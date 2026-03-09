import type { ProductType, FabricType, DesignAreaType } from './types'

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
    color: 'bg-purple-100 border-purple-400',
    textColor: 'text-purple-900',
    popular: false,
  },
  {
    id: 'apron' as ProductType,
    name: 'סינרים',
    icon: '🧑‍🍳',
    color: 'bg-emerald-100 border-emerald-400',
    textColor: 'text-emerald-900',
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
    id: 'cap' as ProductType,
    name: 'כובעים',
    icon: '🧢',
    color: 'bg-blue-100 border-blue-400',
    textColor: 'text-blue-900',
    popular: false,
    comingSoon: true,
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
  { id: 'red', name: 'אדום', hex: '#EF4444' },
  { id: 'navy', name: 'נייבי', hex: '#1E3A8A' },
  { id: 'beige', name: 'בז׳', hex: '#D4A574' },
  { id: 'burgundy', name: 'בורדו', hex: '#7C2D12' },
  { id: 'olive', name: 'זית', hex: '#6B7245' },
] as const

// Colors available per fabric type (undefined = all TSHIRT_COLORS)
export const FABRIC_COLOR_FILTER: Record<string, string[]> = {
  oversized: ['white', 'black', 'beige'],
  polo: ['white', 'black', 'red'],
}

export const SWEATSHIRT_COLORS = [
  { id: 'black', name: 'שחור', hex: '#000000' },
  { id: 'gray', name: 'אפור', hex: '#9CA3AF' },
  { id: 'blue', name: 'כחול', hex: '#3B82F6' },
  { id: 'red', name: 'אדום', hex: '#EF4444' },
  { id: 'green', name: 'ירוק', hex: '#10B981' },
] as const

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
    price: 8,
  },
] as const

// ============================================================================
// Sizes and Surcharges
// ============================================================================

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
  cap: 0, // To be defined
  apron: 20,
} as const

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
  new: 'חדשה',
  paid: 'שולם',
  in_production: 'בייצור',
  shipped: 'נשלח',
  completed: 'הושלם',
  cancelled: 'בוטל',
} as const

export const ORDER_STATUS_COLORS = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
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
  phone: '050-7794277',
  whatsapp: '972559885954',
  email: 'badfos2002@gmail.com',
  instagram: 'https://instagram.com/badfos',
  facebook: 'https://facebook.com/badfos',
  tiktok: 'https://www.tiktok.com/@badfos',
  address: 'ראשון לציון, ישראל',
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
  basePrices?: Record<string, number>
  fabricSurcharges?: Record<string, number>
  designAreas?: Record<string, number>
  sizeSurcharges?: Record<string, number>
  shipping?: { delivery?: number; pickup?: number }
  quantityDiscount?: { minQuantity?: number; discountPercent?: number }
}

let _pricingOverrides: PricingOverrides = {}

export function applyPricingOverrides(data: PricingOverrides) {
  _pricingOverrides = data
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
    default:
      return TSHIRT_COLORS
  }
}

export function getDesignAreasByProductType(productType: ProductType) {
  const areas = (() => {
    switch (productType) {
      case 'tshirt': return TSHIRT_DESIGN_AREAS
      case 'sweatshirt': return SWEATSHIRT_DESIGN_AREAS
      case 'buff': return BUFF_DESIGN_AREAS
      case 'apron': return APRON_DESIGN_AREAS
      default: return TSHIRT_DESIGN_AREAS
    }
  })()
  if (!_pricingOverrides.designAreas) return areas
  return areas.map(a => ({
    ...a,
    price: _pricingOverrides.designAreas?.[a.id] ?? a.price,
  }))
}

export function getBasePrice(productType: ProductType): number {
  return _pricingOverrides.basePrices?.[productType] ?? BASE_PRICES[productType] ?? 0
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
