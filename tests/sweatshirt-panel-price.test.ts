import { describe, it, expect } from 'vitest'
import {
  calculateItemPrice,
  applyQuantityDiscount,
  formatAmount,
} from '@/lib/pricing'
import type { DesignArea, DesignAreaType, ProductConfig } from '@/lib/types'

// TICKET-005 / lead decision 12.11.2026: app/designer/sweatshirt/page.tsx
// computed its OWN price — `BASE_PRICE + designCost` — and ignored the size
// surcharge entirely, while the cart and the server have always charged the
// weighted surcharge via calculateItemPrice. So a sweatshirt order with a 3XL
// has been QUOTED LESS in the designer than the customer is charged at
// checkout. Routing the panel through lib/pricing.ts fixes that; it never
// raises what anyone pays, it only stops the designer under-quoting.
//
// This file pins the AFTER numbers the panel must now show, and — just as
// importantly — pins that the XS–XXL cases are byte-identical to today, so the
// "nothing changed for normal sizes" claim is tested and not merely asserted.
//
// Pinned: sweatshirt kangaroo 53, front_full 10, 3XL/4XL surcharge 12,
// XS–XXL surcharge 0, quantity discount 15 units → 5%.
// Today's formula, for the record: 53 + 10 = 63 per unit for every size.

function design(area: DesignAreaType, enlarge?: number): DesignArea {
  return {
    area,
    areaName: area,
    imageUrl: 'https://example.com/art.png',
    fileName: 'art.png',
    ...(enlarge === undefined ? {} : { enlarge: enlarge as 1 | 2 | 3 }),
  }
}

/** Kangaroo sweatshirt with one front_full print — the case in the lead's table. */
function panel(sizes: { size: string; quantity: number }[], enlarge?: number): ProductConfig {
  return {
    productType: 'sweatshirt',
    fabricType: 'kangaroo',
    color: 'black',
    designs: [design('front_full', enlarge)],
    sizes,
  }
}

/** Exactly what the panel now renders: per-unit, subtotal, discount, total. */
function render(config: ProductConfig) {
  const pricePerUnit = calculateItemPrice(config)
  const totalQuantity = config.sizes.reduce((sum, s) => sum + s.quantity, 0)
  const subtotal = pricePerUnit * totalQuantity
  const discount = applyQuantityDiscount(totalQuantity, subtotal)
  return { pricePerUnit, totalQuantity, subtotal, discount, total: subtotal - discount }
}

describe('sweatshirt designer panel — XS–XXL is byte-identical to today', () => {
  it('1 × L is still 63 per unit and 63 total', () => {
    const r = render(panel([{ size: 'L', quantity: 1 }]))
    expect(r.pricePerUnit).toBe(63)
    expect(r.total).toBe(63)
  })

  it('every single XS–XXL size is still exactly 63 per unit', () => {
    for (const size of ['XS', 'S', 'M', 'L', 'XL', 'XXL']) {
      expect(calculateItemPrice(panel([{ size, quantity: 1 }]))).toBe(63)
    }
  })

  it('a 6-size XS–XXL mix is still 63 per unit', () => {
    const r = render(
      panel([
        { size: 'XS', quantity: 1 }, { size: 'S', quantity: 2 }, { size: 'M', quantity: 3 },
        { size: 'L', quantity: 4 }, { size: 'XL', quantity: 1 }, { size: 'XXL', quantity: 1 },
      ])
    )
    expect(r.pricePerUnit).toBe(63)
    expect(r.subtotal).toBe(756)
  })

  it('16 × L: 63 per unit, 1008 subtotal, 50.4 discount — and the total now reads 957.6, not 958', () => {
    const r = render(panel([{ size: 'L', quantity: 16 }]))
    expect(r.pricePerUnit).toBe(63)
    expect(r.subtotal).toBe(1008)
    expect(r.discount).toBeCloseTo(50.4)
    expect(r.total).toBeCloseTo(957.6)
    expect(formatAmount(r.total)).toBe('957.6')
  })
})

describe('sweatshirt designer panel — the 3XL/4XL cases that now match the cart', () => {
  it('1 × 3XL: today 63, now 75', () => {
    const r = render(panel([{ size: '3XL', quantity: 1 }]))
    expect(r.pricePerUnit).toBe(75)
    expect(r.total).toBe(75)
  })

  it('2 × 3XL: today 126, now 150', () => {
    const r = render(panel([{ size: '3XL', quantity: 2 }]))
    expect(r.pricePerUnit).toBe(75)
    expect(r.total).toBe(150)
  })

  it('1 × L + 1 × 3XL: today 126, now 69 per unit and 138 total', () => {
    const r = render(panel([{ size: 'L', quantity: 1 }, { size: '3XL', quantity: 1 }]))
    expect(r.pricePerUnit).toBe(69)
    expect(r.total).toBe(138)
  })

  it('15 × L + 1 × 3XL: 63.75 per unit, 1020 subtotal, 51 discount, 969 total (today 958)', () => {
    const r = render(panel([{ size: 'L', quantity: 15 }, { size: '3XL', quantity: 1 }]))
    expect(r.pricePerUnit).toBe(63.75)
    expect(r.subtotal).toBe(1020)
    expect(r.discount).toBe(51)
    expect(r.total).toBe(969)
  })

  it('1 × 4XL is also 75 per unit', () => {
    expect(calculateItemPrice(panel([{ size: '4XL', quantity: 1 }]))).toBe(75)
  })
})

describe('sweatshirt designer panel — enlargement on top', () => {
  it('1 × L with +1: 53 + 10 + 1.5 = 64.5', () => {
    const r = render(panel([{ size: 'L', quantity: 1 }], 1))
    expect(r.pricePerUnit).toBe(64.5)
    expect(r.total).toBe(64.5)
    expect(formatAmount(r.total)).toBe('64.5')
  })

  it('20 × L with +2: 66 per unit, 1320 subtotal, 1254 after the discount', () => {
    const r = render(panel([{ size: 'L', quantity: 20 }], 2))
    expect(r.pricePerUnit).toBe(66)
    expect(r.subtotal).toBe(1320)
    expect(r.total).toBe(1254)
  })

  it('a half-shekel total is shown, not rounded away', () => {
    const r = render(panel([{ size: 'L', quantity: 1 }], 3))
    expect(r.total).toBe(67.5)
    expect(formatAmount(r.total)).toBe('67.5')
  })
})
