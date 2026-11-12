import { describe, it, expect } from 'vitest'
import {
  formatPrice,
  formatAmount,
  formatPriceDetailed,
  calculateItemPrice,
} from '@/lib/pricing'
import type { ProductConfig } from '@/lib/types'

// TICKET-005: the enlargement step is ₪1.5, so a per-unit price can land on a
// half shekel. formatPrice used toFixed(0), which would display ₪38.5 as "₪39"
// while Grow charges 38.5 — the display has to tell the truth.
//
// The rule: ONE decimal when the value does not round to a whole shekel at one
// decimal place; otherwise exactly today's output. So no "₪38.0" ever appears,
// and every integer is byte-identical to before.
//
// formatAmount is the same rule without the ₪ — the sweatshirt designer panel
// writes the shekel as a SUFFIX ("63₪") and must keep doing so, so both forms
// share one rounding rule instead of each having its own.
//
// THE PRE-EXISTING CASES THIS ALSO CHANGES (deliberate, lead-approved): a
// weighted size surcharge and a discounted total have always been able to come
// out fractional, and were rounded on screen. The last describe block pins one
// of those real paths.

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

describe('formatPrice — integers are unchanged', () => {
  it('37 is ₪37', () => {
    expect(formatPrice(37)).toBe('₪37')
  })

  it('0 is ₪0', () => {
    expect(formatPrice(0)).toBe('₪0')
  })

  it('1000 is ₪1000', () => {
    expect(formatPrice(1000)).toBe('₪1000')
  })
})

describe('formatPrice — a fractional price shows one decimal', () => {
  it('38.5 is ₪38.5, not ₪39', () => {
    expect(formatPrice(38.5)).toBe('₪38.5')
  })

  it('48.5 is ₪48.5 (one enlargement step on a ₪47 shirt)', () => {
    expect(formatPrice(48.5)).toBe('₪48.5')
  })

  it('38.25 rounds to ₪38.3', () => {
    expect(formatPrice(38.25)).toBe('₪38.3')
  })

  it('a value that rounds to a whole shekel shows NO decimal — never ₪38.0', () => {
    expect(formatPrice(38.04)).toBe('₪38')
    expect(formatPrice(37.98)).toBe('₪38')
  })

  it('floating-point noise does not leak a decimal', () => {
    expect(formatPrice(50.400000000000006)).toBe('₪50.4')
    expect(formatPrice(957.5999999999999)).toBe('₪957.6')
  })
})

describe('formatAmount — the same rule without the shekel sign', () => {
  it('matches formatPrice minus the ₪', () => {
    expect(formatAmount(37)).toBe('37')
    expect(formatAmount(0)).toBe('0')
    expect(formatAmount(1000)).toBe('1000')
    expect(formatAmount(38.5)).toBe('38.5')
    expect(formatAmount(38.25)).toBe('38.3')
    expect(formatAmount(38.04)).toBe('38')
  })

  it('formatPrice is exactly ₪ + formatAmount', () => {
    for (const n of [0, 37, 38.5, 38.25, 957.5999999999999, 1000]) {
      expect(formatPrice(n)).toBe(`₪${formatAmount(n)}`)
    }
  })
})

describe('formatPriceDetailed is untouched', () => {
  it('38.5 is still ₪38.50', () => {
    expect(formatPriceDetailed(38.5)).toBe('₪38.50')
  })

  it('37 is still ₪37.00', () => {
    expect(formatPriceDetailed(37)).toBe('₪37.00')
  })
})

describe('the pre-existing fractional path this change also fixes', () => {
  it('7 shirts with one 3XL: 37 + 12/7 now reads ₪38.7 (it read ₪39)', () => {
    const unit = calculateItemPrice(
      config({ sizes: [{ size: 'M', quantity: 6 }, { size: '3XL', quantity: 1 }] })
    )
    expect(unit).toBeCloseTo(38.714285714285715)
    expect(formatPrice(unit)).toBe('₪38.7')
  })

  it('a 5% discount on 1008 now reads ₪957.6 (it read ₪958)', () => {
    expect(formatPrice(1008 - 1008 * 0.05)).toBe('₪957.6')
  })
})
