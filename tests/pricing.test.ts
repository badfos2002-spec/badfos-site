import { describe, it, expect } from 'vitest'
import {
  calculateItemPrice,
  calculateTotalQuantity,
  calculateTotalPrice,
  applyQuantityDiscount,
  calculateShippingCost,
  calculateOrderTotal,
  generateCartItemId,
  isQuantityDiscountApplicable,
  formatPrice,
  formatPriceDetailed,
} from '@/lib/pricing'
import type {
  CartItem,
  DesignArea,
  DesignAreaType,
  ProductConfig,
} from '@/lib/types'

// Characterization tests: every expected value is a literal taken from the
// current code defaults (lib/constants.ts) and written out here on purpose, so
// a later price change breaks a test instead of silently passing.
// Defaults pinned: tshirt 37 (polo/oversized +10), sweatshirt 53, buff 8;
// print areas front_full/back +10, chest_logo* +5; sizes XS-XXL 0, 3XL/4XL +12;
// shipping delivery 35 / pickup 0; quantity discount 15 units -> 5%.

function design(
  area: DesignAreaType,
  fileName = 'art.png',
  imageUrl = 'https://example.com/art.png'
): DesignArea {
  return { area, areaName: area, imageUrl, fileName }
}

function config(overrides: Partial<ProductConfig> = {}): ProductConfig {
  return {
    productType: 'tshirt',
    fabricType: 'cotton',
    color: 'black',
    designs: [],
    sizes: [],
    ...overrides,
  }
}

// calculateOrderTotal only reads totalPrice + totalQuantity; the other fields
// are here so the fixture type-checks as a real CartItem.
function cartItem(totalPrice: number, totalQuantity: number): CartItem {
  return { ...config(), id: 'item', pricePerUnit: 0, totalPrice, totalQuantity }
}

describe('calculateItemPrice', () => {
  it('base price per product type: tshirt cotton', () => {
    expect(calculateItemPrice(config())).toBe(37)
  })

  it('base price per product type: tshirt polo includes the fabric surcharge', () => {
    // 37 + 10
    expect(calculateItemPrice(config({ fabricType: 'polo' }))).toBe(47)
  })

  it('base price per product type: sweatshirt', () => {
    expect(
      calculateItemPrice({
        productType: 'sweatshirt',
        color: 'black',
        designs: [],
        sizes: [],
      })
    ).toBe(53)
  })

  it('base price per product type: buff', () => {
    expect(
      calculateItemPrice({
        productType: 'buff',
        color: 'black',
        designs: [],
        sizes: [],
      })
    ).toBe(8)
  })

  it('adds the front_full print surcharge', () => {
    // 37 + 10
    expect(calculateItemPrice(config({ designs: [design('front_full')] }))).toBe(47)
  })

  it('adds a surcharge for every print area', () => {
    // 37 + 10 + 10
    expect(
      calculateItemPrice(
        config({ designs: [design('front_full'), design('back')] })
      )
    ).toBe(57)
  })

  it('adds the smaller chest_logo surcharge', () => {
    // 37 + 5
    expect(calculateItemPrice(config({ designs: [design('chest_logo')] }))).toBe(42)
  })

  it('averages the size surcharge by quantity: 3 M + 1 3XL', () => {
    // 37 + (12 * 1) / 4 = 37 + 3
    expect(
      calculateItemPrice(
        config({
          sizes: [
            { size: 'M', quantity: 3 },
            { size: '3XL', quantity: 1 },
          ],
        })
      )
    ).toBe(40)
  })

  it('averages the size surcharge by quantity: 2 M + 1 3XL', () => {
    // 37 + (12 * 1) / 3 = 37 + 4
    expect(
      calculateItemPrice(
        config({
          sizes: [
            { size: 'M', quantity: 2 },
            { size: '3XL', quantity: 1 },
          ],
        })
      )
    ).toBe(41)
  })

  it('fixedPrice still gets the averaged size surcharge', () => {
    // 100 + (12 * 1) / 2 = 100 + 6
    expect(
      calculateItemPrice(
        config({
          fixedPrice: 100,
          sizes: [
            { size: '3XL', quantity: 1 },
            { size: 'M', quantity: 1 },
          ],
        })
      )
    ).toBe(106)
  })

  it('fixedPrice ignores the base price and the print areas', () => {
    expect(
      calculateItemPrice(
        config({
          fixedPrice: 100,
          designs: [design('front_full'), design('back')],
          sizes: [{ size: 'M', quantity: 1 }],
        })
      )
    ).toBe(100)
  })

  it('no sizes means no size surcharge', () => {
    expect(calculateItemPrice(config({ sizes: [] }))).toBe(37)
  })

  it('a zero-quantity size does not divide by zero', () => {
    expect(calculateItemPrice(config({ sizes: [{ size: 'M', quantity: 0 }] }))).toBe(37)
  })
})

describe('calculateTotalQuantity', () => {
  it('sums the quantities of all sizes', () => {
    expect(
      calculateTotalQuantity([
        { size: 'M', quantity: 3 },
        { size: 'L', quantity: 4 },
      ])
    ).toBe(7)
  })

  it('empty sizes is zero', () => {
    expect(calculateTotalQuantity([])).toBe(0)
  })
})

describe('calculateTotalPrice', () => {
  it('multiplies the unit price by the quantity', () => {
    expect(calculateTotalPrice(42, 3)).toBe(126)
  })
})

describe('applyQuantityDiscount', () => {
  it('no discount below 15 units', () => {
    expect(applyQuantityDiscount(14, 1000)).toBe(0)
  })

  it('exactly 15 units gets 5 percent', () => {
    // 1000 * 5%
    expect(applyQuantityDiscount(15, 1000)).toBe(50)
  })

  it('above 15 units gets 5 percent', () => {
    // 200 * 5%
    expect(applyQuantityDiscount(20, 200)).toBe(10)
  })
})

describe('calculateShippingCost', () => {
  it('delivery costs 35', () => {
    expect(calculateShippingCost('delivery')).toBe(35)
  })

  it('pickup is free', () => {
    expect(calculateShippingCost('pickup')).toBe(0)
  })
})

describe('calculateOrderTotal', () => {
  it('sums the items and adds delivery when the quantity discount does not apply', () => {
    expect(calculateOrderTotal([cartItem(300, 6), cartItem(120, 4)])).toEqual({
      subtotal: 420,
      quantityDiscount: 0,
      couponDiscount: 0,
      shipping: 35,
      express: 0,
      total: 455, // 420 + 35
      totalQuantity: 10,
    })
  })

  it('applies the quantity discount once the items together pass 15 units', () => {
    expect(calculateOrderTotal([cartItem(400, 10), cartItem(400, 10)])).toEqual({
      subtotal: 800,
      quantityDiscount: 40, // 800 * 5%
      couponDiscount: 0,
      shipping: 35,
      express: 0,
      total: 795, // 800 - 40 + 35
      totalQuantity: 20,
    })
  })

  it('subtracts the coupon discount and charges nothing for pickup', () => {
    expect(calculateOrderTotal([cartItem(400, 10)], 'pickup', 40)).toEqual({
      subtotal: 400,
      quantityDiscount: 0,
      couponDiscount: 40,
      shipping: 0,
      express: 0,
      total: 360, // 400 - 40
      totalQuantity: 10,
    })
  })

  it('adds the express fee on top and never discounts it', () => {
    expect(
      calculateOrderTotal([cartItem(800, 20)], 'pickup', 0, undefined, 50)
    ).toEqual({
      subtotal: 800,
      quantityDiscount: 40, // 800 * 5%, express excluded
      couponDiscount: 0,
      shipping: 0,
      express: 50,
      total: 810, // 800 - 40 + 50
      totalQuantity: 20,
    })
  })

  it('a negative express fee is treated as no express fee', () => {
    expect(
      calculateOrderTotal([cartItem(800, 20)], 'pickup', 0, undefined, -20)
    ).toEqual({
      subtotal: 800,
      quantityDiscount: 40,
      couponDiscount: 0,
      shipping: 0,
      express: 0,
      total: 760, // 800 - 40
      totalQuantity: 20,
    })
  })

  it('a zero express fee stays zero', () => {
    expect(
      calculateOrderTotal([cartItem(800, 20)], 'pickup', 0, undefined, 0).express
    ).toBe(0)
  })

  it('a custom quantity discount overrides the computed one', () => {
    expect(
      calculateOrderTotal([cartItem(800, 20)], 'pickup', 0, 123)
    ).toEqual({
      subtotal: 800,
      quantityDiscount: 123,
      couponDiscount: 0,
      shipping: 0,
      express: 0,
      total: 677, // 800 - 123
      totalQuantity: 20,
    })
  })

  it('a custom quantity discount of zero cancels the 5 percent rule', () => {
    expect(calculateOrderTotal([cartItem(800, 20)], 'delivery', 0, 0)).toEqual({
      subtotal: 800,
      quantityDiscount: 0, // not 40
      couponDiscount: 0,
      shipping: 35,
      express: 0,
      total: 835, // 800 + 35
      totalQuantity: 20,
    })
  })

  it('the total is floored at zero while the subtotal stays untouched', () => {
    expect(calculateOrderTotal([cartItem(100, 2)], 'delivery', 1000)).toEqual({
      subtotal: 100,
      quantityDiscount: 0,
      couponDiscount: 1000,
      shipping: 35,
      express: 0,
      total: 0, // 100 - 1000 + 35 = -865, floored
      totalQuantity: 2,
    })
  })
})

describe('generateCartItemId', () => {
  it('an identical configuration gets the same id so the cart merges quantities', () => {
    const a = generateCartItemId(config({ designs: [design('front_full')] }))
    const b = generateCartItemId(config({ designs: [design('front_full')] }))
    expect(a).toBe(b)
  })

  it('a different artwork image on the same area gets a different id', () => {
    const a = generateCartItemId(
      config({ designs: [design('front_full', 'art.png', 'https://example.com/a.png')] })
    )
    const b = generateCartItemId(
      config({ designs: [design('front_full', 'art.png', 'https://example.com/b.png')] })
    )
    expect(a).not.toBe(b)
  })

  it('a different file name on the same image gets a different id', () => {
    const a = generateCartItemId(
      config({ designs: [design('front_full', 'first.png', 'https://example.com/a.png')] })
    )
    const b = generateCartItemId(
      config({ designs: [design('front_full', 'second.png', 'https://example.com/a.png')] })
    )
    expect(a).not.toBe(b)
  })

  it('the order the designs were added in does not matter', () => {
    const front = design('front_full', 'front.png', 'https://example.com/front.png')
    const back = design('back', 'back.png', 'https://example.com/back.png')
    expect(generateCartItemId(config({ designs: [front, back] }))).toBe(
      generateCartItemId(config({ designs: [back, front] }))
    )
  })

  it('a special product is identified by its name alone', () => {
    expect(
      generateCartItemId(config({ specialProductName: 'X', designs: [design('back')] }))
    ).toBe('special-X')
  })

  it('a different color gets a different id', () => {
    expect(generateCartItemId(config({ color: 'black' }))).not.toBe(
      generateCartItemId(config({ color: 'white' }))
    )
  })

  it('the id starts with product, fabric and color', () => {
    expect(
      generateCartItemId(config({ designs: [design('front_full')] }))
    ).toContain('tshirt-cotton-black-front_full:art.png:')
  })

  it('a missing fabric type shows up as none', () => {
    expect(
      generateCartItemId({
        productType: 'tshirt',
        color: 'black',
        designs: [],
        sizes: [],
      })
    ).toBe('tshirt-none-black-')
  })
})

describe('isQuantityDiscountApplicable', () => {
  it('14 units is not enough', () => {
    expect(isQuantityDiscountApplicable(14)).toBe(false)
  })

  it('15 units is enough', () => {
    expect(isQuantityDiscountApplicable(15)).toBe(true)
  })

  it('16 units is enough', () => {
    expect(isQuantityDiscountApplicable(16)).toBe(true)
  })
})

describe('formatPrice', () => {
  it('shows a whole number with a shekel sign', () => {
    expect(formatPrice(37)).toBe('₪37')
  })

  it('rounds down', () => {
    expect(formatPrice(36.4)).toBe('₪36')
  })

  it('rounds up', () => {
    expect(formatPrice(36.6)).toBe('₪37')
  })
})

describe('formatPriceDetailed', () => {
  it('always shows two decimals', () => {
    expect(formatPriceDetailed(37)).toBe('₪37.00')
  })

  it('rounds to two decimals', () => {
    expect(formatPriceDetailed(36.456)).toBe('₪36.46')
  })
})
