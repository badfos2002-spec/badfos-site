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
import {
  runClosedOrderCleanup,
  runStoragePressureRelief,
  describeCleanupAbort,
  CleanupAbort,
} from '@/lib/storage-cleanup-run'
import { CLOSED_ORDER_MIN_AGE_DAYS } from '@/lib/storage-cleanup'

// Backup + full reference scan + bucket listing + two capped delete batches
// (Layer 1, and Layer 2 under storage pressure): far past the default function
// budget. Same ceiling as /api/admin/storage-cleanup.
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET
const QUOTE_EXPIRY_DAYS = 30 // הצעת מחיר שעברו 30 יום מיצירתה — נמחקת מה-DB
const UPSCALE_RETRY_DAYS = 14 // ריפוי עצמי של הגדלות: רק הזמנות מ-14 הימים האחרונים

// Storage-pressure threshold for designs/ (in MB). Override via env var.
// The project is on the Blaze plan: there is no 5000 MB hard cap any more (the
// number came from the Spark tier), so this is a COST guard, not a quota guard.
// Above it, Layer 2 runs one extra pass of the closed-order policy; it never
// widens what may be deleted. (The "storage full" incident that prompted this
// was a suspended billing account, not the bucket filling up.)
const STORAGE_AGGRESSIVE_MB = Number(process.env.STORAGE_AGGRESSIVE_MB || 4200)
const MAX_EMERGENCY_FILES = 500 // Layer 2 batch (files), same size as Layer 1's
const MAX_NIGHTLY_ORDER_FILES = 500 // Layer 1 batch; the owner drains a backlog faster from /admin/costs

/**
 * Backup (runs FIRST, before any deletion — captures pre-cleanup state):
 *          nightly full Firestore backup to Storage (lib/backup.ts).
 *          A backup failure never blocks the cleanup, and vice versa.
 * Layer 0: Self-heal upscales — retry failed/stuck design upscales of recent
 *          paid orders (up to 3 total attempts per design, then gave_up).
 * Layer 1: Design files of CLOSED orders — completed/shipped/cancelled older
 *          than 30 days, cart_abandoned older than 90 — through the same
 *          file-level planner as the admin 'old-orders' mode
 *          (lib/storage-cleanup.ts planClosedOrders): files another live
 *          document still names stay, the order is stamped designsDeleted only
 *          together with its own files, one capped batch
 *          (MAX_NIGHTLY_ORDER_FILES) per night. Open orders are never touched.
 *          FIRST-RUN GATE: until the owner has done one manual 'old-orders'
 *          run from /admin/costs, Layer 1 and Layer 2 only PLAN (dryRun) and
 *          report the counts. A refused scan (an unreadable reference…) deletes
 *          nothing, is reported as `aborted` and emails the owner.
 * Layer 1b: Shared sketches older than 30 days lose their uploaded originals but
 *          keep their Firestore doc AND their preview.jpg, so /share/<id> still
 *          shows the sketch — as a still instead of the 3D stage. Policy and
 *          every fail-closed rule live in lib/sketch-retention.ts.
 * Layer 2: If designs/ is still above STORAGE_AGGRESSIVE_MB → ONE MORE pass of
 *          the very same closed-order policy (lib/storage-cleanup-run.ts
 *          runStoragePressureRelief). It used to prefix-delete
 *          designs/<orderId>/ of the oldest orders of ANY status and stamp them
 *          designsDeleted while their originals stayed; now an open order is
 *          never touched, however full the bucket. Nothing left to delete
 *          safely → the owner is alerted instead.
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

  // What "old enough" means tonight, per group — for whoever reads the response.
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const cutoffs = {
    closedOrders: daysAgo(CLOSED_ORDER_MIN_AGE_DAYS.completed),
    abandonedCarts: daysAgo(CLOSED_ORDER_MIN_AGE_DAYS.cart_abandoned),
  }

  let scanned = 0
  let cleaned = 0
  let orderDesigns: Awaited<ReturnType<typeof runClosedOrderCleanup>> | { error: string } = { error: 'not run' }
  let errors = 0
  let storagePressure:
    | Awaited<ReturnType<typeof runStoragePressureRelief>>
    | { ran: false; blockedBy: 'scan-aborted' }
    | { error: string }
    | null = null
  // Set when the reference scan REFUSED to run (CleanupAbort): nothing was
  // deleted, and the owner must be told which document to fix.
  let scanAbort: ReturnType<typeof describeCleanupAbort> | null = null
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

    // ── Layer 1: closed orders' artwork, 30+ days (orders stay in admin) ─
    //    The old version deleted only designs/<orderDocId>/ (upscale outputs)
    //    but stamped designsDeleted — the customer originals under the designer
    //    session prefix stayed forever — and re-read the same 500 already-marked
    //    orders every night. Isolated like Layer 1b: a refusal here (an
    //    unreadable reference, an over-cap collection) deletes nothing and must
    //    not cost the sketch sweep or the emergency layer.
    try {
      orderDesigns = await runClosedOrderCleanup(adminDb, bucket, Date.now(), MAX_NIGHTLY_ORDER_FILES)
      scanned = orderDesigns.eligibleOrders
      cleaned = orderDesigns.dryRun ? 0 : orderDesigns.ordersInBatch
      errors += orderDesigns.result.errors + (orderDesigns.result.stampErrors || 0)
      if (orderDesigns.oversized.length > 0) {
        // Never cleaned by the cron (more files than one batch) — make it visible in the logs.
        console.warn('Closed-order cleanup skipped oversized orders:', orderDesigns.oversized)
      }
      if (orderDesigns.dryRun) {
        console.warn(
          'Closed-order cleanup is in DRY-RUN until the first manual run from /admin/costs. Would delete:',
          orderDesigns.planned
        )
      }
    } catch (e) {
      console.error('Closed-order design cleanup refused/failed (nothing deleted by it):', e)
      orderDesigns = { error: e instanceof Error ? e.message : 'order design cleanup failed' }
      errors++
      if (e instanceof CleanupAbort) scanAbort = describeCleanupAbort(e)
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

    // ── Layer 2: storage pressure — one more pass of the SAME policy ──────
    //    Isolated like Layer 1: a planner refusal deletes nothing.
    const overThreshold = usageMB > STORAGE_AGGRESSIVE_MB
    if (scanAbort) {
      // The pressure pass would stop on the very same document — not run twice.
      // The abort email below carries the pressure warning instead.
      if (overThreshold) storagePressure = { ran: false, blockedBy: 'scan-aborted' }
    } else if (overThreshold) {
      console.warn(`designs/ at ${usageMB.toFixed(0)}MB > ${STORAGE_AGGRESSIVE_MB}MB. Extra closed-order pass.`)
      const MB = 1024 * 1024
      try {
        const relief = await runStoragePressureRelief(
          adminDb,
          bucket,
          usageMB * MB,
          STORAGE_AGGRESSIVE_MB * MB,
          MAX_EMERGENCY_FILES
        )
        storagePressure = relief
        usageMB = relief.usageBytes / MB
        errors += (relief.pass?.result.errors || 0) + (relief.pass?.result.stampErrors || 0)
        // Above the threshold and the cron may not (gate) or cannot (nothing
        // left that is safe) delete more. What remains belongs to open or
        // recently-closed orders, and touching those is exactly the 2026-10
        // incident (order #1491, two days old). A human decision is needed.
        if (relief.alert) await sendStorageFullAlert(usageMB, relief.alert)
      } catch (e) {
        console.error('Storage-pressure pass refused/failed (nothing deleted by it):', e)
        storagePressure = { error: e instanceof Error ? e.message : 'storage pressure pass failed' }
        errors++
        if (e instanceof CleanupAbort) scanAbort = describeCleanupAbort(e)
      }
    }

    // A refused scan must never be silent: it repeats every night until a
    // human fixes the document, and meanwhile nothing is cleaned.
    if (scanAbort) await sendScanAbortAlert(scanAbort, overThreshold ? usageMB : null)

    return NextResponse.json({
      success: true,
      backup,
      scanned,
      cleaned,
      aborted: scanAbort !== null,
      ...(scanAbort && { abortReason: scanAbort.message, abortDocuments: scanAbort.documents }),
      orderDesigns,
      storagePressure,
      deletedQuotes,
      sketches,
      upscalesRetried,
      upscalesGaveUp,
      upscalesHealed,
      upscalesSkipped,
      errors,
      storageMB: Math.round(usageMB),
      filesCount,
      cutoffs,
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
 * Send the owner one alert email, at most once per day per `dedupeDoc`
 * (settings/<dedupeDoc>.lastSentDate) — the conditions these report persist
 * until a human acts, and the nightly rerun adds nothing. Never throws: an
 * alert failure must not fail the cleanup run.
 *
 * Only dates and `numbers` go into the settings document. `settings` is one of
 * the scanned collections — text stored there (an abort reason quoting a URL)
 * could itself stop the next scan.
 */
async function sendOwnerAlert(
  dedupeDoc: string,
  subject: string,
  html: string,
  numbers: Record<string, number> = {}
): Promise<void> {
  try {
    const resend = getResend()
    const to = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!resend || !to) {
      console.warn(`⚠️ Resend or admin email not configured. Alert "${dedupeDoc}" not sent.`)
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    const alertRef = adminDb.collection('settings').doc(dedupeDoc)
    const prev = await alertRef.get()
    if (prev.exists && prev.data()?.lastSentDate === today) return

    const { error } = await resend.emails.send({ from: 'בדפוס <no-reply@badfos.co.il>', to, subject, html })
    if (error) {
      // Not sent — leave the dedup stamp alone so tomorrow's run retries.
      console.error(`Alert "${dedupeDoc}" Resend error:`, error)
      return
    }
    await recordUsage('resend_email')
    await alertRef.set({ lastSentDate: today, lastSentAt: Timestamp.now(), ...numbers }, { merge: true })
    console.warn(`Alert "${dedupeDoc}" sent to owner.`)
  } catch (e) {
    console.error(`Alert "${dedupeDoc}" failed (cleanup continues):`, e)
  }
}

const alertShell = (title: string, body: string) => `
  <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
    <div style="background: #dc2626; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0; color: #fff; font-size: 22px;">${title}</h1>
    </div>
    <div style="color: #1e293b; font-size: 15px; line-height: 1.8;">${body}</div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://badfos.co.il/admin/costs" style="background: #dc2626; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">📋 לניקוי אחסון</a>
    </div>
  </div>
`

/**
 * Owner alert: designs/ is over the pressure threshold and the cron will not
 * bring it down on its own. `reason` picks the honest explanation:
 *   exhausted — every closed order past its window is already cleaned; what is
 *               left belongs to open or recently closed orders;
 *   oversized — the same, but closed orders too big for a nightly batch remain
 *               (the admin tool can take them);
 *   gated     — the first-run gate is closed: the cron has not deleted anything
 *               yet because the owner has not done the first manual run.
 */
async function sendStorageFullAlert(usageMB: number, reason: 'exhausted' | 'oversized' | 'gated'): Promise<void> {
  const usage = escapeHtml(String(Math.round(usageMB)))
  const threshold = escapeHtml(String(STORAGE_AGGRESSIVE_MB))
  const why = {
    exhausted:
      'ואין יותר מה לנקות בבטחה — נשארו רק קבצים של הזמנות פתוחות או של הזמנות שנסגרו לאחרונה, והניקוי הלילי לעולם לא מוחק אותן.',
    oversized:
      'והניקוי הלילי סיים את מה שהוא רשאי למחוק. נשארו הזמנות סגורות שיש להן יותר קבצים ממה שהריצה הלילית מוחקת בסבב אחד ' +
      '— את אלה אפשר עדיין לנקות ידנית במסך עלויות ← ניקוי אחסון (שם התקרה היא 2,000 קבצים לסבב) — ומלבדן רק הזמנות ' +
      'פתוחות או כאלה שנסגרו לאחרונה.',
    gated:
      'והניקוי הלילי האוטומטי עדיין לא מוחק כלום: הוא יופעל רק אחרי ריצה ידנית ראשונה במסך עלויות ← ניקוי אחסון ' +
      '("עיצובים של הזמנות סגורות מעל 30 יום" ← סרוק ← מחק).',
  }[reason]
  const action =
    reason === 'exhausted'
      ? 'נדרשת החלטה: להעלות את הסף (STORAGE_AGGRESSIVE_MB) או לבדוק מה תופס מקום במסך עלויות ← ניקוי אחסון.'
      : 'נדרשת פעולה: להיכנס למסך עלויות ← ניקוי אחסון ולהריץ את הניקוי ידנית.'
  await sendOwnerAlert(
    'storage_alert',
    `🚨 האחסון מעל הסף (${Math.round(usageMB)}MB) — נדרשת ${reason === 'exhausted' ? 'החלטה' : 'פעולה'}`,
    alertShell(
      '🚨 האחסון מעל הסף',
      `קבצי העיצוב תופסים <strong>${usage}MB</strong> (מעל הסף של ${threshold}MB) ${why}
       <br /><br />
       הפרויקט בחבילת Blaze: אין מכסה שחוסמת העלאות, אבל הנפח מחויב לפי שימוש.
       <br />
       <strong>${action}</strong>`
    ),
    { usageMB: Math.round(usageMB) }
  )
}

/**
 * Owner alert: the reference scan REFUSED to run, so tonight's cleanup deleted
 * nothing — and it will refuse again every night until the document is fixed.
 * Names the documents (never the offending text: it can be most of a
 * token-bearing URL). `usageMB` is passed only when designs/ is also over the
 * pressure threshold, so that state is never silent either.
 */
async function sendScanAbortAlert(
  abort: ReturnType<typeof describeCleanupAbort>,
  usageMB: number | null
): Promise<void> {
  const docs = abort.documents.slice(0, 20)
  const list =
    docs.length > 0
      ? `<p><strong>המסמכים שעצרו את הסריקה:</strong></p>
         <ul dir="ltr" style="text-align: left;">${docs
           .map((d) => `<li><a href="${escapeHtml(d.url)}">${escapeHtml(d.path)}</a></li>`)
           .join('')}</ul>
         <p><strong>מה עושים:</strong> לוחצים על הקישור (נפתח המסמך ב-Firebase Console), מוצאים שדה שכל הערך שלו הוא
         קישור קטוע או לא תקין לקובץ באחסון, מתקנים או מוחקים את השדה, ואז לוחצים "סרוק" במסך עלויות ← ניקוי אחסון
         כדי לוודא שהסריקה עוברת.</p>`
      : `<p><strong>מה עושים:</strong> אם זו תקלת קריאה זמנית, הריצה של מחר תנסה שוב לבד. אם המייל חוזר —
         ללחוץ "סרוק" במסך עלויות ← ניקוי אחסון ולראות את ההודעה המלאה.</p>`
  const pressure =
    usageMB !== null
      ? `<p style="color: #b91c1c;"><strong>שימו לב:</strong> קבצי העיצוב תופסים ${escapeHtml(String(Math.round(usageMB)))}MB —
         מעל הסף של ${escapeHtml(String(STORAGE_AGGRESSIVE_MB))}MB — והניקוי חסום עד התיקון.</p>`
      : ''
  await sendOwnerAlert(
    'scan_abort_alert',
    `🛑 ניקוי האחסון הלילי נעצר ולא מחק כלום${usageMB !== null ? ` · האחסון מעל הסף (${Math.round(usageMB)}MB)` : ''}`,
    alertShell(
      '🛑 ניקוי האחסון הלילי נעצר',
      `<p>הניקוי הלילי של קבצי העיצוב נעצר לפני שמחק משהו, ויעצור שוב בכל לילה עד שהבעיה תטופל.</p>
       <p><strong>הסיבה:</strong> ${escapeHtml(abort.message)}</p>
       ${list}
       ${pressure}`
    )
  )
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
