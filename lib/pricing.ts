import type { ProductConfig, CartItem, DesignArea, SizeQuantity } from './types'
import {
  getBasePrice,
  getDesignAreasByProductType,
  getSizeSurcharge,
  getLiveShippingCost,
  getLiveQuantityDiscount,
  getLiveEnlargeStepPrice,
} from './constants'
import { normalizeEnlarge } from './enlarge'

/**
 * What the print enlargements on this item add per unit.
 *
 * Priced per step per unit at the admin's live rate, and gated through
 * normalizeEnlarge — so a stale or crafted `enlarge` on an area or product
 * without the feature (a chest logo, a tote's front) costs exactly nothing,
 * and a value above the ceiling is charged as the ceiling, which is also what
 * gets stored. See lib/enlarge.ts.
 */
function enlargementPrice(productType: string | undefined, designs: DesignArea[]): number {
  const stepPrice = getLiveEnlargeStepPrice()
  return designs.reduce(
    (total, design) => total + normalizeEnlarge(productType, design.area, design.enlarge) * stepPrice,
    0
  )
}

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

  // 1+2. FULL base price for the product + sub-type. With v2 pricing this is
  // the complete per-type price (e.g. polo ₪55); on the legacy path
  // getBasePrice internally adds the t-shirt fabric surcharge, so nothing is
  // added twice here.
  const basePrice = getBasePrice(productType, fabricType)
  const fabricSurcharge = 0

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

  // 5. Print enlargement, on top of the area price — not instead of it
  const enlargePrice = enlargementPrice(productType, designs)

  // Final price per unit
  return basePrice + fabricSurcharge + designAreaPrices + sizeSurcharge + enlargePrice
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
 * A price as text, without a currency sign.
 *
 * One decimal when the amount is not a whole shekel, none when it is. The
 * enlargement step is ₪1.5, so a real per-unit price can land on a half
 * shekel; this used to be toFixed(0), which showed ₪38.5 as "₪38" while Grow
 * charged 38.5. A value that rounds to a whole shekel at one decimal still
 * prints without one, so "₪38.0" never appears and every whole price is
 * byte-identical to what it was.
 *
 * (This also stops rounding the fractional prices that already existed: a
 * weighted size surcharge — 7 shirts with one 3XL is 38.714 per unit — and a
 * discounted total. Those used to display rounded and now display the number
 * actually charged.)
 */
export function formatAmount(price: number): string {
  const oneDecimal = price.toFixed(1)
  return oneDecimal.endsWith('.0') ? price.toFixed(0) : oneDecimal
}

/**
 * Format price in ILS (Israeli Shekel)
 */
export function formatPrice(price: number): string {
  return `₪${formatAmount(price)}`
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
  //
  // The enlargement joins the fingerprint — the same artwork at +0 and at +2
  // costs more and looks different, so it is its own cart line. The marker is
  // appended ONLY above 0 step, so every id that exists today is byte-identical.
  const designIds = designs
    .map((d) => {
      const steps = normalizeEnlarge(productType, d.area, d.enlarge)
      return `${d.area}:${d.fileName || ''}:${hashString(d.imageUrl || '')}${steps > 0 ? `:e${steps}` : ''}`
    })
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
  /** Print enlargement — its OWN number, not folded into designAreaPrices,
   *  because the summary shows it as a "הגדלה +n" row of its own. */
  enlargePrice: number
  total: number
} {
  if (config.fixedPrice !== undefined) {
    return { basePrice: config.fixedPrice, fabricSurcharge: 0, designAreaPrices: 0, sizeSurcharge: 0, enlargePrice: 0, total: config.fixedPrice }
  }

  const { productType, fabricType, designs, sizes } = config

  // v2: full per-type base; surcharge folded in (see calculateItemPrice).
  const basePrice = getBasePrice(productType, fabricType)
  const fabricSurcharge = 0

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

  const enlargePrice = enlargementPrice(productType, designs)

  return {
    basePrice,
    fabricSurcharge,
    designAreaPrices,
    sizeSurcharge,
    enlargePrice,
    total: basePrice + fabricSurcharge + designAreaPrices + sizeSurcharge + enlargePrice,
  }
}
