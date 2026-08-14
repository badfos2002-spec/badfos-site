/**
 * משיכות "חי" מה-API של הספקים. ⚠️ צד-שרת בלבד.
 *
 * ── למה הקובץ הזה נפרד מ-lib/system-status.ts ────────────────────────────
 * כאן נקראים טוקנים מ-process.env. המודול הזה מיובא אך ורק מתוך
 * app/api/admin/system-status/route.ts, שרץ על השרת. lib/system-status.ts
 * (המרשם והלוגיקה) נטען גם בדפדפן — ולכן אסור שיהיה בו טוקן. הפרדה זו היא
 * מה שמבטיח שאף ערך סודי לא יגיע ל-bundle של הלקוח.
 *
 * ── כלל אימות ────────────────────────────────────────────────────────────
 * כאן יושבים אך ורק endpoints שאומתו מול התיעוד הרשמי, כולל מבנה התשובה.
 * ספק שלא הצלחתי לאמת לו endpoint — אין לו fetcher, והכרטיס שלו נשאר
 * "נספר" או "ידני". fetcher שמנחש מבנה תשובה גרוע מאין fetcher בכלל.
 *
 * ── כלל כשל ──────────────────────────────────────────────────────────────
 * כל fetcher זורק כשמשהו לא כמצופה. ה-route תופס לכל ספק בנפרד, ולכן ספק
 * אחד שנופל לעולם לא מרוקן את המסך — הכרטיס שלו יורד למקור נתונים אחר
 * ומספר על התקלה.
 */

import type { UsageFigure } from '@/lib/system-status'

/** מה שספק חי מסוגל להחזיר. כל שדה אופציונלי — ספק מספר רק מה שהוא יודע. */
export interface LiveResult {
  plan?: string | null
  monthlyIls?: number | null
  usage?: UsageFigure | null
  /** משפט שמחליף את ה-note הקבוע — כאן מסבירים מה בדיוק נמדד */
  detail?: string | null
}

export type LiveFetcher = () => Promise<LiveResult>

/** תקרת זמן לכל ספק. מסך שנפתח לא אמור לתלות על ספק איטי. */
const FETCH_TIMEOUT_MS = 8_000

/**
 * ⚠️ הנחה: שער המרה דולר→שקל. לא נמשך משום מקום — מספר קבוע.
 * כל סכום דולרי על המסך שגוי בדיוק ביחס שבו השער הזה שגוי.
 * זהו אותו סדר גודל שממנו נגזרו מחירי היחידה ב-lib/cost-digest.
 */
export const USD_TO_ILS = 3.7

/**
 * ⚠️ הנחה: תעריף Nvidia T4 ב-Replicate, $0.000225 לשנייה. זה החומרה שעליה
 * רץ nightmareai/real-esrgan (המודל היחיד שאנחנו מריצים). אם יתווסף מודל
 * על חומרה אחרת — התעריף כאן כבר לא נכון עבורו.
 */
export const REPLICATE_T4_USD_PER_SEC = 0.000225

const DAY_MS = 86_400_000
export const WINDOW_DAYS = 30

/** fetch עם תקרת זמן. AbortSignal.timeout נתמך ב-Node 18+ וב-Edge. */
async function timedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: 'no-store' })
}

/** הודעת שגיאה קצרה שאפשר להראות לבעלים — בלי להדליף את גוף התשובה. */
function httpError(vendor: string, res: Response): Error {
  return new Error(`${vendor} החזיר ${res.status}`)
}

// ── Vercel ───────────────────────────────────────────────────────────────
/**
 * GET https://api.vercel.com/v1/billing/charges?from=&to=
 * מאומת מול https://vercel.com/docs/rest-api/billing/list-focus-billing-charges
 *
 * מחזיר JSONL (שורת JSON לכל חיוב) בפורמט FOCUS v1.3. השדות המובטחים כוללים
 * BilledCost (number), BillingCurrency (enum: "USD"), ChargeCategory ו-ServiceName.
 *
 * ⚠️ מה שלא הצלחתי לאמת: התיעוד קובע שהקריאה זמינה לתפקידי Owner/Member/
 * Developer/Security/Billing/Enterprise Viewer "for the supplied team". חשבון
 * אישי בלי צוות עלול להחזיר 403/404. לא נבדק מול טוקן אמיתי. אם זה מה שיקרה
 * — הכרטיס פשוט יראה את השגיאה ויירד לנתון הידני, כמתוכנן.
 */
async function fetchVercel(): Promise<LiveResult> {
  const token = process.env.VERCEL_API_TOKEN
  if (!token) throw new Error('VERCEL_API_TOKEN לא מוגדר')

  const now = new Date()
  const from = new Date(now.getTime() - WINDOW_DAYS * DAY_MS)

  const params = new URLSearchParams({ from: from.toISOString(), to: now.toISOString() })
  const teamId = process.env.VERCEL_TEAM_ID
  if (teamId) params.set('teamId', teamId)

  const res = await timedFetch(`https://api.vercel.com/v1/billing/charges?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw httpError('Vercel', res)

  // JSONL — שורה אחת לכל חיוב. שורה פגומה נדלגת ולא מפילה את הכרטיס.
  const text = await res.text()
  let usd = 0
  let lines = 0
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const charge = JSON.parse(trimmed) as { BilledCost?: unknown; BillingCurrency?: unknown }
      if (charge.BillingCurrency && charge.BillingCurrency !== 'USD') continue
      const cost = Number(charge.BilledCost)
      if (!Number.isFinite(cost)) continue
      usd += cost
      lines++
    } catch {
      continue
    }
  }

  if (lines === 0) {
    // תשובה ריקה היא תשובה תקפה (חודש בלי חיובים), אבל היא גם מה שנקבל אם
    // הפורמט השתנה. אומרים את זה במפורש במקום להציג ₪0 בטון בטוח.
    return {
      monthlyIls: 0,
      detail: 'Vercel לא החזיר שורות חיוב ל-30 הימים האחרונים — או שאין חיוב, או שאין הרשאה לנתוני החיוב.',
    }
  }

  return {
    monthlyIls: usd * USD_TO_ILS,
    detail: `חיוב בפועל ב-30 הימים האחרונים: $${usd.toFixed(2)} (${lines} שורות חיוב), בהמרה לפי ₪${USD_TO_ILS}/$.`,
  }
}

// ── Resend ───────────────────────────────────────────────────────────────
/**
 * GET https://api.resend.com/api-keys
 * מאומת מול https://resend.com/docs/api-reference/api-keys/list-api-keys
 *
 * הקריאה עצמה לא מעניינת אותנו — מה שמעניין הן כותרות התשובה, שמתועדות ב-
 * https://resend.com/docs/api-reference/rate-limit :
 *   x-resend-monthly-quota — "Your used monthly email sending quota"
 *   x-resend-daily-quota   — "Your used daily email sending quota.
 *                             Only sent to free plan users."
 *
 * שתי מסקנות מדויקות מהתיעוד:
 *  1. הערך הוא ה*מנוצל*, לא הנותר ולא התקרה. לכן הוא נכנס כ-used, והמכסה
 *     עצמה מגיעה מהשדה הידני שהבעלים מזין — לא נחשת.
 *  2. עצם קיומה של הכותרת היומית מעיד שהחשבון במסלול החינמי. זו עובדה
 *     מתועדת, ולכן זה המקום היחיד שבו אנחנו קובעים מסלול בלי שהבעלים הקליד.
 *
 * בחרנו /api-keys ולא שליחת מייל מסיבה ברורה: אסור שמסך סטטוס ישלח מיילים.
 */
async function fetchResend(): Promise<LiveResult> {
  const token = process.env.RESEND_API_KEY
  if (!token) throw new Error('RESEND_API_KEY לא מוגדר')

  const res = await timedFetch('https://api.resend.com/api-keys', {
    headers: {
      Authorization: `Bearer ${token}`,
      // התיעוד דורש User-Agent — בלעדיו הבקשה נדחית ב-403.
      'User-Agent': 'badfos-admin-status/1.0',
    },
  })
  if (!res.ok) throw httpError('Resend', res)

  const monthlyRaw = res.headers.get('x-resend-monthly-quota')
  const dailyRaw = res.headers.get('x-resend-daily-quota')
  const monthlyUsed = Number(monthlyRaw)

  // הכותרת לא הגיעה → אין נתון חי. זורקים, והכרטיס יורד ל"נספר" (המדידה
  // שלנו) במקום להציג אפס שנראה כמו עובדה.
  if (monthlyRaw === null || !Number.isFinite(monthlyUsed)) {
    throw new Error('Resend לא החזיר את כותרת המכסה החודשית')
  }

  const onFreePlan = dailyRaw !== null
  const dailyUsed = Number(dailyRaw)

  return {
    plan: onFreePlan ? 'Free' : null,
    usage: { used: monthlyUsed, quota: null, unit: 'מיילים החודש' },
    detail: onFreePlan
      ? `נשלחו ${monthlyUsed} מיילים החודש${Number.isFinite(dailyUsed) ? ` (${dailyUsed} היום)` : ''}. החשבון במסלול החינמי — Resend שולח את מונה היום רק למסלול הזה.`
      : `נשלחו ${monthlyUsed} מיילים החודש לפי Resend. המסלול לא מזוהה מה-API — אפשר להזין אותו ידנית בהגדרות.`,
  }
}

// ── Replicate ────────────────────────────────────────────────────────────
/**
 * GET https://api.replicate.com/v1/predictions
 * מאומת מול https://sdks.replicate.com/resources/predictions/ ומול
 * ה-OpenAPI של Replicate. מבנה התשובה: { next, previous, results: [...] },
 * 100 חיזויים לעמוד, מהחדש לישן. לכל חיזוי: id, status, source, model,
 * created_at, completed_at ו-metrics.predict_time (שניות בפועל).
 *
 * זה הספק היחיד שנותן לנו את העלות ה*אמיתית* ולא הערכה: סכום predict_time
 * כפול תעריף החומרה. בדיוק המספר שמאמת (או מפריך) את ההנחה של ₪0.01 להרצה
 * שיושבת ב-lib/cost-digest.
 *
 * ⚠️ אין endpoint לחיוב/יתרה ב-Replicate — אומת מול ה-OpenAPI שלהם: הנתיבים
 * היחידים הם account, collections, deployments, hardware, models, predictions,
 * trainings, webhooks. לכן אין כאן יתרת קרדיט.
 *
 * מושכים עמוד אחד בלבד (100 חיזויים). אם החיזוי ה-100 עדיין בתוך החלון של
 * 30 יום — המדידה חלקית, ואומרים את זה במפורש במקום להציג מספר חסר כמלא.
 */
async function fetchReplicate(): Promise<LiveResult> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN לא מוגדר')

  const res = await timedFetch('https://api.replicate.com/v1/predictions', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw httpError('Replicate', res)

  const body = (await res.json()) as {
    results?: Array<{
      created_at?: string
      status?: string
      metrics?: { predict_time?: number } | null
    }>
  }
  if (!Array.isArray(body.results)) {
    throw new Error('Replicate החזיר מבנה לא מוכר')
  }

  const cutoff = Date.now() - WINDOW_DAYS * DAY_MS
  let runs = 0
  let seconds = 0
  let oldestSeen = Infinity

  for (const p of body.results) {
    const createdMs = p.created_at ? Date.parse(p.created_at) : NaN
    if (!Number.isFinite(createdMs)) continue
    oldestSeen = Math.min(oldestSeen, createdMs)
    if (createdMs < cutoff) continue
    runs++
    const t = Number(p.metrics?.predict_time)
    if (Number.isFinite(t) && t > 0) seconds += t
  }

  // כיסוי מלא רק אם העמוד חזר לפני תחילת החלון. אחרת יש עוד חיזויים שלא ראינו.
  const partial = body.results.length >= 100 && oldestSeen > cutoff
  const usd = seconds * REPLICATE_T4_USD_PER_SEC

  return {
    usage: { used: runs, quota: null, unit: `הרצות ב-${WINDOW_DAYS} יום` },
    monthlyIls: usd * USD_TO_ILS,
    detail:
      `${runs} הרצות, ${seconds.toFixed(1)} שניות GPU בפועל ≈ $${usd.toFixed(3)}. ` +
      (partial
        ? '⚠️ נמדדו 100 ההרצות האחרונות בלבד — יש הרצות נוספות בחלון שלא נספרו כאן.'
        : 'תשלום לפי שניות בפועל, ללא מנוי.'),
  }
}

// ── Make ─────────────────────────────────────────────────────────────────
/**
 * שתי קריאות, שתיהן מאומתות מול https://developers.make.com/api-documentation:
 *
 *  1. GET {zone}/api/v2/organizations
 *     → { organizations: [{ id, name, license, zone, nextReset, ... }], pg }
 *  2. GET {zone}/api/v2/organizations/{id}/usage
 *     → { data: [{ date, operations, dataTransfer, centicredits }] }  (30 יום אחרונים)
 *
 * אימות: Authorization: Token <api-token>  (לא Bearer — כך בתיעוד).
 *
 * זה הכרטיס החי הכי שימושי: Make מחייב לפי operations, וכאן רואים כמה
 * נוצלו בפועל ב-30 יום — בדיוק "איפה אני עומד".
 *
 * ⚠️ שני דברים שלא הצלחתי לאמת ולכן מטופלים בזהירות:
 *  • מבנה ה-license: הסכימה הרשמית מגדירה אותו כ-additionalProperties בלבד,
 *    כלומר השדות הפנימיים אינם מתועדים. לכן license.operations נקרא כאן
 *    *אופורטוניסטית* — אם הוא מספר חיובי הוא משמש כמכסה, ואם לא, המכסה
 *    נשארת ריקה ומגיעה מהשדה הידני. לא מניחים שהוא קיים.
 *  • ה-zone: אין דרך תכנותית לגלות אותו. ברירת המחדל eu2 ניתנת לעקיפה
 *    ב-MAKE_API_ZONE. zone שגוי ייכשל באימות ולא יחזיר נתון של מישהו אחר.
 */
async function fetchMake(): Promise<LiveResult> {
  const token = process.env.MAKE_API_TOKEN
  if (!token) throw new Error('MAKE_API_TOKEN לא מוגדר')

  const zone = (process.env.MAKE_API_ZONE || 'eu2').replace(/[^a-z0-9]/gi, '')
  const base = `https://${zone}.make.com/api/v2`
  const headers = { Authorization: `Token ${token}` }

  const orgRes = await timedFetch(`${base}/organizations`, { headers })
  if (!orgRes.ok) throw httpError(`Make (zone ${zone})`, orgRes)

  const orgBody = (await orgRes.json()) as {
    organizations?: Array<{ id?: number | string; name?: string; license?: Record<string, unknown> }>
  }
  const orgs = Array.isArray(orgBody.organizations) ? orgBody.organizations : []
  if (orgs.length === 0) throw new Error('Make לא החזיר אף ארגון')

  const wantedId = process.env.MAKE_ORG_ID
  const org = (wantedId && orgs.find((o) => String(o.id) === String(wantedId))) || orgs[0]
  if (org?.id === undefined || org.id === null) throw new Error('Make החזיר ארגון בלי מזהה')

  const usageRes = await timedFetch(`${base}/organizations/${encodeURIComponent(String(org.id))}/usage`, {
    headers,
  })
  if (!usageRes.ok) throw httpError('Make (usage)', usageRes)

  const usageBody = (await usageRes.json()) as {
    data?: Array<{ operations?: number; dataTransfer?: number }>
  }
  if (!Array.isArray(usageBody.data)) throw new Error('Make החזיר מבנה שימוש לא מוכר')

  let operations = 0
  let transferBytes = 0
  for (const day of usageBody.data) {
    const ops = Number(day.operations)
    if (Number.isFinite(ops)) operations += ops
    const bytes = Number(day.dataTransfer)
    if (Number.isFinite(bytes)) transferBytes += bytes
  }

  // קריאה אופורטוניסטית של המכסה — ראה האזהרה למעלה.
  const licensedOps = Number(org.license?.operations)
  const quota = Number.isFinite(licensedOps) && licensedOps > 0 ? licensedOps : null

  const transferMb = transferBytes / (1024 * 1024)
  return {
    plan: typeof org.name === 'string' && org.name ? org.name : null,
    usage: { used: operations, quota, unit: `פעולות ב-${WINDOW_DAYS} יום` },
    detail:
      `${operations.toLocaleString('he-IL')} פעולות ו-${transferMb.toFixed(1)}MB תעבורה ב-30 הימים האחרונים` +
      (quota === null
        ? '. Make לא החזיר את גובה המכסה — אפשר להזין אותה ידנית בהגדרות כדי לקבל פס התקדמות.'
        : '.'),
  }
}

// ── OpenAI ───────────────────────────────────────────────────────────────
/**
 * GET https://api.openai.com/v1/organization/costs?start_time=<unix>&bucket_width=1d
 *
 * מבנה מתועד: { object: "page", data: [ { object: "bucket", start_time, end_time,
 * results: [ { object: "organization.costs.result", amount: { value, currency }, ... } ] } ],
 * has_more, next_page }.
 *
 * ⚠️ אימות חלקי — לומר את זה בפה מלא: את עמוד התיעוד עצמו לא הצלחתי למשוך
 * ישירות (OpenAI חוסמת את הסביבה הזו). המבנה אושר משני מקורות בלתי תלויים
 * (משיכה של עמוד התיעוד הרשמי developers.openai.com דרך תהליך נפרד, וחיפוש
 * שאישר את עוטף ה-page). לכן ה-parser כאן מקפיד: מבנה שאינו מזוהה זורק
 * שגיאה במקום להציג ₪0 בטון בטוח. אפס אמיתי (חודש בלי שימוש) כן יוצג כאפס.
 *
 * ⚠️ נדרש מפתח אדמין (sk-admin-...) ולא מפתח הפרויקט הרגיל. מפתח רגיל יחזיר
 * 401 בקריאה הזו — ולכן משתנה סביבה נפרד, ולא שימוש חוזר ב-OPENAI_API_KEY.
 */
async function fetchOpenAI(): Promise<LiveResult> {
  const token = process.env.OPENAI_ADMIN_KEY
  if (!token) throw new Error('OPENAI_ADMIN_KEY לא מוגדר')

  const startTime = Math.floor((Date.now() - WINDOW_DAYS * DAY_MS) / 1000)
  const params = new URLSearchParams({
    start_time: String(startTime),
    bucket_width: '1d',
    limit: '31',
  })

  const res = await timedFetch(`https://api.openai.com/v1/organization/costs?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw httpError('OpenAI', res)

  const body = (await res.json()) as {
    data?: Array<{ results?: Array<{ amount?: { value?: number; currency?: string } }> }>
  }
  if (!Array.isArray(body.data)) throw new Error('OpenAI החזיר מבנה לא מוכר')

  let usd = 0
  let recognisedBuckets = 0
  for (const bucket of body.data) {
    if (!Array.isArray(bucket?.results)) continue
    recognisedBuckets++
    for (const r of bucket.results) {
      const value = Number(r?.amount?.value)
      if (Number.isFinite(value)) usd += value
    }
  }
  // אף דלי לא הכיל results → זה לא "אפס", זה מבנה שלא זיהינו.
  if (recognisedBuckets === 0 && body.data.length > 0) {
    throw new Error('OpenAI החזיר דליים בלי results — מבנה לא מוכר')
  }

  return {
    monthlyIls: usd * USD_TO_ILS,
    detail: `חיוב בפועל ב-30 הימים האחרונים: $${usd.toFixed(2)} (בהמרה לפי ₪${USD_TO_ILS}/$). תשלום לפי שימוש, ללא מנוי.`,
  }
}

// ── המרשם של המשיכות החיות ───────────────────────────────────────────────
/**
 * מפתח = id של ספק ב-PROVIDER_REGISTRY. ספק שאין לו רשומה כאן פשוט לא
 * נמשך חי — וזה מצב תקין לחלוטין, לא באג.
 *
 * ── ספקים שנבדקו ונפסלו במכוון (אין fetcher) ─────────────────────────────
 *  • ManyChat  — אין שום endpoint לשימוש/מכסה/חיוב ב-API. מונה אנשי הקשר,
 *                שהוא מה שקובע את המחיר, זמין בממשק בלבד.
 *  • Firebase  — אין REST להחזרת עלות. ספירות קריאה/כתיבה אפשריות רק דרך
 *                Cloud Monitoring, שדורש הרשאת IAM נוספת לחשבון השירות ושמות
 *                מטריקות שלא הצלחתי לאמת. עלות בדולרים — רק דרך ייצוא
 *                ל-BigQuery, בפיגור של שעות עד ימים.
 *  • Google Ads — הקריאה קיימת (googleAds:searchStream עם GAQL), אבל דורשת
 *                developer token באישור נפרד וחשבון שירות שמשויך ידנית בממשק
 *                Ads. לא משהו שנדלק מהוספת משתנה סביבה.
 *  • Google Places — אין endpoint לצריכה. רק Cloud Monitoring, ושם לא הצלחתי
 *                לאמת את שם המטריקה של Places API (New).
 *  • Telegram / Meta / Analytics — בחינם בנפחים שלנו, אין מה למשוך.
 *  • Grow, דומיין — אין API ציבורי.
 */
export const LIVE_FETCHERS: Record<string, LiveFetcher> = {
  vercel: fetchVercel,
  resend: fetchResend,
  replicate: fetchReplicate,
  make: fetchMake,
  openai: fetchOpenAI,
}
