import { describe, it, expect } from 'vitest'
import { DESIGN_AREA_OVERLAYS, SWEATSHIRT_AREA_OVERRIDES } from '@/lib/mockup-data'

// TICKET-004: the 2D overlay boxes for the sleeve prints.
// Right/left are the WEARER's side, like chest_logo (סמל כיס ימין sits at
// left: '30%' = the VIEWER's left). So on a front photo:
//   shoulder_right → viewer's LEFT half  (left < 50)
//   shoulder_left  → viewer's RIGHT half (left > 50)
// Both boxes are anchored with `left` (never `right`) so a single key can be
// parsed, and they mirror each other exactly:
//   left(shoulder_right) + width + left(shoulder_left) === 100

const pct = (value: string | undefined): number => {
  expect(value).toMatch(/^-?\d+(\.\d+)?%$/)
  return parseFloat(value as string)
}

describe('DESIGN_AREA_OVERLAYS — shoulder boxes on the t-shirt photo', () => {
  it('both shoulders are front-view areas', () => {
    expect(DESIGN_AREA_OVERLAYS.shoulder_right).toBeDefined()
    expect(DESIGN_AREA_OVERLAYS.shoulder_left).toBeDefined()
    expect(DESIGN_AREA_OVERLAYS.shoulder_right.view).toBe('front')
    expect(DESIGN_AREA_OVERLAYS.shoulder_left.view).toBe('front')
  })

  it('both are small square boxes anchored with `left`, never `right`', () => {
    for (const area of ['shoulder_right', 'shoulder_left']) {
      const style = DESIGN_AREA_OVERLAYS[area].style
      expect(style.right).toBeUndefined()
      expect(style.aspectRatio).toBe('1')
      expect(pct(style.width)).toBeGreaterThan(0)
      expect(pct(style.top)).toBeGreaterThan(0)
    }
  })

  it('כתף ימין sits on the viewer’s left half, כתף שמאל on the right half', () => {
    expect(pct(DESIGN_AREA_OVERLAYS.shoulder_right.style.left)).toBeLessThan(50)
    expect(pct(DESIGN_AREA_OVERLAYS.shoulder_left.style.left)).toBeGreaterThan(50)
  })

  it('the two boxes mirror each other exactly about the middle of the photo', () => {
    const right = DESIGN_AREA_OVERLAYS.shoulder_right.style
    const left = DESIGN_AREA_OVERLAYS.shoulder_left.style
    expect(pct(right.width)).toBe(pct(left.width))
    expect(pct(right.top)).toBe(pct(left.top))
    expect(pct(right.left) + pct(right.width) + pct(left.left)).toBe(100)
  })

  it('neither box overlaps קידמי מלא (30%–70%) or the chest logos', () => {
    const right = DESIGN_AREA_OVERLAYS.shoulder_right.style
    const left = DESIGN_AREA_OVERLAYS.shoulder_left.style
    // front_full: width 40% centred → 30%..70%; chest_logo: left 30%, width 12%
    expect(pct(right.left) + pct(right.width)).toBeLessThanOrEqual(30)
    expect(pct(left.left)).toBeGreaterThanOrEqual(70)
  })
})

describe('SWEATSHIRT_AREA_OVERRIDES — the hoodie sleeve is narrower', () => {
  it('both shoulders get a sweatshirt-specific box', () => {
    expect(SWEATSHIRT_AREA_OVERRIDES.shoulder_right).toBeDefined()
    expect(SWEATSHIRT_AREA_OVERRIDES.shoulder_left).toBeDefined()
  })

  it('the override boxes are left-anchored and mirror each other exactly', () => {
    const right = SWEATSHIRT_AREA_OVERRIDES.shoulder_right
    const left = SWEATSHIRT_AREA_OVERRIDES.shoulder_left
    expect(right.right).toBeUndefined()
    expect(left.right).toBeUndefined()
    expect(pct(right.width)).toBe(pct(left.width))
    expect(pct(right.top)).toBe(pct(left.top))
    expect(pct(right.left)).toBeLessThan(50)
    expect(pct(left.left)).toBeGreaterThan(50)
    expect(pct(right.left) + pct(right.width) + pct(left.left)).toBe(100)
  })

  it('the hoodie box is narrower than the t-shirt box — its sleeve is narrower', () => {
    expect(pct(SWEATSHIRT_AREA_OVERRIDES.shoulder_right.width)).toBeLessThan(
      pct(DESIGN_AREA_OVERLAYS.shoulder_right.style.width)
    )
  })

  it('the existing גב override is untouched', () => {
    expect(SWEATSHIRT_AREA_OVERRIDES.back.width).toBe('36%')
    expect(SWEATSHIRT_AREA_OVERRIDES.back.top).toBe('33%')
  })
})
