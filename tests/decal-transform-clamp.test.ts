import { describe, it, expect } from 'vitest'
import { clampTransform } from '@/components/designer/three/decalTransform'

// TICKET-004 PR B: the offset rail is a safety rail — it stops the artwork
// being dragged clear of the mesh, where the decal silently vanishes. On a
// SHOULDER that happens far sooner than on the chest: the sleeve is a thin
// tube, so the surface leaves the projector's 0.22-deep window after a small
// move around its curve. Measured on screen: a committed offset of ~0.13 lost
// about half the artwork, ~0.045 committed clean and complete. So the shoulders
// cap at 0.04 and EVERY other area keeps the old 0.35, unchanged.
//
// Expected values are written as literals on purpose — importing the constants
// would make the test agree with whatever the code says.

const t = (dx: number, dy: number, scale = 1) => ({ dx, dy, scale })

describe('no change for the areas that existed before', () => {
  for (const area of ['front_full', 'back', 'chest_logo', 'chest_logo_right', 'chest_logo_center', 'center', 'center_wide']) {
    it(`${area} still clamps at 0.35`, () => {
      expect(clampTransform(t(0.9, -0.9), area)).toEqual({ dx: 0.35, dy: -0.35, scale: 1 })
    })

    it(`${area} still passes 0.2 through untouched`, () => {
      expect(clampTransform(t(0.2, -0.2), area)).toEqual({ dx: 0.2, dy: -0.2, scale: 1 })
    })
  }

  it('an unknown area keeps the old rail', () => {
    expect(clampTransform(t(0.9, 0.9), 'something_else')).toEqual({ dx: 0.35, dy: 0.35, scale: 1 })
  })

  it('no area at all keeps the old rail (the call signature stays compatible)', () => {
    expect(clampTransform(t(0.9, 0.9))).toEqual({ dx: 0.35, dy: 0.35, scale: 1 })
  })

  it('the exact boundary 0.35 is still allowed', () => {
    expect(clampTransform(t(0.35, -0.35), 'front_full')).toEqual({ dx: 0.35, dy: -0.35, scale: 1 })
  })
})

describe('the shoulders cap at 0.04', () => {
  it('the drag that lost half the artwork (0.13) clamps to 0.04', () => {
    expect(clampTransform(t(0.13, 0), 'shoulder_right')).toEqual({ dx: 0.04, dy: 0, scale: 1 })
    expect(clampTransform(t(0.13, 0), 'shoulder_left')).toEqual({ dx: 0.04, dy: 0, scale: 1 })
  })

  it('a nudge inside the clean range (0.03) passes through untouched', () => {
    expect(clampTransform(t(0.03, -0.03), 'shoulder_right')).toEqual({ dx: 0.03, dy: -0.03, scale: 1 })
    expect(clampTransform(t(0.03, -0.03), 'shoulder_left')).toEqual({ dx: 0.03, dy: -0.03, scale: 1 })
  })

  it('the cap is symmetric on both axes and both signs', () => {
    for (const area of ['shoulder_right', 'shoulder_left']) {
      expect(clampTransform(t(0.5, 0.5), area), area).toEqual({ dx: 0.04, dy: 0.04, scale: 1 })
      expect(clampTransform(t(-0.5, -0.5), area), area).toEqual({ dx: -0.04, dy: -0.04, scale: 1 })
      expect(clampTransform(t(0.5, -0.5), area), area).toEqual({ dx: 0.04, dy: -0.04, scale: 1 })
    }
  })

  it('both shoulders clamp identically', () => {
    const right = clampTransform(t(0.2, -0.18), 'shoulder_right')
    const left = clampTransform(t(0.2, -0.18), 'shoulder_left')
    expect(right).toEqual(left)
  })

  it('the exact boundary 0.04 is allowed', () => {
    expect(clampTransform(t(0.04, -0.04), 'shoulder_right')).toEqual({ dx: 0.04, dy: -0.04, scale: 1 })
  })
})

describe('the size rail is the same everywhere — only the offset is area-aware', () => {
  it('a shoulder still scales between 0.3 and 2', () => {
    expect(clampTransform(t(0, 0, 5), 'shoulder_right').scale).toBe(2)
    expect(clampTransform(t(0, 0, 0.1), 'shoulder_right').scale).toBe(0.3)
    expect(clampTransform(t(0, 0, 1.6), 'shoulder_right').scale).toBe(1.6)
  })

  it('a front area scales the same way', () => {
    expect(clampTransform(t(0, 0, 5), 'front_full').scale).toBe(2)
    expect(clampTransform(t(0, 0, 0.1), 'front_full').scale).toBe(0.3)
  })
})
