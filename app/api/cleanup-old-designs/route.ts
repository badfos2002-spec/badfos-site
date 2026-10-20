import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminStorage, adminSdkUnavailable } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import {
  runUpscaleForOrder,
  upscaleEntryMillis,
  UPSCALABLE_STATUSES,
  STUCK_PENDING_MS,
} from '@/lib/upscale-order'
import { PIXEL_LIMIT_ERROR } from '@/lib/upscale'
import { runBackup, BackupSummary } from '@/lib/backup'
import { sweepOldSketches, SketchSweepSummary } from '@/lib/sketch-sweep'
import { Resend } from 'resend'
import { escapeHtml } from '@/lib/utils'
import { recordUsage } from '@/lib/usage-tracking'
import { isManualOrder } from '@/lib/manual-order'

const CRON_SECRET = process.env.CRON_SECRET
const CLEANUP_DAYS = 30
const QUOTE_EXPIRY_DAYS = 30 // הצעת מחיר שעברו 30 יום מיצירתה — נמחקת מה-DB
const UPSCALE_RETRY_DAYS = 14 // ריפוי עצמי של הגדלות: רק הזמנות מ-14 הימים האחרונים

// Storage thresholds (in MB). Override via env vars if needed.
// Firebase Spark (free) tier limit is 5000 MB.
// Default policy: always keep at least 500 MB free + 300 MB buffer for uploads
// between cron runs → trigger aggressive cleanup at 4200 MB, target 3000 MB after.
const STORAGE_AGGRESSIVE_MB = Number(process.env.STORAGE_AGGRESSIVE_MB || 4200)
const STORAGE_TARGET_MB = Number(process.env.STORAGE_TARGET_MB || 3000)
const MAX_EMERGENCY_DELETIONS = 500 // safety cap per run

// HARD age guard for Layer 2: an order younger than this NEVER loses its
// files — not even with storage over the emergency threshold. Incident
// 2026-10: Layer 2 walked createdAt asc, but every old order was already
// designsDeleted → continue — so it reached and deleted FRESH orders
// (order #1491, two days old). Storage relief must never cost a live order
// its files; when nothing old enough remains, the owner is alerted instead.
const EMERGENCY_MIN_AGE_DAYS = 45

/**
 * Backup (runs FIRST, before any deletion — captures pre-cleanup state):
 *          nightly full Firestore backup to Storage (lib/backup.ts).
 *          A backup failure never blocks the cleanup, and vice versa.
 * Layer 0: Self-heal upscales — retry failed/stuck design upscales of recent
 *          paid orders (up to 3 total attempts per design, then gave_up).
 * Layer 1: Delete design files of orders older than 30 days (keep order docs).
 * Layer 1b: Shared sketches older than 30 days lose their uploaded originals but
 *          keep their Firestore doc AND their preview.jpg, so /share/<id> still
 *          shows the sketch — as a still instead of the 3D stage. Policy and
 *          every fail-closed rule live in lib/sketch-retention.ts.
 * Layer 2: If Storage usage still high → delete entire oldest orders (doc + files) until safe.
 *
 * Triggered by Vercel Cron daily, or manually with the CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || req.nextUrl.searchParams.get('secret')
  if (!CRON_SECRET || (auth !== CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // `adminStorage.bucket()` below sits OUTSIDE the try/catch that guards the
  // rest of this handler, so with the Admin SDK down it threw an unhandled
  // TypeError: Next answered a bare 500 with no body and the log showed a raw
  // "Cannot read properties of undefined (reading 'bucket')" with nothing
  // naming this route. Same outcome (nothing runs, the cron is red) but now
  // it says which job died and why. Nothing below this line changes.
  const unavailable = adminSdkUnavailable()
  if (unavailable) {
    console.error(
      '[ADMIN_SDK_UNAVAILABLE] cleanup-old-designs did not run: no nightly Firestore backup, no 30-day design ' +
      'cleanup, no sketch retention sweep and no emergency storage relief. Storage keeps growing until this is ' +
      'fixed. Check FIREBASE_ADMIN_* on Vercel. Reason:',
      unavailable
    )
    return NextResponse.json({ error: 'admin_sdk_unavailable' }, { status: 503 })
  }

  const bucket = adminStorage.bucket()

  // ── Dry run ─────────────────────────────────────────────────────────────
  // `?dryRun=1` plans the sketch sweep and returns it WITHOUT touching
  // anything — no Storage delete, no document write, and none of the other
  // layers run at all (they are listed in `skipped` so nobody reads this
  // response as a verdict on them). The Vercel cron never passes it.
  if (req.nextUrl.searchParams.get('dryRun') === '1') {
    const sketches = await sweepOldSketches(adminDb, bucket, false)
    return NextResponse.json({
      success: true,
      mode: 'dry-run',
      sketches,
      skipped: ['backup', 'upscale-self-heal', 'expired-quotes', 'order-designs', 'emergency-storage'],
    })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - CLEANUP_DAYS)
  const cutoffTs = Timestamp.fromDate(cutoff)

  let scanned = 0
  let cleaned = 0
  let errors = 0
  let emergencyDeleted = 0
  let deletedQuotes = 0
  let upscalesRetried = 0
  let upscalesGaveUp = 0
  let upscalesHealed = 0
  let upscalesSkipped = 0
  let sketches: SketchSweepSummary | { error: string } = { error: 'not run' }

  // ── Nightly backup — FIRST, before any deletion below. Failure here must
  //    never block the cleanup (and cleanup failures never block the backup,
  //    since it already completed by then). ─────────────────────────────────
  let backup: BackupSummary | { error: string }
  try {
    backup = await runBackup()
  } catch (e) {
    console.error('Nightly backup failed (cleanup continues):', e)
    backup = { error: e instanceof Error ? e.message : 'backup failed' }
  }

  try {
    // ── Layer 0: Self-healing upscale retries (paid orders, last 14 days) ─
    try {
      const retryCutoff = new Date()
      retryCutoff.setDate(retryCutoff.getDate() - UPSCALE_RETRY_DAYS)
      const recentSnap = await adminDb
        .collection('orders')
        .where('createdAt', '>=', Timestamp.fromDate(retryCutoff))
        .limit(500)
        .get()

      for (const doc of recentSnap.docs) {
        const order = doc.data()
        if (!UPSCALABLE_STATUSES.includes(order.status)) continue
        // הזמנה ידנית — בלי הגדלה אוטומטית (החלטת הבעלים)
        if (isManualOrder(order)) continue
        const upscales = order.upscales || {}
        // Heal when EITHER:
        //  (a) an existing entry is retryable — failed, a pixel-limit gave_up
        //      (already high-res, convert in place), or a pending one older than
        //      1h (lost webhook); OR
        //  (b) a design has a source image but NO upscale entry at all — the
        //      paid trigger never ran, or the design was base64 and skipped by
        //      the old code. This is what heals the owner's oversized order and
        //      every past order whose designs stayed base64.
        const hasRetryableEntry = Object.values(upscales).some((u: any) => {
          if (u?.status === 'failed') return true
          if (u?.status === 'gave_up') return typeof u?.error === 'string' && PIXEL_LIMIT_ERROR.test(u.error)
          if (u?.status !== 'pending') return false
          const ms = upscaleEntryMillis(u.createdAt)
          return ms === null || Date.now() - ms >= STUCK_PENDING_MS
        })
        const items = Array.isArray(order.items) ? order.items : []
        const hasUnupscaledDesign = items.some((item: any, itemIdx: number) =>
          (Array.isArray(item?.designs) ? item.designs : []).some((d: any) => {
            const area = typeof d?.area === 'string' ? d.area : ''
            const imageUrl = typeof d?.imageUrl === 'string' ? d.imageUrl : ''
            // Only designs that actually carry a source image and have no entry
            if (!area || !imageUrl) return false
            return upscales[`${itemIdx}_${area}`] === undefined
          })
        )
        if (!hasRetryableEntry && !hasUnupscaledDesign) continue

        try {
          const r = await runUpscaleForOrder(doc.id, { retryStuckPending: true })
          upscalesRetried += r.created
          upscalesGaveUp += r.gaveUp
          upscalesHealed += r.healed
          upscalesSkipped += r.skipped
          if (r.created || r.gaveUp || r.healed || r.skipped) {
            console.log(`Upscale self-heal: order ${doc.id} — retried ${r.created}, gave up ${r.gaveUp}, healed ${r.healed}, skipped ${r.skipped}`)
          }
        } catch (e) {
          console.error(`Upscale self-heal failed for order ${doc.id}:`, e)
          errors++
        }
      }
    } catch (e) {
      console.error('Upscale self-heal scan failed:', e)
      errors++
    }

    // ── Expired quotes: delete quotes created 30+ days ago (by createdAt) ─
    const quoteCutoff = new Date()
    quoteCutoff.setDate(quoteCutoff.getDate() - QUOTE_EXPIRY_DAYS)
    const quotesSnap = await adminDb
      .collection('quotes')
      .where('createdAt', '<', Timestamp.fromDate(quoteCutoff))
      .limit(500)
      .get()

    for (const doc of quotesSnap.docs) {
      try {
        await doc.ref.delete()
        deletedQuotes++
      } catch (e) {
        console.error(`Failed to delete expired quote ${doc.id}:`, e)
        errors++
      }
    }

    // ── Layer 1: 30-day image cleanup (orders stay in admin) ────────────
    const snapshot = await adminDb
      .collection('orders')
      .where('createdAt', '<', cutoffTs)
      .limit(500)
      .get()

    for (const doc of snapshot.docs) {
      scanned++
      if (doc.data().designsDeleted) continue
      try {
        await bucket.deleteFiles({ prefix: `designs/${doc.id}/` })
        await doc.ref.update({
          designsDeleted: true,
          designsDeletedAt: Timestamp.now(),
        })
        cleaned++
      } catch (e) {
        console.error(`Cleanup failed for order ${doc.id}:`, e)
        errors++
      }
    }

    // ── Layer 1b: shared sketches older than 30 days (link keeps working) ─
    //    Isolated: a sketch-sweep failure must not cost the order cleanup or
    //    the emergency layer below, which are what protect the quota.
    try {
      sketches = await sweepOldSketches(adminDb, bucket, true)
      errors += sketches.errors
    } catch (e) {
      console.error('Sketch retention sweep failed:', e)
      sketches = { error: e instanceof Error ? e.message : 'sketch sweep failed' }
      errors++
    }

    // ── Check current storage usage in designs/ ─────────────────────────
    let { totalMB: usageMB, count: filesCount } = await getDesignsUsage(bucket)

    // ── Layer 2: Emergency — delete IMAGES of oldest orders (orders themselves stay) ─
    if (usageMB > STORAGE_AGGRESSIVE_MB) {
      console.warn(`Storage at ${usageMB.toFixed(0)}MB > ${STORAGE_AGGRESSIVE_MB}MB. Emergency image cleanup.`)
      const oldestSnap = await adminDb
        .collection('orders')
        .orderBy('createdAt', 'asc')
        .limit(1000)
        .get()

      const emergencyAgeCutoffMs = Date.now() - EMERGENCY_MIN_AGE_DAYS * 24 * 60 * 60 * 1000
      for (const doc of oldestSnap.docs) {
        if (usageMB <= STORAGE_TARGET_MB) break
        if (emergencyDeleted >= MAX_EMERGENCY_DELETIONS) break
        if (doc.data().designsDeleted) continue

        // Hard age guard — a young order's files are never deleted, even in an
        // emergency. Unknown/unparseable createdAt counts as young (fail safe).
        const createdMs = doc.data().createdAt?.toMillis?.()
        if (typeof createdMs !== 'number' || createdMs > emergencyAgeCutoffMs) continue

        try {
          const [orderFiles] = await bucket.getFiles({ prefix: `designs/${doc.id}/` })
          const orderBytes = orderFiles.reduce(
            (sum, f) => sum + Number(f.metadata?.size || 0),
            0
          )
          if (orderFiles.length === 0) continue
          await bucket.deleteFiles({ prefix: `designs/${doc.id}/` })
          await doc.ref.update({
            designsDeleted: true,
            designsDeletedAt: Timestamp.now(),
            designsDeletedReason: 'storage_limit',
          })
          usageMB -= orderBytes / (1024 * 1024)
          emergencyDeleted++
        } catch (e) {
          console.error(`Emergency image cleanup failed for order ${doc.id}:`, e)
          errors++
        }
      }
      console.warn(`Emergency cleanup done: cleared images of ${emergencyDeleted} orders. Usage now ${usageMB.toFixed(0)}MB.`)

      // Still above the emergency threshold and the loop ran out of SAFE
      // candidates (not out of the per-run cap) — deleting more would mean
      // touching young orders, which is exactly the incident this guards
      // against. The cron cannot help any further: alert the owner, a human
      // decision is needed (Blaze upgrade or a wider deletion policy).
      if (usageMB > STORAGE_AGGRESSIVE_MB && emergencyDeleted < MAX_EMERGENCY_DELETIONS) {
        await sendStorageFullAlert(usageMB)
      }
    }

    return NextResponse.json({
      success: true,
      backup,
      scanned,
      cleaned,
      emergencyDeleted,
      deletedQuotes,
      sketches,
      upscalesRetried,
      upscalesGaveUp,
      upscalesHealed,
      upscalesSkipped,
      errors,
      storageMB: Math.round(usageMB),
      filesCount,
      cutoff: cutoff.toISOString(),
    })
  } catch (e) {
    console.error('Cleanup endpoint error:', e)
    return NextResponse.json({ error: 'Cleanup failed', backup }, { status: 500 })
  }
}

// Lazy-init Resend to avoid build-time errors when API key is missing
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

/**
 * Urgent owner alert: storage is over the emergency threshold and the cron has
 * nothing left it may safely delete (everything older than
 * EMERGENCY_MIN_AGE_DAYS is already cleaned). De-duplicated to one email per
 * day via settings/storage_alert — the condition persists until a human acts,
 * and the nightly rerun adds nothing. Never throws: an alert failure must not
 * fail the cleanup run.
 */
async function sendStorageFullAlert(usageMB: number): Promise<void> {
  try {
    const resend = getResend()
    const to = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!resend || !to) {
      console.warn('⚠️ Resend or admin email not configured. Storage-full alert not sent.')
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    const alertRef = adminDb.collection('settings').doc('storage_alert')
    const prev = await alertRef.get()
    if (prev.exists && prev.data()?.lastSentDate === today) return

    const usage = escapeHtml(String(Math.round(usageMB)))
    const threshold = escapeHtml(String(STORAGE_AGGRESSIVE_MB))
    const minAge = escapeHtml(String(EMERGENCY_MIN_AGE_DAYS))

    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
        <div style="background: #dc2626; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; color: #fff; font-size: 22px;">🚨 האחסון מלא — נדרשת החלטה</h1>
        </div>
        <p style="color: #1e293b; font-size: 15px; line-height: 1.8;">
          האחסון מלא (<strong>${usage}MB</strong>, מעל סף החירום של ${threshold}MB) ואין יותר מה לנקות בבטחה —
          כל ההזמנות שנותרו עם קבצים צעירות מ-${minAge} יום, והניקוי הלילי לעולם לא מוחק אותן.
          <br /><br />
          <strong>נדרשת החלטה: שדרוג ל-Blaze או הרחבת מדיניות המחיקה.</strong>
          <br />
          עד אז העלאות חדשות של לקוחות עלולות להיכשל כשהמכסה תיגמר.
        </p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="https://badfos.co.il/admin" style="background: #dc2626; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">📋 לממשק הניהול</a>
        </div>
      </div>
    `

    const { error } = await resend.emails.send({
      from: 'בדפוס <no-reply@badfos.co.il>',
      to,
      subject: `🚨 האחסון מלא (${Math.round(usageMB)}MB) ואין מה לנקות בבטחה — נדרשת החלטה`,
      html,
    })
    if (error) {
      // Not sent — leave the dedup stamp alone so tomorrow's run retries.
      console.error('Storage-full alert Resend error:', error)
      return
    }
    await recordUsage('resend_email')
    await alertRef.set(
      {
        lastSentDate: today,
        lastSentAt: Timestamp.now(),
        usageMB: Math.round(usageMB),
      },
      { merge: true }
    )
    console.warn(`Storage-full alert sent to owner (${Math.round(usageMB)}MB).`)
  } catch (e) {
    console.error('Storage-full alert failed (cleanup continues):', e)
  }
}

async function getDesignsUsage(bucket: ReturnType<typeof adminStorage.bucket>) {
  try {
    const [files] = await bucket.getFiles({ prefix: 'designs/' })
    const totalBytes = files.reduce((sum, f) => sum + Number(f.metadata?.size || 0), 0)
    return { totalMB: totalBytes / (1024 * 1024), count: files.length }
  } catch (e) {
    console.error('Failed to compute storage usage:', e)
    return { totalMB: 0, count: 0 }
  }
}
