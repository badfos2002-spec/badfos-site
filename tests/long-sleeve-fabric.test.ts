import { describe, it, expect, afterEach } from 'vitest'
import {
  FABRIC_TYPES,
  FABRIC_COLOR_FILTER,
  TSHIRT_AREA_FILTER,
  TSHIRT_DESIGN_AREAS,
  LONG_SLEEVE_ONLY_AREAS,
  getFabricType,
  getModel3D,
  getBasePrice,
  applyPricingOverrides,
} from '@/lib/constants'
import { calculateItemPrice } from '@/lib/pricing'
import { canEnlarge } from '@/lib/enlarge'
import { codeDefaults } from '@/app/admin/pricing/defaults'
import { typeOptions, sizeOptions, areaOptions, colorOptions } from '@/lib/manual-order'
import type { DesignArea, DesignAreaType, ProductConfig } from '@/lib/types'

// TICKET-017: «חולצת שרוול ארוך» — a cotton sleeve variant. +₪5 over cotton,
// white/black only, XS–XXL, and two print areas of its own (שרוול ימין/שמאל)
// that no other fabric offers. The 3D model lands in TICKET-018 — until then
// getModel3D returns null and the designer shows the 2D mockup.

afterEach(() => applyPricingOverrides({}))

function design(area: DesignAreaType): DesignArea {
  return { area, areaName: area, imageUrl: 'https://example.com/art.png', fileName: 'art.png' }
}

const SLEEVES = ['sleeve_right', 'sleeve_left']
const CLASSIC_AREAS = ['front_full', 'back', 'chest_logo', 'chest_logo_right', 'chest_logo_center', 'shoulder_right', 'shoulder_left']

describe('FABRIC_TYPES — long-sleeve', () => {
  it('has the long-sleeve entry: +₪5, a cotton variant, named «חולצת שרוול ארוך»', () => {
    const ls = FABRIC_TYPES.find(f => f.id === 'long-sleeve')
    expect(ls).toBeDefined()
    expect(ls!.surcharge).toBe(5)
    expect(ls!.parent).toBe('cotton')
    expect(ls!.name).toBe('חולצת שרוול ארוך')
    expect(ls!.description).toBe('כותנה עם שרוולים ארוכים')
  })

  it('the top level (no parent) is exactly the four classic fabrics', () => {
    expect(FABRIC_TYPES.filter(f => !f.parent).map(f => f.id)).toEqual(['cotton', 'dri-fit', 'polo', 'oversized'])
  })

  it('getFabricType names it for the cart / admin / emails', () => {
    expect(getFabricType('long-sleeve')?.name).toBe('חולצת שרוול ארוך')
    expect(getFabricType('long-sleeve')?.surcharge).toBe(5)
  })

  it('colours: white and black only', () => {
    expect(FABRIC_COLOR_FILTER['long-sleeve']).toEqual(['white', 'black'])
  })
})

describe('sleeve print areas', () => {
  it('the t-shirt area list has שרוול ימין / שרוול שמאל at ₪5', () => {
    const right = TSHIRT_DESIGN_AREAS.find(a => a.id === 'sleeve_right')
    const left = TSHIRT_DESIGN_AREAS.find(a => a.id === 'sleeve_left')
    expect(right).toMatchObject({ name: 'שרוול ימין', description: 'הדפס לאורך השרוול', price: 5 })
    expect(left).toMatchObject({ name: 'שרוול שמאל', description: 'הדפס לאורך השרוול', price: 5 })
  })

  it('LONG_SLEEVE_ONLY_AREAS lists the two sleeves', () => {
    expect([...LONG_SLEEVE_ONLY_AREAS].sort()).toEqual([...SLEEVES].sort())
  })

  it('long-sleeve offers everything cotton has plus both sleeves', () => {
    const ids = TSHIRT_AREA_FILTER['long-sleeve']
    expect([...ids].sort()).toEqual([...CLASSIC_AREAS, ...SLEEVES].sort())
  })

  it('cotton, dri-fit and oversized offer every classic area and no sleeve', () => {
    for (const fabric of ['cotton', 'dri-fit', 'oversized']) {
      expect([...TSHIRT_AREA_FILTER[fabric]].sort()).toEqual([...CLASSIC_AREAS].sort())
    }
  })

  it('polo keeps its list unchanged (no centre logo, no sleeves)', () => {
    expect(TSHIRT_AREA_FILTER.polo).toEqual(['front_full', 'back', 'chest_logo', 'chest_logo_right', 'shoulder_right', 'shoulder_left'])
  })

  it('sleeve areas are not enlargeable', () => {
    expect(canEnlarge('tshirt', 'sleeve_right')).toBe(false)
    expect(canEnlarge('tshirt', 'sleeve_left')).toBe(false)
  })
})

describe('long-sleeve pricing', () => {
  const config = (designs: DesignAreaType[]): ProductConfig => ({
    productType: 'tshirt',
    fabricType: 'long-sleeve',
    color: 'white',
    designs: designs.map(design),
    sizes: [],
  })

  it('plain long-sleeve: 37 + 5', () => {
    expect(calculateItemPrice(config([]))).toBe(42)
  })

  it('long-sleeve + שרוול ימין + גב: 37 + 5 + 5 + 10 = 57 per unit', () => {
    expect(calculateItemPrice(config(['sleeve_right', 'back']))).toBe(57)
  })

  it('a saved v2 price doc without a long-sleeve key prices it as cotton + 5, never as plain cotton', () => {
    applyPricingOverrides({
      products: { tshirt: { base: { cotton: 40, 'dri-fit': 40, polo: 50, oversized: 50 }, areas: {} } },
    })
    expect(getBasePrice('tshirt', 'long-sleeve')).toBe(45)
    expect(getFabricType('long-sleeve')?.surcharge).toBe(5)
  })

  it('a v2 doc WITH a long-sleeve price wins', () => {
    applyPricingOverrides({
      products: { tshirt: { base: { cotton: 37, 'long-sleeve': 44 }, areas: {} } },
    })
    expect(getBasePrice('tshirt', 'long-sleeve')).toBe(44)
    expect(getFabricType('long-sleeve')?.surcharge).toBe(7)
  })

  it('admin pricing defaults carry the long-sleeve price and both sleeve areas', () => {
    const t = codeDefaults().tshirt
    expect(t.base['long-sleeve']).toBe(42)
    expect(t.areas.sleeve_right).toBe(5)
    expect(t.areas.sleeve_left).toBe(5)
    // sweatshirts have no sleeve prints
    expect(codeDefaults().sweatshirt.areas.sleeve_right).toBeUndefined()
  })
})

describe('long-sleeve 3D model', () => {
  it('has no 3D model yet (TICKET-018) — the designer falls back to 2D', () => {
    expect(getModel3D('tshirt', 'long-sleeve')).toBeNull()
  })

  it('the other t-shirt fabrics keep their models', () => {
    expect(getModel3D('tshirt', 'cotton')?.variant).toBe('tshirt')
    expect(getModel3D('tshirt', 'polo')?.variant).toBe('polo')
    expect(getModel3D('tshirt', 'oversized')?.variant).toBe('oversized')
  })
})

describe('manual order — long-sleeve', () => {
  it('is offered as a t-shirt type', () => {
    expect(typeOptions('tshirt').some(o => o.id === 'long-sleeve' && o.name === 'חולצת שרוול ארוך')).toBe(true)
  })

  it('white/black only, XS–XXL only (no 3XL/4XL, no kids), sleeves offered', () => {
    expect(colorOptions('tshirt', 'long-sleeve').map(o => o.id)).toEqual(['white', 'black'])
    expect(sizeOptions('tshirt', 'long-sleeve', 'white').map(o => o.id)).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
    const areas = areaOptions('tshirt', 'long-sleeve').map(o => o.id)
    expect(areas).toContain('sleeve_right')
    expect(areas).toContain('sleeve_left')
    expect(areaOptions('tshirt', 'cotton').map(o => o.id)).not.toContain('sleeve_right')
  })
})
