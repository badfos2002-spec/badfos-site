import { describe, it, expect } from 'vitest'
import {
  calculateItemPrice,
  calculateTotalPrice,
  applyQuantityDiscount,
} from '@/lib/pricing'
import type { DesignArea, DesignAreaType, ProductConfig } from '@/lib/types'

// TICKET-004: the two new sleeve areas (כתף ימין / כתף שמאל) cost ₪5 per unit
// each, exactly like a chest logo. Every expected value is written as a
// literal (same convention as tests/pricing.test.ts) so a price change breaks
// a test instead of silently passing.
// Pinned here: tshirt cotton 37, polo 47, sweatshirt 53; front_full 10;
// shoulder_right / shoulder_left 5 each; quantity discount 15 units → 5%.

function design(area: DesignAreaType): DesignArea {
  return {
    area,
    areaName: area,
    imageUrl: 'https://example.com/art.png',
    fileName: 'art.png',
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

describe('shoulder areas — price per unit', () => {
  it('tshirt cotton + כתף ימין: 37 + 5', () => {
    expect(calculateItemPrice(config({ designs: [design('shoulder_right')] }))).toBe(42)
  })

  it('tshirt cotton + כתף שמאל: 37 + 5', () => {
    expect(calculateItemPrice(config({ designs: [design('shoulder_left')] }))).toBe(42)
  })

  it('tshirt cotton + both shoulders: 37 + 5 + 5', () => {
    expect(
      calculateItemPrice(config({ designs: [design('shoulder_right'), design('shoulder_left')] }))
    ).toBe(47)
  })

  it('tshirt cotton + קידמי מלא + both shoulders: 37 + 10 + 5 + 5', () => {
    expect(
      calculateItemPrice(
        config({ designs: [design('front_full'), design('shoulder_right'), design('shoulder_left')] })
      )
    ).toBe(57)
  })

  it('sweatshirt kangaroo + כתף שמאל: 53 + 5', () => {
    expect(
      calculateItemPrice(
        config({ productType: 'sweatshirt', fabricType: 'kangaroo', designs: [design('shoulder_left')] })
      )
    ).toBe(58)
  })

  it('polo + כתף ימין: 47 + 5 — the polo area filter does not change pricing', () => {
    expect(
      calculateItemPrice(config({ fabricType: 'polo', designs: [design('shoulder_right')] }))
    ).toBe(52)
  })
})

describe('shoulder areas — order totals and the quantity discount', () => {
  const sizes = [{ size: 'M', quantity: 20 }]

  it('20 units × both shoulders add 200 to the order before the discount', () => {
    const withShoulders = calculateItemPrice(
      config({ designs: [design('shoulder_right'), design('shoulder_left')], sizes })
    )
    const without = calculateItemPrice(config({ sizes }))

    expect(without).toBe(37)
    expect(withShoulders).toBe(47)
    expect(calculateTotalPrice(without, 20)).toBe(740)
    expect(calculateTotalPrice(withShoulders, 20)).toBe(940)
    expect(calculateTotalPrice(withShoulders, 20) - calculateTotalPrice(without, 20)).toBe(200)
  })

  it('the ≥15-unit 5% discount still applies on top of the shoulder surcharge', () => {
    const withShoulders = calculateItemPrice(
      config({ designs: [design('shoulder_right'), design('shoulder_left')], sizes })
    )
    const total = calculateTotalPrice(withShoulders, 20)

    // 940 × 5% = 47
    expect(applyQuantityDiscount(20, total)).toBe(47)
    expect(total - applyQuantityDiscount(20, total)).toBe(893)
  })
})
