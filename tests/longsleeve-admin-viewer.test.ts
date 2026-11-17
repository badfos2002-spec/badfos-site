import { describe, it, expect } from 'vitest'
import { anglesForItem } from '@/lib/admin-3d-viewer'
import { angleForArea } from '@/components/designer/three/placements'
import type { DesignArea, OrderItem } from '@/lib/types'

// TICKET-018: the admin order card's 3D viewer must show a long-sleeve item on
// its own model and give the producer a button for each printed sleeve, at the
// turntable angle `angleForArea` owns (never re-derived here).

function design(area: string): DesignArea {
  return { area, areaName: area, imageUrl: `https://example.com/${area}.png`, fileName: `${area}.png` } as DesignArea
}
function item(designs: DesignArea[]): OrderItem {
  return {
    productType: 'tshirt',
    fabricType: 'long-sleeve',
    color: 'black',
    sizes: [{ size: 'L', quantity: 1 }],
    designs,
    pricePerUnit: 52,
    totalQuantity: 1,
    totalPrice: 52,
  } as unknown as OrderItem
}

describe('anglesForItem — long-sleeve', () => {
  it('a right-sleeve print adds שרוול ימין at the longsleeve sleeve angle', () => {
    const angles = anglesForItem(item([design('front_full'), design('sleeve_right')]))
    expect(angles.map(a => a.label)).toEqual(['קדימה', 'גב', 'שרוול ימין'])
    expect(angles[2].area).toBe('sleeve_right')
    expect(angles[2].angle).toBe(angleForArea('longsleeve' as never, 'sleeve_right'))
    expect(angles[2].angle).toBeCloseTo(Math.PI / 2, 10)
  })

  it('both sleeves and both shoulders: six buttons, sleeves after shoulders, mirrored', () => {
    const angles = anglesForItem(item([
      design('sleeve_left'), design('shoulder_right'), design('sleeve_right'), design('shoulder_left'),
    ]))
    expect(angles.map(a => a.label)).toEqual(['קדימה', 'גב', 'כתף ימין', 'כתף שמאל', 'שרוול ימין', 'שרוול שמאל'])
    expect(angles[4].angle).toBeCloseTo(-angles[5].angle, 10)
  })

  it('no sleeve print → no sleeve button', () => {
    expect(anglesForItem(item([design('back')])).map(a => a.area)).toEqual(['front_full', 'back'])
  })
})
