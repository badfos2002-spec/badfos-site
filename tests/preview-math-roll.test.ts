import { describe, it, expect } from 'vitest'
import { previewScaleAndPosition } from '@/components/designer/three/previewMath'

// TICKET-008: a roll about the projector's own axis commutes with the in-plane
// isotropic scale (R = R_y·R_z, M = R_y·R_z·diag(s,s,1)·R_zᵀ·R_yᵀ = R_y·diag(s,s,1)·R_yᵀ),
// so a rolled shoulder previews EXACTLY like an unrolled one. A pitch (x) does
// not commute and still falls back to the front formula.

const P: [number, number, number] = [-0.73, 0.36, -0.09]
const D: [number, number, number] = [0.01, -0.02, 0.03]
const ROLL = 0.3

describe('sideways projector with a roll', () => {
  for (const yaw of [-Math.PI / 2, Math.PI / 2]) {
    for (const roll of [ROLL, -ROLL]) {
      it(`yaw ${yaw.toFixed(2)}, roll ${roll}: same scale/position as without the roll`, () => {
        const rolled = previewScaleAndPosition(P, [0, yaw, roll], 1.3, D)
        const plain = previewScaleAndPosition(P, [0, yaw, 0], 1.3, D)
        expect(rolled).toEqual(plain)
        expect(rolled.scale).toEqual([1, 1.3, 1.3])
      })
    }
  }

  it('a front projector with a roll keeps the front formula', () => {
    const rolled = previewScaleAndPosition(P, [0, 0, ROLL], 1.3, D)
    expect(rolled).toEqual(previewScaleAndPosition(P, [0, 0, 0], 1.3, D))
  })

  it('a pitched sideways projector still falls back to the front formula', () => {
    const { scale } = previewScaleAndPosition(P, [0.2, -Math.PI / 2, ROLL], 1.3, D)
    expect(scale).toEqual([1.3, 1.3, 1])
  })
})
