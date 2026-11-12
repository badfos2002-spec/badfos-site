import { describe, it, expect } from 'vitest'
import { VARIANTS, type Placement } from '@/components/designer/three/placements'
import { DESIGN_AREA_OVERLAYS, SWEATSHIRT_AREA_OVERRIDES } from '@/lib/mockup-data'

// TICKET-007: the shoulder print sat too high (hugging the shoulder seam) on
// every shirt and sweatshirt. It moves down the sleeve to just above the hem;
// the long-sleeve family lands at the same arm height as the lowered tee.

const areas = (v: keyof typeof VARIANTS) =>
  (VARIANTS[v] as { areas: Record<string, Placement | undefined> }).areas

// The TICKET-004 heights the user saw as too high.
const OLD_Y = { tshirt: 0.59, polo: 0.52, oversized: 0.58, hoodie: 0.5, sweatshirt: 0.5, ziphoodie: 0.5 } as const
const SHIRTS = Object.keys(OLD_Y) as (keyof typeof OLD_Y)[]
const LONG = ['hoodie', 'sweatshirt', 'ziphoodie'] as const

const pct = (s: string | undefined) => parseFloat(s as string)

describe('3D — the shoulder print is lower on every shirt variant', () => {
  for (const v of SHIRTS) {
    it(`${v}: shoulder_right is below its TICKET-004 height`, () => {
      expect(areas(v).shoulder_right!.position[1]).toBeLessThan(OLD_Y[v])
    })

    it(`${v}: the left shoulder still mirrors the right (x → −x, same y/z, same size/depth)`, () => {
      const r = areas(v).shoulder_right!
      const l = areas(v).shoulder_left!
      expect(l.position[0]).toBeCloseTo(-r.position[0], 10)
      expect(l.position[1]).toBe(r.position[1])
      expect(l.position[2]).toBe(r.position[2])
      expect(l.size).toBe(r.size)
      expect(l.depth).toBe(r.depth)
      // TICKET-008 adds a mirrored roll in rotation[2]; x/y stay as they were.
      expect(r.rotation.slice(0, 2)).toEqual([0, -Math.PI / 2])
      expect(l.rotation.slice(0, 2)).toEqual([0, Math.PI / 2])
      expect(l.rotation[2] + r.rotation[2]).toBe(0) // mirrored (and 0 + 0 on oversized, no −0 trap)
    })

    it(`${v}: the shoulder print no longer sits above the chest-logo row`, () => {
      expect(areas(v).shoulder_right!.position[1]).toBeLessThanOrEqual(areas(v).chest_logo!.position[1])
    })
  }

  it('the three long-sleeve variants share ONE shoulder position', () => {
    const ref = areas('hoodie').shoulder_right!.position
    for (const v of LONG) expect(areas(v).shoulder_right!.position).toEqual(ref)
  })

  it('the hoodie family drops by at least as much as the tee — same arm height, not the old seam spot', () => {
    // The tee and hoodie sleeves were both tuned "just below the shoulder seam"
    // in TICKET-004 (0.59 / 0.50). Matching the jackets to the lowered shirts
    // means the hoodie print travels down the arm by a comparable distance —
    // never stays put, and never runs off toward the cuff (≤ 2× the tee's drop).
    const teeDrop = OLD_Y.tshirt - areas('tshirt').shoulder_right!.position[1]
    const hoodieDrop = OLD_Y.hoodie - areas('hoodie').shoulder_right!.position[1]
    expect(teeDrop).toBeGreaterThan(0)
    expect(hoodieDrop).toBeGreaterThanOrEqual(teeDrop * 0.75)
    expect(hoodieDrop).toBeLessThanOrEqual(teeDrop * 2)
  })
})

describe('2D — the overlay boxes move down too', () => {
  it('t-shirt photo: both shoulder boxes are lower than 36% and still mirror', () => {
    const r = DESIGN_AREA_OVERLAYS.shoulder_right.style
    const l = DESIGN_AREA_OVERLAYS.shoulder_left.style
    expect(pct(r.top)).toBeGreaterThan(36)
    expect(pct(l.top)).toBe(pct(r.top))
    expect(pct(r.left) + pct(r.width) + pct(l.left)).toBeCloseTo(100, 10)
  })

  it('sweatshirt photo: both shoulder boxes are lower than 40% and still mirror', () => {
    const r = SWEATSHIRT_AREA_OVERRIDES.shoulder_right
    const l = SWEATSHIRT_AREA_OVERRIDES.shoulder_left
    expect(pct(r.top)).toBeGreaterThan(40)
    expect(pct(l.top)).toBe(pct(r.top))
    expect(pct(r.left) + pct(r.width) + pct(l.left)).toBeCloseTo(100, 10)
  })
})
