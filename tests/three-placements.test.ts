import { describe, it, expect } from 'vitest'
import { VARIANTS } from '@/components/designer/three/placements'
import type { Placement } from '@/components/designer/three/placements'

// TICKET-004 PR B: the 3D placement tables, moved out of Tshirt3DModel.tsx into
// a plain module (three / drei cannot be imported in jsdom). Two jobs here:
//   1. pin the values the move must NOT change,
//   2. pin the shoulder placements + guides for all six shirt variants — an
//      area with no placement is SILENTLY not rendered, which is exactly the
//      failure this ticket exists to avoid.
// Convention (fixed by PR A and its tests): wearer's right = negative local x =
// viewer's left, same as chest_logo (`סמל כיס ימין` sits at x = -0.27).

const SHIRTS = ['tshirt', 'polo', 'oversized', 'sweatshirt', 'hoodie', 'ziphoodie'] as const
const NON_SHIRTS = ['cap', 'meshcap', 'buff', 'tote', 'totevolume', 'dsbag', 'vest', 'baby', 'apron'] as const
const SHOULDERS = ['shoulder_right', 'shoulder_left'] as const

function areas(variant: string): Record<string, Placement | undefined> {
  return (VARIANTS as Record<string, { areas: Record<string, Placement | undefined> }>)[variant].areas
}
function guides(variant: string): Record<string, { w: number; h: number; label: string } | undefined> {
  return (VARIANTS as Record<string, { guides: Record<string, { w: number; h: number; label: string } | undefined> }>)[variant].guides
}

describe('extraction regression — the tables still hold exactly what they held', () => {
  it('tshirt front_full is unchanged', () => {
    expect(VARIANTS.tshirt.areas.front_full).toEqual({
      position: [0, 0.13, 0.3],
      rotation: [0, 0, 0],
      size: 0.68,
      depth: 0.55,
    })
  })

  it('tshirt back still projects from behind', () => {
    expect(VARIANTS.tshirt.areas.back.rotation[1]).toBe(Math.PI)
  })

  it('the zip hoodie still has no full-front print', () => {
    expect(areas('ziphoodie').front_full).toBeUndefined()
  })

  it('the polo is still the multi-panel model', () => {
    expect(VARIANTS.polo.panels).toBe(true)
  })

  it('the crewneck back print still sits higher than the hoodie one', () => {
    expect(VARIANTS.sweatshirt.areas.back.position[1]).toBe(0.16)
    expect(VARIANTS.hoodie.areas.back.position[1]).toBe(0.01)
  })

  it('chest_logo is still on the wearer’s right = negative x (the convention)', () => {
    expect(VARIANTS.tshirt.areas.chest_logo.position[0]).toBe(-0.27)
  })
})

describe('every shirt variant can print on both shoulders', () => {
  for (const variant of SHIRTS) {
    it(`${variant} has a placement and a guide for both shoulders`, () => {
      for (const id of SHOULDERS) {
        expect(areas(variant)[id], `${variant}.areas.${id}`).toBeDefined()
        expect(guides(variant)[id], `${variant}.guides.${id}`).toBeDefined()
      }
    })
  }
})

describe('shoulder projectors face sideways and mirror each other', () => {
  for (const variant of SHIRTS) {
    it(`${variant}: both rotations are ±π/2 and exact negatives`, () => {
      const right = areas(variant).shoulder_right!
      const left = areas(variant).shoulder_left!
      expect(Math.abs(right.rotation[1])).toBe(Math.PI / 2)
      expect(Math.abs(left.rotation[1])).toBe(Math.PI / 2)
      expect(right.rotation[1]).toBe(-left.rotation[1])
    })

    it(`${variant}: the wearer's right shoulder faces −x`, () => {
      expect(areas(variant).shoulder_right!.rotation[1]).toBe(-Math.PI / 2)
      expect(areas(variant).shoulder_left!.rotation[1]).toBe(Math.PI / 2)
    })

    it(`${variant}: no tilt — rotation x and z are 0`, () => {
      for (const id of SHOULDERS) {
        const p = areas(variant)[id]!
        expect(p.rotation[0]).toBe(0)
        expect(p.rotation[2]).toBe(0)
      }
    })

    it(`${variant}: the positions mirror in x, right one negative, same y and z`, () => {
      const right = areas(variant).shoulder_right!
      const left = areas(variant).shoulder_left!
      expect(right.position[0]).toBeLessThan(0)
      expect(right.position[0]).toBe(-left.position[0])
      expect(right.position[1]).toBe(left.position[1])
      expect(right.position[2]).toBe(left.position[2])
    })
  }
})

describe('shoulder guides', () => {
  for (const variant of SHIRTS) {
    it(`${variant} labels the guides כתף ימין / כתף שמאל`, () => {
      expect(guides(variant).shoulder_right!.label).toBe('כתף ימין')
      expect(guides(variant).shoulder_left!.label).toBe('כתף שמאל')
    })

    it(`${variant} guide boxes mirror in size and stay small, like a chest logo`, () => {
      const right = guides(variant).shoulder_right!
      const left = guides(variant).shoulder_left!
      expect(right.w).toBe(left.w)
      expect(right.h).toBe(left.h)
      expect(right.w).toBeLessThanOrEqual(0.25)
      expect(right.h).toBeLessThanOrEqual(0.25)
    })
  }
})

describe('nothing but shirts prints on a shoulder', () => {
  for (const variant of NON_SHIRTS) {
    it(`${variant} has no shoulder placement`, () => {
      for (const id of SHOULDERS) {
        expect(areas(variant)[id], `${variant}.areas.${id}`).toBeUndefined()
        expect(guides(variant)[id], `${variant}.guides.${id}`).toBeUndefined()
      }
    })
  }
})
