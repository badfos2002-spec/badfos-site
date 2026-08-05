import type { ProductType, FabricType, DesignAreaType, GallerySection } from './types'

// ============================================================================
// Product Categories
// ============================================================================

export const PRODUCT_CATEGORIES = [
  {
    id: 'tshirt' as ProductType,
    name: 'חולצות',
    icon: '👕',
    color: 'bg-yellow-100 border-yellow-400',
    textColor: 'text-yellow-900',
    popular: false,
  },
  {
    id: 'sweatshirt' as ProductType,
    name: 'סווטשרטים',
    icon: '🧥',
    color: 'bg-green-100 border-green-500',
    textColor: 'text-green-900',
    popular: false,
  },
  {
    id: 'baby' as ProductType,
    name: 'בגדי תינוקות',
    icon: '👶',
    color: 'bg-sky-100 border-sky-500',
    textColor: 'text-sky-900',
    popular: false,
  },
  {
    id: 'cap' as ProductType,
    name: 'כובעים',
    icon: '🧢',
    color: 'bg-orange-100 border-orange-500',
    textColor: 'text-orange-900',
    popular: false,
  },
  {
    id: 'apron' as ProductType,
    name: 'סינרים',
    icon: '🧑‍🍳',
    color: 'bg-purple-100 border-purple-800',
    textColor: 'text-purple-900',
    popular: false,
  },
  {
    id: 'buff' as ProductType,
    name: 'באפים',
    icon: '🎽',
    color: 'bg-pink-100 border-pink-400',
    textColor: 'text-pink-900',
    popular: false,
  },
  {
    id: 'tote' as ProductType,
    name: 'תיקים',
    icon: '👜',
    color: 'bg-blue-100 border-blue-800',
    textColor: 'text-blue-900',
    popular: false,
  },
  {
    id: 'vest' as ProductType,
    name: 'וסטים זוהרים',
    icon: '🦺',
    color: 'bg-orange-100 border-orange-500',
    textColor: 'text-orange-900',
    popular: false,
  },
] as const

// ============================================================================
// Fabric Types (T-Shirts only)
// ============================================================================

export const FABRIC_TYPES = [
  {
    id: 'cotton' as FabricType,
    name: 'כותנה',
    description: 'בד כותנה רך ונוח',
    surcharge: 0,
  },
  {
    id: 'dri-fit' as FabricType,
    name: 'דרייפיט',
    description: 'בד ספורטיבי מנדף זיעה',
    surcharge: 0,
  },
  {
    id: 'polo' as FabricType,
    name: 'פולו',
    description: 'חולצת פולו אלגנטית',
    surcharge: 10,
  },
  {
    id: 'oversized' as FabricType,
    name: 'אוברסייז',
    description: 'גזרה רחבה ונוחה',
    surcharge: 10,
  },
] as const

// ============================================================================
// Colors by Product Type
// ============================================================================

export const TSHIRT_COLORS = [
  { id: 'white', name: 'לבן', hex: '#FFFFFF', border: true },
  { id: 'black', name: 'שחור', hex: '#000000' },
  { id: 'gray', name: 'אפור', hex: '#9CA3AF' },
  { id: 'red', name: 'אדום', hex: '#A81C22' },
  { id: 'navy', name: 'נייבי', hex: '#203A66' },
  { id: 'beige', name: 'בז׳', hex: '#FFEABE' },
  { id: 'burgundy', name: 'בורדו', hex: '#6E2A48' },
  { id: 'olive', name: 'זית', hex: '#6B7245' },
] as const

// Colors available per fabric type (undefined = all TSHIRT_COLORS)
export const FABRIC_COLOR_FILTER: Record<string, string[]> = {
  oversized: ['white', 'black', 'beige'],
  polo: ['white', 'black', 'gray'],
}

export const SWEATSHIRT_COLORS = [
  { id: 'white', name: 'לבן', hex: '#FFFFFF', border: true },
  { id: 'black', name: 'שחור', hex: '#000000' },
  { id: 'navy', name: 'נייבי', hex: '#1F3A63' },
  { id: 'melange', name: 'אפור מלאנג', hex: '#A6ABB2' },
  { id: 'gray', name: 'אפור', hex: '#9CA3AF' },
  { id: 'lightblue', name: 'תכלת', hex: '#9AD4EC' },
  { id: 'red', name: 'אדום', hex: '#C0202B' },
  { id: 'babypink', name: 'ורוד בייבי', hex: '#F7C6D9' },
  { id: 'bottlegreen', name: 'ירוק בקבוק', hex: '#1B4D3E' },
  { id: 'beige', name: 'בז׳', hex: '#E8DFCD' },
  { id: 'burgundy', name: 'בורדו', hex: '#6E2A48' },
  { id: 'brown', name: 'חום', hex: '#6B4226' },
  { id: 'olive', name: 'זית', hex: '#6B7245' },
] as const

// Colors available per sweatshirt type.
export const SWEATSHIRT_COLOR_FILTER: Record<string, string[]> = {
  zip: ['navy', 'black', 'white', 'melange'],
  putter: ['black', 'white', 'navy', 'melange', 'lightblue', 'red', 'babypink', 'bottlegreen'],
  kangaroo: ['black', 'white', 'navy', 'beige', 'lightblue', 'burgundy', 'babypink', 'brown', 'olive', 'gray'],
}

// Print areas per sweatshirt type (undefined = all areas). The zip has no
// full-front print — the zipper runs down the centre.
export const SWEATSHIRT_AREA_FILTER: Record<string, string[]> = {
  zip: ['back', 'chest_logo', 'chest_logo_right'],
}

export const BUFF_COLORS = [
  { id: 'red', name: 'אדום', hex: '#EF4444' },
  { id: 'navy', name: 'נייבי', hex: '#1E3A8A' },
  { id: 'purple', name: 'סגול', hex: '#A855F7' },
  { id: 'orange', name: 'כתום', hex: '#F97316' },
  { id: 'green', name: 'ירוק', hex: '#10B981' },
  { id: 'turquoise', name: 'טורקיז', hex: '#06B6D4' },
] as const

export const APRON_COLORS = [
  { id: 'gray', name: 'אפור', hex: '#9CA3AF' },
  { id: 'white', name: 'לבן', hex: '#F9FAFB' },
  { id: 'navy', name: 'נייבי', hex: '#1E3A8A' },
  { id: 'black', name: 'שחור', hex: '#000000' },
] as const

export const CAP_TYPES = [
  {
    id: 'tembel',
    name: 'כובע טמבל',
    description: 'כובע טמבל קלאסי עם שוליים',
    surcharge: 0,
  },
  {
    id: 'mesh',
    name: 'כובע רשת',
    description: 'כובע רשת ספורטיבי (טראקר)',
    surcharge: 0,
  },
] as const

export const SWEATSHIRT_TYPES = [
  { id: 'kangaroo', name: 'קפוצ׳ון קנגרו', description: 'קפוצ׳ון עם ברדס, בלי רוכסן', surcharge: 0 },
  { id: 'putter', name: 'פוטר', description: 'סווטשירט קלאסי, בלי ברדס ובלי רוכסן', surcharge: 0 },
  { id: 'zip', name: 'קפוצ׳ון עם רוכסן', description: 'קפוצ׳ון עם ברדס ורוכסן', surcharge: 0 },
] as const

export const CAP_COLORS = [
  { id: 'white', name: 'לבן', hex: '#FFFFFF', border: true },
  { id: 'black', name: 'שחור', hex: '#000000' },
  { id: 'gray', name: 'אפור', hex: '#9CA3AF' },
  { id: 'burgundy', name: 'בורדו', hex: '#7C2D12' },
  { id: 'olive', name: 'זית', hex: '#6B7245' },
  { id: 'khaki', name: 'חאקי', hex: '#A09262' },
  { id: 'royalblue', name: 'כחול רויל', hex: '#1E40AF' },
  { id: 'orange', name: 'כתום', hex: '#F97316' },
  { id: 'yellow', name: 'צהוב', hex: '#FBBF24' },
  { id: 'beige', name: 'בז׳', hex: '#FFEABE' },
  { id: 'pink', name: 'ורוד', hex: '#FBCFE8' },
  { id: 'green', name: 'ירוק', hex: '#10B981' },
] as const

export const CAP_COLOR_FILTER: Record<string, string[]> = {
  tembel: ['white', 'black', 'gray', 'burgundy', 'olive', 'khaki', 'royalblue', 'orange', 'yellow'],
  mesh: ['burgundy', 'beige', 'pink', 'green', 'royalblue', 'black'],
}

export const BABY_COLORS = [
  { id: 'white', name: 'לבן', hex: '#FFFFFF', border: true },
  { id: 'lightblue', name: 'תכלת', hex: '#BFDBFE' },
  { id: 'pink', name: 'ורוד', hex: '#FBCFE8' },
] as const

// ============================================================================
// Design Areas by Product Type
// ============================================================================

export const TSHIRT_DESIGN_AREAS = [
  {
    id: 'front_full' as DesignAreaType,
    name: 'קידמי מלא',
    description: 'הדפסה מלאה על החזה',
    price: 10,
  },
  {
    id: 'back' as DesignAreaType,
    name: 'גב',
    description: 'הדפסה על הגב',
    price: 10,
  },
  {
    id: 'chest_logo' as DesignAreaType,
    name: 'סמל כיס שמאל',
    description: 'סמל קטן בגובה הכיס צד שמאל',
    price: 5,
  },
  {
    id: 'chest_logo_right' as DesignAreaType,
    name: 'סמל כיס ימין',
    description: 'סמל קטן בגובה הכיס צד ימין',
    price: 5,
  },
] as const

export const SWEATSHIRT_DESIGN_AREAS = [
  {
    id: 'front_full' as DesignAreaType,
    name: 'קידמי מלא',
    description: 'הדפסה מלאה על החזה',
    price: 10,
  },
  {
    id: 'back' as DesignAreaType,
    name: 'גב',
    description: 'הדפסה על הגב',
    price: 10,
  },
  {
    id: 'chest_logo' as DesignAreaType,
    name: 'סמל כיס שמאל',
    description: 'סמל קטן בגובה הכיס צד שמאל',
    price: 5,
  },
  {
    id: 'chest_logo_right' as DesignAreaType,
    name: 'סמל כיס ימין',
    description: 'סמל קטן בגובה הכיס צד ימין',
    price: 5,
  },
] as const

export const BUFF_DESIGN_AREAS = [
  {
    id: 'center' as DesignAreaType,
    name: 'מרכזי',
    description: 'הדפסה במרכז הבאף',
    price: 8,
  },
] as const

export const APRON_DESIGN_AREAS = [
  {
    id: 'center' as DesignAreaType,
    name: 'מרכזי',
    description: 'הדפסה על הסינר',
    price: 10,
  },
] as const

export const CAP_DESIGN_AREAS = [
  {
    id: 'center' as DesignAreaType,
    name: 'קידמי',
    description: 'הדפסה קדמית על הכובע',
    price: 5,
  },
  {
    id: 'center_wide' as DesignAreaType,
    name: 'קידמי רוחבי',
    description: 'הדפסה קדמית במלבן רוחבי',
    price: 5,
  },
] as const

export const CAP_AREA_FILTER: Record<string, string[]> = {
  tembel: ['center', 'center_wide'],
  mesh: ['center'],
}

export const BABY_DESIGN_AREAS = [
  {
    id: 'front_full' as DesignAreaType,
    name: 'קידמי',
    description: 'הדפסה על קדמת בגד הגוף',
    price: 5,
  },
] as const

export const BABY_SIZES = [
  { id: 'newborn', name: 'נולד עכשיו', surcharge: 0 },
  { id: '0-3m', name: 'נולד עכשיו - 3 חודשים', surcharge: 0 },
  { id: '3-6m', name: '3-6 חודשים', surcharge: 0 },
  { id: '6-12m', name: '6-12 חודשים', surcharge: 0 },
  { id: '12-18m', name: '12-18 חודשים', surcharge: 0 },
  { id: '18-24m', name: '18-24 חודשים', surcharge: 0 },
] as const

// ============================================================================
// Tote bags (תיקים) — no sizes; type-based (more types added over time)
// ============================================================================

export const TOTE_TYPES = [
  { id: 'volume', name: 'תיק קנבס', description: 'תיק בד קנבס עם נפח ותחתית מתרחבת', surcharge: 0 },
] as const

export const TOTE_COLORS = [
  { id: 'beige', name: 'בז׳', hex: '#E4D9C3' },
  { id: 'white', name: 'לבן', hex: '#FFFFFF', border: true },
  { id: 'black', name: 'שחור', hex: '#000000' },
] as const

export const TOTE_COLOR_FILTER: Record<string, string[]> = {
  volume: ['beige', 'white', 'black'],
}

export const TOTE_DESIGN_AREAS = [
  {
    id: 'front_full' as DesignAreaType,
    name: 'צד קדמי',
    description: 'הדפסה על חזית התיק',
    price: 5,
  },
  {
    id: 'back' as DesignAreaType,
    name: 'צד אחורי',
    description: 'הדפסה על גב התיק',
    price: 5,
  },
] as const

export const TOTE_AREA_FILTER: Record<string, string[]> = {
  volume: ['front_full', 'back'],
}

export const TOTE_MIN_QUANTITY = 1

// ============================================================================
// Hi-vis vests (וסטים זוהרים) — one size; kangaroo-free zipper-less model
// ============================================================================

export const VEST_COLORS = [
  { id: 'neonyellow', name: 'צהוב זוהר', hex: '#CCFF00' },
  { id: 'neonorange', name: 'כתום זוהר', hex: '#FF6D00' },
] as const

export const VEST_DESIGN_AREAS = [
  {
    id: 'back' as DesignAreaType,
    name: 'גב',
    description: 'הדפסה גדולה על הגב',
    price: 10,
  },
  {
    id: 'chest_logo' as DesignAreaType,
    name: 'סמל כיס ימין',
    description: 'סמל על החזה צד ימין',
    price: 5,
  },
  {
    id: 'chest_logo_right' as DesignAreaType,
    name: 'סמל כיס שמאל',
    description: 'סמל על החזה צד שמאל',
    price: 5,
  },
] as const

export const VEST_MIN_QUANTITY = 1

// ============================================================================
// Sizes and Surcharges
// ============================================================================

// Kid sizes (2–18) — available ONLY for cotton t-shirts in white or black.
export const KIDS_SIZES = [
  { id: '2', name: '2', surcharge: 0 },
  { id: '4', name: '4', surcharge: 0 },
  { id: '6', name: '6', surcharge: 0 },
  { id: '8', name: '8', surcharge: 0 },
  { id: '10', name: '10', surcharge: 0 },
  { id: '12', name: '12', surcharge: 0 },
  { id: '14', name: '14', surcharge: 0 },
  { id: '16', name: '16', surcharge: 0 },
  { id: '18', name: '18', surcharge: 0 },
] as const

export const STANDARD_SIZES = [
  { id: 'XS', name: 'XS', surcharge: 0 },
  { id: 'S', name: 'S', surcharge: 0 },
  { id: 'M', name: 'M', surcharge: 0 },
  { id: 'L', name: 'L', surcharge: 0 },
  { id: 'XL', name: 'XL', surcharge: 0 },
  { id: 'XXL', name: 'XXL', surcharge: 0 },
  { id: '3XL', name: '3XL', surcharge: 12 },
  { id: '4XL', name: '4XL', surcharge: 12 },
] as const

// ============================================================================
// Base Prices
// ============================================================================

export const BASE_PRICES = {
  tshirt: 37,
  sweatshirt: 53,
  buff: 8,
  cap: 30,
  apron: 29,
  baby: 35,
  tote: 35,
  vest: 30,
} as const

export const CAP_MIN_QUANTITY = 10

// ============================================================================
// Buff Quantity Options
// ============================================================================

export const BUFF_QUANTITIES = [
  { value: 50, label: '50 יחידות' },
  { value: 100, label: '100 יחידות' },
] as const

export const APRON_QUANTITIES = [
  { value: 30, label: '30 יחידות' },
  { value: 50, label: '50 יחידות' },
  { value: 100, label: '100 יחידות' },
] as const

// ============================================================================
// Shipping
// ============================================================================

export const SHIPPING_COSTS = {
  delivery: 35,
  pickup: 0,
} as const

export const PICKUP_LOCATION = {
  city: 'ראשון לציון',
  address: 'ראשון לציון, ישראל',
} as const

// Express pickup: order ready in 1-2 business days, flat surcharge.
// Available ONLY for pickup orders with up to maxQuantity total units.
export const EXPRESS_PICKUP = {
  cost: 50,
  maxQuantity: 20,
} as const

/** Express is offered only on pickup, and only for small orders (≤20 units) */
export function isExpressEligible(method: 'delivery' | 'pickup', totalQuantity: number): boolean {
  return method === 'pickup' && totalQuantity > 0 && totalQuantity <= EXPRESS_PICKUP.maxQuantity
}

// ============================================================================
// Discount Thresholds
// ============================================================================

export const QUANTITY_DISCOUNT = {
  minQuantity: 15,
  discountPercent: 5,
} as const

// ============================================================================
// Order Statuses (Hebrew)
// ============================================================================

export const ORDER_STATUS_LABELS = {
  pending_payment: 'ממתין לתשלום',
  cart_abandoned: 'נטש עגלה',
  new: 'חדשה',
  paid: 'שולם',
  in_production: 'בייצור',
  shipped: 'נשלח',
  completed: 'הושלם',
  cancelled: 'בוטל',
} as const

export const ORDER_STATUS_COLORS = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  cart_abandoned: 'bg-orange-100 text-orange-800',
  new: 'bg-emerald-100 text-emerald-800',
  paid: 'bg-green-100 text-green-800',
  in_production: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
} as const

// ============================================================================
// Lead Statuses (Hebrew)
// ============================================================================

export const LEAD_STATUS_LABELS = {
  new: 'חדש',
  answered: 'נענה',
  called_no_answer: 'חוייג ללא מענה',
  not_relevant: 'לא רלוונטי',
  closed_deal: 'סגר עסקה',
} as const

export const LEAD_STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  answered: 'bg-green-100 text-green-800',
  called_no_answer: 'bg-yellow-100 text-yellow-800',
  not_relevant: 'bg-gray-100 text-gray-800',
  closed_deal: 'bg-purple-100 text-purple-800',
} as const

// ============================================================================
// Lead Sources (Hebrew)
// ============================================================================

export const LEAD_SOURCE_LABELS = {
  popup: 'פופאפ',
  bottom_form: 'טופס תחתון',
  contact_form: 'טופס יצירת קשר',
} as const

// ============================================================================
// File Upload Constraints
// ============================================================================

export const UPLOAD_CONSTRAINTS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  acceptedFormats: ['image/jpeg', 'image/jpg', 'image/png'],
  acceptedExtensions: ['.jpg', '.jpeg', '.png'],
} as const

// ============================================================================
// Contact Information
// ============================================================================

export const CONTACT_INFO = {
  phone: '055-988-5954',
  whatsapp: '972559885954',
  email: 'badfos2002@gmail.com',
  instagram: 'https://instagram.com/badfos',
  facebook: 'https://facebook.com/badfos',
  tiktok: 'https://www.tiktok.com/@badfos',
  address: 'דובנוב 10, ראשון לציון',
} as const

// ============================================================================
// Coupon Configuration
// ============================================================================

export const COUPON_CONFIG = {
  prefix: 'SAVE10',
  discountPercent: 10,
  expirationMonths: 3,
} as const

// ============================================================================
// Helper Functions
// ============================================================================

// ============================================================================
// Pricing Overrides — loaded from Firestore admin (settings/pricing)
// ============================================================================

type PricingOverrides = {
  /** LEGACY (pre-v2): flat base per product + GLOBAL per-area-id print prices
   *  (leaked across products). Still honored when `products` is absent. */
  basePrices?: Record<string, number>
  fabricSurcharges?: Record<string, number>
  designAreas?: Record<string, number>
  /** v2: per-product pricing — full base price per sub-type + print prices
   *  scoped to THAT product only (no cross-product bleed). */
  products?: Record<string, {
    base?: Record<string, number>   // keyed by sub-type id, or 'default'
    areas?: Record<string, number>  // keyed by area id, scoped to this product
  }>
  sizeSurcharges?: Record<string, number>
  shipping?: { delivery?: number; pickup?: number }
  quantityDiscount?: { minQuantity?: number; discountPercent?: number }
}

let _pricingOverrides: PricingOverrides = {}

// Admin price overrides load asynchronously (see PricingLoader). Because the
// prices above are read from a plain module variable, components that show a
// price must re-render once the overrides arrive — otherwise they keep showing
// the hardcoded defaults (e.g. ₪37) until some unrelated state change. These
// let a component subscribe (via usePricingVersion) and re-render on load.
let _pricingVersion = 0
const _pricingListeners = new Set<() => void>()

export function applyPricingOverrides(data: PricingOverrides) {
  _pricingOverrides = data
  _pricingVersion++
  _pricingListeners.forEach((fn) => fn())
}

export function subscribePricing(fn: () => void): () => void {
  _pricingListeners.add(fn)
  return () => _pricingListeners.delete(fn)
}

export function getPricingVersion(): number {
  return _pricingVersion
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getProductCategory(productType: ProductType) {
  return PRODUCT_CATEGORIES.find((cat) => cat.id === productType)
}

export function getFabricType(fabricId: FabricType) {
  const fabric = FABRIC_TYPES.find((f) => f.id === fabricId)
  if (!fabric) return undefined
  // v2: surcharge shown on the fabric card = full price diff vs cotton.
  const v2 = _pricingOverrides.products?.tshirt?.base
  if (v2 && v2[fabricId] !== undefined && v2.cotton !== undefined) {
    return { ...fabric, surcharge: Math.max(0, v2[fabricId] - v2.cotton) }
  }
  const overrideSurcharge = _pricingOverrides.fabricSurcharges?.[fabricId]
  if (overrideSurcharge !== undefined) return { ...fabric, surcharge: overrideSurcharge }
  return fabric
}

export function getColorsByProductType(productType: ProductType) {
  switch (productType) {
    case 'tshirt':
      return TSHIRT_COLORS
    case 'sweatshirt':
      return SWEATSHIRT_COLORS
    case 'buff':
      return BUFF_COLORS
    case 'apron':
      return APRON_COLORS
    case 'baby':
      return BABY_COLORS
    case 'cap':
      return CAP_COLORS
    default:
      return TSHIRT_COLORS
  }
}

// Hebrew label helpers — resolve any color / type / product id to its Hebrew
// name across ALL product categories, so the admin, emails and cart always
// show Hebrew (never a raw english id). Falls back to the id if unknown.
export function getColorLabel(id: string): string {
  const all: readonly { id: string; name: string }[] = [
    ...TSHIRT_COLORS, ...SWEATSHIRT_COLORS, ...CAP_COLORS,
    ...BUFF_COLORS, ...APRON_COLORS, ...BABY_COLORS, ...TOTE_COLORS, ...VEST_COLORS,
  ]
  return all.find(c => c.id === id)?.name ?? id
}

export function getTypeLabel(id: string): string {
  const all: readonly { id: string; name: string }[] = [
    ...FABRIC_TYPES, ...CAP_TYPES, ...SWEATSHIRT_TYPES, ...TOTE_TYPES,
  ]
  return all.find(t => t.id === id)?.name ?? id
}

export function getProductLabel(id: string): string {
  return (PRODUCT_CATEGORIES as readonly { id: string; name: string }[]).find(p => p.id === id)?.name ?? id
}

export function getColorHex(id: string): string {
  const all: readonly { id: string; hex: string }[] = [
    ...TSHIRT_COLORS, ...SWEATSHIRT_COLORS, ...CAP_COLORS,
    ...BUFF_COLORS, ...APRON_COLORS, ...BABY_COLORS, ...TOTE_COLORS, ...VEST_COLORS,
  ]
  return all.find(c => c.id === id)?.hex ?? '#000000'
}

// The 3D model for a product+type (null → no 3D model, use the 2D mockup).
// Shared by the designers and the shared-design view so they stay in sync.
export function getModel3D(productType: string, fabricType?: string): { variant: string; url: string } | null {
  if (productType === 'tshirt') {
    if (fabricType === 'polo') return { variant: 'polo', url: '/models/polo-web.glb' }
    if (fabricType === 'oversized') return { variant: 'oversized', url: '/models/oversized-web.glb' }
    return { variant: 'tshirt', url: '/models/tshirt-web.glb' }
  }
  if (productType === 'sweatshirt') {
    if (fabricType === 'kangaroo') return { variant: 'hoodie', url: '/models/hoodie-web.glb' }
    if (fabricType === 'zip') return { variant: 'ziphoodie', url: '/models/ziphoodie-web.glb' }
    return { variant: 'sweatshirt', url: '/models/sweatshirt-web.glb' }
  }
  if (productType === 'cap') {
    if (fabricType === 'mesh') return { variant: 'meshcap', url: '/models/meshcap-web.glb' }
    return { variant: 'cap', url: '/models/cap-web.glb' }
  }
  if (productType === 'tote') return { variant: 'totevolume', url: '/models/tote-volume-web.glb' }
  if (productType === 'buff') return { variant: 'buff', url: '/models/buff-web.glb' }
  if (productType === 'vest') return { variant: 'vest', url: '/models/vest-web.glb' }
  if (productType === 'baby') return { variant: 'baby', url: '/models/baby-web.glb' }
  return null
}

export function getDesignAreasByProductType(productType: ProductType) {
  const areas = (() => {
    switch (productType) {
      case 'tshirt': return TSHIRT_DESIGN_AREAS
      case 'sweatshirt': return SWEATSHIRT_DESIGN_AREAS
      case 'buff': return BUFF_DESIGN_AREAS
      case 'apron': return APRON_DESIGN_AREAS
      case 'baby': return BABY_DESIGN_AREAS
      case 'cap': return CAP_DESIGN_AREAS
      case 'tote': return TOTE_DESIGN_AREAS
      case 'vest': return VEST_DESIGN_AREAS
      default: return TSHIRT_DESIGN_AREAS
    }
  })()
  // v2: print prices scoped to THIS product only — a v2 doc fully replaces the
  // legacy GLOBAL per-area-id overrides (which leaked across products).
  const v2 = _pricingOverrides.products?.[productType]?.areas
  if (v2) {
    return areas.map(a => ({ ...a, price: v2[a.id] ?? a.price }))
  }
  if (_pricingOverrides.products) return areas // v2 doc, product not configured → code defaults
  if (!_pricingOverrides.designAreas) return areas
  return areas.map(a => ({
    ...a,
    price: _pricingOverrides.designAreas?.[a.id] ?? a.price,
  }))
}

/**
 * FULL base price for a product (+ optional sub-type: fabric / sweatshirt /
 * cap / tote type). v2 overrides hold complete per-type prices; the legacy
 * path falls back to flat base + t-shirt fabric surcharge.
 */
export function getBasePrice(productType: ProductType, subType?: string): number {
  const v2 = _pricingOverrides.products?.[productType]?.base
  if (v2) {
    if (subType && v2[subType] !== undefined) return v2[subType]
    if (v2.default !== undefined) return v2.default
    const first = Object.values(v2)[0]
    if (first !== undefined) return first
  }
  let base = _pricingOverrides.basePrices?.[productType] ?? BASE_PRICES[productType] ?? 0
  if (productType === 'tshirt' && subType) {
    base += _pricingOverrides.fabricSurcharges?.[subType]
      ?? FABRIC_TYPES.find(f => f.id === subType)?.surcharge
      ?? 0
  }
  return base
}

export function getSizeSurcharge(sizeId: string): number {
  if (_pricingOverrides.sizeSurcharges?.[sizeId] !== undefined) {
    return _pricingOverrides.sizeSurcharges[sizeId]
  }
  return STANDARD_SIZES.find(s => s.id === sizeId)?.surcharge ?? 0
}

export function getLiveShippingCost(method: 'delivery' | 'pickup'): number {
  return _pricingOverrides.shipping?.[method] ?? SHIPPING_COSTS[method]
}

export function getLiveQuantityDiscount(): { minQuantity: number; discountPercent: number } {
  return {
    minQuantity: _pricingOverrides.quantityDiscount?.minQuantity ?? QUANTITY_DISCOUNT.minQuantity,
    discountPercent: _pricingOverrides.quantityDiscount?.discountPercent ?? QUANTITY_DISCOUNT.discountPercent,
  }
}

// ============================================================================
// Gallery Sections (עמוד /gallery — קטגוריות סינון + העלאה מהאדמין)
// ============================================================================

export const GALLERY_SECTIONS: { value: GallerySection; label: string }[] = [
  { value: 'soldiers', label: 'חיילים' },
  { value: 'families', label: 'משפחות' },
  { value: 'bachelorette', label: 'רווקות' },
  { value: 'birthday', label: 'ימי הולדת' },
  { value: 'business', label: 'עסקים' },
  { value: 'more', label: 'ועוד' },
]
