/**
 * דוח עלויות שבועי — הליבה (חישוב טהור, ללא Firestore).
 *
 * המדד היחיד שמעניין: כמה עולה לי להוציא הזמנה אחת מהדלת.
 * כל מה שכאן הוא פונקציות טהורות כדי שאפשר יהיה לבדוק אותן בלי Firebase;
 * ה-I/O כולו יושב ב-app/api/cost-digest/route.ts.
 */

export const JERUSALEM_TZ = 'Asia/Jerusalem'

/** ממוצע שבועות בחודש (52/12) — לפי זה נגזר החלק השבועי של מנוי חודשי. */
export const WEEKS_PER_MONTH = 4.345

// ── שירותים בתשלום שאנחנו מודדים ─────────────────────────────────────────
// הוספת שירות שלישי = שורה כאן + שורה ב-SERVICE_LABELS + שורה ב-UNIT_COST_ILS.
export type UsageService = 'replicate_upscale' | 'resend_email'

export const SERVICE_LABELS: Record<string, string> = {
  replicate_upscale: 'upscale',
  resend_email: 'מיילים',
}

/**
 * ⚠️ מחירי יחידה — ההנחות היחידות בדוח. מחיר שגוי כאן = דוח שמשקר.
 *
 * replicate_upscale — nightmareai/real-esrgan רץ על Nvidia T4 ב-Replicate,
 *   $0.000225 לשנייה. ריצת 4x טיפוסית (כולל boot) ≈ 12 שניות → ~$0.0027.
 *   בשער ₪3.70/$ ≈ ₪0.010 לחיזוי.
 *   ⚠️ הנחה: משך הריצה. לא נמדד בפועל — Replicate מחזיר predict_time
 *   ב-webhook, ואם יתברר שהריצה ארוכה/קצרה יותר יש לעדכן את המספר כאן.
 *
 * resend_email — מסלול Resend Pro: $20 לחודש עבור 50,000 מיילים
 *   → $0.0004 למייל ≈ ₪0.0015.
 *   ⚠️ הנחה: שאנחנו במסלול Pro. במסלול החינמי (3,000 מיילים בחודש)
 *   העלות השולית האמיתית היא ₪0, וה-$20 בכלל לא קיים.
 *
 * שימו לב: המחיר שהופעל נשמר על כל רשומת שימוש (unitCostIls), ולכן שינוי
 * המספר כאן משפיע רק על מדידות עתידיות — היסטוריה לא משתנה רטרואקטיבית.
 */
export const UNIT_COST_ILS: Record<UsageService, number> = {
  replicate_upscale: 0.01,
  resend_email: 0.0015,
}

// ── ספי חריגה ────────────────────────────────────────────────────────────
/**
 * שלושה תנאים חייבים להתקיים יחד כדי להתריע. המטרה: לא לצעוק "זאב" בנפחים
 * נמוכים, שבהם יחס לבדו חסר משמעות (1→3 קריאות זה פי 3 אבל זה לא סיפור).
 *
 *  1. רצפה מוחלטת: בשבוע הגדול מבין השניים היו לפחות 20 קריאות.
 *  2. הפרש מוחלט: השינוי הוא לפחות 15 קריאות.
 *  3. יחס: פי 2 לפחות (לכל כיוון).
 *
 * דוגמאות: 15→47 מתריע (47≥20, Δ32≥15, ×3.1). 1→3 שותק (רצפה). 20→24 שותק
 * (Δ4). 40→80 מתריע. 0→25 מתריע (שירות חדש שמתחיל לצרוך תקציב).
 */
export const ANOMALY_MIN_CALLS = 20
export const ANOMALY_MIN_DELTA = 15
export const ANOMALY_MIN_RATIO = 2

// ── טיפוסים ──────────────────────────────────────────────────────────────

/** מסמך שימוש יומי אחד כפי שהוא נשמר ב-Firestore (אוסף usage). */
export interface UsageDoc {
  service: string
  /** מפתח יום בזמן ישראל, YYYY-MM-DD */
  date: string
  calls: number
  units: number
  costIls: number
}

export interface ServiceTotals {
  service: string
  calls: number
  units: number
  costIls: number
}

export interface WeekTotals {
  /** עלות משתנה בלבד (לפי שימוש) */
  variableIls: number
  /** החלק השבועי של המנויים הקבועים */
  fixedIls: number
  /** variableIls + fixedIls */
  totalIls: number
  orders: number
  /** null כשאין הזמנות — לא מחלקים באפס */
  costPerOrder: number | null
  byService: Record<string, ServiceTotals>
}

export interface Anomaly {
  service: string
  label: string
  current: number
  previous: number
  /** null כשהשבוע הקודם היה 0 — אין יחס להציג */
  ratio: number | null
  direction: 'up' | 'down'
}

export interface Digest {
  weekNumber: number
  current: WeekTotals
  /** null בהרצה הראשונה — אין שבוע קודם להשוות אליו */
  previous: WeekTotals | null
  /** שינוי באחוזים בעלות-להזמנה. null כשאין בסיס להשוואה */
  deltaPercent: number | null
  deltaDirection: 'up' | 'down' | 'flat' | null
  anomaly: Anomaly | null
  /** true כשיש נתוני שימוש ואף שירות לא חרג */
  nothingChanged: boolean
}

export interface Subscription {
  name: string
  monthlyIls: number
  active: boolean
}

export interface CostSettings {
  subscriptions: Subscription[]
  recipients: string[]
}

// ── תאריכים בזמן ישראל ───────────────────────────────────────────────────

/** היסט אזור-הזמן במילישניות עבור רגע נתון (מטפל בשעון קיץ). */
function tzOffsetMs(date: Date, timeZone: string): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const local = new Date(date.toLocaleString('en-US', { timeZone }))
  return local.getTime() - utc.getTime()
}

/** מפתח יום YYYY-MM-DD לפי שעון ישראל. */
export function jerusalemDateKey(date: Date = new Date()): string {
  // en-CA נותן בדיוק YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: JERUSALEM_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** חצות (00:00) בשעון ישראל של מפתח היום הנתון, כ-Date ב-UTC. */
export function jerusalemMidnight(dateKey: string): Date {
  const asUtc = new Date(`${dateKey}T00:00:00Z`)
  // מעברי שעון בישראל קורים ב-02:00, אז חצות אף פעם לא נופל על המעבר עצמו
  return new Date(asUtc.getTime() - tzOffsetMs(asUtc, JERUSALEM_TZ))
}

/** הזזת מפתח יום ב-n ימים (קדימה או אחורה). */
export function shiftDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`) // צהריים — חסין מפני שעון קיץ
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** מספר שבוע ISO-8601 (שבוע 1 = השבוע שמכיל את 4 בינואר). */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7 // ראשון=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum) // יום חמישי של אותו שבוע
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * חלונות ההשוואה: שני חלונות של 7 ימים *מלאים* שמסתיימים אתמול.
 * היום הנוכחי לא נכלל — הוא חלקי (ה-cron רץ בבוקר) והיה מטה את התמונה.
 */
export function weekWindows(today: string): {
  current: { from: string; to: string }
  previous: { from: string; to: string }
} {
  return {
    current: { from: shiftDateKey(today, -7), to: shiftDateKey(today, -1) },
    previous: { from: shiftDateKey(today, -14), to: shiftDateKey(today, -8) },
  }
}

// ── צבירה ────────────────────────────────────────────────────────────────

/** סכימת המנויים הפעילים → ₪ לחודש. */
export function activeMonthlyIls(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((s) => s.active && Number.isFinite(s.monthlyIls) && s.monthlyIls > 0)
    .reduce((sum, s) => sum + s.monthlyIls, 0)
}

/** צבירת מסמכי שימוש יומיים לתוך טווח תאריכים (כולל שני הקצוות). */
export function aggregateUsage(
  docs: UsageDoc[],
  from: string,
  to: string
): Record<string, ServiceTotals> {
  const byService: Record<string, ServiceTotals> = {}
  for (const doc of docs) {
    if (!doc || typeof doc.date !== 'string') continue
    if (doc.date < from || doc.date > to) continue
    const key = doc.service
    if (!key) continue
    const bucket = byService[key] || (byService[key] = { service: key, calls: 0, units: 0, costIls: 0 })
    bucket.calls += Number(doc.calls) || 0
    bucket.units += Number(doc.units) || 0
    bucket.costIls += Number(doc.costIls) || 0
  }
  return byService
}

export function buildWeekTotals(
  byService: Record<string, ServiceTotals>,
  fixedMonthlyIls: number,
  orders: number
): WeekTotals {
  const variableIls = Object.values(byService).reduce((sum, s) => sum + s.costIls, 0)
  const fixedIls = fixedMonthlyIls / WEEKS_PER_MONTH
  const totalIls = variableIls + fixedIls
  return {
    variableIls,
    fixedIls,
    totalIls,
    orders,
    // אפס הזמנות → אין "עלות להזמנה". לא מחלקים באפס ולא ממציאים אינסוף.
    costPerOrder: orders > 0 ? totalIls / orders : null,
    byService,
  }
}

/**
 * מאתר את השירות שזז הכי חזק. מחזיר לכל היותר חריגה אחת — הגדולה ביותר
 * בהפרש מוחלט. הדוח מציג שורה אחת, לא טבלה.
 */
export function detectAnomaly(
  current: Record<string, ServiceTotals>,
  previous: Record<string, ServiceTotals>
): Anomaly | null {
  const services = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)]))
  let best: Anomaly | null = null
  let bestDelta = 0

  for (const service of services) {
    const curr = current[service]?.calls ?? 0
    const prev = previous[service]?.calls ?? 0
    const delta = curr - prev
    const absDelta = Math.abs(delta)
    if (absDelta === 0) continue

    const peak = Math.max(curr, prev)
    if (peak < ANOMALY_MIN_CALLS) continue
    if (absDelta < ANOMALY_MIN_DELTA) continue

    const low = Math.min(curr, prev)
    // low === 0 → יחס אינסופי, עובר את הסף בהגדרה
    if (low > 0 && peak / low < ANOMALY_MIN_RATIO) continue

    if (absDelta <= bestDelta) continue
    bestDelta = absDelta
    best = {
      service,
      label: SERVICE_LABELS[service] || service,
      current: curr,
      previous: prev,
      ratio: prev > 0 ? curr / prev : null,
      direction: delta > 0 ? 'up' : 'down',
    }
  }

  return best
}

export interface DigestInput {
  weekNumber: number
  currentUsage: Record<string, ServiceTotals>
  previousUsage: Record<string, ServiceTotals> | null
  currentOrders: number
  previousOrders: number
  fixedMonthlyIls: number
}

export function computeDigest(input: DigestInput): Digest {
  const current = buildWeekTotals(input.currentUsage, input.fixedMonthlyIls, input.currentOrders)
  // הערה: לשבוע הקודם מוחל אותו סל מנויים כמו היום — אנחנו לא שומרים
  // היסטוריית מנויים. אם הבעלים שינה מנוי באמצע, ההשוואה היא של החלק המשתנה.
  const previous = input.previousUsage
    ? buildWeekTotals(input.previousUsage, input.fixedMonthlyIls, input.previousOrders)
    : null

  let deltaPercent: number | null = null
  let deltaDirection: Digest['deltaDirection'] = null
  if (previous && previous.costPerOrder !== null && current.costPerOrder !== null) {
    const diff = current.costPerOrder - previous.costPerOrder
    deltaPercent = previous.costPerOrder > 0 ? (diff / previous.costPerOrder) * 100 : null
    if (deltaPercent !== null) {
      deltaDirection = Math.abs(deltaPercent) < 1 ? 'flat' : deltaPercent > 0 ? 'up' : 'down'
    }
  }

  const anomaly = input.previousUsage ? detectAnomaly(input.currentUsage, input.previousUsage) : null
  const hasAnyUsage =
    Object.keys(input.currentUsage).length > 0 || Object.keys(input.previousUsage || {}).length > 0

  return {
    weekNumber: input.weekNumber,
    current,
    previous,
    deltaPercent,
    deltaDirection,
    anomaly,
    nothingChanged: hasAnyUsage && anomaly === null,
  }
}

// ── הגדרות הבעלים ────────────────────────────────────────────────────────
/**
 * אוסף נפרד מ-/settings בכוונה: settings ציבורי לקריאה (firestore.rules),
 * וכאן יושבים מבנה העלויות של העסק וכתובות המייל הפרטיות של הבעלים.
 * adminSettings פתוח לקריאה/כתיבה לאדמין בלבד.
 */
export const COST_SETTINGS_COLLECTION = 'adminSettings'
export const COST_SETTINGS_DOC = 'costDigest'


/** אותה בדיקה כמו lib/utils.isValidEmail — משוכפלת כאן כדי לשמור על מודול טהור. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmailLike(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_RE.test(value.trim())
}

/** קריאה סלחנית של מסמך ההגדרות — כל שדה פגום פשוט נזרק. */
export function parseCostSettings(raw: unknown): CostSettings {
  const data = (raw || {}) as Record<string, unknown>
  const rawSubs = Array.isArray(data.subscriptions) ? data.subscriptions : []
  const subscriptions: Subscription[] = []
  for (const item of rawSubs) {
    const s = (item || {}) as Record<string, unknown>
    const name = typeof s.name === 'string' ? s.name.trim() : ''
    const monthlyIls = Number(s.monthlyIls)
    if (!name || !Number.isFinite(monthlyIls) || monthlyIls < 0) continue
    subscriptions.push({ name, monthlyIls, active: s.active !== false })
  }
  return { subscriptions, recipients: digestRecipients(data) }
}

/**
 * הנמענים לדוח — לכל היותר שניים, רק כתובות תקינות, ללא כפילויות.
 * ריק = ה-cron מדלג ומסביר ללוג. אין שום כתובת מקודדת בקוד.
 */
export function digestRecipients(raw: unknown): string[] {
  const list = (raw as { recipients?: unknown })?.recipients
  if (!Array.isArray(list)) return []
  const out: string[] = []
  for (const value of list) {
    if (!isEmailLike(value)) continue
    const email = value.trim().toLowerCase()
    if (out.includes(email)) continue
    out.push(email)
    if (out.length === 2) break
  }
  return out
}

// ── עיצוב מספרים ─────────────────────────────────────────────────────────

/** ₪ שלמים — לסכומים הגדולים (עלות מערכות). */
export function ils(amount: number): string {
  return `₪${Math.round(amount).toLocaleString('he-IL')}`
}

/** ₪ עם ספרה אחרי הנקודה — לעלות להזמנה. */
export function ils1(amount: number): string {
  return `₪${amount.toFixed(1)}`
}
