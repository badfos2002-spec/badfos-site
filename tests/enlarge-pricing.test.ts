import { describe, it, expect, afterEach } from 'vitest'
import {
  calculateItemPrice,
  getPriceBreakdown,
  applyQuantityDiscount,
} from '@/lib/pricing'
import { applyPricingOverrides, getLiveEnlargeStepPrice, ENLARGE_STEP_PRICE } from '@/lib/constants'
import type { DesignArea, DesignAreaType, ProductConfig } from '@/lib/types'

// TICKET-005: enlarging a print costs ₪1.5 per step per unit, on front_full and
// back of t-shirts and sweatshirts only. Every expected value is a literal
// (same convention as tests/pricing.test.ts) so a price change breaks a test
// instead of silently passing.
// Pinned here: tshirt cotton 37, sweatshirt kangaroo 53; front_full 10,
// back 10, chest_logo 5; enlarge step 1.5; quantity discount 15 units → 5%.

function design(area: DesignAreaType, enlarge?: number): DesignArea {
  return {
    area,
    areaName: area,
    imageUrl: 'https://example.com/art.png',
    fileName: 'art.png',
    ...(enlarge === undefined ? {} : { enlarge: enlarge as 1 | 2 | 3 }),
  }
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

afterEach(() => {
  // applyPricingOverrides replaces the module state wholesale — put the code
  // defaults back so one test can never leak a price into the next.
  applyPricingOverrides({})
})

describe('the enlargement step price', () => {
  it('the code default is 1.5', () => {
    expect(ENLARGE_STEP_PRICE).toBe(1.5)
    expect(getLiveEnlargeStepPrice()).toBe(1.5)
  })

  it('an admin override replaces it', () => {
    applyPricingOverrides({ enlargeStepPrice: 2 })
    expect(getLiveEnlargeStepPrice()).toBe(2)
  })

  it('an override of 0 is honoured, not treated as missing', () => {
    applyPricingOverrides({ enlargeStepPrice: 0 })
    expect(getLiveEnlargeStepPrice()).toBe(0)
  })
})

describe('calculateItemPrice — enlargement per unit', () => {
  it('tshirt cotton + front_full + enlarge 2: 37 + 10 + 3 = 50', () => {
    expect(calculateItemPrice(config({ designs: [design('front_full', 2)] }))).toBe(50)
  })

  it('tshirt cotton + back + enlarge 3: the enlarge part alone is 4.5', () => {
    const plain = calculateItemPrice(config({ designs: [design('back')] }))
    const enlarged = calculateItemPrice(config({ designs: [design('back', 3)] }))
    expect(plain).toBe(47)
    expect(enlarged).toBe(51.5)
    expect(enlarged - plain).toBe(4.5)
  })

  it('tshirt cotton + front_full + enlarge 1: 37 + 10 + 1.5 = 48.5', () => {
    expect(calculateItemPrice(config({ designs: [design('front_full', 1)] }))).toBe(48.5)
  })

  it('a design with NO enlarge key is priced exactly as today', () => {
    expect(calculateItemPrice(config({ designs: [design('front_full')] }))).toBe(47)
  })

  it('enlarge 0 costs nothing', () => {
    expect(calculateItemPrice(config({ designs: [design('front_full', 0)] }))).toBe(47)
  })

  it('front_full and back each enlarged 2: 37 + 10 + 10 + 3 + 3 = 63', () => {
    expect(
      calculateItemPrice(config({ designs: [design('front_full', 2), design('back', 2)] }))
    ).toBe(63)
  })

  it('chest_logo with enlarge 2 adds NOTHING — the area has no enlargement', () => {
    expect(calculateItemPrice(config({ designs: [design('chest_logo', 2)] }))).toBe(42)
  })

  it('a shoulder with enlarge 2 adds nothing either', () => {
    expect(calculateItemPrice(config({ designs: [design('shoulder_right', 2)] }))).toBe(42)
  })

  it('a tote front_full with enlarge 2 adds nothing — the product has no enlargement', () => {
    expect(
      calculateItemPrice({
        productType: 'tote',
        fabricType: 'volume',
        color: 'natural',
        designs: [design('front_full', 2)],
        sizes: [],
      })
    ).toBe(40)
  })

  it('a hostile enlarge 7 is CLAMPED to 3 steps: 37 + 10 + 4.5 = 51.5', () => {
    expect(calculateItemPrice(config({ designs: [design('front_full', 7)] }))).toBe(51.5)
  })

  it('sweatshirt kangaroo + front_full + enlarge 1: 53 + 10 + 1.5 = 64.5', () => {
    expect(
      calculateItemPrice(
        config({ productType: 'sweatshirt', fabricType: 'kangaroo', designs: [design('front_full', 1)] })
      )
    ).toBe(64.5)
  })

  it('the enlargement rides on top of the size surcharge, not instead of it', () => {
    // 37 + 10 + 3 + 12 (one 3XL, one unit) = 62
    expect(
      calculateItemPrice(
        config({ designs: [design('front_full', 2)], sizes: [{ size: '3XL', quantity: 1 }] })
      )
    ).toBe(62)
  })

  it('an admin override of 2 per step makes 2 steps cost 4', () => {
    applyPricingOverrides({ enlargeStepPrice: 2 })
    expect(calculateItemPrice(config({ designs: [design('front_full', 2)] }))).toBe(51)
  })
})

describe('enlargement inside the order total and the quantity discount', () => {
  it('20 shirts at front_full enlarge 2: 1000 before the discount, 950 after', () => {
    const unit = calculateItemPrice(
      config({ designs: [design('front_full', 2)], sizes: [{ size: 'M', quantity: 20 }] })
    )
    expect(unit).toBe(50)
    const subtotal = unit * 20
    expect(subtotal).toBe(1000)
    expect(applyQuantityDiscount(20, subtotal)).toBe(50)
    expect(subtotal - applyQuantityDiscount(20, subtotal)).toBe(950)
  })

  it('20 shirts with +2 on the back cost ₪60 more than 20 plain ones', () => {
    const plain = calculateItemPrice(config({ designs: [design('back')] })) * 20
    const enlarged = calculateItemPrice(config({ designs: [design('back', 2)] })) * 20
    expect(enlarged - plain).toBe(60)
  })

  it('14 units get no discount on the enlarged price', () => {
    expect(applyQuantityDiscount(14, 50 * 14)).toBe(0)
  })
})

describe('getPriceBreakdown — enlargement is its own row', () => {
  it('reports the enlargement amount separately from the area prices', () => {
    const b = getPriceBreakdown(config({ designs: [design('front_full', 2)] }))
    expect(b.enlargePrice).toBe(3)
    expect(b.designAreaPrices).toBe(10)
    expect(b.basePrice).toBe(37)
    expect(b.fabricSurcharge).toBe(0)
    expect(b.sizeSurcharge).toBe(0)
    expect(b.total).toBe(50)
  })

  it('is 0 and the other fields are untouched when nothing is enlarged', () => {
    const b = getPriceBreakdown(config({ designs: [design('front_full')] }))
    expect(b.enlargePrice).toBe(0)
    expect(b.designAreaPrices).toBe(10)
    expect(b.basePrice).toBe(37)
    expect(b.total).toBe(47)
  })

  it('sums the enlargement of both areas', () => {
    const b = getPriceBreakdown(config({ designs: [design('front_full', 1), design('back', 3)] }))
    expect(b.enlargePrice).toBe(6)
    expect(b.designAreaPrices).toBe(20)
    expect(b.total).toBe(63)
  })

  it('ignores enlargement on an area that does not offer it', () => {
    const b = getPriceBreakdown(config({ designs: [design('chest_logo', 2)] }))
    expect(b.enlargePrice).toBe(0)
    expect(b.total).toBe(42)
  })

  it('a fixed-price special product reports no enlargement', () => {
    const b = getPriceBreakdown(config({ fixedPrice: 99, designs: [design('front_full', 2)] }))
    expect(b.enlargePrice).toBe(0)
    expect(b.total).toBe(99)
  })

  it('the breakdown total always equals calculateItemPrice', () => {
    const c = config({ designs: [design('front_full', 2), design('chest_logo', 2)], sizes: [{ size: '3XL', quantity: 1 }] })
    expect(getPriceBreakdown(c).total).toBe(calculateItemPrice(c))
  })
})
