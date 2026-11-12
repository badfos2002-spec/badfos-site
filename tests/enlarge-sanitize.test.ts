import { describe, it, expect } from 'vitest'
import { sanitizeItems, itemsSignature } from '@/lib/order-sanitize'

// TICKET-005: sanitizeItems whitelists the design fields that reach Firestore
// through /api/order-sync and /api/verify-order-sync. Without `enlarge` on the
// whitelist, a re-checkout silently drops the enlargement the customer paid
// for.
//
// lib/firebase.ts has no ignoreUndefinedProperties and addDoc THROWS on an
// explicit undefined, so the key must be absent — not 0, not undefined. Every
// assertion here uses `'enlarge' in d`, never toBeUndefined(), because
// toBeUndefined() passes for the exact value that breaks the write.

function item(overrides: Record<string, unknown> = {}) {
  return {
    productType: 'tshirt',
    fabricType: 'cotton',
    color: 'black',
    sizes: [{ size: 'M', quantity: 2 }],
    designs: [
      { area: 'back', areaName: 'גב', imageUrl: 'https://example.com/a.png', fileName: 'a.png' },
    ],
    pricePerUnit: 50,
    totalQuantity: 2,
    totalPrice: 100,
    ...overrides,
  }
}

function design(area: string, enlarge?: unknown) {
  return {
    area,
    areaName: area,
    imageUrl: 'https://example.com/a.png',
    fileName: 'a.png',
    ...(enlarge === undefined ? {} : { enlarge }),
  }
}

describe('sanitizeItems — the enlargement survives', () => {
  it('keeps enlarge: 2 on back', () => {
    const out = sanitizeItems([item({ designs: [design('back', 2)] })])
    expect(out[0].designs[0].enlarge).toBe(2)
  })

  it('keeps enlarge: 2 on front_full of a sweatshirt', () => {
    const out = sanitizeItems([
      item({ productType: 'sweatshirt', fabricType: 'kangaroo', designs: [design('front_full', 2)] }),
    ])
    expect(out[0].designs[0].enlarge).toBe(2)
  })

  it('every field sent today is still sent', () => {
    const out = sanitizeItems([item({ designs: [design('back', 1)] })])
    expect(out[0].designs[0]).toEqual({
      area: 'back',
      areaName: 'back',
      imageUrl: 'https://example.com/a.png',
      fileName: 'a.png',
      enlarge: 1,
    })
    expect(out[0].productType).toBe('tshirt')
    expect(out[0].fabricType).toBe('cotton')
    expect(out[0].color).toBe('black')
    expect(out[0].pricePerUnit).toBe(50)
    expect(out[0].totalQuantity).toBe(2)
    expect(out[0].totalPrice).toBe(100)
    expect(out[0].sizes).toEqual([{ size: 'M', quantity: 2 }])
  })
})

describe('sanitizeItems — the key is ABSENT whenever there is no enlargement', () => {
  it('a plain design carries no enlarge key', () => {
    const out = sanitizeItems([item()])
    expect('enlarge' in out[0].designs[0]).toBe(false)
  })

  it('enlarge: 0 is stripped, never written as 0', () => {
    const out = sanitizeItems([item({ designs: [design('back', 0)] })])
    expect('enlarge' in out[0].designs[0]).toBe(false)
  })

  it('enlarge: undefined is stripped, never written as undefined', () => {
    const out = sanitizeItems([item({ designs: [{ ...design('back'), enlarge: undefined }] })])
    expect('enlarge' in out[0].designs[0]).toBe(false)
  })

  it('enlarge: null is stripped', () => {
    const out = sanitizeItems([item({ designs: [design('back', null)] })])
    expect('enlarge' in out[0].designs[0]).toBe(false)
  })

  it('a negative enlargement is stripped', () => {
    const out = sanitizeItems([item({ designs: [design('back', -1)] })])
    expect('enlarge' in out[0].designs[0]).toBe(false)
  })

  it('a non-numeric enlargement is stripped', () => {
    const out = sanitizeItems([item({ designs: [design('back', 'two')] })])
    expect('enlarge' in out[0].designs[0]).toBe(false)
  })

  it('it is dropped on chest_logo — that area has no enlargement', () => {
    const out = sanitizeItems([item({ designs: [design('chest_logo', 2)] })])
    expect('enlarge' in out[0].designs[0]).toBe(false)
  })

  it('it is dropped on a shoulder', () => {
    const out = sanitizeItems([item({ designs: [design('shoulder_left', 2)] })])
    expect('enlarge' in out[0].designs[0]).toBe(false)
  })

  it('it is dropped on a TOTE front_full — that product has no enlargement', () => {
    const out = sanitizeItems([
      item({ productType: 'tote', fabricType: 'volume', designs: [design('front_full', 2)] }),
    ])
    expect('enlarge' in out[0].designs[0]).toBe(false)
  })

  it('it is dropped on a VEST back — reachable only through the vest designer', () => {
    const out = sanitizeItems([
      item({ productType: 'vest', fabricType: undefined, designs: [design('back', 2)] }),
    ])
    expect('enlarge' in out[0].designs[0]).toBe(false)
  })

  it('it is dropped on a baby front_full', () => {
    const out = sanitizeItems([
      item({ productType: 'baby', fabricType: 'default', designs: [design('front_full', 3)] }),
    ])
    expect('enlarge' in out[0].designs[0]).toBe(false)
  })
})

describe('sanitizeItems — a hostile value is CLAMPED to 3, not dropped', () => {
  it('enlarge: 7 is stored as 3, so the record matches the verified price', () => {
    const out = sanitizeItems([item({ designs: [design('back', 7)] })])
    expect(out[0].designs[0].enlarge).toBe(3)
  })

  it('a fractional 2.7 floors to 2', () => {
    const out = sanitizeItems([item({ designs: [design('back', 2.7)] })])
    expect(out[0].designs[0].enlarge).toBe(2)
  })
})

describe('itemsSignature — the enlargement is part of the signature', () => {
  it('the same cart with and without enlargement signs differently', () => {
    expect(itemsSignature([item({ designs: [design('back', 2)] })])).not.toBe(
      itemsSignature([item({ designs: [design('back')] })])
    )
  })

  it('enlarge 2 and enlarge 3 sign differently', () => {
    expect(itemsSignature([item({ designs: [design('back', 2)] })])).not.toBe(
      itemsSignature([item({ designs: [design('back', 3)] })])
    )
  })

  it('a PLAIN item signs byte-identically to before — enlarge: 0 changes nothing', () => {
    expect(itemsSignature([item({ designs: [design('back', 0)] })])).toBe(
      itemsSignature([item({ designs: [design('back')] })])
    )
  })

  it('a stale enlargement on chest_logo does not change the signature', () => {
    expect(itemsSignature([item({ designs: [design('chest_logo', 2)] })])).toBe(
      itemsSignature([item({ designs: [design('chest_logo')] })])
    )
  })

  it('the signature is still order-insensitive across designs', () => {
    const front = design('front_full', 2)
    const back = design('back', 1)
    expect(itemsSignature([item({ designs: [front, back] })])).toBe(
      itemsSignature([item({ designs: [back, front] })])
    )
  })
})
