/**
 * שחזור גיבוי לילי מ-backups/backup-YYYY-MM-DD.json.gz חזרה ל-Firestore.
 *
 * ⚠️ בטיחות: ברירת המחדל היא DRY RUN — הסקריפט רק מדפיס מה היה נכתב.
 *    כתיבה אמיתית רק עם הדגל --apply.
 *
 * הרצה:
 *   npx tsx scripts/restore-backup.ts <path/to/backup-YYYY-MM-DD.json.gz> [--collections=orders,leads] [--apply]
 *
 * דרישות: FIREBASE_ADMIN_* מוגדרים ב-.env.local (הסקריפט טוען אותו לבד).
 * הורדת הקובץ: ראו scripts/restore-backup.md
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { gunzipSync } from 'zlib'

// ── Load .env.local (אין תלות ב-dotenv) ─────────────────────────────────────
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m || line.trim().startsWith('#')) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[m[1]]) process.env[m[1]] = v
  }
}

async function main() {
  const args = process.argv.slice(2)
  const filePath = args.find((a) => !a.startsWith('--'))
  const apply = args.includes('--apply')
  const collectionsArg = args.find((a) => a.startsWith('--collections='))
  const onlyCollections = collectionsArg
    ? collectionsArg.replace('--collections=', '').split(',').map((s) => s.trim())
    : null

  if (!filePath) {
    console.error('Usage: npx tsx scripts/restore-backup.ts <backup.json.gz> [--collections=orders,leads] [--apply]')
    process.exit(1)
  }

  // Imports אחרי טעינת env — firebase-admin נכשל בלי credentials
  const { adminDb } = await import('../lib/firebase-admin')
  const { deserializeValue } = await import('../lib/backup')

  const backup = JSON.parse(gunzipSync(readFileSync(filePath)).toString()) as {
    version: number
    createdAt: string
    collections: Record<string, Array<{ id: string; data: unknown }>>
  }
  console.log(`📦 Backup from ${backup.createdAt} (version ${backup.version})`)
  console.log(apply ? '🔴 APPLY MODE — writing to Firestore!' : '🟢 DRY RUN — nothing will be written (add --apply to write)')

  let total = 0
  for (const [name, docs] of Object.entries(backup.collections)) {
    if (onlyCollections && !onlyCollections.includes(name)) continue
    console.log(`\n📁 ${name}: ${docs.length} docs`)
    for (const doc of docs) {
      const data = deserializeValue(doc.data) as Record<string, unknown>
      if (apply) {
        // set() בלי merge — משחזר את המסמך בדיוק כפי שגובה
        await adminDb.collection(name).doc(doc.id).set(data)
      }
      total++
    }
    console.log(`   ${apply ? '✅ restored' : '👀 would restore'} ${docs.length} docs`)
  }

  console.log(`\n${apply ? '✅ Restored' : '👀 DRY RUN — would restore'} ${total} docs total`)
  if (!apply) console.log('להרצה אמיתית: הוסיפו --apply (מומלץ קודם עם --collections=X לאוסף בודד)')
}

main().catch((e) => {
  console.error('❌ Restore failed:', e)
  process.exit(1)
})
