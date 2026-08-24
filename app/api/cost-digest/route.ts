import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminSdkUnavailable } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { Resend } from 'resend'
import {
  aggregateUsage,
  activeMonthlyIls,
  computeDigest,
  digestRecipients,
  isoWeekNumber,
  jerusalemDateKey,
  jerusalemMidnight,
  parseCostSettings,
  shiftDateKey,
  weekWindows,
  COST_SETTINGS_COLLECTION,
  COST_SETTINGS_DOC,
  type UsageDoc,
} from '@/lib/cost-digest'
import { USAGE_COLLECTION, recordUsage } from '@/lib/usage-tracking'
import { CostDigestEmail, costDigestSubject } from '@/lib/email-templates/cost-digest'

const CRON_SECRET = process.env.CRON_SECRET

/** הזמנה שיצאה מהדלת בפועל — אותה הגדרה כמו במסך האנליטיקה. */
const PAID_STATUSES = ['paid', 'in_production', 'shipped', 'completed']

// Lazy-init Resend to avoid build-time errors when API key is missing
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

/**
 * דוח עלויות שבועי לבעל העסק.
 *
 * צובר את 7 הימים המלאים האחרונים, משווה ל-7 שלפניהם, ומחשב את המספר
 * היחיד שמעניין: כמה עולה להוציא הזמנה אחת. נשלח במייל לשתי הכתובות
 * שהבעלים הגדיר ב-/admin/costs (אין כתובת מקודדת בקוד).
 *
 * מופעל מ-Vercel Cron בימי ראשון, או ידנית עם CRON_SECRET —
 * בדיוק כמו /api/cleanup-old-designs ו-/api/notify-abandoned.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || req.nextUrl.searchParams.get('secret')
  if (!CRON_SECRET || (auth !== CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 1. הגדרות הבעלים: מנויים קבועים + נמענים ────────────────────────
  let settings = { subscriptions: [] as ReturnType<typeof parseCostSettings>['subscriptions'], recipients: [] as string[] }
  let settingsError: string | null = null
  try {
    const snap = await adminDb.collection(COST_SETTINGS_COLLECTION).doc(COST_SETTINGS_DOC).get()
    settings = parseCostSettings(snap.exists ? snap.data() : {})
  } catch (e) {
    settingsError = e instanceof Error ? e.message : String(e)
    console.error('Cost digest: failed to read settings:', settingsError)
  }

  const recipients = digestRecipients(settings)
  if (recipients.length === 0) {
    // ── תקלה מול דילוג מכוון ─────────────────────────────────────────────
    // אין נמענים כי הבעלים לא הגדיר אותם = דילוג מכוון, 200.
    // אין נמענים כי הקריאה ל-Firestore נכשלה = תקלה. קודם הוחזר 200 גם
    // במקרה הזה — ה-cron של Vercel הציג ריצה ירוקה, והדוח פשוט הפסיק
    // להגיע בלי שאיש ידע. 5xx הוא מה שגורם לריצה להיראות אדומה.
    const reason = settingsError ? 'settings_unavailable' : 'no_recipients'
    if (settingsError) {
      const unavailable = adminSdkUnavailable()
      console.error(
        `${unavailable ? '[ADMIN_SDK_UNAVAILABLE] ' : ''}Cost digest FAILED (${reason}): the recipient list ` +
          `could not be read, so the weekly digest was not sent. Settings read failed: ${settingsError}` +
          `${unavailable ? ` — Firebase Admin SDK is not initialised: ${unavailable}` : ''}`
      )
      return NextResponse.json({ success: false, skipped: true, reason }, { status: 503 })
    }
    console.warn(
      `Cost digest skipped (${reason}): no valid recipient addresses configured. Set them at /admin/costs.`
    )
    return NextResponse.json({ success: true, skipped: true, reason }, { status: 200 })
  }

  try {
    // ── 2. חלונות הזמן ─────────────────────────────────────────────────
    const today = jerusalemDateKey()
    const { current, previous } = weekWindows(today)

    // ── 3. שימוש: מסמך מונה אחד לכל שירות לכל יום ──────────────────────
    const usageSnap = await adminDb
      .collection(USAGE_COLLECTION)
      .where('date', '>=', previous.from)
      .where('date', '<=', current.to)
      .get()
    const usageDocs = usageSnap.docs.map((d) => d.data() as UsageDoc)

    const currentUsage = aggregateUsage(usageDocs, current.from, current.to)
    const previousUsage = aggregateUsage(usageDocs, previous.from, previous.to)

    // ── 4. הזמנות: שאילתה אחת ל-14 יום, פיצול בזיכרון ──────────────────
    // סינון הסטטוס נעשה בזיכרון בכוונה — כך אין צורך באינדקס מורכב
    // (status + createdAt), והנפח (עשרות מסמכים) לא מצדיק אחד.
    const rangeStart = jerusalemMidnight(previous.from)
    const rangeEnd = jerusalemMidnight(shiftDateKey(current.to, 1))
    const currentStart = jerusalemMidnight(current.from)

    const ordersSnap = await adminDb
      .collection('orders')
      .where('createdAt', '>=', Timestamp.fromDate(rangeStart))
      .where('createdAt', '<', Timestamp.fromDate(rangeEnd))
      .get()

    let currentOrders = 0
    let previousOrders = 0
    for (const doc of ordersSnap.docs) {
      const data = doc.data()
      if (!PAID_STATUSES.includes(data.status)) continue
      const createdAt: Date | null = data.createdAt?.toDate?.() ?? null
      if (!createdAt) continue
      if (createdAt >= currentStart) currentOrders++
      else previousOrders++
    }

    // ── 5. חישוב ─────────────────────────────────────────────────────
    // בהרצה הראשונה אין נתוני שבוע קודם כלל — אז אין מה להשוות, ולא
    // מציגים "ירידה של 100%" מול אפס מדומיין.
    const hasPreviousData = usageDocs.some((d) => d.date >= previous.from && d.date <= previous.to)

    const digest = computeDigest({
      weekNumber: isoWeekNumber(jerusalemMidnight(current.to)),
      currentUsage,
      previousUsage: hasPreviousData ? previousUsage : null,
      currentOrders,
      previousOrders,
      fixedMonthlyIls: activeMonthlyIls(settings.subscriptions),
    })

    // ── 6. שליחה ─────────────────────────────────────────────────────
    const resend = getResend()
    if (!resend) {
      console.warn('Cost digest: RESEND_API_KEY not configured — digest computed but not sent.')
      return NextResponse.json({ success: true, skipped: true, reason: 'resend_not_configured', digest })
    }

    const { error } = await resend.emails.send({
      from: 'בדפוס <no-reply@badfos.co.il>',
      to: recipients,
      subject: costDigestSubject(digest),
      html: CostDigestEmail(digest),
    })

    if (error) {
      console.error('Cost digest Resend error:', error)
      return NextResponse.json({ error: 'Failed to send digest' }, { status: 500 })
    }

    // הדוח עצמו עולה כסף — נמדד כמו כל מייל אחר
    await recordUsage('resend_email', recipients.length)

    return NextResponse.json({
      success: true,
      sent: recipients.length,
      week: digest.weekNumber,
      window: current,
      orders: currentOrders,
      totalIls: Math.round(digest.current.totalIls),
      costPerOrder: digest.current.costPerOrder,
      anomaly: digest.anomaly?.service ?? null,
    })
  } catch (e) {
    console.error('Cost digest endpoint error:', e)
    return NextResponse.json({ error: 'Cost digest failed' }, { status: 500 })
  }
}
