import { describe, it, expect } from 'vitest'
import { pickPanel } from '@/components/designer/three/placements'
import type { MeshSummary } from '@/components/designer/three/placements'

// TICKET-004 PR B: the polo is the one multi-primitive model (`panels: true`).
// Its decal routing scored meshes by bounding-box z and picked the largest
// front / largest back panel, so a shoulder decal would land on the chest.
// The rule is extracted here as a pure function over bounding-box summaries so
// it can be tested without loading a GLB. `meshes` arrives sorted by vertex
// count, descending — index 0 is the body (the same contract Tshirt3DModel has
// always relied on).

const FRONT = 0
const BACK = 1
const SLEEVE_RIGHT = 2 // wearer's right = NEGATIVE x
const SLEEVE_LEFT = 3

const POLO: MeshSummary[] = [
  { xc: 0, zc: 0.3, count: 5000 },   // front chest panel
  { xc: 0, zc: -0.3, count: 4800 },  // back panel
  { xc: -0.6, zc: 0, count: 900 },   // wearer's right sleeve
  { xc: 0.6, zc: 0, count: 900 },    // wearer's left sleeve
]

describe('pickPanel — the existing front/back rule is unchanged', () => {
  it('no panel asked for → the front chest panel', () => {
    expect(pickPanel(POLO, undefined)).toBe(FRONT)
  })

  it("panel 'front' → the front chest panel", () => {
    expect(pickPanel(POLO, 'front')).toBe(FRONT)
  })

  it("panel 'back' → the back panel", () => {
    expect(pickPanel(POLO, 'back')).toBe(BACK)
  })

  it('front is the LARGEST mesh on the +z side, not merely the first', () => {
    const meshes: MeshSummary[] = [
      { xc: 0, zc: 0.2, count: 100 }, // a small front-facing part
      { xc: 0, zc: 0.3, count: 5000 }, // the real chest panel
      { xc: 0, zc: -0.3, count: 4800 },
    ]
    expect(pickPanel(meshes, 'front')).toBe(1)
    expect(pickPanel(meshes, 'back')).toBe(2)
  })
})

describe('pickPanel — the shoulders route to the right sleeve primitive', () => {
  it("panel 'sleeveRight' → the negative-x sleeve", () => {
    expect(pickPanel(POLO, 'sleeveRight')).toBe(SLEEVE_RIGHT)
  })

  it("panel 'sleeveLeft' → the positive-x sleeve", () => {
    expect(pickPanel(POLO, 'sleeveLeft')).toBe(SLEEVE_LEFT)
  })

  it('works on raw glTF units too (the polo sleeves sit at x ≈ ±14000…25000)', () => {
    const raw: MeshSummary[] = [
      { xc: 120, zc: 8000, count: 42000 },
      { xc: 90, zc: -7600, count: 39000 },
      { xc: -19000, zc: 400, count: 6100 },
      { xc: 19000, zc: 400, count: 6100 },
    ]
    expect(pickPanel(raw, 'sleeveRight')).toBe(2)
    expect(pickPanel(raw, 'sleeveLeft')).toBe(3)
  })

  it('the biggest sleeve-side mesh wins when a sleeve is split in two', () => {
    const meshes: MeshSummary[] = [
      ...POLO,
      { xc: -0.55, zc: 0, count: 300 }, // a cuff, same side, smaller
    ]
    expect(pickPanel(meshes, 'sleeveRight')).toBe(SLEEVE_RIGHT)
  })
})

describe('pickPanel — safe fallbacks, nothing ever vanishes', () => {
  it('no sleeve in the list → the front panel', () => {
    const bodyOnly: MeshSummary[] = [
      { xc: 0, zc: 0.3, count: 5000 },
      { xc: 0, zc: -0.3, count: 4800 },
    ]
    expect(pickPanel(bodyOnly, 'sleeveRight')).toBe(FRONT)
    expect(pickPanel(bodyOnly, 'sleeveLeft')).toBe(FRONT)
  })

  it('a slightly off-centre body is not mistaken for a sleeve', () => {
    const bodyOnly: MeshSummary[] = [
      { xc: -0.004, zc: 0.3, count: 5000 },
      { xc: 0.002, zc: -0.3, count: 4800 },
    ]
    expect(pickPanel(bodyOnly, 'sleeveRight')).toBe(FRONT)
  })

  it('nothing on the +z side → index 0, the body (today’s fallback)', () => {
    const backOnly: MeshSummary[] = [{ xc: 0, zc: -0.3, count: 4800 }]
    expect(pickPanel(backOnly, 'front')).toBe(0)
  })

  it('an empty list → −1', () => {
    expect(pickPanel([], 'front')).toBe(-1)
    expect(pickPanel([], 'back')).toBe(-1)
    expect(pickPanel([], 'sleeveRight')).toBe(-1)
    expect(pickPanel([], undefined)).toBe(-1)
  })
})
