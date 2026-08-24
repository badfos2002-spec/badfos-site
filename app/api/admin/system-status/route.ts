/**
 * GET /api/admin/system-status — הנתונים למסך "איפה אני עומד".
 *
 * ── למה זה חייב להיות route ולא קריאה מהדפדפן ────────────────────────────
 * הטוקנים של הספקים הם סודות. הם נקראים כאן בלבד, בצד השרת, ואף פעם לא
 * מגיעים לתשובה. התשובה מכילה אך ורק מספרים מעובדים ושמות משתני סביבה
 * (שם, לא ערך) כדי שהמסך יוכל להגיד "אפשר לשדרג את הכרטיס הזה ל'חי'".
 *
 * ── בידוד כשלים ──────────────────────────────────────────────────────────
 * כל fetcher רץ ב-Promise.allSettled משלו. ספק שנופל, מחזיר 500, או תולה עד
 * ה-timeout — מוריד את הכרטיס *שלו* ל"נספר"/"ידני" עם הודעת שגיאה גלויה,
 * ולא נוגע בשאר המסך. גם קריסה של Firestore לא מרוקנת את המסך: המרשם עדיין
 * מייצר כרטיס לכל מערכת.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth, adminSdkUnavailable } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import {
  aggregateUsage,
  activeMonthlyIls,
  jerusalemDateKey,
  jerusalemMidnight,
  parseCostSettings,
  shiftDateKey,
  COST_SETTINGS_COLLECTION,
  COST_SETTINGS_DOC,
  type ServiceTotals,
  type Subscription,
  type UsageDoc,
} from '@/lib/cost-digest'
import { USAGE_COLLECTION } from '@/lib/usage-tracking'
import {
  buildCards,
  buildTotals,
  type LiveOutcome,
  type StatusPayload,
} from '@/lib/system-status'
import { LIVE_FETCHERS, WINDOW_DAYS } from '@/lib/system-status-fetchers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** אותה הגדרת "הזמנה שיצאה מהדלת" כמו בדוח השבועי ובמסך האנליטיקה. */
const PAID_STATUSES = ['paid', 'in_production', 'shipped', 'completed']

/**
 * מטמון בזיכרון. פתיחת המסך לא אמורה להרעיש חמישה ספקים בכל רענון דף.
 * חמש דקות: מספיק טרי כדי להיות שימושי, מספיק ארוך כדי שרענון כפול יהיה חינם.
 * ⚠️ על Vercel לכל instance יש מטמון משלו — יכול לצאת שתי משיכות אחרי scale.
 * זה מקובל כאן: זה מסך אדמין עם משתמש אחד, וכפתור הרענון תמיד עוקף.
 */
const CACHE_TTL_MS = 5 * 60 * 1000
let cache: { payload: StatusPayload; at: number } | null = null

export async function GET(request: NextRequest) {
  // ── אימות: Bearer <idToken> + זהות אדמין (זהה ל-download-design) ───────
  const authHeader = request.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const idToken = authHeader.slice('Bearer '.length).trim()
  if (!idToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  let decoded
  try {
    decoded = await adminAuth.verifyIdToken(idToken)
  } catch {
    // A dead Admin SDK is not a bad token. verifyIdToken() on an undefined
    // adminAuth throws a TypeError, which landed here and answered 401 —
    // telling the logged-in owner to re-authenticate for a problem no login
    // can fix, and telling any monitoring that someone was poking at admin
    // auth. Fail closed either way; just say which failure it is.
    const unavailable = adminSdkUnavailable()
    if (unavailable) {
      console.error(
        '[ADMIN_SDK_UNAVAILABLE] system-status: the admin token could not be verified because the Firebase ' +
        'Admin SDK is not initialised — this is an outage, not a rejected login. Reason:',
        unavailable
      )
      return NextResponse.json({ error: 'admin_sdk_unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (decoded.email !== 'badfos2002@gmail.com' || decoded.email_verified !== true) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const refresh = request.nextUrl.searchParams.get('refresh') === '1'
  if (!refresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...cache.payload, cached: true })
  }

  try {
    const payload = await buildStatus()
    cache = { payload, at: Date.now() }
    return NextResponse.json(payload)
  } catch (err) {
    console.error('system-status error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

// ── בניית התמונה ─────────────────────────────────────────────────────────

async function buildStatus(): Promise<StatusPayload> {
  const today = jerusalemDateKey()
  const from = shiftDateKey(today, -WINDOW_DAYS)

  // Firestore והספקים החיים במקביל — אין ביניהם תלות.
  const [subscriptions, counted, orders30d, live] = await Promise.all([
    readSettings(),
    readUsage(from, today),
    countPaidOrders(from, today),
    runLiveFetchers(),
  ])

  // הקבוע מגיע מהמנויים הפעילים (אותה פונקציה כמו בדוח השבועי), והמשתנה
  // מהמדידה שלנו ב-30 יום.
  const fixedMonthlyIls = activeMonthlyIls(subscriptions)
  const variable30dIls = Object.values(counted).reduce((sum, s) => sum + s.costIls, 0)

  return {
    cards: buildCards({ subscriptions, counted, live }),
    totals: buildTotals(fixedMonthlyIls, variable30dIls, orders30d),
    fetchedAt: new Date().toISOString(),
    cached: false,
  }
}

// ── קריאות Firestore, כל אחת בולעת את השגיאה שלה ─────────────────────────

async function readSettings(): Promise<Subscription[]> {
  try {
    const snap = await adminDb.collection(COST_SETTINGS_COLLECTION).doc(COST_SETTINGS_DOC).get()
    return parseCostSettings(snap.exists ? snap.data() : {}).subscriptions
  } catch (e) {
    console.error('system-status: settings read failed:', e)
    return []
  }
}

async function readUsage(from: string, to: string): Promise<Record<string, ServiceTotals>> {
  try {
    const snap = await adminDb
      .collection(USAGE_COLLECTION)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .get()
    return aggregateUsage(
      snap.docs.map((d) => d.data() as UsageDoc),
      from,
      to
    )
  } catch (e) {
    console.error('system-status: usage read failed:', e)
    return {}
  }
}

async function countPaidOrders(from: string, to: string): Promise<number> {
  try {
    const start = jerusalemMidnight(from)
    const end = jerusalemMidnight(shiftDateKey(to, 1))
    const snap = await adminDb
      .collection('orders')
      .where('createdAt', '>=', Timestamp.fromDate(start))
      .where('createdAt', '<', Timestamp.fromDate(end))
      .get()
    // סינון סטטוס בזיכרון — בדיוק כמו בדוח השבועי, כדי לא לדרוש אינדקס מורכב.
    return snap.docs.filter((d) => PAID_STATUSES.includes(d.data().status)).length
  } catch (e) {
    console.error('system-status: orders read failed:', e)
    return 0
  }
}

// ── משיכות חיות, מבודדות ─────────────────────────────────────────────────

/**
 * כל הספקים במקביל, כל אחד עטוף. allSettled ולא all — ספק שדוחה חייב
 * להשאיר את השאר בחיים. שום דבר כאן לא יכול לזרוק החוצה.
 */
async function runLiveFetchers(): Promise<Record<string, LiveOutcome>> {
  const ids = Object.keys(LIVE_FETCHERS)
  const settled = await Promise.allSettled(ids.map((id) => LIVE_FETCHERS[id]()))

  const out: Record<string, LiveOutcome> = {}
  ids.forEach((id, i) => {
    const result = settled[i]
    if (result.status === 'fulfilled') {
      out[id] = { ok: true, ...result.value }
      return
    }
    const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
    // "לא מוגדר" מגיע מהבדיקה בראש כל fetcher — זה מצב תקין, לא תקלה.
    const tokenMissing = message.includes('לא מוגדר')
    out[id] = {
      ok: false,
      // הודעת השגיאה נוצרת תמיד אצלנו ולעולם לא מכילה את גוף התשובה של
      // הספק — כדי שטוקן או מידע רגיש לא יזלגו למסך דרך הודעת שגיאה.
      error: tokenMissing ? '' : message,
      tokenMissing,
    }
  })
  return out
}
