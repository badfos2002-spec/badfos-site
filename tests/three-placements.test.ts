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

    // TICKET-008: no pitch on any shoulder; a slight roll about the projector's
    // own axis on every variant but the oversized one, mirrored left/right.
    it(`${variant}: no pitch — rotation x is 0; roll z is 0 on oversized, mirrored elsewhere`, () => {
      for (const id of SHOULDERS) expect(areas(variant)[id]!.rotation[0]).toBe(0)
      const right = areas(variant).shoulder_right!.rotation[2]
      const left = areas(variant).shoulder_left!.rotation[2]
      if (variant === 'oversized') {
        expect(right).toBe(0)
        expect(left).toBe(0)
      } else {
        expect(right).not.toBe(0)
        expect(left).toBe(-right)
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

// TICKET-011 addendum 3: a WIDE artwork contain-fits the guide box, then «+3»
// multiplies it by 1.3. The old t-shirt boxes (back 0.72, front 0.62) put a
// 16:9 image at 0.94 wide on +3 — seam to seam, onto the sleeves. Narrowed so
// +3 stays inside the torso (≤ 0.78); aspect kept close to the old boxes.
describe('t-shirt front/back guide boxes keep a wide +3 print inside the torso', () => {
  it('back is 0.60 × 0.78, front_full 0.54 × 0.60', () => {
    expect(guides('tshirt').back).toMatchObject({ w: 0.6, h: 0.78, label: 'גב' })
    expect(guides('tshirt').front_full).toMatchObject({ w: 0.54, h: 0.6, label: 'קדמי מלא' })
  })

  it('+3 (×1.3) never exceeds 0.78 of the shirt width', () => {
    for (const id of ['back', 'front_full']) {
      expect(guides('tshirt')[id]!.w * 1.3).toBeLessThanOrEqual(0.78 + 1e-9)
    }
  })

  it('the other variants and the t-shirt placements are untouched', () => {
    expect(guides('polo').back!.w).toBe(0.575)
    expect(guides('oversized').back!.w).toBe(0.6)
    expect(areas('tshirt').back).toMatchObject({ position: [0, 0.14, -0.3], size: 0.92, depth: 0.55 })
    expect(areas('tshirt').front_full).toMatchObject({ position: [0, 0.13, 0.3], size: 0.68, depth: 0.55 })
  })
})
