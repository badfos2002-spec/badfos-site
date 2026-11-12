import { describe, it, expect } from 'vitest'
import { DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'
import { codeDefaults } from '@/app/admin/pricing/defaults'
import type { DesignArea, DesignAreaType } from '@/lib/types'

// TICKET-004: the cart thumbnail, the share page and the share-cart page all
// split a product's designs into front/back with the SAME expression:
//   designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'front')
// Rendering CartItem would drag in the Zustand store, next/image and lib/db
// (Firebase), so this pins that pure expression instead — the components are
// verified to use it verbatim (CartItem.tsx:190-191, ShareClient.tsx:226-227,
// app/share/cart/[id]/page.tsx:124-125).

function design(area: DesignAreaType): DesignArea {
  return {
    area,
    areaName: area,
    imageUrl: 'https://example.com/art.png',
    fileName: 'art.png',
  }
}

const hasFrontDesigns = (designs: DesignArea[]) =>
  designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'front')
const hasBackDesigns = (designs: DesignArea[]) =>
  designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'back')

describe('cart / share thumbnails — a shoulder print is a FRONT design', () => {
  it('כתף ימין alone shows the front mockup and not the back one', () => {
    const designs = [design('shoulder_right')]
    expect(hasFrontDesigns(designs)).toBe(true)
    expect(hasBackDesigns(designs)).toBe(false)
  })

  it('כתף שמאל alone shows the front mockup and not the back one', () => {
    const designs = [design('shoulder_left')]
    expect(hasFrontDesigns(designs)).toBe(true)
    expect(hasBackDesigns(designs)).toBe(false)
  })

  it('a shoulder plus a back print shows both mockups', () => {
    const designs = [design('shoulder_left'), design('back')]
    expect(hasFrontDesigns(designs)).toBe(true)
    expect(hasBackDesigns(designs)).toBe(true)
  })

  it('the shoulder overlays resolve to a style the thumbnail can apply', () => {
    for (const area of ['shoulder_right', 'shoulder_left'] as const) {
      expect(DESIGN_AREA_OVERLAYS[area]).toBeDefined()
      expect(DESIGN_AREA_OVERLAYS[area].label).toBeTruthy()
      expect(DESIGN_AREA_OVERLAYS[area].style.width).toBeTruthy()
    }
  })
})

describe('/admin/pricing — the shoulders are editable at ₪5', () => {
  it('t-shirt defaults include both shoulders at 5', () => {
    expect(codeDefaults().tshirt.areas.shoulder_right).toBe(5)
    expect(codeDefaults().tshirt.areas.shoulder_left).toBe(5)
  })

  it('sweatshirt defaults include both shoulders at 5', () => {
    expect(codeDefaults().sweatshirt.areas.shoulder_right).toBe(5)
    expect(codeDefaults().sweatshirt.areas.shoulder_left).toBe(5)
  })

  it('no other product gained a shoulder price', () => {
    const defaults = codeDefaults()
    for (const productId of ['cap', 'tote', 'vest', 'buff', 'apron', 'baby']) {
      expect(defaults[productId].areas.shoulder_right).toBeUndefined()
      expect(defaults[productId].areas.shoulder_left).toBeUndefined()
    }
  })

  it('the existing defaults are untouched', () => {
    const defaults = codeDefaults()
    expect(defaults.tshirt.base.cotton).toBe(37)
    expect(defaults.tshirt.areas.front_full).toBe(10)
    expect(defaults.tshirt.areas.chest_logo).toBe(5)
    expect(defaults.sweatshirt.base.kangaroo).toBe(53)
    expect(defaults.sweatshirt.areas.back).toBe(10)
  })
})
