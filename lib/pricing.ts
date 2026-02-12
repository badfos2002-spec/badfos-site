import type { ProductConfig, CartItem, SizeQuantity } from './types'
import {
  getBasePrice,
  getFabricType,
  getDesignAreasByProductType,
  STANDARD_SIZES,
  SHIPPING_COSTS,
  QUANTITY_DISCOUNT,
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
      const sizeConfig = STANDARD_SIZES.find((size) => size.id === s.size)
      const surcharge = sizeConfig?.surcharge || 0
      return sum + surcharge * s.quantity
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
 *
 * Rule: ≥15 units → 5% discount
 */
export function applyQuantityDiscount(
  totalQuantity: number,
  subtotal: number
): number {
  if (totalQuantity >= QUANTITY_DISCOUNT.minQuantity) {
    return subtotal * (QUANTITY_DISCOUNT.discountPercent / 100)
  }
  return 0
}

/**
 * Calculate shipping cost based on method
 */
export function calculateShippingCost(
  method: 'delivery' | 'pickup'
): number {
  return SHIPPING_COSTS[method]
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
  couponDiscount: number = 0
): {
  subtotal: number
  quantityDiscount: number
  couponDiscount: number
  shipping: number
  total: number
  totalQuantity: number
} {
  // Calculate subtotal and total quantity
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
  const totalQuantity = items.reduce(
    (sum, item) => sum + item.totalQuantity,
    0
  )

  // Apply quantity discount
  const quantityDiscount = applyQuantityDiscount(totalQuantity, subtotal)

  // Calculate shipping
  const shipping = calculateShippingCost(shippingMethod)

  // Calculate final total
  const total =
    subtotal - quantityDiscount - couponDiscount + shipping

  return {
    subtotal,
    quantityDiscount,
    couponDiscount,
    shipping,
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

/**
 * Generate a unique cart item ID based on configuration
 * This allows us to detect duplicate items in the cart
 */
export function generateCartItemId(config: ProductConfig): string {
  const { productType, fabricType, color, designs } = config

  const designIds = designs
    .map((d) => d.area)
    .sort()
    .join('-')

  return `${productType}-${fabricType || 'none'}-${color}-${designIds}`
}

/**
 * Check if a quantity discount is applicable
 */
export function isQuantityDiscountApplicable(totalQuantity: number): boolean {
  return totalQuantity >= QUANTITY_DISCOUNT.minQuantity
}

/**
 * Get the quantity discount message
 */
export function getQuantityDiscountMessage(): string {
  return `הזמינו ${QUANTITY_DISCOUNT.minQuantity} חולצות או יותר וקבלו ${QUANTITY_DISCOUNT.discountPercent}% הנחה!`
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
      const sizeConfig = STANDARD_SIZES.find((size) => size.id === s.size)
      const surcharge = sizeConfig?.surcharge || 0
      return sum + surcharge * s.quantity
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
