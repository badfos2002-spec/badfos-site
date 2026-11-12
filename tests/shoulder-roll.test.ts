import { describe, it, expect } from 'vitest'
import { VARIANTS, angleForArea, type Placement } from '@/components/designer/three/placements'
import { DESIGN_AREA_OVERLAYS, SWEATSHIRT_AREA_OVERRIDES } from '@/lib/mockup-data'

// TICKET-008: a slight roll (rotate only, never move) of the shoulder print
// square, so its bottom edge turns toward the sleeve and reads as more parallel
// to the sleeve hem. Every shirt variant but `oversized`; mirrored left/right.

const areas = (v: keyof typeof VARIANTS) =>
  (VARIANTS[v] as { areas: Record<string, Placement | undefined> }).areas

const ROLLED = ['tshirt', 'polo', 'hoodie', 'sweatshirt', 'ziphoodie'] as const
const SHIRTS = [...ROLLED, 'oversized'] as const
const LONG = ['hoodie', 'sweatshirt', 'ziphoodie'] as const
const deg = (d: number) => (d * Math.PI) / 180

// The TICKET-007 positions — the roll must not move the square.
const POSITION: Record<(typeof SHIRTS)[number], [number, number, number]> = {
  tshirt: [-0.73, 0.36, -0.09],
  polo: [-0.66, 0.24, -0.17],
  oversized: [-0.8, 0.32, -0.03],
  hoodie: [-0.67, 0.18, 0],
  sweatshirt: [-0.67, 0.18, 0],
  ziphoodie: [-0.67, 0.18, 0],
}

describe('3D — a slight, mirrored roll on the five rolled variants', () => {
  for (const v of ROLLED) {
    it(`${v}: shoulder_right rolls between 5° and 30°, left is the exact negative`, () => {
      const r = areas(v).shoulder_right!.rotation[2]
      const l = areas(v).shoulder_left!.rotation[2]
      expect(r).not.toBe(0)
      expect(Math.abs(r)).toBeGreaterThanOrEqual(deg(5))
      expect(Math.abs(r)).toBeLessThanOrEqual(deg(30))
      expect(l).toBe(-r)
    })
  }

  it('the long-sleeve family shares one roll', () => {
    const ref = areas('hoodie').shoulder_right!.rotation[2]
    for (const v of LONG) expect(areas(v).shoulder_right!.rotation[2]).toBe(ref)
  })

  it('oversized does not roll', () => {
    expect(areas('oversized').shoulder_right!.rotation[2]).toBe(0)
    expect(areas('oversized').shoulder_left!.rotation[2]).toBe(0)
  })
})

describe('3D — everything else about the shoulders is unchanged', () => {
  for (const v of SHIRTS) {
    it(`${v}: no pitch, yaw still exactly ∓π/2`, () => {
      expect(areas(v).shoulder_right!.rotation[0]).toBe(0)
      expect(areas(v).shoulder_left!.rotation[0]).toBe(0)
      expect(areas(v).shoulder_right!.rotation[1]).toBe(-Math.PI / 2)
      expect(areas(v).shoulder_left!.rotation[1]).toBe(Math.PI / 2)
    })

    it(`${v}: the turntable angle ignores the roll`, () => {
      expect(angleForArea(v, 'shoulder_right')).toBe(Math.PI / 2)
      expect(angleForArea(v, 'shoulder_left')).toBe(-Math.PI / 2)
    })

    it(`${v}: positions are the TICKET-007 ones (rotate only, do not move)`, () => {
      const p = POSITION[v]
      expect(areas(v).shoulder_right!.position).toEqual(p)
      expect(areas(v).shoulder_left!.position).toEqual([-p[0], p[1], p[2]])
    })
  }
})

const ROTATE = /^rotate\((-?\d+(?:\.\d+)?)deg\)$/
const rollOf = (t: string | undefined) => {
  expect(t).toMatch(ROTATE)
  return parseFloat((t as string).match(ROTATE)![1])
}

describe('2D — the overlay boxes roll too, mirrored', () => {
  it('t-shirt photo: viewer-left (shoulder_right) turns clockwise, the other box mirrors', () => {
    const r = rollOf(DESIGN_AREA_OVERLAYS.shoulder_right.style.transform)
    const l = rollOf(DESIGN_AREA_OVERLAYS.shoulder_left.style.transform)
    expect(r).toBeGreaterThan(0)
    expect(r).toBeLessThanOrEqual(30)
    expect(l).toBe(-r)
  })

  it('sweatshirt photo: same direction, a smaller angle (the sleeves hang straighter)', () => {
    const r = rollOf(SWEATSHIRT_AREA_OVERRIDES.shoulder_right.transform)
    const l = rollOf(SWEATSHIRT_AREA_OVERRIDES.shoulder_left.transform)
    expect(r).toBeGreaterThan(0)
    expect(r).toBeLessThan(rollOf(DESIGN_AREA_OVERLAYS.shoulder_right.style.transform))
    expect(l).toBe(-r)
  })
})
