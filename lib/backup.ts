/**
 * גיבוי לילי אוטומטי — כל נתוני העסק מ-Firestore נשמרים כקובץ JSON דחוס
 * ב-Firebase Storage תחת backups/backup-YYYY-MM-DD.json.gz.
 *
 * - Timestamps מומרים ל-ISO עם מרקר טיפוס כדי שאפשר יהיה לשחזר אותם 1:1
 *   (ראו scripts/restore-backup.ts).
 * - Retention: נשמרים 14 הגיבויים האחרונים, ישנים יותר נמחקים.
 *
 * מופעל מתוך ה-cron של 03:00 (app/api/cleanup-old-designs) — לפני כל מחיקה,
 * כך שהגיבוי מצלם את המצב שלפני הניקוי.
 */
import { adminDb, adminStorage } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { gzipSync } from 'zlib'

/** כל אוספי הנתונים העסקיים — מאומת מול firestore.rules + lib/db.ts */
export const BACKUP_COLLECTIONS = [
  'orders',
  'leads',
  'coupons',
  'reviews',
  'quotes',
  'packages',
  'packageOrders',
  'siteImages',
  'pricing',
  'discounts',
  'inventory',
  'settings',
  'adminSettings',
  'counters',
  'shared_designs',
  'shared_carts',
] as const

export const BACKUP_RETENTION = 14
const BACKUP_PREFIX = 'backups/backup-'
const BACKUP_NAME_RE = /backup-\d{4}-\d{2}-\d{2}\.json\.gz$/

/** מרקר טיפוס עבור Timestamp בקובץ הגיבוי */
export const TS_MARKER = '__firestore_timestamp__'

export interface BackupSummary {
  collections: number
  docs: number
  bytes: number
  file: string
  deletedOldBackups: number
}

export interface BackupFile {
  version: 1
  createdAt: string
  collections: Record<string, Array<{ id: string; data: unknown }>>
}

/** המרה רקורסיבית: Timestamp/Date → { [TS_MARKER]: ISO string } */
export function serializeValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Date) return { [TS_MARKER]: value.toISOString() }
  const maybeTs = value as { toDate?: () => Date }
  if (typeof maybeTs.toDate === 'function') {
    return { [TS_MARKER]: maybeTs.toDate().toISOString() }
  }
  if (Array.isArray(value)) return value.map(serializeValue)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) out[k] = serializeValue(v)
  return out
}

/** ההמרה ההפוכה — משמש את סקריפט השחזור */
export function deserializeValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(deserializeValue)
  const obj = value as Record<string, unknown>
  if (typeof obj[TS_MARKER] === 'string') {
    return Timestamp.fromDate(new Date(obj[TS_MARKER] as string))
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) out[k] = deserializeValue(v)
  return out
}

/**
 * מריץ גיבוי מלא: קורא את כל האוספים, דוחס, מעלה ל-Storage ומוחק גיבויים
 * ישנים מעבר ל-14 הימים האחרונים.
 */
export async function runBackup(now: Date = new Date()): Promise<BackupSummary> {
  const payload: BackupFile = {
    version: 1,
    createdAt: now.toISOString(),
    collections: {},
  }

  let docs = 0
  for (const name of BACKUP_COLLECTIONS) {
    const snap = await adminDb.collection(name).get()
    payload.collections[name] = snap.docs.map((d) => ({
      id: d.id,
      data: serializeValue(d.data()),
    }))
    docs += snap.docs.length
  }

  const gz = gzipSync(Buffer.from(JSON.stringify(payload)))
  const filePath = `${BACKUP_PREFIX}${now.toISOString().slice(0, 10)}.json.gz`
  const bucket = adminStorage.bucket()

  await bucket.file(filePath).save(gz, {
    contentType: 'application/gzip',
    resumable: false,
    metadata: { cacheControl: 'no-store' },
  })

  // ── Retention: keep newest 14 backups, delete the rest ──────────────────
  // שמות הקבצים מבוססי תאריך (YYYY-MM-DD) — מיון לקסיקוגרפי = כרונולוגי
  let deletedOldBackups = 0
  const [files] = await bucket.getFiles({ prefix: BACKUP_PREFIX })
  const backups = files
    .filter((f) => BACKUP_NAME_RE.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name))
  for (const f of backups.slice(BACKUP_RETENTION)) {
    try {
      await f.delete()
      deletedOldBackups++
    } catch (e) {
      console.error(`Failed to delete old backup ${f.name}:`, e)
    }
  }

  return {
    collections: BACKUP_COLLECTIONS.length,
    docs,
    bytes: gz.length,
    file: filePath,
    deletedOldBackups,
  }
}
