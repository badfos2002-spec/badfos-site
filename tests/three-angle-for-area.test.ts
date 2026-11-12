import { describe, it, expect } from 'vitest'
import { VARIANTS, angleForArea } from '@/components/designer/three/placements'
import type { Placement, ShirtVariant } from '@/components/designer/three/placements'

// TICKET-004 PR B: the turntable angle. Preview3DStage had
// `focusArea === 'back' ? Math.PI : 0` hard-coded in TWO effects; a shoulder
// needs a quarter turn, so the rule becomes one pure helper.
// An area faces the camera when the group rotation maps the projector's outward
// axis onto +z → angle = −placement.rotation.y (normalised to (−π, π]).

const SHIRTS = ['tshirt', 'polo', 'oversized', 'sweatshirt', 'hoodie', 'ziphoodie'] as const

/** Same normalisation the helper must use: (−π, π], with −π mapped to +π. */
function norm(a: number): number {
  const twoPi = Math.PI * 2
  let x = ((a % twoPi) + twoPi) % twoPi
  if (x > Math.PI) x -= twoPi
  return x
}

describe('angleForArea — no behaviour change for the existing areas', () => {
  it('front_full faces the front (0)', () => {
    expect(angleForArea('tshirt', 'front_full')).toBe(0)
  })

  it('back turns the model around (π)', () => {
    expect(angleForArea('tshirt', 'back')).toBe(Math.PI)
  })

  it('chest_logo faces the front (0)', () => {
    expect(angleForArea('tshirt', 'chest_logo')).toBe(0)
  })

  it('no area → front (the old fallback for every non-back area)', () => {
    expect(angleForArea('tshirt', undefined)).toBe(0)
  })

  it('no variant → front, even for back', () => {
    expect(angleForArea(undefined, 'back')).toBe(0)
  })

  it('an area the variant cannot print → front', () => {
    expect(angleForArea('ziphoodie', 'front_full')).toBe(0)
  })
})

describe('angleForArea — the shoulders get a quarter turn', () => {
  it('shoulder_right turns the model +π/2', () => {
    expect(angleForArea('tshirt', 'shoulder_right')).toBe(Math.PI / 2)
  })

  it('shoulder_left turns the model −π/2', () => {
    expect(angleForArea('tshirt', 'shoulder_left')).toBe(-Math.PI / 2)
  })

  it('the two are exact negatives, on every shirt variant', () => {
    for (const variant of SHIRTS) {
      const right = angleForArea(variant, 'shoulder_right')
      const left = angleForArea(variant, 'shoulder_left')
      expect(Math.abs(right), variant).toBe(Math.PI / 2)
      expect(right, variant).toBe(-left)
    }
  })
})

describe('the invariant that ties the placements to the turntable', () => {
  it('every area of every shirt variant: angleForArea === −rotation.y', () => {
    for (const variant of SHIRTS) {
      const areas = (VARIANTS as Record<string, { areas: Record<string, Placement> }>)[variant].areas
      for (const area of Object.keys(areas)) {
        expect(
          angleForArea(variant as ShirtVariant, area),
          `${variant}.${area}`,
        ).toBeCloseTo(norm(-areas[area].rotation[1]), 10)
      }
    }
  })
})
