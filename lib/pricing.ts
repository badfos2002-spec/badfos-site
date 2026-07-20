import type { ProductConfig, CartItem, SizeQuantity } from './types'
import {
  getBasePrice,
  getFabricType,
  getDesignAreasByProductType,
  getSizeSurcharge,
  getLiveShippingCost,
  getLiveQuantityDiscount,
} from './constants'

// ============================================================================
// Price Calculation Functions
// ============================================================================

/**
 * Calculate the price per unit for a product configuration
 *
 * Formula: basePrice + fabricSurcharge + designAreaPrices + sizeSurcharge
 */
export function calculateItemPrice(config: ProductConfig): number {
  // Special products with a fixed price — still apply size surcharges
  if (config.fixedPrice !== undefined) {
    let sizeSurcharge = 0
    if (config.sizes && config.sizes.length > 0) {
      const totalQty = config.sizes.reduce((sum, s) => sum + s.quantity, 0)
      const weighted = config.sizes.reduce((sum, s) => sum + getSizeSurcharge(s.size) * s.quantity, 0)
      sizeSurcharge = totalQty > 0 ? weighted / totalQty : 0
    }
    return config.fixedPrice + sizeSurcharge
  }

  const { productType, fabricType, designs, sizes } = config

  // 1. Base price
  const basePrice = getBasePrice(productType)

  // 2. Fabric surcharge (for t-shirts)
  let fabricSurcharge = 0
  if (fabricType && productType === 'tshirt') {
    const fabric = getFabricType(fabricType as any)
    fabricSurcharge = fabric?.surcharge || 0
  }

  // 3. Design area prices
  const designAreaPrices = designs.reduce((total, design) => {
    const areas = getDesignAreasByProductType(productType)
    const areaConfig = areas.find((a) => a.id === design.area)
    return total + (areaConfig?.price || 0)
  }, 0)

  // 4. Size surcharge (calculate average if multiple sizes)
  let sizeSurcharge = 0
  if (sizes && sizes.length > 0) {
    const totalQuantity = sizes.reduce((sum, s) => sum + s.quantity, 0)
    const weightedSurcharge = sizes.reduce((sum, s) => {
      return sum + getSizeSurcharge(s.size) * s.quantity
    }, 0)
    sizeSurcharge = totalQuantity > 0 ? weightedSurcharge / totalQuantity : 0
  }

  // Final price per unit
  return basePrice + fabricSurcharge + designAreaPrices + sizeSurcharge
}

/**
 * Calculate the total quantity for a product configuration
 */
export function calculateTotalQuantity(sizes: SizeQuantity[]): number {
  return sizes.reduce((total, size) => total + size.quantity, 0)
}

/**
 * Calculate the total price for a product (price per unit × quantity)
 */
export function calculateTotalPrice(
  pricePerUnit: number,
  quantity: number
): number {
  return pricePerUnit * quantity
}

/**
 * Apply quantity discount if applicable
 */
export function applyQuantityDiscount(
  totalQuantity: number,
  subtotal: number
): number {
  const { minQuantity, discountPercent } = getLiveQuantityDiscount()
  if (totalQuantity >= minQuantity) {
    return subtotal * (discountPercent / 100)
  }
  return 0
}

/**
 * Calculate shipping cost based on method
 */
export function calculateShippingCost(
  method: 'delivery' | 'pickup'
): number {
  return getLiveShippingCost(method)
}

/**
 * Validate and apply coupon discount
 * Note: This is a simplified version. Real implementation should check Firestore.
 */
export function validateCouponDiscount(
  code: string,
  subtotal: number
): number {
  // This will be implemented with Firestore lookup in the actual app
  // For now, return 0
  return 0
}

/**
 * Calculate the complete order total
 */
export function calculateOrderTotal(
  items: CartItem[],
  shippingMethod: 'delivery' | 'pickup' = 'delivery',
  couponDiscount: number = 0,
  customQuantityDiscount?: number,
  expressCost: number = 0
): {
  subtotal: number
  quantityDiscount: number
  couponDiscount: number
  shipping: number
  express: number
  total: number
  totalQuantity: number
} {
  // Calculate subtotal and total quantity
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
  const totalQuantity = items.reduce(
    (sum, item) => sum + item.totalQuantity,
    0
  )

  // Apply quantity discount (use custom if provided, otherwise use hardcoded rule)
  const quantityDiscount = customQuantityDiscount !== undefined
    ? customQuantityDiscount
    : applyQuantityDiscount(totalQuantity, subtotal)

  // Calculate shipping
  const shipping = calculateShippingCost(shippingMethod)

  // Express surcharge (pickup only) — flat fee, discounts never apply to it
  const express = expressCost > 0 ? expressCost : 0

  // Calculate final total
  const total =
    subtotal - quantityDiscount - couponDiscount + shipping + express

  return {
    subtotal,
    quantityDiscount,
    couponDiscount,
    shipping,
    express,
    total: Math.max(0, total), // Ensure non-negative
    totalQuantity,
  }
}

/**
 * Format price in ILS (Israeli Shekel)
 */
export function formatPrice(price: number): string {
  return `₪${price.toFixed(0)}`
}

/**
 * Format price with decimals
 */
export function formatPriceDetailed(price: number): string {
  return `₪${price.toFixed(2)}`
}

/** Small deterministic 32-bit string hash (djb2) for cart-item design fingerprinting. */
function hashString(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

/**
 * Generate a unique cart item ID based on configuration
 * This allows us to detect duplicate items in the cart
 */
export function generateCartItemId(config: ProductConfig): string {
  // Special products get a unique ID based on their name
  if (config.specialProductName) {
    return `special-${config.specialProductName}`
  }

  const { productType, fabricType, color, designs } = config

  // Fingerprint each design by area + file name + content hash. Two items with the
  // same product/color/area but DIFFERENT uploaded designs must NOT collapse into one
  // cart entry (that would silently drop the second design — critical for large orders
  // where many shirts share the same product/color but each has its own artwork).
  // Identical re-adds still yield the same id and merge quantities, as before.
  const designIds = designs
    .map((d) => `${d.area}:${d.fileName || ''}:${hashString(d.imageUrl || '')}`)
    .sort()
    .join('-')

  return `${productType}-${fabricType || 'none'}-${color}-${designIds}`
}

/**
 * Check if a quantity discount is applicable
 */
export function isQuantityDiscountApplicable(totalQuantity: number): boolean {
  return totalQuantity >= getLiveQuantityDiscount().minQuantity
}

/**
 * Get the quantity discount message
 */
export function getQuantityDiscountMessage(): string {
  const { minQuantity, discountPercent } = getLiveQuantityDiscount()
  return `הזמינו ${minQuantity} חולצות או יותר וקבלו ${discountPercent}% הנחה!`
}

/**
 * Calculate price breakdown for display
 */
export function getPriceBreakdown(config: ProductConfig): {
  basePrice: number
  fabricSurcharge: number
  designAreaPrices: number
  sizeSurcharge: number
  total: number
} {
  if (config.fixedPrice !== undefined) {
    return { basePrice: config.fixedPrice, fabricSurcharge: 0, designAreaPrices: 0, sizeSurcharge: 0, total: config.fixedPrice }
  }

  const { productType, fabricType, designs, sizes } = config

  const basePrice = getBasePrice(productType)

  let fabricSurcharge = 0
  if (fabricType && productType === 'tshirt') {
    const fabric = getFabricType(fabricType as any)
    fabricSurcharge = fabric?.surcharge || 0
  }

  const designAreaPrices = designs.reduce((total, design) => {
    const areas = getDesignAreasByProductType(productType)
    const areaConfig = areas.find((a) => a.id === design.area)
    return total + (areaConfig?.price || 0)
  }, 0)

  let sizeSurcharge = 0
  if (sizes && sizes.length > 0) {
    const totalQuantity = sizes.reduce((sum, s) => sum + s.quantity, 0)
    const weightedSurcharge = sizes.reduce((sum, s) => {
      return sum + getSizeSurcharge(s.size) * s.quantity
    }, 0)
    sizeSurcharge = totalQuantity > 0 ? weightedSurcharge / totalQuantity : 0
  }

  return {
    basePrice,
    fabricSurcharge,
    designAreaPrices,
    sizeSurcharge,
    total: basePrice + fabricSurcharge + designAreaPrices + sizeSurcharge,
  }
}
