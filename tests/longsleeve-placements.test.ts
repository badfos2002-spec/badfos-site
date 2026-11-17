import { describe, it, expect } from 'vitest'
import { VARIANTS, angleForArea } from '@/components/designer/three/placements'
import type { Placement, GuideBox } from '@/components/designer/three/placements'
import { previewScaleAndPosition } from '@/components/designer/three/previewMath'

// TICKET-018: the long-sleeve cotton tee gets its own 3D variant with exactly
// cotton's seven print areas (the user dropped the along-the-sleeve prints).
// An area with no placement or no guide is SILENTLY not rendered, which is the
// failure these tests guard. Convention (TICKET-004): the wearer's right is
// NEGATIVE local x; a sideways projector on the right arm faces −x, i.e.
// rotation [0, −π/2, roll].

const SEVEN = [
  'front_full', 'back', 'chest_logo', 'chest_logo_right', 'chest_logo_center',
  'shoulder_right', 'shoulder_left',
] as const

type Cfg = { areas: Record<string, Placement | undefined>; guides: Record<string, GuideBox | undefined>; panels: boolean }
const ls = () => (VARIANTS as unknown as Record<string, Cfg | undefined>).longsleeve as Cfg
const area = (a: string) => ls().areas[a] as Placement
const guide = (a: string) => ls().guides[a] as GuideBox

describe('VARIANTS.longsleeve — registry', () => {
  it('exists, single body mesh like the cotton tee', () => {
    expect(ls()).toBeDefined()
    expect(ls().panels).toBe(false)
  })

  it('has a placement AND a labelled guide for each of the seven areas — and nothing else', () => {
    expect(Object.keys(ls().areas).sort()).toEqual([...SEVEN].sort())
    expect(Object.keys(ls().guides).sort()).toEqual([...SEVEN].sort())
    for (const a of SEVEN) expect(guide(a).label.length, a).toBeGreaterThan(0)
  })
})

describe('shoulder prints — upper arm, where a short sleeve would end', () => {
  it("sideways like the tee, rolled the tee's way (TICKET-009: right roll > 0)", () => {
    const r = area('shoulder_right').rotation
    expect(r[0]).toBe(0)
    expect(r[1]).toBe(-Math.PI / 2)
    expect(r[2]).toBeGreaterThan(0)
    expect(r[2]).toBeLessThan(0.4)
  })

  it('on the upper arm: below the chest-logo row, above the garment centre', () => {
    const y = area('shoulder_right').position[1]
    expect(y).toBeLessThan(area('chest_logo').position[1])
    expect(y).toBeGreaterThan(0)
  })

  it("square and shallow, like the other shirts' shoulders", () => {
    expect(guide('shoulder_right').w).toBe(guide('shoulder_right').h)
    expect(area('shoulder_right').depth).toBeLessThanOrEqual(0.25)
  })

  it('pinned at the first-pass position', () => {
    expect(area('shoulder_right').position).toEqual([-0.64, 0.4, -0.05])
  })
})

describe('left = exact mirror of right', () => {
  for (const [r, l] of [['shoulder_right', 'shoulder_left'], ['chest_logo', 'chest_logo_right']] as const) {
    it(`${l} mirrors ${r}`, () => {
      const R = area(r), L = area(l)
      expect(L.position[0]).toBeCloseTo(-R.position[0], 10)
      expect(L.position[1]).toBe(R.position[1])
      expect(L.position[2]).toBe(R.position[2])
      expect(L.rotation[1]).toBeCloseTo(-R.rotation[1], 10)
      expect(L.rotation[2]).toBeCloseTo(-R.rotation[2], 10)
      expect(L.size).toBe(R.size)
      expect(L.depth).toBe(R.depth)
      expect(guide(l).w).toBe(guide(r).w)
      expect(guide(l).h).toBe(guide(r).h)
    })
  }
})

describe('angleForArea — side views for the shoulders', () => {
  it('right shoulder +π/2, left −π/2', () => {
    expect(angleForArea('longsleeve' as never, 'shoulder_right')).toBeCloseTo(Math.PI / 2, 10)
    expect(angleForArea('longsleeve' as never, 'shoulder_left')).toBeCloseTo(-Math.PI / 2, 10)
  })

  it('front faces 0, back faces π', () => {
    expect(angleForArea('longsleeve' as never, 'front_full')).toBe(0)
    expect(angleForArea('longsleeve' as never, 'back')).toBe(Math.PI)
  })
})

describe('preview maths', () => {
  it('a rolled shoulder previews like an unrolled sideways projector (roll-agnostic)', () => {
    const s = area('shoulder_right')
    const d: [number, number, number] = [0.01, -0.02, 0.01]
    const rolled = previewScaleAndPosition(s.position, s.rotation, 1.2, d)
    expect(rolled).toEqual(previewScaleAndPosition(s.position, [0, s.rotation[1], 0], 1.2, d))
    expect(rolled.scale).toEqual([1, 1.2, 1.2])
  })
})
