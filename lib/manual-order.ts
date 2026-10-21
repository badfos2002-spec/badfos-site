/**
 * הזמנה ידנית — מכירה שהשותף סגר מחוץ לאתר וגבה בעצמו. נרשמת באדמין לתיעוד
 * ולמעקב בלבד: נוצרת כ"שולם", בלי מיילים, בלי המרות, בלי הגדלה, בלי וואטסאפ.
 *
 * קוד טהור: רץ גם בטופס (בחירות חוקיות) וגם בשרת (ולידציה לפני כתיבה), כדי
 * ששניהם יסכימו בדיוק מה חוקי. מקור האמת לקטלוג הוא lib/constants.ts — אותם
 * פילטרים של צבע/מידה/אזור שהמעצבים באתר משתמשים בהם.
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
  TSHIRT_DESIGN_AREAS,
  SWEATSHIRT_DESIGN_AREAS,
  BUFF_DESIGN_AREAS,
  APRON_DESIGN_AREAS,
  CAP_DESIGN_AREAS,
  BABY_DESIGN_AREAS,
  TOTE_DESIGN_AREAS,
  VEST_DESIGN_AREAS,
  TSHIRT_AREA_FILTER,
  SWEATSHIRT_AREA_FILTER,
  CAP_AREA_FILTER,
  TOTE_AREA_FILTER,
} from './constants'
import { ONE_SIZE, sizeLabel } from './daily-orders'

export const MANUAL_SOURCE = 'manual'

/** תקרת כמות למידה אחת בשורה. */
export const MAX_QUANTITY = 10000

export const MANUAL_PAYMENT_METHODS = [
  { id: 'bit', name: 'ביט' },
  { id: 'paybox', name: 'פייבוקס' },
  { id: 'credit', name: 'אשראי' },
  { id: 'cash', name: 'מזומן' },
  { id: 'bank_transfer', name: 'העברה בנקאית' },
] as const

export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number]['id']

export function paymentMethodLabel(id: unknown): string {
  return MANUAL_PAYMENT_METHODS.find(m => m.id === id)?.name ?? String(id ?? '')
}

/** הזמנה שנרשמה ידנית באדמין (לא דרך האתר). */
export function isManualOrder(o: unknown): boolean {
  return !!o && typeof o === 'object' && (o as { source?: unknown }).source === MANUAL_SOURCE
}

// ── קטלוג ────────────────────────────────────────────────────────────────

export interface Option {
  id: string
  name: string
}

export const PRODUCT_OPTIONS: Option[] = PRODUCT_CATEGORIES.map(p => ({ id: p.id, name: p.name }))

/**
 * "אחר" — מוצר שלא בקטלוג (כוס, מחזיק מפתחות...). נשמר בשורה כ-productType:'other'
 * עם specialProductName (אותו שדה שהצבירה היומית כבר מקבצת לפיו), color = צבע/פרטים
 * חופשי ('' כשאין), ומידה אחת בלבד: מידה חופשית או ONE_SIZE.
 */
export const OTHER_PRODUCT = 'other'
export const OTHER_PRODUCT_OPTION: Option = { id: OTHER_PRODUCT, name: 'אחר (מוצר שלא באתר)' }
export const OTHER_NAME_MAX = 80
export const OTHER_DETAILS_MAX = 80
export const OTHER_SIZE_MAX = 30
/** משבצות עיצוב למוצר "אחר" — בלי אזורי הדפסה; מזהים שה-download-design proxy מקבל ([A-Za-z0-9_]). */
const OTHER_DESIGN_AREAS: readonly Option[] = [
  { id: 'other', name: 'עיצוב' },
  { id: 'other_2', name: 'עיצוב 2' },
  { id: 'other_3', name: 'עיצוב 3' },
]

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

function filterList(list: readonly Option[], allowed: string[] | undefined): Option[] {
  return (allowed ? list.filter(c => allowed.includes(c.id)) : list).map(c => ({ id: c.id, name: c.name }))
}

/** צבעים חוקיים למוצר+סוג — אותם פילטרים כמו במעצבים. */
export function colorOptions(productType: string, fabricType: string): Option[] {
  switch (productType) {
    case 'tshirt': return filterList(TSHIRT_COLORS, FABRIC_COLOR_FILTER[fabricType])
    case 'sweatshirt': return filterList(SWEATSHIRT_COLORS, SWEATSHIRT_COLOR_FILTER[fabricType])
    case 'cap': return filterList(CAP_COLORS, CAP_COLOR_FILTER[fabricType])
    case 'tote': return filterList(TOTE_COLORS, TOTE_COLOR_FILTER[fabricType])
    case 'buff': return filterList(BUFF_COLORS, undefined)
    case 'apron': return filterList(APRON_COLORS, undefined)
    case 'baby': return filterList(BABY_COLORS, undefined)
    case 'vest': return filterList(VEST_COLORS, undefined)
    default: return []
  }
}

/**
 * מידות חוקיות למוצר+סוג+צבע — אותם כללים כמו SizeQuantityStep ושאר המעצבים:
 * ילדים רק לכותנה לבן/שחור, אוברסייז בלי XS/3XL/4XL, דרייפיט בלי 4XL,
 * תינוקות — מידות תינוק, מוצרים בלי מידות — ONE_SIZE (כמו במעצבים).
 */
export function sizeOptions(productType: string, fabricType: string, color: string): Option[] {
  const std = STANDARD_SIZES.map(s => ({ id: s.id, name: s.name }))
  switch (productType) {
    case 'tshirt': {
      if (fabricType === 'oversized') return std.filter(s => s.id !== 'XS' && s.id !== '3XL' && s.id !== '4XL')
      if (fabricType === 'dri-fit') return std.filter(s => s.id !== '4XL')
      if (fabricType === 'cotton' && (color === 'white' || color === 'black')) {
        return [...std, ...KIDS_SIZES.map(s => ({ id: s.id, name: sizeLabel(s.id) }))]
      }
      return std
    }
    case 'sweatshirt':
      return std
    case 'baby':
      return BABY_SIZES.map(s => ({ id: s.id, name: s.name }))
    default:
      return [{ id: ONE_SIZE, name: sizeLabel(ONE_SIZE) }]
  }
}

const AREAS_BY_PRODUCT: Record<string, readonly Option[]> = {
  tshirt: TSHIRT_DESIGN_AREAS,
  sweatshirt: SWEATSHIRT_DESIGN_AREAS,
  buff: BUFF_DESIGN_AREAS,
  apron: APRON_DESIGN_AREAS,
  cap: CAP_DESIGN_AREAS,
  baby: BABY_DESIGN_AREAS,
  tote: TOTE_DESIGN_AREAS,
  vest: VEST_DESIGN_AREAS,
  [OTHER_PRODUCT]: OTHER_DESIGN_AREAS,
}

const AREA_FILTER_BY_PRODUCT: Record<string, Record<string, string[]>> = {
  tshirt: TSHIRT_AREA_FILTER,
  sweatshirt: SWEATSHIRT_AREA_FILTER,
  cap: CAP_AREA_FILTER,
  tote: TOTE_AREA_FILTER,
}

/** אזורי הדפסה חוקיים למוצר+סוג — אותם פילטרים כמו במעצבים. */
export function areaOptions(productType: string, fabricType: string): Option[] {
  return filterList(AREAS_BY_PRODUCT[productType] ?? [], AREA_FILTER_BY_PRODUCT[productType]?.[fabricType])
}

// ── ולידציה ──────────────────────────────────────────────────────────────

export interface ManualOrderInput {
  customer: {
    firstName: string
    lastName: string
    phone: string
    email?: string
    phoneSecondary?: string
    notes?: string
  }
  shipping: {
    method: 'delivery' | 'pickup'
    address?: { street: string; number: string; city: string; apartment?: string; floor?: string; entrance?: string }
    additionalPhone?: string
  }
  items: {
    productType: string
    fabricType?: string
    /** מוצר "אחר" בלבד: שם המוצר */
    specialProductName?: string
    /** במוצר "אחר": צבע/פרטים חופשי ('' כשאין) */
    color: string
    /** במוצר "אחר": שורה אחת, size = מידה חופשית ('' = מידה אחת) */
    sizes: { size: string; quantity: number }[]
    designs?: { area: string; imageUrl: string; fileName?: string }[]
  }[]
  total: number
  paymentMethod: string
}

/** "054-123 4567" / "+972541234567" → "0541234567". */
export function normalizePhone(raw: unknown): string {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('972')) return `0${digits.slice(3)}`
  return digits
}

const PHONE_RE = /^05\d{8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * כתובת הורדה של Firebase Storage מהבאקט שלנו, בתוך designs/<session>/<file>.
 * כל דבר אחר (blob:, data:, http:, באקט זר, נתיב אחר, traversal) נדחה.
 */
export function isOwnDesignUrl(value: unknown, bucket: string | undefined): boolean {
  if (typeof value !== 'string' || !bucket) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  // רק הצורה הקנונית בדיוק כפי ש-getDownloadURL מחזיר: בלי userinfo, בלי
  // אותיות גדולות במארח, בלי /./ או ../, בלי \ ובלי #fragment.
  if (url.href !== value || url.hash || url.username || url.password) return false
  if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com' || url.port) return false
  if (url.searchParams.get('alt') !== 'media') return false
  const m = /^\/v0\/b\/([^/]+)\/o\/([^/]+)$/.exec(url.pathname)
  if (!m || m[1] !== bucket) return false
  let path: string
  try {
    path = decodeURIComponent(m[2])
  } catch {
    return false
  }
  const parts = path.split('/')
  return (
    parts.length === 3 &&
    parts[0] === 'designs' &&
    /^[A-Za-z0-9_-]+$/.test(parts[1]) &&
    /^(?!\.+$)[A-Za-z0-9._-]+$/.test(parts[2])
  )
}

type Str = (v: unknown, max: number) => string
const str: Str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/**
 * טקסט חופשי של מוצר "אחר": תווי כיווניות (bidi) מוסרים, רווחים מכווצים (גם ירידות שורה) ו-'|' → '/',
 * כי '|' הוא המפריד במפתח הקבוצה של הסיכום היומי. לא נחתך — האורך נבדק אחר כך.
 */
const freeText = (v: unknown): string =>
  typeof v === 'string'
    ? v.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').replace(/\s+/g, ' ').replace(/\|/g, '/').trim()
    : ''

export interface ValidatedManualOrder {
  customer: Record<string, string>
  shipping: Record<string, unknown>
  items: {
    productType: string
    fabricType?: string
    specialProductName?: string
    color: string
    sizes: { size: string; quantity: number }[]
    designs: { area: string; areaName: string; imageUrl: string; fileName: string }[]
    pricePerUnit: number
    totalQuantity: number
    totalPrice: number
  }[]
  total: number
  paymentMethod: ManualPaymentMethod
}

/**
 * ולידציה מלאה (שרת + טופס). מחזיר את ההזמנה המנוקה, או הודעת שגיאה בעברית.
 * המחירים לשורות הם 0 — הסכום הכולל מוזן ידנית ולא מחושב.
 */
export function validateManualOrder(
  raw: unknown,
  bucket: string | undefined,
): { ok: true; order: ValidatedManualOrder } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error })
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

  // לקוח
  const c = (r.customer && typeof r.customer === 'object' ? r.customer : {}) as Record<string, unknown>
  const firstName = str(c.firstName, 100)
  const lastName = str(c.lastName, 100)
  const phone = normalizePhone(c.phone)
  const email = str(c.email, 200).toLowerCase()
  const phoneSecondary = c.phoneSecondary ? normalizePhone(c.phoneSecondary) : ''
  const notes = str(c.notes, 2000)
  if (!firstName || !lastName) return fail('חסר שם פרטי או שם משפחה')
  if (!PHONE_RE.test(phone)) return fail('טלפון לא תקין (10 ספרות, מתחיל ב-05)')
  if (email && !EMAIL_RE.test(email)) return fail('אימייל לא תקין')
  if (phoneSecondary && !/^0\d{8,9}$/.test(phoneSecondary)) return fail('טלפון נוסף לא תקין')
  const customer: Record<string, string> = {
    firstName,
    lastName,
    email, // '' כשלא נמסר — אימייל אופציונלי בהזמנה ידנית
    phone,
    ...(phoneSecondary ? { phoneSecondary } : {}),
    ...(notes ? { notes } : {}),
  }

  // משלוח
  const s = (r.shipping && typeof r.shipping === 'object' ? r.shipping : {}) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  if (s.method !== 'delivery' && s.method !== 'pickup') return fail('בחרו משלוח או איסוף עצמי')
  const shipping: Record<string, unknown> = { method: s.method, cost: 0 }
  if (s.method === 'delivery') {
    const a = (s.address && typeof s.address === 'object' ? s.address : {}) as Record<string, unknown>
    const address = {
      street: str(a.street, 200),
      number: str(a.number, 30),
      city: str(a.city, 100),
      ...(str(a.apartment, 30) ? { apartment: str(a.apartment, 30) } : {}),
      ...(str(a.floor, 30) ? { floor: str(a.floor, 30) } : {}),
      ...(str(a.entrance, 30) ? { entrance: str(a.entrance, 30) } : {}),
    }
    if (!address.street || !address.number || !address.city) return fail('במשלוח חובה רחוב, מספר ועיר')
    shipping.address = address
    const additionalPhone = s.additionalPhone ? normalizePhone(s.additionalPhone) : ''
    if (additionalPhone && !/^0\d{8,9}$/.test(additionalPhone)) return fail('טלפון נוסף לשליח לא תקין')
    if (additionalPhone) shipping.additionalPhone = additionalPhone
  }

  // פריטים
  if (!Array.isArray(r.items) || r.items.length === 0) return fail('חובה לפחות שורת מוצר אחת')
  if (r.items.length > 50) return fail('יותר מדי שורות')
  const items: ValidatedManualOrder['items'] = []
  for (let i = 0; i < r.items.length; i++) {
    const it = (r.items[i] && typeof r.items[i] === 'object' ? r.items[i] : {}) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    const row = `שורה ${i + 1}: `
    const productType = str(it.productType, 30)
    const isOther = productType === OTHER_PRODUCT
    if (!isOther && !PRODUCT_OPTIONS.some(p => p.id === productType)) return fail(`${row}בחרו מוצר`)
    const types = typeOptions(productType)
    const fabricType = types.length ? str(it.fabricType, 30) : ''
    if (types.length && !types.some(t => t.id === fabricType)) return fail(`${row}בחרו סוג`)

    let color: string
    let specialProductName = ''
    const sizes: { size: string; quantity: number }[] = []
    if (isOther) {
      // מוצר שלא בקטלוג: בלי בדיקות קטלוג — שם חובה, פרטים ומידה חופשיים, כמות אחת
      specialProductName = freeText(it.specialProductName)
      if (!specialProductName) return fail(`${row}הזינו שם מוצר`)
      if (specialProductName.length > OTHER_NAME_MAX) return fail(`${row}שם המוצר ארוך מדי (עד ${OTHER_NAME_MAX} תווים)`)
      color = freeText(it.color)
      if (color.length > OTHER_DETAILS_MAX) return fail(`${row}צבע/פרטים ארוך מדי (עד ${OTHER_DETAILS_MAX} תווים)`)
      const list = Array.isArray(it.sizes) ? it.sizes : []
      if (list.length !== 1) return fail(`${row}הזינו כמות`)
      const size = freeText(list[0]?.size)
      if (size.length > OTHER_SIZE_MAX) return fail(`${row}מידה ארוכה מדי (עד ${OTHER_SIZE_MAX} תווים)`)
      const quantity = list[0]?.quantity
      if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        return fail(`${row}כמות לא תקינה (1 עד ${MAX_QUANTITY})`)
      }
      sizes.push({ size: size || ONE_SIZE, quantity })
    } else {
      color = str(it.color, 30)
      if (!colorOptions(productType, fabricType).some(o => o.id === color)) return fail(`${row}בחרו צבע`)

      const validSizes = sizeOptions(productType, fabricType, color)
      const seen = new Set<string>()
      for (const sq of Array.isArray(it.sizes) ? it.sizes : []) {
        const size = str(sq?.size, 20)
        const quantity = sq?.quantity
        if (quantity === 0) continue
        if (!validSizes.some(v => v.id === size)) return fail(`${row}מידה ${size || '?'} לא קיימת למוצר/סוג/צבע הזה`)
        if (seen.has(size)) return fail(`${row}מידה ${size} מופיעה פעמיים`)
        if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
          return fail(`${row}כמות לא תקינה במידה ${sizeLabel(size)} (1 עד ${MAX_QUANTITY})`)
        }
        seen.add(size)
        sizes.push({ size, quantity })
      }
      if (sizes.length === 0) return fail(`${row}הזינו כמות לפחות במידה אחת`)
    }

    const validAreas = areaOptions(productType, fabricType)
    const areasSeen = new Set<string>()
    const designs: ValidatedManualOrder['items'][number]['designs'] = []
    for (const d of Array.isArray(it.designs) ? it.designs : []) {
      const area = str(d?.area, 30)
      const areaOpt = validAreas.find(a => a.id === area)
      if (!areaOpt) return fail(`${row}אזור הדפסה לא חוקי למוצר הזה`)
      if (areasSeen.has(area)) return fail(`${row}שני עיצובים לאותו אזור`)
      if (!isOwnDesignUrl(d?.imageUrl, bucket)) return fail(`${row}קובץ העיצוב לא הועלה כראוי — העלו שוב`)
      areasSeen.add(area)
      designs.push({ area, areaName: areaOpt.name, imageUrl: d.imageUrl, fileName: str(d?.fileName, 200) || 'design' })
    }

    items.push({
      productType,
      ...(fabricType ? { fabricType } : {}),
      ...(specialProductName ? { specialProductName } : {}),
      color,
      sizes,
      designs,
      pricePerUnit: 0,
      totalQuantity: sizes.reduce((n, x) => n + x.quantity, 0),
      totalPrice: 0,
    })
  }

  // סכום ותשלום
  const total = r.total
  if (typeof total !== 'number' || !Number.isFinite(total) || total < 0 || total > 10_000_000) return fail('סכום לא תקין')
  const paymentMethod = MANUAL_PAYMENT_METHODS.find(m => m.id === r.paymentMethod)?.id
  if (!paymentMethod) return fail('בחרו אמצעי תשלום')

  return {
    ok: true,
    order: { customer, shipping, items, total: Math.round(total * 100) / 100, paymentMethod },
  }
}
