import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminStorage } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import {
  runUpscaleForOrder,
  upscaleEntryMillis,
  UPSCALABLE_STATUSES,
  STUCK_PENDING_MS,
} from '@/lib/upscale-order'
import { PIXEL_LIMIT_ERROR } from '@/lib/upscale'
import { runBackup, BackupSummary } from '@/lib/backup'

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

/**
 * Backup (runs FIRST, before any deletion — captures pre-cleanup state):
 *          nightly full Firestore backup to Storage (lib/backup.ts).
 *          A backup failure never blocks the cleanup, and vice versa.
 * Layer 0: Self-heal upscales — retry failed/stuck design upscales of recent
 *          paid orders (up to 3 total attempts per design, then gave_up).
 * Layer 1: Delete design files of orders older than 30 days (keep order docs).
 * Layer 2: If Storage usage still high → delete entire oldest orders (doc + files) until safe.
 *
 * Triggered by Vercel Cron daily, or manually with the CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || req.nextUrl.searchParams.get('secret')
  if (!CRON_SECRET || (auth !== CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bucket = adminStorage.bucket()
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

      for (const doc of oldestSnap.docs) {
        if (usageMB <= STORAGE_TARGET_MB) break
        if (emergencyDeleted >= MAX_EMERGENCY_DELETIONS) break
        if (doc.data().designsDeleted) continue

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
    }

    return NextResponse.json({
      success: true,
      backup,
      scanned,
      cleaned,
      emergencyDeleted,
      deletedQuotes,
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
