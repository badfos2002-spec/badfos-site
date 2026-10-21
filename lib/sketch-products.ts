/**
 * קטלוג מוצרי הסקיצה + מיפוי שורת הזמנה → סקיצה. קוד טהור (בלי Firebase),
 * משותף ל-/admin/sketches, לטופס ההזמנה הידנית ולכרטיסי ההזמנות.
 *
 * מיקום ברירת מחדל: בסקיצה, עיצוב שלא הוזז נשמר בלי `transform` — וזה בדיוק
 * מה שהמיפוי מחזיר (אין שדה transform בכלל).
 */
import {
  FABRIC_TYPES, TSHIRT_COLORS, FABRIC_COLOR_FILTER, TSHIRT_DESIGN_AREAS, TSHIRT_AREA_FILTER,
  SWEATSHIRT_TYPES, SWEATSHIRT_COLORS, SWEATSHIRT_COLOR_FILTER, SWEATSHIRT_DESIGN_AREAS, SWEATSHIRT_AREA_FILTER,
  CAP_TYPES, CAP_COLORS, CAP_COLOR_FILTER, CAP_DESIGN_AREAS, CAP_AREA_FILTER,
  TOTE_TYPES, TOTE_COLORS, TOTE_COLOR_FILTER, TOTE_DESIGN_AREAS, TOTE_AREA_FILTER,
  BUFF_COLORS, BUFF_DESIGN_AREAS, APRON_COLORS, APRON_DESIGN_AREAS, BABY_COLORS, BABY_DESIGN_AREAS,
  VEST_COLORS, VEST_DESIGN_AREAS,
  isHexColor,
} from './constants'
import { isOwnDesignUrl } from './manual-order'

export type ColorDef = { id: string; name: string; hex: string; border?: boolean }
export type TypeDef = { id: string; name: string }
export type AreaDef = { id: string; name: string }

export interface ProductDef {
  id: string
  name: string
  types: readonly TypeDef[] | null
  colors: readonly ColorDef[]
  colorFilter?: Record<string, string[]>
  areas: readonly AreaDef[]
  areaFilter?: Record<string, string[]>
}

/** המוצרים שהסקיצה יודעת להציג (מקור: /admin/sketches). */
export const SKETCH_PRODUCTS: ProductDef[] = [
  { id: 'tshirt', name: 'חולצה', types: FABRIC_TYPES, colors: TSHIRT_COLORS as unknown as ColorDef[], colorFilter: FABRIC_COLOR_FILTER, areas: TSHIRT_DESIGN_AREAS as unknown as AreaDef[], areaFilter: TSHIRT_AREA_FILTER },
  { id: 'sweatshirt', name: 'סווטשירט', types: SWEATSHIRT_TYPES, colors: SWEATSHIRT_COLORS as unknown as ColorDef[], colorFilter: SWEATSHIRT_COLOR_FILTER, areas: SWEATSHIRT_DESIGN_AREAS as unknown as AreaDef[], areaFilter: SWEATSHIRT_AREA_FILTER },
  { id: 'cap', name: 'כובע', types: CAP_TYPES, colors: CAP_COLORS as unknown as ColorDef[], colorFilter: CAP_COLOR_FILTER, areas: CAP_DESIGN_AREAS as unknown as AreaDef[], areaFilter: CAP_AREA_FILTER },
  { id: 'tote', name: 'תיק', types: TOTE_TYPES, colors: TOTE_COLORS as unknown as ColorDef[], colorFilter: TOTE_COLOR_FILTER, areas: TOTE_DESIGN_AREAS as unknown as AreaDef[], areaFilter: TOTE_AREA_FILTER },
  { id: 'vest', name: 'וסט זוהר', types: null, colors: VEST_COLORS as unknown as ColorDef[], areas: VEST_DESIGN_AREAS as unknown as AreaDef[] },
  { id: 'buff', name: 'באף', types: null, colors: BUFF_COLORS as unknown as ColorDef[], areas: BUFF_DESIGN_AREAS as unknown as AreaDef[] },
  { id: 'apron', name: 'סינר', types: null, colors: APRON_COLORS as unknown as ColorDef[], areas: APRON_DESIGN_AREAS as unknown as AreaDef[] },
  { id: 'baby', name: 'בגד גוף', types: null, colors: BABY_COLORS as unknown as ColorDef[], areas: BABY_DESIGN_AREAS as unknown as AreaDef[] },
]

/** מה שנשמר במסמך shared_designs (בלי previewUrl/phone/label). */
export interface SketchSpec {
  productType: string
  /** נוכח רק למוצר עם בחירת סוג */
  fabricType?: string
  color: string
  /** imageUrl = קובץ ההזמנה המקורי; מועתק לתיקיית הסקיצה לפני השמירה */
  designs: { area: string; areaName: string; imageUrl: string }[]
}

/** שורת הזמנה כפי שהיא באתר/בהזמנה הידנית (מספיק השדות שהמיפוי צריך). */
export interface SketchSourceItem {
  productType?: unknown
  fabricType?: unknown
  color?: unknown
  designs?: unknown
}

/**
 * שורת הזמנה → סקיצה, או null כשאין מה להציג (מוצר "אחר"/לא מוכר, בלי צבע,
 * בלי עיצוב שמור ב-Storage שלנו). סוג לא חוקי/חסר → הסוג הראשון (כמו "פתח
 * לעריכה" בעמוד הסקיצות); עיצוב באזור שהסוג לא מדפיס — נשמט.
 */
export function orderItemToSketch(item: SketchSourceItem, bucket: string | undefined): SketchSpec | null {
  const p = SKETCH_PRODUCTS.find(x => x.id === item.productType)
  if (!p) return null
  const color = typeof item.color === 'string' ? item.color : ''
  if (!color || !(p.colors.some(c => c.id === color) || isHexColor(color))) return null
  const fabricType = p.types
    ? (p.types.some(t => t.id === item.fabricType) ? (item.fabricType as string) : p.types[0].id)
    : ''
  const af = fabricType ? p.areaFilter?.[fabricType] : undefined
  const designs: SketchSpec['designs'] = []
  for (const d of Array.isArray(item.designs) ? item.designs : []) {
    const area = typeof d?.area === 'string' ? d.area : ''
    const def = p.areas.find(a => a.id === area)
    if (!def || (af && !af.includes(area))) continue
    if (designs.some(x => x.area === area)) continue
    if (!isOwnDesignUrl(d?.imageUrl, bucket)) continue
    designs.push({ area, areaName: def.name, imageUrl: d.imageUrl })
  }
  if (designs.length === 0) return null
  return { productType: p.id, ...(fabricType ? { fabricType } : {}), color, designs }
}

/** 05X-XXXXXXX / 972... → ספרות ל-wa.me (972…) — כמו בעמוד הסקיצות. */
export function waPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('972')) return d
  if (d.startsWith('0')) return '972' + d.slice(1)
  return d
}

/** קישור וואטסאפ עם הסקיצה — לאותו מספר כשיש טלפון תקין, אחרת בחירת איש קשר. */
export function sketchWhatsAppUrl(shareUrl: string, phone?: string): string {
  const text = encodeURIComponent(`היי! הכנו עבורך סקיצה 🎨\nאפשר לצפות בה כאן:\n${shareUrl}`)
  const p = waPhone(phone ?? '')
  return p.length >= 11 ? `https://wa.me/${p}?text=${text}` : `https://wa.me/?text=${text}`
}
