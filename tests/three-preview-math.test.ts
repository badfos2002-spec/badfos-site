import { describe, it, expect } from 'vitest'
import { previewScaleAndPosition } from '@/components/designer/three/previewMath'

// TICKET-004 PR B: the live drag/slider preview scales the decal MESH instead
// of reprojecting it (248 ms a rebuild). The mesh carries the baked geometry at
// identity rotation, so reproducing
//     v' = P + D + R·diag(s,s,1)·Rᵀ·(v − P)
// needs M = R·diag(s,s,1)·Rᵀ, and `position_i = P_i·(1 − M_ii) + D_i`.
// Today's code assumes M = diag(s,s,1) — true at rotation 0 and π, WRONG at
// ±π/2, where the decal's plane is the local y–z plane. At axis-aligned quarter
// turns M stays diagonal, so the fix is one table lookup.

const FRONT: [number, number, number] = [0, 0, 0]
const BACK: [number, number, number] = [0, Math.PI, 0]
const SHOULDER_RIGHT: [number, number, number] = [0, -Math.PI / 2, 0]
const SHOULDER_LEFT: [number, number, number] = [0, Math.PI / 2, 0]
const NONE: [number, number, number] = [0, 0, 0]

describe('front areas — bit-identical to the old formula', () => {
  const P: [number, number, number] = [0, 0.13, 0.3] // tshirt front_full

  it('scales in the projector plane', () => {
    const { scale } = previewScaleAndPosition(P, FRONT, 1.3, NONE)
    expect(scale).toEqual([1.3, 1.3, 1])
  })

  it('compensates the fixed point in x and y only', () => {
    const { position } = previewScaleAndPosition(P, FRONT, 1.3, NONE)
    expect(position[0]).toBeCloseTo(0, 12)
    expect(position[1]).toBeCloseTo(-0.039, 12) // 0.13 × (1 − 1.3)
    expect(position[2]).toBeCloseTo(0, 12)
  })

  it('reproduces the old expressions exactly, offset included', () => {
    const sRel = 1.42
    const d: [number, number, number] = [0.08, -0.03, 0]
    const { position } = previewScaleAndPosition(P, FRONT, sRel, d)
    expect(position[0]).toBe(P[0] * (1 - sRel) + d[0])
    expect(position[1]).toBe(P[1] * (1 - sRel) + d[1])
    expect(position[2]).toBe(d[2])
  })
})

describe('back areas — unchanged as well', () => {
  const P: [number, number, number] = [0, 0.14, -0.3] // tshirt back

  it('scales in the projector plane', () => {
    const { scale } = previewScaleAndPosition(P, BACK, 1.3, NONE)
    expect(scale).toEqual([1.3, 1.3, 1])
  })

  it('uses the same position formula as the front', () => {
    const { position } = previewScaleAndPosition(P, BACK, 1.3, NONE)
    expect(position[0]).toBeCloseTo(0, 12)
    expect(position[1]).toBeCloseTo(-0.042, 12) // 0.14 × (1 − 1.3)
    expect(position[2]).toBeCloseTo(0, 12)
  })

  it('reproduces the old expressions exactly, offset included', () => {
    const sRel = 0.7
    const d: [number, number, number] = [-0.05, 0.11, 0]
    const { position } = previewScaleAndPosition(P, BACK, sRel, d)
    expect(position[0]).toBe(P[0] * (1 - sRel) + d[0])
    expect(position[1]).toBe(P[1] * (1 - sRel) + d[1])
    expect(position[2]).toBe(d[2])
  })
})

describe('shoulders — the decal plane is the local y–z plane', () => {
  const P: [number, number, number] = [-0.5, 0.6, 0.02]

  it('scales in y and z, never in x', () => {
    const { scale } = previewScaleAndPosition(P, SHOULDER_RIGHT, 1.3, NONE)
    expect(scale).toEqual([1, 1.3, 1.3])
  })

  it('compensates the fixed point in y and z', () => {
    const { position } = previewScaleAndPosition(P, SHOULDER_RIGHT, 1.3, NONE)
    expect(position[0]).toBeCloseTo(0, 12)
    expect(position[1]).toBeCloseTo(0.6 * -0.3, 12)
    expect(position[2]).toBeCloseTo(0.02 * -0.3, 12)
  })

  it('the mirrored shoulder behaves identically', () => {
    const right = previewScaleAndPosition(P, SHOULDER_RIGHT, 1.3, NONE)
    const left = previewScaleAndPosition([0.5, 0.6, 0.02], SHOULDER_LEFT, 1.3, NONE)
    expect(left.scale).toEqual(right.scale)
    expect(left.position[1]).toBeCloseTo(right.position[1], 12)
    expect(left.position[2]).toBeCloseTo(right.position[2], 12)
  })
})

describe('invariants that hold for every rotation', () => {
  const CASES: [string, [number, number, number], [number, number, number]][] = [
    ['front', [0, 0.13, 0.3], FRONT],
    ['back', [0, 0.14, -0.3], BACK],
    ['shoulder_right', [-0.5, 0.6, 0.02], SHOULDER_RIGHT],
    ['shoulder_left', [0.5, 0.6, 0.02], SHOULDER_LEFT],
  ]

  for (const [name, P, rotation] of CASES) {
    it(`${name}: no scaling change → identity and the raw offset`, () => {
      const d: [number, number, number] = [0.07, -0.02, 0]
      const { scale, position } = previewScaleAndPosition(P, rotation, 1, d)
      expect(scale).toEqual([1, 1, 1])
      expect(position[0]).toBeCloseTo(d[0], 12)
      expect(position[1]).toBeCloseTo(d[1], 12)
      expect(position[2]).toBeCloseTo(d[2], 12)
    })

    it(`${name}: the baked anchor P is the fixed point (M·P + T === P)`, () => {
      const sRel = 1.65
      const { scale, position } = previewScaleAndPosition(P, rotation, sRel, NONE)
      for (let i = 0; i < 3; i++) {
        expect(scale[i] * P[i] + position[i], `axis ${i}`).toBeCloseTo(P[i], 12)
      }
    })

    it(`${name}: the drag delta passes through additively`, () => {
      const sRel = 0.8
      const d: [number, number, number] = [0.03, 0.09, -0.04]
      const withD = previewScaleAndPosition(P, rotation, sRel, d)
      const without = previewScaleAndPosition(P, rotation, sRel, NONE)
      expect(withD.scale).toEqual(without.scale)
      for (let i = 0; i < 3; i++) {
        expect(withD.position[i] - without.position[i], `axis ${i}`).toBeCloseTo(d[i], 12)
      }
    })
  }
})

describe('anything that is not an axis-aligned quarter turn keeps today’s behaviour', () => {
  const P: [number, number, number] = [0.1, 0.4, 0.3]

  it('an arbitrary yaw falls back to (s, s, 1)', () => {
    const { scale, position } = previewScaleAndPosition(P, [0, 0.7, 0], 1.3, NONE)
    expect(scale).toEqual([1.3, 1.3, 1])
    expect(position[1]).toBeCloseTo(P[1] * -0.3, 12)
  })

  it('a tilted projector falls back to (s, s, 1) instead of throwing', () => {
    const { scale } = previewScaleAndPosition(P, [0.2, -Math.PI / 2, 0], 1.3, NONE)
    expect(scale).toEqual([1.3, 1.3, 1])
  })
})
