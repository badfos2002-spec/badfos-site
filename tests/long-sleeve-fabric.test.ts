import { describe, it, expect, afterEach } from 'vitest'
import {
  FABRIC_TYPES,
  FABRIC_COLOR_FILTER,
  TSHIRT_AREA_FILTER,
  TSHIRT_DESIGN_AREAS,
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
// white/black only, XS–XXL, and exactly cotton's print areas (the user dropped
// the along-the-sleeve prints in TICKET-018). The 3D model landed in TICKET-018.

afterEach(() => applyPricingOverrides({}))

function design(area: DesignAreaType): DesignArea {
  return { area, areaName: area, imageUrl: 'https://example.com/art.png', fileName: 'art.png' }
}

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

describe('print areas — no sleeve prints anywhere', () => {
  it('the t-shirt area list is exactly the seven classic areas', () => {
    expect(TSHIRT_DESIGN_AREAS.map(a => a.id).sort()).toEqual([...CLASSIC_AREAS].sort())
    expect(TSHIRT_DESIGN_AREAS.map(a => a.id as string)).not.toContain('sleeve_right')
  })

  it('long-sleeve offers exactly what cotton has', () => {
    expect([...TSHIRT_AREA_FILTER['long-sleeve']].sort()).toEqual([...TSHIRT_AREA_FILTER.cotton].sort())
    expect([...TSHIRT_AREA_FILTER['long-sleeve']].sort()).toEqual([...CLASSIC_AREAS].sort())
  })

  it('cotton, dri-fit and oversized offer every classic area', () => {
    for (const fabric of ['cotton', 'dri-fit', 'oversized']) {
      expect([...TSHIRT_AREA_FILTER[fabric]].sort()).toEqual([...CLASSIC_AREAS].sort())
    }
  })

  it('polo keeps its list unchanged (no centre logo, no sleeves)', () => {
    expect(TSHIRT_AREA_FILTER.polo).toEqual(['front_full', 'back', 'chest_logo', 'chest_logo_right', 'shoulder_right', 'shoulder_left'])
  })

  it('only front_full / back are enlargeable on the long-sleeve tee', () => {
    expect(canEnlarge('tshirt', 'back')).toBe(true)
    expect(canEnlarge('tshirt', 'shoulder_right')).toBe(false)
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

  it('long-sleeve + גב: 37 + 5 + 10 = 52 per unit', () => {
    expect(calculateItemPrice(config(['back']))).toBe(52)
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

  it('admin pricing defaults carry the long-sleeve price and no sleeve areas', () => {
    const t = codeDefaults().tshirt
    expect(t.base['long-sleeve']).toBe(42)
    expect(Object.keys(t.areas).sort()).toEqual([...CLASSIC_AREAS].sort())
  })
})

describe('long-sleeve 3D model', () => {
  it('has its own 3D model (TICKET-018)', () => {
    expect(getModel3D('tshirt', 'long-sleeve')).toEqual({ variant: 'longsleeve', url: '/models/longsleeve-web.glb' })
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

  it('white/black only, XS–XXL only (no 3XL/4XL, no kids), cotton areas, no sleeve', () => {
    expect(colorOptions('tshirt', 'long-sleeve').map(o => o.id)).toEqual(['white', 'black'])
    expect(sizeOptions('tshirt', 'long-sleeve', 'white').map(o => o.id)).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
    const areas = areaOptions('tshirt', 'long-sleeve').map(o => o.id)
    expect([...areas].sort()).toEqual([...CLASSIC_AREAS].sort())
    expect(areas).not.toContain('sleeve_right')
  })
})
