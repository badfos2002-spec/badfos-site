import { describe, it, expect } from 'vitest'
import { to3DDesigns } from '@/lib/enlarge'

// TICKET-005: the 3D decal already supports a transform (the admin sketch tool
// drags and scales with it). Enlargement reuses that path instead of inventing
// one: every Preview3DStage caller maps its designs through to3DDesigns, which
// turns the step count into { dx: 0, dy: 0, scale }.
//
// The mapping is pure and lives in lib/enlarge.ts — NOT under
// components/designer/three/ — so it is testable without React Three Fiber and
// so this ticket keeps its hands off the files TICKET-004 PR B is editing.
//
// dx and dy are ALWAYS 0: enlargement grows the print in place, centred in its
// area. There is no dragging in the customer-facing designers.

describe('to3DDesigns — the step count becomes a decal scale', () => {
  it('enlarge 2 on front_full is scale 1.2', () => {
    const out = to3DDesigns('tshirt', [{ area: 'front_full', url: 'https://x/a.png', enlarge: 2 }])
    expect(out).toHaveLength(1)
    expect(out[0].area).toBe('front_full')
    expect(out[0].url).toBe('https://x/a.png')
    expect(out[0].transform.scale).toBeCloseTo(1.2)
  })

  it('1 and 3 steps are 1.1 and 1.3', () => {
    const out = to3DDesigns('tshirt', [
      { area: 'front_full', url: 'a', enlarge: 1 },
      { area: 'back', url: 'b', enlarge: 3 },
    ])
    expect(out[0].transform.scale).toBeCloseTo(1.1)
    expect(out[1].transform.scale).toBeCloseTo(1.3)
  })

  it('dx and dy are 0 at every step', () => {
    for (const enlarge of [undefined, 0, 1, 2, 3, 7]) {
      const out = to3DDesigns('tshirt', [{ area: 'front_full', url: 'a', enlarge }])
      expect(out[0].transform.dx).toBe(0)
      expect(out[0].transform.dy).toBe(0)
    }
  })

  it('no enlargement is scale 1', () => {
    const out = to3DDesigns('tshirt', [{ area: 'front_full', url: 'a' }])
    expect(out[0].transform.scale).toBeCloseTo(1)
  })

  it('a sweatshirt scales the same way', () => {
    const out = to3DDesigns('sweatshirt', [{ area: 'back', url: 'a', enlarge: 2 }])
    expect(out[0].transform.scale).toBeCloseTo(1.2)
  })
})

describe('to3DDesigns — a stale enlargement never scales anything', () => {
  it('a chest_logo carrying enlarge: 2 renders at scale 1', () => {
    const out = to3DDesigns('tshirt', [{ area: 'chest_logo', url: 'a', enlarge: 2 }])
    expect(out[0].transform.scale).toBeCloseTo(1)
  })

  it('a shoulder carrying enlarge: 2 renders at scale 1', () => {
    const out = to3DDesigns('tshirt', [{ area: 'shoulder_left', url: 'a', enlarge: 2 }])
    expect(out[0].transform.scale).toBeCloseTo(1)
  })

  it('a TOTE front_full carrying enlarge: 2 renders at scale 1', () => {
    const out = to3DDesigns('tote', [{ area: 'front_full', url: 'a', enlarge: 2 }])
    expect(out[0].transform.scale).toBeCloseTo(1)
  })

  it('a hostile enlarge 7 clamps to 1.3', () => {
    const out = to3DDesigns('tshirt', [{ area: 'front_full', url: 'a', enlarge: 7 }])
    expect(out[0].transform.scale).toBeCloseTo(1.3)
  })
})

describe('to3DDesigns — an explicit transform wins', () => {
  it("an admin sketch's own transform is forwarded untouched", () => {
    const t = { dx: 0.1, dy: -0.2, scale: 0.8 }
    const out = to3DDesigns('tshirt', [{ area: 'front_full', url: 'a', enlarge: 2, transform: t }])
    expect(out[0].transform).toEqual(t)
  })

  it('without one, the enlargement supplies the transform', () => {
    const out = to3DDesigns('tshirt', [{ area: 'front_full', url: 'a', enlarge: 2, transform: undefined }])
    expect(out[0].transform).toEqual({ dx: 0, dy: 0, scale: 1.2 })
  })
})

describe('to3DDesigns — the list itself', () => {
  it('keeps every design and their order', () => {
    const out = to3DDesigns('tshirt', [
      { area: 'front_full', url: 'a' },
      { area: 'chest_logo', url: 'b' },
      { area: 'back', url: 'c', enlarge: 2 },
    ])
    expect(out.map(d => d.area)).toEqual(['front_full', 'chest_logo', 'back'])
  })

  it('an empty list maps to an empty list', () => {
    expect(to3DDesigns('tshirt', [])).toEqual([])
  })
})
