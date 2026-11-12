import { describe, it, expect } from 'vitest'
import { generateCartItemId } from '@/lib/pricing'
import type { DesignArea, DesignAreaType, ProductConfig } from '@/lib/types'

// TICKET-005: the same artwork at +0 and at +2 is a DIFFERENT cart line (it
// costs more and looks different), so the enlargement joins the cart-item
// fingerprint. The marker is appended ONLY when the normalised step is above 0,
// so every id that exists today — including the literal pinned in
// tests/pricing.test.ts, copied in below — stays byte-identical.

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

describe('generateCartItemId — the existing ids are untouched', () => {
  it('the pinned id prefix is unchanged', () => {
    expect(generateCartItemId(config({ designs: [design('front_full')] }))).toContain(
      'tshirt-cotton-black-front_full:art.png:'
    )
  })

  it('an item with no designs is still exactly tshirt-none-black-', () => {
    expect(
      generateCartItemId({ productType: 'tshirt', color: 'black', designs: [], sizes: [] })
    ).toBe('tshirt-none-black-')
  })

  it('a plain design carries no enlargement marker at all', () => {
    expect(generateCartItemId(config({ designs: [design('front_full')] }))).not.toContain(':e')
  })

  it('enlarge: 0 produces the SAME id as no enlarge key', () => {
    expect(generateCartItemId(config({ designs: [design('front_full', 0)] }))).toBe(
      generateCartItemId(config({ designs: [design('front_full')] }))
    )
  })
})

describe('generateCartItemId — an enlarged design is its own cart line', () => {
  it('enlarge 2 and no enlargement are different ids', () => {
    expect(generateCartItemId(config({ designs: [design('front_full', 2)] }))).not.toBe(
      generateCartItemId(config({ designs: [design('front_full')] }))
    )
  })

  it('enlarge 2 and enlarge 3 are different ids', () => {
    expect(generateCartItemId(config({ designs: [design('front_full', 2)] }))).not.toBe(
      generateCartItemId(config({ designs: [design('front_full', 3)] }))
    )
  })

  it('two adds of the identical enlarged design collapse into one line', () => {
    expect(generateCartItemId(config({ designs: [design('back', 1)] }))).toBe(
      generateCartItemId(config({ designs: [design('back', 1)] }))
    )
  })

  it('the enlargement of EACH area counts', () => {
    expect(
      generateCartItemId(config({ designs: [design('front_full', 2), design('back')] }))
    ).not.toBe(
      generateCartItemId(config({ designs: [design('front_full'), design('back', 2)] }))
    )
  })

  it('the id is still order-insensitive across areas', () => {
    const front = design('front_full', 2)
    const back = design('back', 1)
    expect(generateCartItemId(config({ designs: [front, back] }))).toBe(
      generateCartItemId(config({ designs: [back, front] }))
    )
  })
})

describe('generateCartItemId — a stale enlargement never splits a line', () => {
  it('chest_logo with enlarge 2 has the same id as a plain chest_logo', () => {
    expect(generateCartItemId(config({ designs: [design('chest_logo', 2)] }))).toBe(
      generateCartItemId(config({ designs: [design('chest_logo')] }))
    )
  })

  it('a tote front_full with enlarge 2 has the same id as a plain one', () => {
    const tote = (enlarge?: number): ProductConfig => ({
      productType: 'tote',
      fabricType: 'volume',
      color: 'natural',
      designs: [design('front_full', enlarge)],
      sizes: [],
    })
    expect(generateCartItemId(tote(2))).toBe(generateCartItemId(tote()))
  })

  it('a hostile enlarge 7 lands on the same line as enlarge 3', () => {
    expect(generateCartItemId(config({ designs: [design('front_full', 7)] }))).toBe(
      generateCartItemId(config({ designs: [design('front_full', 3)] }))
    )
  })

  it('a special product is still identified by its name alone', () => {
    expect(
      generateCartItemId(config({ specialProductName: 'X', designs: [design('front_full', 2)] }))
    ).toBe('special-X')
  })
})
