import { describe, it, expect, afterEach } from 'vitest'
import { buildPaymentItems, verifyAmount } from '@/lib/payment-verify'
import { applyPricingOverrides } from '@/lib/constants'
import type { CartItem, DesignArea, DesignAreaType } from '@/lib/types'

// TICKET-005, the risky part. The server prices every item with
// calculateItemPrice, so verification is correct the moment calculateItemPrice
// understands `enlarge` — PROVIDED THE FIELD ACTUALLY ARRIVES. Until now
// CartPage sent `designs: i.designs.map(d => ({ area: d.area }))` and threw
// everything else away, so an enlarged cart would have been refused with
// "Amount verification failed" and the customer could not pay.
//
// Both halves of that contract live in lib/payment-verify.ts: the mapping the
// cart sends and the check the route runs. verifyAmount is a PURE MOVE out of
// app/api/payment/create/route.ts — the tolerance arithmetic below is pinned
// exactly as it stands today (server − 2 … server + delivery shipping +
// express-when-eligible + 2). It lives in lib/ and not as a route export
// because Next 14 type-validates route exports and rejects extra ones.
//
// Pinned: tshirt cotton 37, front_full 10, enlarge step 1.5, discount 15 → 5%,
// delivery shipping 35, express 50 for up to 20 units.

function design(area: DesignAreaType, enlarge?: number): DesignArea {
  return {
    area,
    areaName: area,
    imageUrl: 'https://example.com/art.png',
    fileName: 'art.png',
    ...(enlarge === undefined ? {} : { enlarge: enlarge as 1 | 2 | 3 }),
  }
}

function cartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'tshirt-cotton-black-x',
    productType: 'tshirt',
    fabricType: 'cotton',
    color: 'black',
    designs: [design('front_full')],
    sizes: [{ size: 'M', quantity: 20 }],
    pricePerUnit: 47,
    totalQuantity: 20,
    totalPrice: 940,
    ...overrides,
  }
}

/** 20 shirts, front_full enlarged 2 steps: 37 + 10 + 3 = 50 per unit. */
const enlargedCart = (quantity = 20): CartItem[] => [
  cartItem({
    designs: [design('front_full', 2)],
    sizes: [{ size: 'M', quantity }],
    pricePerUnit: 50,
    totalQuantity: quantity,
    totalPrice: 50 * quantity,
  }),
]

afterEach(() => {
  applyPricingOverrides({})
})

describe('buildPaymentItems — the enlargement reaches the server', () => {
  it('an enlarged design carries its enlarge', () => {
    const out = buildPaymentItems(enlargedCart())
    expect(out[0].designs).toEqual([{ area: 'front_full', enlarge: 2 }])
  })

  it('a plain design carries NO enlarge key', () => {
    const out = buildPaymentItems([cartItem()])
    expect(out[0].designs).toEqual([{ area: 'front_full' }])
    expect('enlarge' in (out[0].designs as Record<string, unknown>[])[0]).toBe(false)
  })

  it('enlarge: 0 is not sent as 0', () => {
    const out = buildPaymentItems([cartItem({ designs: [design('front_full', 0)] })])
    expect('enlarge' in (out[0].designs as Record<string, unknown>[])[0]).toBe(false)
  })

  it('a stale enlargement on a non-enlargeable area is not sent', () => {
    const out = buildPaymentItems([cartItem({ designs: [design('chest_logo', 2)] })])
    expect(out[0].designs).toEqual([{ area: 'chest_logo' }])
  })

  it('a hostile 7 is sent clamped to 3', () => {
    const out = buildPaymentItems([cartItem({ designs: [design('front_full', 7)] })])
    expect(out[0].designs).toEqual([{ area: 'front_full', enlarge: 3 }])
  })

  it('every field the cart sends today is still sent, and nothing more', () => {
    const out = buildPaymentItems(enlargedCart())
    expect(Object.keys(out[0]).sort()).toEqual(
      ['designs', 'fabricType', 'fixedPrice', 'productType', 'sizes', 'totalQuantity'].sort()
    )
    expect(out[0].productType).toBe('tshirt')
    expect(out[0].fabricType).toBe('cotton')
    expect(out[0].sizes).toEqual([{ size: 'M', quantity: 20 }])
    expect(out[0].totalQuantity).toBe(20)
  })

  it('a fixed-price special product still sends its fixedPrice', () => {
    const out = buildPaymentItems([
      cartItem({ specialProductName: 'X', fixedPrice: 99, designs: [] }),
    ])
    expect(out[0].fixedPrice).toBe(99)
    expect(out[0].designs).toEqual([])
  })

  it('maps every item in the cart', () => {
    const out = buildPaymentItems([...enlargedCart(), cartItem()])
    expect(out).toHaveLength(2)
  })
})

describe('verifyAmount — an enlarged cart is accepted', () => {
  it('accepts the exact enlarged total: 20 × 50 = 1000 less 5% = 950', () => {
    expect(verifyAmount(buildPaymentItems(enlargedCart()), 950)).toBe(true)
  })

  it('REFUSES the unenlarged total for an enlarged cart (what the bug would have charged)', () => {
    // 20 × 47 = 940 less 5% = 893 — far below the 948 floor
    expect(verifyAmount(buildPaymentItems(enlargedCart()), 893)).toBe(false)
  })

  it('accepts the enlarged total plus delivery shipping', () => {
    expect(verifyAmount(buildPaymentItems(enlargedCart()), 985)).toBe(true)
  })

  it('an admin step-price override is honoured', () => {
    applyPricingOverrides({ enlargeStepPrice: 2 })
    // 37 + 10 + 4 = 51 per unit; 20 × 51 = 1020 less 5% = 969
    expect(verifyAmount(buildPaymentItems(enlargedCart()), 969)).toBe(true)
    expect(verifyAmount(buildPaymentItems(enlargedCart()), 950)).toBe(false)
  })
})

describe('verifyAmount — the tolerance window is byte-identical to today', () => {
  const items = () => buildPaymentItems(enlargedCart())

  it('the floor is the server amount minus 2', () => {
    expect(verifyAmount(items(), 948)).toBe(true)
    expect(verifyAmount(items(), 947.99)).toBe(false)
  })

  it('the ceiling is the server amount plus delivery shipping plus 2', () => {
    expect(verifyAmount(items(), 987)).toBe(true)
    expect(verifyAmount(items(), 987.01)).toBe(false)
  })

  it('express adds its 50 only when the order is eligible (≤20 units)', () => {
    expect(verifyAmount(items(), 1037, 0, true)).toBe(true)
    expect(verifyAmount(items(), 1037.01, 0, true)).toBe(false)
  })

  it('express on a 21-unit order gets NO allowance', () => {
    // 21 × 50 = 1050 less 5% = 997.5 → ceiling 997.5 + 35 + 2 = 1034.5
    expect(verifyAmount(buildPaymentItems(enlargedCart(21)), 1034.5, 0, true)).toBe(true)
    expect(verifyAmount(buildPaymentItems(enlargedCart(21)), 1080, 0, true)).toBe(false)
  })

  it('a coupon discount lowers the whole window', () => {
    expect(verifyAmount(items(), 850, 100)).toBe(true)
    expect(verifyAmount(items(), 950, 100)).toBe(false)
  })

  it('an empty cart is always accepted', () => {
    expect(verifyAmount([], 1)).toBe(true)
  })
})
