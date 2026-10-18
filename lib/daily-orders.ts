/**
 * הזמנות יומיות — קטלוג, ולידציה וצבירה. קוד טהור: רץ גם בדפדפן (טבלת
 * העריכה) וגם בשרת (חילוץ קולי + שמירה + סיכום), כדי ששניהם יסכימו בדיוק
 * מה "שורה חוקית".
 *
 * מקור האמת לקטלוג הוא lib/constants.ts — אותם פילטרים של צבע/מידה שהמעצבים
 * באתר משתמשים בהם. אין כאן רשימות צבעים משלנו.
 */
import {
  PRODUCT_CATEGORIES,
  FABRIC_TYPES,
  SWEATSHIRT_TYPES,
  CAP_TYPES,
  TOTE_TYPES,
  TSHIRT_COLORS,
  FABRIC_COLOR_FILTER,
  SWEATSHIRT_COLORS,
  SWEATSHIRT_COLOR_FILTER,
  CAP_COLORS,
  CAP_COLOR_FILTER,
  TOTE_COLORS,
  TOTE_COLOR_FILTER,
  BUFF_COLORS,
  APRON_COLORS,
  BABY_COLORS,
  VEST_COLORS,
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

/** תקרת כמות לשורה — מעל זה זו כמעט בוודאות טעות תמלול. */
export const MAX_QUANTITY = 10000

/** שורה אחת בהזמנה קולית: מוצר+סוג+צבע+מידה+כמות. */
export interface VoiceItem {
  productType: string
  fabricType: string // '' כשלמוצר אין סוג
  color: string
  size: string
  quantity: number
}

export interface Option {
  id: string
  name: string
}

// ── קטלוג ────────────────────────────────────────────────────────────────

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

export const PRODUCT_OPTIONS: Option[] = PRODUCT_CATEGORIES.map(p => ({
  id: p.id,
  name: PRODUCT_SINGULAR[p.id] ?? p.name,
}))

const TYPES_BY_PRODUCT: Record<string, readonly Option[]> = {
  tshirt: FABRIC_TYPES,
  sweatshirt: SWEATSHIRT_TYPES,
  cap: CAP_TYPES,
  tote: TOTE_TYPES,
}

/** סוגים למוצר (ריק = למוצר אין בחירת סוג). */
export function typeOptions(productType: string): Option[] {
  return (TYPES_BY_PRODUCT[productType] ?? []).map(t => ({ id: t.id, name: t.name }))
}

function filterPalette(palette: readonly Option[], allowed: string[] | undefined): Option[] {
  const list = allowed ? palette.filter(c => allowed.includes(c.id)) : palette
  return list.map(c => ({ id: c.id, name: c.name }))
}

/** צבעים חוקיים למוצר+סוג — אותם פילטרים כמו במעצבים. */
export function colorOptions(productType: string, fabricType: string): Option[] {
  switch (productType) {
    case 'tshirt':
      return filterPalette(TSHIRT_COLORS, FABRIC_COLOR_FILTER[fabricType])
    case 'sweatshirt':
      return filterPalette(SWEATSHIRT_COLORS, SWEATSHIRT_COLOR_FILTER[fabricType])
    case 'cap':
      return filterPalette(CAP_COLORS, CAP_COLOR_FILTER[fabricType])
    case 'tote':
      return filterPalette(TOTE_COLORS, TOTE_COLOR_FILTER[fabricType])
    case 'buff':
      return filterPalette(BUFF_COLORS, undefined)
    case 'apron':
      return filterPalette(APRON_COLORS, undefined)
    case 'baby':
      return filterPalette(BABY_COLORS, undefined)
    case 'vest':
      return filterPalette(VEST_COLORS, undefined)
    default:
      return []
  }
}

const ONE_SIZE_OPTION: Option = { id: ONE_SIZE, name: 'מידה אחת' }

/** מידות חוקיות למוצר+סוג+צבע — אותם כללים כמו SizeQuantityStep. */
export function sizeOptions(productType: string, fabricType: string, color: string): Option[] {
  const std = STANDARD_SIZES.map(s => ({ id: s.id, name: s.name }))
  switch (productType) {
    case 'tshirt': {
      if (fabricType === 'oversized') return std.filter(s => s.id !== 'XS' && s.id !== '3XL' && s.id !== '4XL')
      if (fabricType === 'dri-fit') return std.filter(s => s.id !== '4XL')
      if (fabricType === 'cotton' && (color === 'white' || color === 'black')) {
        return [...std, ...KIDS_SIZES.map(s => ({ id: s.id, name: `ילדים ${s.name}` }))]
      }
      return std
    }
    case 'sweatshirt':
      return std
    case 'baby':
      return BABY_SIZES.map(s => ({ id: s.id, name: s.name }))
    default:
      return [ONE_SIZE_OPTION]
  }
}

/** כל הערכים האפשריים בכל הקטלוג — לסכמת ה-JSON של החילוץ. */
export function catalogEnums() {
  const products = PRODUCT_OPTIONS.map(p => p.id)
  const types = new Set<string>([''])
  const colors = new Set<string>()
  const sizes = new Set<string>()
  for (const p of products) {
    const ts = typeOptions(p)
    for (const t of ts) types.add(t.id)
    for (const t of ts.length ? ts.map(x => x.id) : ['']) {
      for (const c of colorOptions(p, t)) {
        colors.add(c.id)
        for (const s of sizeOptions(p, t, c.id)) sizes.add(s.id)
      }
    }
  }
  return { products, types: Array.from(types), colors: Array.from(colors), sizes: Array.from(sizes) }
}

/**
 * תיאור הקטלוג בטקסט, לפרומפט של החילוץ: לכל מוצר — סוגים, ולכל סוג — צבעים
 * ומידות חוקיים, עם השם העברי ליד כל מזהה.
 */
export function catalogForPrompt(): string {
  const lines: string[] = []
  for (const p of PRODUCT_OPTIONS) {
    lines.push(`product "${p.id}" (${p.name}):`)
    const ts = typeOptions(p.id)
    const variants = ts.length ? ts : [{ id: '', name: '' }]
    for (const t of variants) {
      const colors = colorOptions(p.id, t.id)
      const sizesFor = (c: string) => sizeOptions(p.id, t.id, c).map(s => s.id).join(',')
      const head = t.id ? `  type "${t.id}" (${t.name})` : '  type "" (no type)'
      lines.push(`${head}: colors ${colors.map(c => `${c.id}=${c.name}`).join(', ')}`)
      // הרשימה הנפוצה ביותר היא ברירת המחדל; רק חריגים נכתבים לכל צבע
      const counts = new Map<string, number>()
      for (const c of colors) counts.set(sizesFor(c.id), (counts.get(sizesFor(c.id)) ?? 0) + 1)
      const base = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
      lines.push(`    sizes: ${base}`)
      for (const c of colors) {
        const s = sizesFor(c.id)
        if (s !== base) lines.push(`    sizes for color ${c.id}: ${s}`)
      }
    }
  }
  return lines.join('\n')
}

// ── ולידציה ──────────────────────────────────────────────────────────────

export type ItemField = 'productType' | 'fabricType' | 'color' | 'size' | 'quantity'

/** השדה הבעייתי הראשון בשורה + הודעה (עברית), או null כשהשורה חוקית לגמרי. */
export function itemIssue(item: VoiceItem): { field: ItemField; message: string } | null {
  if (!PRODUCT_OPTIONS.some(p => p.id === item.productType)) return { field: 'productType', message: 'חסר מוצר' }
  const ts = typeOptions(item.productType)
  if (ts.length && !ts.some(t => t.id === item.fabricType)) return { field: 'fabricType', message: 'חסר סוג' }
  if (!ts.length && item.fabricType) return { field: 'fabricType', message: 'סוג לא קיים למוצר הזה' }
  if (!colorOptions(item.productType, item.fabricType).some(c => c.id === item.color)) return { field: 'color', message: 'צבע לא קיים לסוג הזה' }
  if (!sizeOptions(item.productType, item.fabricType, item.color).some(s => s.id === item.size)) return { field: 'size', message: 'מידה לא קיימת לסוג/צבע הזה' }
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) return { field: 'quantity', message: 'כמות לא תקינה' }
  return null
}

/** בעיה בשורה (עברית), או null כשהשורה חוקית לגמרי. */
export function itemProblem(item: VoiceItem): string | null {
  return itemIssue(item)?.message ?? null
}

/** ניקוי שורה שהגיעה מבחוץ (מודל / לקוח) לצורה הבסיסית. */
export function normalizeItem(raw: unknown): VoiceItem {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const productType = str(r.productType)
  return {
    productType,
    // למוצר בלי סוגים — הסוג תמיד ריק, גם אם הגיע ערך
    fabricType: typeOptions(productType).length ? str(r.fabricType) : '',
    color: str(r.color),
    size: str(r.size),
    quantity: typeof r.quantity === 'number' ? Math.floor(r.quantity) : Number.parseInt(str(r.quantity), 10) || 0,
  }
}

// ── תוויות ───────────────────────────────────────────────────────────────

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
  voice: number
  sizes: { size: string; label: string; quantity: number }[]
}

export interface DailySummary {
  total: number
  site: number
  voice: number
  siteOrders: number
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
    source: 'site' | 'voice',
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
        total: 0, site: 0, voice: 0, sizes: [], sizeMap: new Map(),
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
    for (const item of order.items ?? []) {
      for (const s of item.sizes ?? []) {
        add('site', item.productType, item.fabricType ?? '', item.color, s.size, Number(s.quantity), item.specialProductName)
      }
    }
    for (const pkg of order.packages ?? []) {
      const name = pkg.packageName || 'חבילה'
      add('site', 'package', '', '', ONE_SIZE, Number(pkg.quantity), `חבילה: ${name}`)
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
    voice: list.reduce((n, g) => n + g.voice, 0),
    siteOrders: paid.length,
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
