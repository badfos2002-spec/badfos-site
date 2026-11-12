import { describe, it, expect } from 'vitest'
import {
  anglesForItem,
  snapshotFileName,
  viewerDesignsFor,
} from '@/lib/admin-3d-viewer'
import { angleForArea } from '@/components/designer/three/placements'
import type { DesignArea, DesignAreaType, OrderItem } from '@/lib/types'

// TICKET-006: the admin order card mounts the live 3D stage for a t-shirt /
// sweatshirt item. Everything that can be decided without a canvas lives in
// pure helpers — which angles the item is worth looking at, what the saved PNG
// is called, and how the order's stored designs become `ShirtDesign[]`.
//
// The turntable angles are NOT re-derived here: they come from TICKET-004's
// `angleForArea`, the single source of truth that ties a placement's projector
// rotation to the turntable.

const STORAGE = 'https://firebasestorage.googleapis.com/v0/b/badfos-test.firebasestorage.app/o'

function design(area: DesignAreaType, extra: Record<string, unknown> = {}): DesignArea {
  return {
    area,
    areaName: area,
    imageUrl: `${STORAGE}/designs%2F${area}.png?alt=media&token=abc123`,
    fileName: `${area}.png`,
    ...extra,
  } as DesignArea
}

function item(designs: DesignArea[], over: Partial<OrderItem> = {}): OrderItem {
  return {
    productType: 'tshirt',
    fabricType: 'cotton',
    color: 'black',
    sizes: [{ size: 'L', quantity: 3 }],
    designs,
    pricePerUnit: 47,
    totalQuantity: 3,
    totalPrice: 141,
    ...over,
  }
}

describe('anglesForItem — which angles the producer gets buttons for', () => {
  it('a plain front+back item gets exactly two angles: קדימה (0) and גב (π)', () => {
    const angles = anglesForItem(item([design('front_full'), design('back')]))

    expect(angles).toHaveLength(2)
    expect(angles.map(a => a.label)).toEqual(['קדימה', 'גב'])
    expect(angles[0].angle).toBe(0)
    expect(angles[1].angle).toBe(Math.PI)
  })

  it('an item with no designs at all still gets front and back', () => {
    const angles = anglesForItem(item([]))

    expect(angles.map(a => a.label)).toEqual(['קדימה', 'גב'])
  })

  it('a chest logo adds no angle — it is already visible from the front', () => {
    const angles = anglesForItem(item([design('chest_logo')]))

    expect(angles).toHaveLength(2)
    expect(angles.map(a => a.label)).toEqual(['קדימה', 'גב'])
  })

  it('a right-shoulder print adds כתף ימין at angleForArea — a quarter turn', () => {
    const angles = anglesForItem(item([design('front_full'), design('shoulder_right')]))

    expect(angles).toHaveLength(3)
    expect(angles[2].label).toBe('כתף ימין')
    expect(angles[2].angle).toBe(angleForArea('tshirt', 'shoulder_right'))
    expect(Math.abs(angles[2].angle)).toBe(Math.PI / 2)
  })

  it('both shoulders give four angles, the two shoulders mirrored', () => {
    const angles = anglesForItem(
      item([design('back'), design('shoulder_left'), design('shoulder_right')])
    )

    expect(angles.map(a => a.label)).toEqual(['קדימה', 'גב', 'כתף ימין', 'כתף שמאל'])
    const right = angles[2].angle
    const left = angles[3].angle
    expect(right).toBe(angleForArea('tshirt', 'shoulder_right'))
    expect(left).toBe(angleForArea('tshirt', 'shoulder_left'))
    expect(right).toBe(-left)
    expect(Math.abs(right)).toBe(Math.PI / 2)
  })

  it('the angles come from the item own 3D variant, not from the t-shirt always', () => {
    // sweatshirt + kangaroo → the hoodie model (getModel3D), so the shoulder
    // angle must be read off the HOODIE placements.
    const angles = anglesForItem(
      item([design('shoulder_left')], { productType: 'sweatshirt', fabricType: 'kangaroo' })
    )

    expect(angles[2].label).toBe('כתף שמאל')
    expect(angles[2].angle).toBe(angleForArea('hoodie', 'shoulder_left'))
  })

  it('every angle carries the area it belongs to', () => {
    const angles = anglesForItem(item([design('shoulder_right')]))

    expect(angles.map(a => a.area)).toEqual(['front_full', 'back', 'shoulder_right'])
  })
})

describe('snapshotFileName — what lands in the admin Downloads folder', () => {
  it('numbers the item from 1, not from 0', () => {
    expect(snapshotFileName(1592, 0, 'כתף ימין')).toBe('הזמנה-1592-פריט-1-כתף ימין.png')
  })

  it('pins one literal per angle label', () => {
    expect(snapshotFileName(1592, 0, 'קדימה')).toBe('הזמנה-1592-פריט-1-קדימה.png')
    expect(snapshotFileName(1592, 1, 'גב')).toBe('הזמנה-1592-פריט-2-גב.png')
    expect(snapshotFileName(7, 2, 'כתף שמאל')).toBe('הזמנה-7-פריט-3-כתף שמאל.png')
  })

  it('a path character in an input can never produce a path separator', () => {
    expect(snapshotFileName(1592, 0, 'כתף/ימין')).toBe('הזמנה-1592-פריט-1-כתף-ימין.png')
    expect(snapshotFileName(1592, 0, '..\\..\\etc')).not.toMatch(/[\\/]/)
    expect(snapshotFileName(1592, 0, 'a:b*c?d"e<f>g|h')).not.toMatch(/[\\/:*?"<>|]/)
    expect(snapshotFileName(1592, 0, 'כתף/ימין')).toMatch(/\.png$/)
  })
})

describe('viewerDesignsFor — the order designs as the 3D stage wants them', () => {
  it('one entry per design, carrying its area', () => {
    const designs = viewerDesignsFor(item([design('front_full'), design('shoulder_right')]))

    expect(designs).toHaveLength(2)
    expect(designs.map(d => d.area)).toEqual(['front_full', 'shoulder_right'])
  })

  it('the artwork is loaded through the SAME-ORIGIN proxy, never from Storage', () => {
    // A cross-origin texture taints the WebGL canvas and `toBlob` throws, so
    // the capture would die on the one thing this feature exists for.
    const [d] = viewerDesignsFor(item([design('front_full')]))

    expect(d.url.startsWith('https://firebasestorage.googleapis.com')).toBe(false)
    expect(d.url.startsWith('/api/design-proxy?url=')).toBe(true)
    expect(d.url).toContain(encodeURIComponent(`${STORAGE}/designs%2Ffront_full.png?alt=media&token=abc123`))
  })

  it('a url that is already same-origin is left alone', () => {
    const [d] = viewerDesignsFor(
      item([design('front_full', { imageUrl: 'data:image/png;base64,AAAA' })])
    )

    expect(d.url).toBe('data:image/png;base64,AAAA')
  })

  it('no enlarge field (the common case today) → scale 1, no offset', () => {
    const [d] = viewerDesignsFor(item([design('front_full')]))

    expect(d.transform).toEqual({ dx: 0, dy: 0, scale: 1 })
  })

  it('enlarge 2 → scale 1.2 (TICKET-005 writes the field; we only read it)', () => {
    const [d] = viewerDesignsFor(item([design('front_full', { enlarge: 2 })]))

    expect(d.transform?.scale).toBe(1.2)
  })

  it('enlarge 1 and 3 → 1.1 and 1.3', () => {
    const [one] = viewerDesignsFor(item([design('back', { enlarge: 1 })]))
    const [three] = viewerDesignsFor(item([design('back', { enlarge: 3 })]))

    expect(one.transform?.scale).toBeCloseTo(1.1, 10)
    expect(three.transform?.scale).toBeCloseTo(1.3, 10)
  })

  it('a junk enlarge value cannot break the scale', () => {
    const bad = viewerDesignsFor(
      item([
        design('front_full', { enlarge: null }),
        design('back', { enlarge: 'two' }),
        design('chest_logo', { enlarge: NaN }),
      ])
    )

    for (const d of bad) expect(d.transform?.scale).toBe(1)
  })

  // TICKET-005 landed `lib/enlarge.ts`, which owns the step→scale rule for every
  // consumer: the price, the sanitiser, the 2D overlays and every other
  // Preview3DStage caller. The viewer's own copy of `1 + 0.1*n` had neither the
  // ceiling nor the product/area gate, so it was the one place that could
  // disagree with what the customer paid for and what the sketch shows.
  it('a crafted enlarge 7 is clamped to the ceiling — 1.3, not 1.7', () => {
    const [d] = viewerDesignsFor(item([design('front_full', { enlarge: 7 })]))

    expect(d.transform?.scale).toBeCloseTo(1.3, 10)
  })

  it('a fractional step floors, like every other consumer', () => {
    const [d] = viewerDesignsFor(item([design('front_full', { enlarge: 2.5 })]))

    expect(d.transform?.scale).toBeCloseTo(1.2, 10)
  })

  it('a stale enlarge on an area that cannot be enlarged is ignored', () => {
    // Only front_full and back enlarge. A chest logo or a shoulder carrying the
    // field (hand-edited doc, future area rename) must render at its real size.
    const designs = viewerDesignsFor(
      item([
        design('chest_logo', { enlarge: 2 }),
        design('shoulder_right', { enlarge: 3 }),
      ])
    )

    expect(designs.map(d => d.transform?.scale)).toEqual([1, 1])
  })

  it('the gate is product AND area — a product without the feature never scales', () => {
    const [d] = viewerDesignsFor(
      item([design('front_full', { enlarge: 3 })], { productType: 'cap' })
    )

    expect(d.transform?.scale).toBe(1)
  })

  it('a sweatshirt back still enlarges all the way to 1.3', () => {
    const [d] = viewerDesignsFor(
      item([design('back', { enlarge: 3 })], { productType: 'sweatshirt', fabricType: 'kangaroo' })
    )

    expect(d.transform?.scale).toBeCloseTo(1.3, 10)
  })

  it('a design with no image url is dropped rather than rendered as a blank decal', () => {
    const designs = viewerDesignsFor(
      item([design('front_full', { imageUrl: '' }), design('back')])
    )

    expect(designs.map(d => d.area)).toEqual(['back'])
  })
})
