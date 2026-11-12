import { describe, it, expect } from 'vitest'
import { VARIANTS, type Placement } from '@/components/designer/three/placements'

// TICKET-009: the user's review of the TICKET-008 gallery. The tee's roll goes
// the other way (same sense as the hoodie family), the crewneck's shoulder
// square moves a bit toward the back and the zip hoodie's a bit toward the
// front. Everything else stays where it was.

const areas = (v: keyof typeof VARIANTS) =>
  (VARIANTS[v] as { areas: Record<string, Placement | undefined> }).areas
const R = (v: keyof typeof VARIANTS) => areas(v).shoulder_right!
const L = (v: keyof typeof VARIANTS) => areas(v).shoulder_left!

describe('3D — the t-shirt roll flips to the hoodie family sense', () => {
  it('tshirt shoulder_right rolls positive, like the hoodie', () => {
    const r = R('tshirt').rotation[2]
    expect(r).toBeGreaterThan(0)
    expect(Math.sign(r)).toBe(Math.sign(R('hoodie').rotation[2]))
  })

  // 009b: the user asked for a gentler tee roll, +0.12 instead of +0.17.
  it('magnitude 0.12, left is the exact negative', () => {
    expect(R('tshirt').rotation[2]).toBe(0.12)
    expect(L('tshirt').rotation[2]).toBe(-R('tshirt').rotation[2])
  })
})

describe('3D — crewneck back, zip hoodie forward, both beside the hoodie', () => {
  const hoodie = R('hoodie').position

  it('crewneck (sweatshirt) sits further back: smaller z, within 0.12', () => {
    const z = R('sweatshirt').position[2]
    expect(z).toBeLessThan(hoodie[2])
    expect(hoodie[2] - z).toBeLessThanOrEqual(0.12)
  })

  it('zip hoodie sits further forward: larger z, within 0.12', () => {
    const z = R('ziphoodie').position[2]
    expect(z).toBeGreaterThan(hoodie[2])
    expect(z - hoodie[2]).toBeLessThanOrEqual(0.12)
  })

  for (const v of ['sweatshirt', 'ziphoodie'] as const) {
    it(`${v}: same x and y as the hoodie, same roll, same size/depth`, () => {
      expect(R(v).position[2]).toBe(v === 'sweatshirt' ? -0.05 : 0.07) // absolute, not relative to the hoodie
      expect(R(v).position[0]).toBe(hoodie[0])
      expect(R(v).position[1]).toBe(hoodie[1])
      expect(R(v).rotation).toEqual(R('hoodie').rotation)
      expect(L(v).rotation).toEqual(L('hoodie').rotation)
      expect(R(v).size).toBe(R('hoodie').size)
      expect(R(v).depth).toBe(R('hoodie').depth)
    })

    it(`${v}: the left shoulder mirrors (x negated, same y and z)`, () => {
      const r = R(v).position
      expect(L(v).position).toEqual([-r[0], r[1], r[2]])
    })
  }
})

describe('3D — the other shoulders do not move', () => {
  const PINNED = {
    polo: [-0.66, 0.24, -0.17],
    oversized: [-0.8, 0.32, -0.03],
  } as const
  for (const [v, p] of Object.entries(PINNED) as [keyof typeof PINNED, readonly number[]][]) {
    it(`${v}: shoulder positions unchanged`, () => {
      expect(R(v).position).toEqual([...p])
      expect(L(v).position).toEqual([-p[0], p[1], p[2]])
    })
  }

  // 009b: the kangaroo hoodie nudges a little toward the front, staying behind
  // the zip hoodie.
  it('hoodie: x/y unchanged, z a small nudge forward (0 < z < zip z), left mirrors', () => {
    const r = R('hoodie').position
    expect(r.slice(0, 2)).toEqual([-0.67, 0.18])
    expect(r[2]).toBeGreaterThan(0)
    expect(r[2]).toBeLessThan(R('ziphoodie').position[2])
    expect(L('hoodie').position).toEqual([0.67, 0.18, r[2]])
  })

  // 009b: the tee shoulder nudges a REALLY slight bit toward the front.
  it('tshirt: x/y unchanged, z just forward of −0.09 (≤ −0.05), left mirrors', () => {
    const r = R('tshirt').position
    expect(r.slice(0, 2)).toEqual([-0.73, 0.36])
    expect(r[2]).toBeGreaterThan(-0.09)
    expect(r[2]).toBeLessThanOrEqual(-0.05)
    expect(L('tshirt').position).toEqual([0.73, 0.36, r[2]])
  })

  it('oversized still does not roll; polo and hoodie rolls unchanged', () => {
    expect(R('oversized').rotation[2]).toBe(0)
    expect(R('polo').rotation[2]).toBe(0.1)
    expect(R('hoodie').rotation[2]).toBe(0.17)
  })
})
