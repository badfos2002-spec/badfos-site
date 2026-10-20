/**
 * הזמנות יומיות — תוויות וצבירה. קוד טהור: רץ גם בדפדפן (תצוגת הסיכום)
 * וגם בשרת (סיכום היום).
 */
import {
  STANDARD_SIZES,
  KIDS_SIZES,
  BABY_SIZES,
  getColorLabel,
  getTypeLabel,
  getProductLabel,
} from './constants'

/** אותה הגדרת "שולם" כמו בדוח השבועי ובמסך מצב המערכת. */
export const PAID_STATUSES = ['paid', 'in_production', 'shipped', 'completed']

export const VOICE_ORDERS_COLLECTION = 'voiceOrders'

/** מידה אחת למוצרים בלי מידות (כובע, תיק, באף, סינר, וסט) — כמו במעצבים. */
export const ONE_SIZE = 'ONE_SIZE'

/** שורה אחת בהזמנה קולית: מוצר+סוג+צבע+מידה+כמות. */
export interface VoiceItem {
  productType: string
  fabricType: string // '' כשלמוצר אין סוג
  color: string
  size: string
  quantity: number
}

// ── תוויות ───────────────────────────────────────────────────────────────

const PRODUCT_SINGULAR: Record<string, string> = {
  tshirt: 'חולצה',
  sweatshirt: 'סווטשרט',
  buff: 'באף',
  cap: 'כובע',
  apron: 'סינר',
  baby: 'בגד גוף',
  tote: 'תיק',
  vest: 'וסט זוהר',
}

/** "חולצה כותנה", "סווטשרט פוטר", "כובע טמבל", "באף". */
export function productTypeLabel(productType: string, fabricType?: string): string {
  const singular = PRODUCT_SINGULAR[productType] ?? productType
  if (!fabricType) return singular
  const type = getTypeLabel(fabricType)
  // "כובע טמבל" / "תיק קנבס" כבר כוללים את שם המוצר
  return type.startsWith(singular) ? type : `${singular} ${type}`
}

const SIZE_ORDER: string[] = [
  ...STANDARD_SIZES.map(s => s.id),
  ...KIDS_SIZES.map(s => s.id),
  ...BABY_SIZES.map(s => s.id),
  ONE_SIZE,
  'one-size',
]

export function sizeLabel(size: string): string {
  if (size === ONE_SIZE || size === 'one-size') return 'מידה אחת'
  if (KIDS_SIZES.some(k => k.id === size)) return `ילדים ${size}`
  const baby = BABY_SIZES.find(b => b.id === size)
  if (baby) return baby.name
  return size
}

function sizeRank(size: string): number {
  const i = SIZE_ORDER.indexOf(size)
  return i === -1 ? SIZE_ORDER.length : i
}

// ── צבירה ────────────────────────────────────────────────────────────────

/** פריט מהזמנת אתר — רק השדות שהצבירה צריכה (OrderItem ב-lib/types.ts). */
export interface SiteOrderItemLike {
  productType: string
  fabricType?: string
  color: string
  sizes?: { size: string; quantity: number }[]
  specialProductName?: string
}

export interface SiteOrderLike {
  status: string
  /** 'manual' = הזמנה ידנית מהאדמין (lib/manual-order.ts) — נספרת כמקור "ידני" */
  source?: string
  items?: SiteOrderItemLike[]
  /** חבילות שנקנו באותה הזמנה (order.packages) — נספרות לצד הפריטים */
  packages?: { packageName?: string; quantity?: number }[]
}

/** כמה ימים אחורה לשאול הזמנות לפי createdAt, כדי לתפוס עגלות שנפתחו מוקדם ושולמו ביום המבוקש. */
export const PAID_LOOKBACK_DAYS = 14

/**
 * הזמנה שייכת ליום שבו *שולמה* (paidAt), ורק אם אין paidAt — ליום שבו נוצרה.
 * כך הזמנה שנוצרה ב-23:50 ושולמה ב-00:10 נספרת ביום השני, ועגלה נטושה
 * שהוחזרה ושולמה אחרי 3 ימים נספרת ביום התשלום.
 */
export function isOrderInDay(o: { createdAtMs: number; paidAtMs?: number | null }, startMs: number, endMs: number): boolean {
  const t = typeof o.paidAtMs === 'number' ? o.paidAtMs : o.createdAtMs
  return t >= startMs && t < endMs
}

export interface DailyGroup {
  key: string
  label: string // "חולצה כותנה · שחור"
  total: number
  site: number
  manual: number
  voice: number
  sizes: { size: string; label: string; quantity: number }[]
}

export interface DailySummary {
  total: number
  site: number
  manual: number
  voice: number
  siteOrders: number
  manualOrders: number
  voiceOrders: number
  groups: DailyGroup[]
}

/**
 * צבירת יום: הזמנות אתר ששולמו + הזמנות קוליות, מקובצות לפי
 * מוצר+סוג+צבע, ובתוך כל קבוצה — כמות לכל מידה בסדר המידות הקבוע.
 * הסינון לפי יום נעשה לפני (בשאילתה); כאן מסננים סטטוס בלבד.
 */
export function aggregateDaily(siteOrders: SiteOrderLike[], voiceOrders: { items?: VoiceItem[] }[]): DailySummary {
  const groups = new Map<string, DailyGroup & { sizeMap: Map<string, number> }>()

  const add = (
    source: 'site' | 'manual' | 'voice',
    productType: string,
    fabricType: string,
    color: string,
    size: string,
    quantity: number,
    special?: string,
  ) => {
    if (!Number.isFinite(quantity) || quantity <= 0) return
    const key = [productType, fabricType, color, special ?? ''].join('|')
    let g = groups.get(key)
    if (!g) {
      const name = special || productTypeLabel(productType, fabricType)
      g = {
        key,
        label: productType === 'package' ? name : `${name} · ${getColorLabel(color, productType)}`,
        total: 0, site: 0, manual: 0, voice: 0, sizes: [], sizeMap: new Map(),
      }
      groups.set(key, g)
    }
    g.total += quantity
    g[source] += quantity
    // 'one-size' (ישן) ו-ONE_SIZE הם אותה מידה — שורה אחת
    const sz = size === 'one-size' ? ONE_SIZE : size
    g.sizeMap.set(sz, (g.sizeMap.get(sz) ?? 0) + quantity)
  }

  const paid = siteOrders.filter(o => PAID_STATUSES.includes(o.status))
  for (const order of paid) {
    const source = order.source === 'manual' ? 'manual' : 'site'
    for (const item of order.items ?? []) {
      for (const s of item.sizes ?? []) {
        add(source, item.productType, item.fabricType ?? '', item.color, s.size, Number(s.quantity), item.specialProductName)
      }
    }
    for (const pkg of order.packages ?? []) {
      const name = pkg.packageName || 'חבילה'
      add(source, 'package', '', '', ONE_SIZE, Number(pkg.quantity), `חבילה: ${name}`)
    }
  }
  for (const vo of voiceOrders) {
    for (const item of vo.items ?? []) {
      add('voice', item.productType, item.fabricType ?? '', item.color, item.size, Number(item.quantity))
    }
  }

  const list: DailyGroup[] = Array.from(groups.values()).map(({ sizeMap, ...g }) => ({
    ...g,
    sizes: Array.from(sizeMap.entries())
      .sort((a, b) => sizeRank(a[0]) - sizeRank(b[0]) || a[0].localeCompare(b[0]))
      .map(([size, quantity]) => ({ size, label: sizeLabel(size), quantity })),
  }))
  list.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'he'))

  return {
    total: list.reduce((n, g) => n + g.total, 0),
    site: list.reduce((n, g) => n + g.site, 0),
    manual: list.reduce((n, g) => n + g.manual, 0),
    voice: list.reduce((n, g) => n + g.voice, 0),
    siteOrders: paid.filter(o => o.source !== 'manual').length,
    manualOrders: paid.filter(o => o.source === 'manual').length,
    voiceOrders: voiceOrders.length,
    groups: list,
  }
}

const SUPPLIER_NAMES: Record<string, string> = {
  buff: 'באפים',
  apron: 'סינרים',
  baby: 'בגדי גוף',
  vest: 'וסטים',
}

/** שם קצר לספק: "חולצות כותנה", "קפוצון קנגרו", "פוטר", "כובעי טמבל", "באפים". */
function supplierName(productType: string, fabricType: string): string {
  const type = fabricType ? getTypeLabel(fabricType) : ''
  if (productType === 'tshirt' && type) return `חולצות ${type}`
  if (productType === 'sweatshirt' && type) return type.replace(/׳/g, '')
  if (productType === 'cap' && type) return type.replace(/^כובע /, 'כובעי ')
  if (productType === 'tote' && type) return type.replace(/^תיק /, 'תיקי ')
  return SUPPLIER_NAMES[productType] ?? getProductLabel(productType)
}

/** "S- 10", "מידה אחת- 35"; ילדים ותינוקות: "מידה (14) - 4 יחידות", "מידה (3-6 חודשים) - 2 יחידות". */
function supplierSizeLine(s: { size: string; label: string; quantity: number }): string {
  const kids = KIDS_SIZES.find(k => k.id === s.size)
  const baby = BABY_SIZES.find(b => b.id === s.size)
  if (kids || baby) return `מידה (${(kids ?? baby)!.name}) - ${s.quantity === 1 ? 'יחידה אחת' : `${s.quantity} יחידות`}`
  return `${s.label}- ${s.quantity}`
}

/**
 * טקסט לספק: לכל קבוצה שורת "שם צבע" ואחריה שורה לכל מידה (supplierSizeLine), שורה
 * ריקה בין קבוצות. בלי תאריך/סיכומים/מקור/מחירים/לקוחות. כל שורה מתחילה ב-RLM
 * (U+200F) כדי שוואטסאפ יציג גם שורה שמתחילה באות לטינית ("S- 10") מימין לשמאל,
 * מיושרת לימין כמו שאר השורות.
 */
export function supplierText(summary: DailySummary): string {
  const RLM = '\u200F'
  return summary.groups
    .map(g => {
      const [productType, fabricType, color, ...rest] = g.key.split('|')
      const special = rest.join('|')
      const head = productType === 'package'
        ? special
        : `${special || supplierName(productType, fabricType)} ${getColorLabel(color, productType)}`
      return [head, ...g.sizes.map(supplierSizeLine)].map(l => RLM + l).join('\n')
    })
    .join('\n\n')
}

/** YYYY-MM-DD תקין. */
export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T12:00:00Z`)
  // round-trip: דוחה תאריכים שהדפדפן/Node "מתקנים" בשקט (2026-02-31)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}
