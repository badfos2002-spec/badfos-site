import { describe, it, expect } from 'vitest'
import { DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'
import { TSHIRT_DESIGN_AREAS } from '@/lib/constants'

// TICKET-017: until TICKET-018 brings long-sleeve renders, the 2D preview /
// cart thumbnails use the tee photos — every t-shirt area, incl. the sleeves,
// must have an overlay box. The sleeve boxes are narrow and vertical and
// mirror each other like the shoulders (wearer's right = viewer's left).

const pct = (value: string | undefined): number => {
  expect(value).toMatch(/^-?\d+(\.\d+)?%$/)
  return parseFloat(value as string)
}

describe('DESIGN_AREA_OVERLAYS — every t-shirt area has a box', () => {
  it('covers all TSHIRT_DESIGN_AREAS', () => {
    for (const a of TSHIRT_DESIGN_AREAS) expect(DESIGN_AREA_OVERLAYS[a.id], a.id).toBeDefined()
  })
})

describe('DESIGN_AREA_OVERLAYS — sleeve boxes', () => {
  it('both sleeves are front-view, left-anchored, labelled', () => {
    expect(DESIGN_AREA_OVERLAYS.sleeve_right.label).toBe('שרוול ימין')
    expect(DESIGN_AREA_OVERLAYS.sleeve_left.label).toBe('שרוול שמאל')
    for (const area of ['sleeve_right', 'sleeve_left']) {
      const o = DESIGN_AREA_OVERLAYS[area]
      expect(o.view).toBe('front')
      expect(o.style.right).toBeUndefined()
    }
  })

  it('narrow and vertical (aspect ratio w/h < 1)', () => {
    const [w, h] = DESIGN_AREA_OVERLAYS.sleeve_right.style.aspectRatio.split('/').map(s => parseFloat(s))
    expect(w / h).toBeLessThan(1)
    expect(DESIGN_AREA_OVERLAYS.sleeve_left.style.aspectRatio).toBe(DESIGN_AREA_OVERLAYS.sleeve_right.style.aspectRatio)
  })

  it('שרוול ימין on the viewer\'s left, mirrored exactly, clear of קידמי מלא', () => {
    const r = DESIGN_AREA_OVERLAYS.sleeve_right.style
    const l = DESIGN_AREA_OVERLAYS.sleeve_left.style
    expect(pct(r.left)).toBeLessThan(50)
    expect(pct(r.width)).toBe(pct(l.width))
    expect(pct(r.top)).toBe(pct(l.top))
    expect(pct(r.left) + pct(r.width) + pct(l.left)).toBe(100)
    expect(pct(r.left) + pct(r.width)).toBeLessThanOrEqual(30)
  })
})
