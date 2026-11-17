import { describe, it, expect } from 'vitest'
import { VARIANTS, angleForArea } from '@/components/designer/three/placements'
import type { Placement, GuideBox } from '@/components/designer/three/placements'
import { previewScaleAndPosition } from '@/components/designer/three/previewMath'
import { clampTransform } from '@/components/designer/three/decalTransform'

// TICKET-018: the long-sleeve cotton tee gets its own 3D variant. Its print
// areas are everything the cotton tee has plus the two forearm prints that
// TICKET-017 added (sleeve_right / sleeve_left). An area with no placement or
// no guide is SILENTLY not rendered, which is the failure these tests guard.
// Convention (TICKET-004): the wearer's right is NEGATIVE local x; a sideways
// projector on the right arm faces −x, i.e. rotation [0, −π/2, roll].

const NINE = [
  'front_full', 'back', 'chest_logo', 'chest_logo_right', 'chest_logo_center',
  'shoulder_right', 'shoulder_left', 'sleeve_right', 'sleeve_left',
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

  it('has a placement AND a labelled guide for each of the nine areas', () => {
    for (const a of NINE) {
      expect(ls().areas[a], a).toBeDefined()
      expect(ls().guides[a], a).toBeDefined()
      expect(guide(a).label.length, a).toBeGreaterThan(0)
    }
  })

  it('the sleeve guides carry the Hebrew sleeve names', () => {
    expect(guide('sleeve_right').label).toBe('שרוול ימין')
    expect(guide('sleeve_left').label).toBe('שרוול שמאל')
  })

  it('the other t-shirt variants do NOT get sleeve areas', () => {
    for (const v of ['tshirt', 'polo', 'oversized'] as const) {
      const areas = (VARIANTS[v] as unknown as Cfg).areas
      expect(areas.sleeve_right, v).toBeUndefined()
      expect(areas.sleeve_left, v).toBeUndefined()
    }
  })
})

describe('sleeve prints — tall narrow decals along the forearm', () => {
  it('the sleeve guide is clearly taller than wide (≥ 2.5 : 1)', () => {
    for (const a of ['sleeve_right', 'sleeve_left']) {
      expect(guide(a).h / guide(a).w, a).toBeGreaterThanOrEqual(2.5)
    }
  })

  it('the sleeve sits on the forearm: entirely BELOW the shoulder print', () => {
    const sleeve = area('sleeve_right'), shoulder = area('shoulder_right')
    const sleeveTop = sleeve.position[1] + guide('sleeve_right').h / 2
    const shoulderBottom = shoulder.position[1] - guide('shoulder_right').h / 2
    expect(sleeveTop).toBeLessThan(shoulderBottom)
  })

  it('the right sleeve is on the wearer\'s right (negative x), outside the chest logo', () => {
    expect(area('sleeve_right').position[0]).toBeLessThan(area('chest_logo').position[0])
    expect(area('sleeve_right').position[0]).toBeLessThan(0)
  })

  it('projects sideways from outside the arm: rotation [0, −π/2, roll > 0] on the right', () => {
    const r = area('sleeve_right').rotation
    expect(r[0]).toBe(0)
    expect(r[1]).toBe(-Math.PI / 2)
    expect(r[2]).toBeGreaterThan(0)
    expect(r[2]).toBeLessThan(0.4)
  })

  it('a shallow projector — the sleeve is a thin tube beside the body', () => {
    expect(area('sleeve_right').depth).toBeLessThanOrEqual(0.25)
  })
})

describe('shoulder prints — upper arm, where a short sleeve would end', () => {
  it('sideways like the tee, rolled the tee\'s way (TICKET-009: right roll > 0)', () => {
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

  it('square and shallow, like the other shirts\' shoulders', () => {
    expect(guide('shoulder_right').w).toBe(guide('shoulder_right').h)
    expect(area('shoulder_right').depth).toBeLessThanOrEqual(0.25)
  })
})

describe('left = exact mirror of right', () => {
  for (const [r, l] of [['shoulder_right', 'shoulder_left'], ['sleeve_right', 'sleeve_left'], ['chest_logo', 'chest_logo_right']] as const) {
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

describe('angleForArea — side views for the arm prints', () => {
  it('right shoulder and right sleeve turn the same quarter turn (+π/2)', () => {
    expect(angleForArea('longsleeve' as never, 'shoulder_right')).toBeCloseTo(Math.PI / 2, 10)
    expect(angleForArea('longsleeve' as never, 'sleeve_right')).toBeCloseTo(Math.PI / 2, 10)
  })

  it('left shoulder and left sleeve turn −π/2', () => {
    expect(angleForArea('longsleeve' as never, 'shoulder_left')).toBeCloseTo(-Math.PI / 2, 10)
    expect(angleForArea('longsleeve' as never, 'sleeve_left')).toBeCloseTo(-Math.PI / 2, 10)
  })

  it('front faces 0, back faces π', () => {
    expect(angleForArea('longsleeve' as never, 'front_full')).toBe(0)
    expect(angleForArea('longsleeve' as never, 'back')).toBe(Math.PI)
  })
})

describe('preview maths and drag rail', () => {
  it('a rolled sleeve previews like an unrolled sideways projector (roll-agnostic)', () => {
    const s = area('sleeve_right')
    const d: [number, number, number] = [0.01, -0.02, 0.01]
    const rolled = previewScaleAndPosition(s.position, s.rotation, 1.2, d)
    expect(rolled).toEqual(previewScaleAndPosition(s.position, [0, s.rotation[1], 0], 1.2, d))
    expect(rolled.scale).toEqual([1, 1.2, 1.2])
  })

  it('a sleeve gets the shoulder\'s short drag rail (0.04), not the chest\'s 0.35', () => {
    for (const a of ['sleeve_right', 'sleeve_left']) {
      expect(clampTransform({ dx: 0.5, dy: -0.5, scale: 1 }, a)).toEqual({ dx: 0.04, dy: -0.04, scale: 1 })
    }
  })
})
