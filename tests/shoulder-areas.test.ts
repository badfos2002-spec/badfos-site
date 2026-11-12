import { describe, it, expect } from 'vitest'
import {
  getDesignAreasByProductType,
  TSHIRT_AREA_FILTER,
  SWEATSHIRT_AREA_FILTER,
  SWEATSHIRT_DESIGN_AREAS,
} from '@/lib/constants'
import type { DesignAreaType, ProductType } from '@/lib/types'

// TICKET-004: כתף ימין / כתף שמאל exist on t-shirts and sweatshirts only, at
// ₪5, and must survive the polo / zip area filters (a filter that omits them
// hides them silently). Every expectation is a literal.

const SHOULDERS = ['shoulder_right', 'shoulder_left'] as const

function areaIds(productType: ProductType): string[] {
  return getDesignAreasByProductType(productType).map(a => a.id)
}

describe('getDesignAreasByProductType — shoulders on shirts', () => {
  it('tshirt offers כתף ימין at 5', () => {
    const area = getDesignAreasByProductType('tshirt').find(a => a.id === 'shoulder_right')
    expect(area).toBeDefined()
    expect(area?.name).toBe('כתף ימין')
    expect(area?.price).toBe(5)
  })

  it('tshirt offers כתף שמאל at 5', () => {
    const area = getDesignAreasByProductType('tshirt').find(a => a.id === 'shoulder_left')
    expect(area).toBeDefined()
    expect(area?.name).toBe('כתף שמאל')
    expect(area?.price).toBe(5)
  })

  it('sweatshirt offers כתף ימין at 5', () => {
    const area = getDesignAreasByProductType('sweatshirt').find(a => a.id === 'shoulder_right')
    expect(area).toBeDefined()
    expect(area?.name).toBe('כתף ימין')
    expect(area?.price).toBe(5)
  })

  it('sweatshirt offers כתף שמאל at 5', () => {
    const area = getDesignAreasByProductType('sweatshirt').find(a => a.id === 'shoulder_left')
    expect(area).toBeDefined()
    expect(area?.name).toBe('כתף שמאל')
    expect(area?.price).toBe(5)
  })

  it('every other product offers neither shoulder', () => {
    for (const productType of ['cap', 'buff', 'tote', 'vest', 'baby', 'apron'] as const) {
      const ids = areaIds(productType)
      expect(ids).not.toContain('shoulder_right')
      expect(ids).not.toContain('shoulder_left')
    }
  })
})

describe('area filters keep the shoulders available', () => {
  it('TSHIRT_AREA_FILTER.polo includes both shoulders and still its four old areas', () => {
    expect(TSHIRT_AREA_FILTER.polo).toContain('shoulder_right')
    expect(TSHIRT_AREA_FILTER.polo).toContain('shoulder_left')
    expect(TSHIRT_AREA_FILTER.polo).toContain('front_full')
    expect(TSHIRT_AREA_FILTER.polo).toContain('back')
    expect(TSHIRT_AREA_FILTER.polo).toContain('chest_logo')
    expect(TSHIRT_AREA_FILTER.polo).toContain('chest_logo_right')
    expect(TSHIRT_AREA_FILTER.polo).not.toContain('chest_logo_center')
  })

  it('SWEATSHIRT_AREA_FILTER.zip includes both shoulders and still excludes קידמי מלא', () => {
    expect(SWEATSHIRT_AREA_FILTER.zip).toContain('shoulder_right')
    expect(SWEATSHIRT_AREA_FILTER.zip).toContain('shoulder_left')
    expect(SWEATSHIRT_AREA_FILTER.zip).toContain('back')
    expect(SWEATSHIRT_AREA_FILTER.zip).toContain('chest_logo')
    expect(SWEATSHIRT_AREA_FILTER.zip).toContain('chest_logo_right')
    expect(SWEATSHIRT_AREA_FILTER.zip).not.toContain('front_full')
  })
})

describe('the sweatshirt designer picks the shoulders up from the constants', () => {
  // Mirrors app/designer/sweatshirt/page.tsx: availableAreas is derived from
  // SWEATSHIRT_DESIGN_AREAS + SWEATSHIRT_AREA_FILTER — there is no literal
  // area list in that page, so this pins the real derivation.
  function availableAreas(type: string): string[] {
    return SWEATSHIRT_DESIGN_AREAS.filter(
      a => !SWEATSHIRT_AREA_FILTER[type] || SWEATSHIRT_AREA_FILTER[type].includes(a.id)
    ).map(a => a.id)
  }

  it('kangaroo (no filter) offers both shoulders', () => {
    expect(availableAreas('kangaroo')).toContain('shoulder_right')
    expect(availableAreas('kangaroo')).toContain('shoulder_left')
  })

  it('putter (no filter) offers both shoulders', () => {
    expect(availableAreas('putter')).toContain('shoulder_right')
    expect(availableAreas('putter')).toContain('shoulder_left')
  })

  it('zip offers both shoulders but no קידמי מלא', () => {
    expect(availableAreas('zip')).toContain('shoulder_right')
    expect(availableAreas('zip')).toContain('shoulder_left')
    expect(availableAreas('zip')).not.toContain('front_full')
  })
})

describe('DesignAreaType', () => {
  it('accepts both shoulder ids (the real gate is tsc --noEmit)', () => {
    const right: DesignAreaType = 'shoulder_right'
    const left: DesignAreaType = 'shoulder_left'
    expect([right, left]).toEqual(SHOULDERS.slice())
  })

  it('both ids are safe for the download/upscale route regexes ([A-Za-z0-9_])', () => {
    for (const id of SHOULDERS) {
      expect(id).toMatch(/^[A-Za-z0-9_]+$/)
    }
  })
})
