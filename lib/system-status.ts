/**
 * "איפה אני עומד" — מרשם המערכות בתשלום ולוגיקת הסטטוס. מודול טהור.
 *
 * ── הכלל היחיד שלא נשבר: מספר לא משקר ────────────────────────────────────
 * לכל מספר על המסך יש מקור (provenance) גלוי:
 *   • live    🟢 חי    — נמשך עכשיו מה-API של הספק
 *   • counted 🔵 נספר  — נספר על ידי המדידה שלנו (lib/usage-tracking).
 *                        מדויק למה שהאתר עושה, עיוור לכל שימוש מחוץ לאתר.
 *   • manual  ⚪ ידני  — הבעלים הקליד את זה ב-/admin/costs.
 *
 * ספק בלי מקור נתונים עדיין מקבל כרטיס. השמטת מערכת גרועה מהצגתה כ"ידני",
 * כי כרטיס חסר נקרא כמו "זה לא עולה כלום".
 *
 * ── הוספת ספק חדש ────────────────────────────────────────────────────────
 * שורה אחת ב-PROVIDER_REGISTRY כאן (+ שורה אופציונלית ב-lib/system-status-
 * fetchers.ts אם יש API אמיתי שמחזיר שימוש). זה הכל — אין refactor.
 *
 * ── למה המודול הזה טהור ──────────────────────────────────────────────────
 * הוא נטען גם בדפדפן (מסך /admin/costs צריך את המרשם ל-select ואת התוויות).
 * לכן אסור שיהיה כאן process.env, טוקן, או קריאת רשת. ה-fetchers יושבים
 * במודול נפרד שנטען אך ורק מתוך ה-API route.
 */

import type { ServiceTotals, Subscription, UsageService } from '@/lib/cost-digest'

// ── מקור הנתון ───────────────────────────────────────────────────────────

export type Provenance = 'live' | 'counted' | 'manual'

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  live: 'חי',
  counted: 'נספר',
  manual: 'ידני',
}

/** הסבר בעברית למה המשמעות של התג — מוצג כ-tooltip ובמקרא. */
export const PROVENANCE_MEANING: Record<Provenance, string> = {
  live: 'נמשך עכשיו ישירות מה-API של הספק',
  counted: 'נספר על ידי המדידה שלנו — מדויק למה שהאתר עושה, עיוור לשימוש מחוץ לאתר',
  manual: 'הוקלד ידנית בהגדרות. לא מתעדכן מעצמו',
}

// ── סטטוס ────────────────────────────────────────────────────────────────

export type StatusLevel = 'over' | 'approaching' | 'ok' | 'unknown'

/** מעל 75% מהמכסה — "מתקרב". מעל 100% — "חריגה". */
export const APPROACHING_RATIO = 0.75
export const OVER_RATIO = 1

export const STATUS_LABEL: Record<StatusLevel, string> = {
  over: 'חריגה',
  approaching: 'מתקרב למכסה',
  ok: 'תקין',
  unknown: 'אין נתון',
}

// ── טיפוסים ──────────────────────────────────────────────────────────────

export interface UsageFigure {
  used: number
  /** null = אין מכסה ידועה → אין פס התקדמות, רק המספר */
  quota: number | null
  /** תווית היחידה בעברית, למשל "מיילים החודש" */
  unit: string
}

/** כרטיס מוכן להצגה. זה בדיוק מה שה-API מחזיר ללקוח. */
export interface ProviderCard {
  id: string
  name: string
  /** קישור לעמוד החיוב/הקונסולה של הספק. null = לא ידוע/לא מאושר */
  consoleUrl: string | null
  provenance: Provenance
  status: StatusLevel
  plan: string | null
  /** ₪ לחודש. null = לא הוזן ולא ידוע */
  monthlyIls: number | null
  usage: UsageFigure | null
  /** משפט אחד בעברית: מה רואים כאן, וממה זה עיוור */
  note: string | null
  /** מלא רק כשה-fetcher החי נכשל — הכרטיס ירד למקור אחר ואומר את זה */
  error: string | null
  /** true כשיש fetcher אבל הטוקן לא מוגדר — ניתן לשדרג ל"חי" */
  upgradableEnvVar: string | null
}

export interface StatusTotals {
  /** סכום המנויים החודשיים הפעילים (ידני) */
  fixedMonthlyIls: number
  /** עלות משתנה שנמדדה ב-30 הימים האחרונים */
  variable30dIls: number
  /** fixedMonthlyIls + variable30dIls */
  totalMonthlyIls: number
  /** הזמנות ששולמו ב-30 הימים האחרונים */
  orders30d: number
  /** null כשאין הזמנות — לא מחלקים באפס */
  costPerOrder: number | null
}

export interface StatusPayload {
  cards: ProviderCard[]
  totals: StatusTotals
  /** ISO — מתי הנתונים נמשכו בפועל (לא מתי המסך נפתח) */
  fetchedAt: string
  /** true כשהתשובה הוגשה מהמטמון ולא נמשכה מחדש */
  cached: boolean
}

// ── המרשם ────────────────────────────────────────────────────────────────

export interface ProviderMeta {
  id: string
  /** שם התצוגה בעברית — כולל בסוגריים מה זה עושה לעסק */
  name: string
  consoleUrl: string
  /** משפט קבוע שמסביר מה הכרטיס מראה וממה הוא עיוור */
  note: string
  /**
   * שירותי המדידה הפנימית שמזינים את מצב "נספר". ריק = אין מדידה פנימית.
   * חייבים להתאים ל-UsageService ב-lib/cost-digest.ts.
   */
  countedServices?: UsageService[]
  /** תווית היחידה עבור המצב "נספר" */
  countedUnit?: string
  /**
   * משתנה הסביבה שיהפוך את הכרטיס ל"חי". קיים רק לספקים שיש להם fetcher
   * מאומת ב-lib/system-status-fetchers.ts.
   */
  liveEnvVar?: string
}

/**
 * כל מערכת שהעסק משלם עליה או תלוי בה. סדר ההצגה נקבע בזמן ריצה לפי
 * דחיפות (sortCards) — הסדר כאן הוא רק סדר ההצהרה.
 *
 * ⚠️ הערה על מכסות: אין כאן שום מכסה "ברירת מחדל". מכסת חינם תלויה במסלול
 * שהבעלים נמצא בו בפועל, ולנחש אותה זה בדיוק "מספר שמשקר". מכסה מגיעה או
 * מה-API של הספק (חי), או מהשדה "מכסה חודשית" שהבעלים מקליד בהגדרות.
 */
export const PROVIDER_REGISTRY: ProviderMeta[] = [
  {
    id: 'vercel',
    name: 'Vercel (אחסון האתר)',
    consoleUrl: 'https://vercel.com/dashboard/usage',
    note: 'האתר עצמו רץ כאן. צריכת רוחב-פס וזמן פונקציות נראית רק בדשבורד של Vercel.',
    liveEnvVar: 'VERCEL_API_TOKEN',
  },
  {
    id: 'firebase',
    name: 'Firebase (מסד נתונים, קבצים, התחברות)',
    consoleUrl: 'https://console.firebase.google.com/project/badfos-28b67/usage',
    note: 'הזמנות, לידים וקבצי העיצוב. קריאות/כתיבות ונפח אחסון נראים רק בקונסולה של Firebase.',
  },
  {
    id: 'resend',
    name: 'Resend (מיילים ללקוחות)',
    consoleUrl: 'https://resend.com/settings/billing',
    note: 'כל מייל שהאתר שולח נספר אצלנו. מיילים שנשלחו ידנית מהדשבורד של Resend לא ייספרו כאן.',
    countedServices: ['resend_email'],
    countedUnit: 'מיילים ב-30 יום',
    liveEnvVar: 'RESEND_API_KEY',
  },
  {
    id: 'replicate',
    name: 'Replicate (שיפור איכות עיצומים לדפוס)',
    consoleUrl: 'https://replicate.com/account/billing',
    note: 'כל הרצת upscale נספרת אצלנו. חיוב לפי שניות GPU בפועל — הסכום המדויק בדשבורד.',
    countedServices: ['replicate_upscale'],
    countedUnit: 'הרצות ב-30 יום',
    liveEnvVar: 'REPLICATE_API_TOKEN',
  },
  {
    id: 'make',
    name: 'Make (אוטומציות ותשלומים)',
    consoleUrl: 'https://www.make.com/en/login',
    note: 'כל תשלום וכל ליד עוברים דרך תרחיש ב-Make. החיוב הוא לפי מספר פעולות (operations) בחודש.',
    liveEnvVar: 'MAKE_API_TOKEN',
  },
  {
    id: 'manychat',
    name: 'ManyChat (וואטסאפ אוטומטי)',
    consoleUrl: 'https://manychat.com/subscriptions',
    note: 'שחזור עגלות נטושות בוואטסאפ. החיוב לפי מספר אנשי קשר — נראה רק בדשבורד של ManyChat.',
  },
  {
    id: 'openai',
    name: 'OpenAI (יצירת עיצובים + עוזר טלגרם)',
    consoleUrl: 'https://platform.openai.com/usage',
    note: 'תשלום לפי שימוש, ללא מנוי. אין אצלנו מדידה — הסכום נמצא בדשבורד של OpenAI.',
    liveEnvVar: 'OPENAI_ADMIN_KEY',
  },
  {
    id: 'google_ads',
    name: 'Google Ads (פרסום ממומן)',
    consoleUrl: 'https://ads.google.com/aw/billing/summary',
    note: 'זו כנראה ההוצאה החודשית הגדולה ביותר. התקציב בפועל נמצא רק בחשבון Google Ads.',
  },
  {
    id: 'google_places',
    name: 'Google Places (ביקורות גוגל באתר)',
    consoleUrl: 'https://console.cloud.google.com/billing',
    note: 'מושך את דירוג הכוכבים והביקורות לעמוד הבית. חיוב לפי קריאות API ב-Google Cloud.',
  },
  {
    id: 'meta',
    name: 'Meta (פייסבוק ואינסטגרם)',
    consoleUrl: 'https://business.facebook.com/billing_hub',
    note: 'פיקסל ו-Conversions API הם בחינם. מה שעולה כסף הוא תקציב הפרסום, אם רץ.',
  },
  {
    id: 'grow',
    name: 'Grow / משולם (סליקת אשראי)',
    consoleUrl: 'https://grow.business',
    note: 'עמלת סליקה לכל עסקה — לא מנוי חודשי קבוע. הסכום המדויק בדוחות של Grow.',
  },
  {
    id: 'domain',
    // סדר לטיני-ואז-עברית-בסוגריים, כמו שאר הכרטיסים: כך ה-bidi מציב את
    // שם הדומיין במקום צפוי ולא באמצע משפט עברי.
    name: 'badfos.co.il (הדומיין של האתר)',
    // הרשם אומת מול whois של badfos.co.il: "registrar name: Gorni Interactive Ltd,
    // registrar info: https://www.box.co.il/". תוקף הרישום: 03-07-2029.
    consoleUrl: 'https://www.box.co.il/',
    note: 'רשום דרך Gorni Interactive (box.co.il), בתוקף עד 03/07/2029. תשלום שנתי, לא חודשי.',
  },
  {
    id: 'telegram',
    name: 'Telegram (בוט ההתראות)',
    consoleUrl: 'https://core.telegram.org/bots',
    note: 'התראות על הזמנות חדשות. ה-API של טלגרם הוא בחינם — אין כאן עלות.',
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics + Tag Manager',
    consoleUrl: 'https://analytics.google.com',
    note: 'מדידת תנועה באתר. שתי המערכות בחינם בנפחים של העסק.',
  },
]

export const PROVIDER_BY_ID: Record<string, ProviderMeta> = Object.fromEntries(
  PROVIDER_REGISTRY.map((p) => [p.id, p])
)

// ── לוגיקת סטטוס ─────────────────────────────────────────────────────────

/**
 * סטטוס נגזר אך ורק מיחס שימוש/מכסה. בלי מכסה ידועה אין דרך לדעת אם אנחנו
 * "בסדר" — ולכן מחזירים unknown ולא ok. ok כוזב הוא בדיוק סוג השקר שהמסך
 * הזה אמור למנוע.
 */
export function computeStatus(usage: UsageFigure | null): StatusLevel {
  if (!usage || usage.quota === null || !Number.isFinite(usage.quota) || usage.quota <= 0) {
    return 'unknown'
  }
  const ratio = usage.used / usage.quota
  if (ratio >= OVER_RATIO) return 'over'
  if (ratio >= APPROACHING_RATIO) return 'approaching'
  return 'ok'
}

/** יחס השימוש 0..1+ , או null כשאין מכסה. משמש לפס ההתקדמות ולמיון. */
export function usageRatio(usage: UsageFigure | null): number | null {
  if (!usage || usage.quota === null || !Number.isFinite(usage.quota) || usage.quota <= 0) {
    return null
  }
  return usage.used / usage.quota
}

/**
 * דירוג דחיפות — קטן יותר = צף למעלה.
 * חריגה → מתקרב → תקלה במשיכה החיה → אין נתון → תקין.
 * מערכת בריאה צריכה להיות שקטה, ולכן 'ok' יורד לתחתית.
 */
export function attentionRank(card: ProviderCard): number {
  if (card.status === 'over') return 0
  if (card.status === 'approaching') return 1
  if (card.error) return 2
  if (card.status === 'unknown') return 3
  return 4
}

/**
 * מיון להצגה. שובר שוויון: יחס שימוש גבוה קודם, אחר כך עלות חודשית גבוהה,
 * ולבסוף שם — כדי שהסדר יהיה יציב בין רענונים ולא ירקוד מול העיניים.
 */
export function sortCards(cards: ProviderCard[]): ProviderCard[] {
  return [...cards].sort((a, b) => {
    const rank = attentionRank(a) - attentionRank(b)
    if (rank !== 0) return rank

    const ratioDiff = (usageRatio(b.usage) ?? -1) - (usageRatio(a.usage) ?? -1)
    if (ratioDiff !== 0) return ratioDiff

    const costDiff = (b.monthlyIls ?? -1) - (a.monthlyIls ?? -1)
    if (costDiff !== 0) return costDiff

    return a.name.localeCompare(b.name, 'he')
  })
}

/** כמה כרטיסים דורשים תשומת לב עכשיו — לכותרת המסך. */
export function needsAttentionCount(cards: ProviderCard[]): number {
  return cards.filter((c) => attentionRank(c) <= 2).length
}

// ── צבירה כספית ──────────────────────────────────────────────────────────

/**
 * הגלגול החודשי. משתמש באותה הגדרה של "הזמנה" כמו הדוח השבועי
 * (lib/cost-digest) — מנויים קבועים + עלות משתנה מדודה, חלקי הזמנות ששולמו.
 *
 * חלון של 30 יום ולא "החודש הקלנדרי": ב-3 בחודש חלון קלנדרי היה מראה
 * עלות-להזמנה מטורפת על בסיס שלושה ימים. 30 יום מתגלגלים תמיד מלאים.
 */
export function buildTotals(
  fixedMonthlyIls: number,
  variable30dIls: number,
  orders30d: number
): StatusTotals {
  const totalMonthlyIls = fixedMonthlyIls + variable30dIls
  return {
    fixedMonthlyIls,
    variable30dIls,
    totalMonthlyIls,
    orders30d,
    costPerOrder: orders30d > 0 ? totalMonthlyIls / orders30d : null,
  }
}

// ── בניית הכרטיסים ───────────────────────────────────────────────────────

/** תוצאת משיכה חיה של ספק אחד, כפי שה-route מוסר אותה הלאה. */
export type LiveOutcome =
  | { ok: true; plan?: string | null; monthlyIls?: number | null; usage?: UsageFigure | null; detail?: string | null }
  | { ok: false; error: string; tokenMissing: boolean }

export interface BuildCardsInput {
  /** המנויים שהבעלים הזין (המקור ה"ידני") */
  subscriptions: Subscription[]
  /** מה שהמדידה הפנימית ספרה, לפי service id */
  counted: Record<string, ServiceTotals>
  /** תוצאות המשיכות החיות, לפי provider id. חסר = אין fetcher לספק */
  live: Record<string, LiveOutcome>
}

/**
 * מרכיב כרטיס לכל מערכת. פונקציה טהורה בכוונה — אותה החלטה כמו ב-
 * lib/cost-digest: כל ה-I/O יושב ב-route, וכאן אפשר לבדוק את ההתנהגות
 * (אפס טוקנים, ספק שנפל, חריגה) בלי Firebase ובלי רשת.
 *
 * סדר העדיפויות לכל שדה: חי ← נספר ← ידני. כל ירידה בסולם מסומנת בתג
 * ה-provenance, כך שלא ייתכן מספר על המסך שלא ברור מאיפה בא.
 */
export function buildCards(input: BuildCardsInput): ProviderCard[] {
  const cards: ProviderCard[] = []
  const usedSubscriptions = new Set<Subscription>()

  for (const meta of PROVIDER_REGISTRY) {
    const sub = input.subscriptions.find((s) => s.providerId === meta.id)
    if (sub) usedSubscriptions.add(sub)

    // מנוי כבוי נספר כ-0 ולא כ"לא ידוע" — הבעלים אמר במפורש שהוא לא משלם.
    const manualMonthly = sub ? (sub.active ? sub.monthlyIls : 0) : null

    const card: ProviderCard = {
      id: meta.id,
      name: meta.name,
      consoleUrl: meta.consoleUrl,
      provenance: 'manual',
      status: 'unknown',
      plan: sub?.plan ?? null,
      monthlyIls: manualMonthly,
      usage: null,
      note: meta.note,
      error: null,
      upgradableEnvVar: null,
    }

    const live = input.live[meta.id]

    if (live?.ok) {
      card.provenance = 'live'
      if (live.plan) card.plan = live.plan
      if (live.monthlyIls !== undefined && live.monthlyIls !== null) card.monthlyIls = live.monthlyIls
      if (live.usage) card.usage = live.usage
      if (live.detail) card.note = live.detail
    } else {
      if (live && !live.ok && live.error) card.error = live.error
      // רק חוסר טוקן הוא הזמנה להגדיר משהו. כשל אמיתי הוא תקלה, לא הזמנה.
      if (meta.liveEnvVar && live && !live.ok && live.tokenMissing) {
        card.upgradableEnvVar = meta.liveEnvVar
      }

      const counted = countedFor(meta, input.counted)
      if (counted) {
        card.provenance = 'counted'
        card.usage = counted.usage
        // עלות מדודה נכנסת רק כשאין מנוי ידני לשורה — הידני גובר, כי הוא
        // מה שבאמת יורד מהאשראי.
        if (card.monthlyIls === null) card.monthlyIls = counted.costIls
      }
    }

    // מכסה ידנית משלימה כל מקור שלא סיפק מכסה משלו.
    if (card.usage && card.usage.quota === null && sub?.quota) {
      card.usage = { ...card.usage, quota: sub.quota }
    }

    card.status = computeStatus(card.usage)
    cards.push(card)
  }

  // ── מנויים שלא שויכו לאף מערכת ────────────────────────────────────────
  // בלי זה הוצאה שהוזנה הייתה נעלמת מהמסך ונשארת רק בסכום. כרטיס חסר
  // נקרא בדיוק כמו "זה לא עולה כלום" — וזה מה שאסור לקרות כאן.
  for (const sub of input.subscriptions) {
    if (usedSubscriptions.has(sub)) continue
    cards.push({
      id: `custom:${sub.name}`,
      name: sub.name,
      consoleUrl: null,
      provenance: 'manual',
      status: 'unknown',
      plan: sub.plan ?? null,
      monthlyIls: sub.active ? sub.monthlyIls : 0,
      // אין שום מדידה לשורה שהוקלדה ביד. גם אם הוזנה מכסה, פס של "0 מתוך X"
      // היה נראה כמו מדידה — ולכן אין פס.
      usage: null,
      note: sub.active
        ? 'מנוי שהוזן ידנית ולא שויך לאף מערכת ברשימה.'
        : 'מנוי שהוזן ידנית ומסומן כלא פעיל — לא נספר בסך החודשי.',
      error: null,
      upgradableEnvVar: null,
    })
  }

  return sortCards(cards)
}

/** צבירת המדידה הפנימית של ספק אחד לכדי נתון שימוש אחד. */
function countedFor(
  meta: ProviderMeta,
  counted: Record<string, ServiceTotals>
): { usage: UsageFigure; costIls: number } | null {
  if (!meta.countedServices || meta.countedServices.length === 0) return null
  let used = 0
  let costIls = 0
  for (const service of meta.countedServices) {
    const totals = counted[service]
    if (!totals) continue
    used += totals.calls
    costIls += totals.costIls
  }
  // אפס הוא מידע ("לא נשלח כלום"), לא היעדר מידע — המדידה קיימת ורצה.
  return { usage: { used, quota: null, unit: meta.countedUnit || 'קריאות ב-30 יום' }, costIls }
}

// ── עיצוב מספרים ─────────────────────────────────────────────────────────

/** מספר שלם עם מפרידי אלפים, בפורמט עברי. */
export function num(value: number): string {
  return Math.round(value).toLocaleString('he-IL')
}

/**
 * ₪ לכרטיס. מתחת ל-₪10 מוצגת ספרה אחרי הנקודה, כי עיגול לשלמים היה הופך
 * ₪0.63 ל-₪1 — הגזמה של 59% על סכום קטן. מעל ₪10 השבר חסר משמעות.
 */
export function ilsCard(amount: number): string {
  if (amount > 0 && amount < 10 && !Number.isInteger(amount)) return `₪${amount.toFixed(1)}`
  return `₪${Math.round(amount).toLocaleString('he-IL')}`
}

/** אחוז שלם לתצוגה על פס ההתקדמות. */
export function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}
