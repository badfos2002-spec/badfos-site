import { describe, it, expect } from 'vitest'
import {
  ENLARGE_MAX_STEPS,
  canEnlarge,
  normalizeEnlarge,
  enlargeScale,
  enlargeTransform,
  withEnlarge,
} from '@/lib/enlarge'
import type { DesignArea, DesignAreaType } from '@/lib/types'

// TICKET-005: the enlargement model. One copy of the 0.1 step and one copy of
// the 3-step ceiling live in lib/enlarge.ts; the 2D overlays, the 3D mapping,
// the price and the cart id all read them from here. Every expected value is a
// literal so a change to the step size or the ceiling breaks a test.
//
// The gate is productType AND area, not area alone: tote and baby also have
// front_full/back and vest has back, and none of them offers enlargement.

function design(area: DesignAreaType, extra: Partial<DesignArea> = {}): DesignArea {
  return {
    area,
    areaName: area,
    imageUrl: 'https://example.com/art.png',
    fileName: 'art.png',
    ...extra,
  }
}

describe('ENLARGE_MAX_STEPS', () => {
  it('is 3 steps', () => {
    expect(ENLARGE_MAX_STEPS).toBe(3)
  })
})

describe('canEnlarge — only t-shirts and sweatshirts, only front_full and back', () => {
  it('t-shirt front_full and back can be enlarged', () => {
    expect(canEnlarge('tshirt', 'front_full')).toBe(true)
    expect(canEnlarge('tshirt', 'back')).toBe(true)
  })

  it('sweatshirt front_full and back can be enlarged', () => {
    expect(canEnlarge('sweatshirt', 'front_full')).toBe(true)
    expect(canEnlarge('sweatshirt', 'back')).toBe(true)
  })

  it('no logo area and neither shoulder can be enlarged', () => {
    for (const area of ['chest_logo', 'chest_logo_right', 'chest_logo_center', 'shoulder_right', 'shoulder_left'] as const) {
      expect(canEnlarge('tshirt', area)).toBe(false)
      expect(canEnlarge('sweatshirt', area)).toBe(false)
    }
  })

  it('no other product can be enlarged, even on front_full or back', () => {
    expect(canEnlarge('tote', 'front_full')).toBe(false)
    expect(canEnlarge('tote', 'back')).toBe(false)
    expect(canEnlarge('baby', 'front_full')).toBe(false)
    expect(canEnlarge('baby', 'back')).toBe(false)
    expect(canEnlarge('vest', 'back')).toBe(false)
    expect(canEnlarge('cap', 'center')).toBe(false)
    expect(canEnlarge('buff', 'center')).toBe(false)
    expect(canEnlarge('apron', 'center')).toBe(false)
  })

  it('a missing product or area can never be enlarged', () => {
    expect(canEnlarge(undefined, 'front_full')).toBe(false)
    expect(canEnlarge('tshirt', undefined)).toBe(false)
  })
})

describe('normalizeEnlarge — the single gate every consumer goes through', () => {
  it('keeps 1, 2 and 3 on an enlargeable area', () => {
    expect(normalizeEnlarge('tshirt', 'front_full', 1)).toBe(1)
    expect(normalizeEnlarge('tshirt', 'front_full', 2)).toBe(2)
    expect(normalizeEnlarge('tshirt', 'back', 3)).toBe(3)
  })

  it('absent, 0 and null are all 0', () => {
    expect(normalizeEnlarge('tshirt', 'front_full', undefined)).toBe(0)
    expect(normalizeEnlarge('tshirt', 'front_full', 0)).toBe(0)
    expect(normalizeEnlarge('tshirt', 'front_full', null)).toBe(0)
  })

  it('CLAMPS a hostile 7 to 3 — never drops it', () => {
    expect(normalizeEnlarge('tshirt', 'back', 7)).toBe(3)
    expect(normalizeEnlarge('tshirt', 'back', 999)).toBe(3)
  })

  it('a negative or non-numeric value is 0', () => {
    expect(normalizeEnlarge('tshirt', 'back', -1)).toBe(0)
    expect(normalizeEnlarge('tshirt', 'back', NaN)).toBe(0)
    expect(normalizeEnlarge('tshirt', 'back', 'two')).toBe(0)
    expect(normalizeEnlarge('tshirt', 'back', {})).toBe(0)
  })

  it('a fractional value floors to a whole step', () => {
    expect(normalizeEnlarge('tshirt', 'back', 2.5)).toBe(2)
    expect(normalizeEnlarge('tshirt', 'back', 0.9)).toBe(0)
  })

  it('is 0 on an area that does not offer enlargement', () => {
    expect(normalizeEnlarge('tshirt', 'chest_logo', 2)).toBe(0)
    expect(normalizeEnlarge('tshirt', 'shoulder_right', 2)).toBe(0)
  })

  it('is 0 on a product that does not offer enlargement', () => {
    expect(normalizeEnlarge('tote', 'front_full', 2)).toBe(0)
    expect(normalizeEnlarge('baby', 'back', 3)).toBe(0)
    expect(normalizeEnlarge('vest', 'back', 2)).toBe(0)
  })
})

describe('enlargeScale — 1 + 0.1 per step', () => {
  it('no enlargement is scale 1', () => {
    expect(enlargeScale(undefined)).toBeCloseTo(1)
    expect(enlargeScale(0)).toBeCloseTo(1)
  })

  it('1, 2 and 3 steps are 1.1, 1.2 and 1.3', () => {
    expect(enlargeScale(1)).toBeCloseTo(1.1)
    expect(enlargeScale(2)).toBeCloseTo(1.2)
    expect(enlargeScale(3)).toBeCloseTo(1.3)
  })

  it('CLAMPS past 3 steps to 1.3', () => {
    expect(enlargeScale(7)).toBeCloseTo(1.3)
  })

  it('a negative value is scale 1', () => {
    expect(enlargeScale(-2)).toBeCloseTo(1)
  })
})

describe('enlargeTransform — the shape the 3D decal takes', () => {
  it('never offsets the design, only scales it', () => {
    expect(enlargeTransform(2)).toEqual({ dx: 0, dy: 0, scale: 1.2 })
  })

  it('no enlargement is the identity transform', () => {
    expect(enlargeTransform(undefined)).toEqual({ dx: 0, dy: 0, scale: 1 })
    expect(enlargeTransform(0)).toEqual({ dx: 0, dy: 0, scale: 1 })
  })

  it('3 steps is 1.3 and 7 clamps to it', () => {
    expect(enlargeTransform(3)).toEqual({ dx: 0, dy: 0, scale: 1.3 })
    expect(enlargeTransform(7)).toEqual({ dx: 0, dy: 0, scale: 1.3 })
  })
})

describe('withEnlarge — writes the step onto one area and never writes a 0', () => {
  it('sets the step on the matching area only', () => {
    const designs = [design('front_full'), design('back')]
    const next = withEnlarge(designs, 'tshirt', 'back', 2)
    expect(next.find(d => d.area === 'back')!.enlarge).toBe(2)
    expect('enlarge' in next.find(d => d.area === 'front_full')!).toBe(false)
  })

  it('STRIPS the key at 0 rather than writing enlarge: 0 (addDoc would carry it)', () => {
    const designs = [design('back', { enlarge: 2 })]
    const next = withEnlarge(designs, 'tshirt', 'back', 0)
    expect('enlarge' in next[0]).toBe(false)
  })

  it('never writes the key on an area that does not offer enlargement', () => {
    const next = withEnlarge([design('chest_logo')], 'tshirt', 'chest_logo', 2)
    expect('enlarge' in next[0]).toBe(false)
  })

  it('never writes the key on a product that does not offer enlargement', () => {
    const next = withEnlarge([design('front_full')], 'tote', 'front_full', 2)
    expect('enlarge' in next[0]).toBe(false)
  })

  it('clamps a step above the ceiling', () => {
    const next = withEnlarge([design('front_full')], 'tshirt', 'front_full', 7)
    expect(next[0].enlarge).toBe(3)
  })

  it('leaves the rest of the design untouched and does not mutate the input', () => {
    const designs = [design('front_full')]
    const next = withEnlarge(designs, 'tshirt', 'front_full', 1)
    expect(next[0].imageUrl).toBe('https://example.com/art.png')
    expect(next[0].fileName).toBe('art.png')
    expect(next[0].areaName).toBe('front_full')
    expect('enlarge' in designs[0]).toBe(false)
  })

  it('an area with no design is left alone', () => {
    const designs = [design('front_full')]
    expect(withEnlarge(designs, 'tshirt', 'back', 2)).toEqual(designs)
  })
})
