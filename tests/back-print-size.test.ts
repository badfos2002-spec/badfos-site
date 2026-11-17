import { describe, it, expect } from 'vitest'
import { VARIANTS } from '@/components/designer/three/placements'
import type { Placement, GuideBox } from '@/components/designer/three/placements'
import { DESIGN_AREA_OVERLAYS, LONG_SLEEVE_AREA_OVERRIDES, SWEATSHIRT_AREA_OVERRIDES } from '@/lib/mockup-data'

// TICKET-019 (user: «להגדיל בחולצות מעט את גודל ההדפס בגב ב5 אחוז» → all
// shirts AND sweatshirts; «תעלה מעט את הגב למעלה בשרוול הארוך»).
//
// The visible print is contain-fit into the guide box (Tshirt3DModel
// `artworkScale`): guide w/h drive what the customer sees, `placement.size` is
// only the no-guide fallback. So w AND h grow 5% (a tall artwork is h-limited,
// a wide one w-limited) and `size` grows with them to stay consistent.

type Cfg = { areas: Record<string, Placement | undefined>; guides: Record<string, GuideBox | undefined> }
const V = VARIANTS as unknown as Record<string, Cfg>
const TOL = 1e-6

// before (develop c2e3183) → after = before × 1.05
const TABLE: Record<string, { size: number; w: number; h: number }> = {
  tshirt:     { size: 0.92, w: 0.55,  h: 0.72 },
  longsleeve: { size: 0.84, w: 0.51,  h: 0.67 },
  polo:       { size: 0.71, w: 0.575, h: 0.71 },
  oversized:  { size: 0.74, w: 0.6,   h: 0.74 },
  sweatshirt: { size: 0.64, w: 0.55,  h: 0.66 },
  hoodie:     { size: 0.64, w: 0.55,  h: 0.66 },
  ziphoodie:  { size: 0.64, w: 0.55,  h: 0.66 },
}

// develop positions of the back print; only the long-sleeve moves (y 0.10 → 0.15)
const POSITIONS: Record<string, [number, number, number]> = {
  tshirt: [0, 0.14, -0.3],
  longsleeve: [0, 0.15, -0.33],
  polo: [0, 0.12, -0.36],
  oversized: [0, 0.11, -0.3],
  sweatshirt: [0, 0.16, -0.33],
  hoodie: [0, 0.01, -0.33],
  ziphoodie: [0, 0.01, -0.33],
}
const DEPTHS: Record<string, number> = {
  tshirt: 0.55, longsleeve: 0.55, polo: 0.5, oversized: 0.55, sweatshirt: 0.55, hoodie: 0.55, ziphoodie: 0.55,
}

describe('3D back print +5% on the seven garment variants', () => {
  for (const [variant, before] of Object.entries(TABLE)) {
    it(`${variant}: guide w/h and size ×1.05`, () => {
      const p = V[variant].areas.back as Placement
      const g = V[variant].guides.back as GuideBox
      expect(Math.abs(g.w - before.w * 1.05), 'w').toBeLessThan(TOL)
      expect(Math.abs(g.h - before.h * 1.05), 'h').toBeLessThan(TOL)
      expect(Math.abs(p.size - before.size * 1.05), 'size').toBeLessThan(TOL)
    })

    it(`${variant}: position / rotation / depth`, () => {
      const p = V[variant].areas.back as Placement
      expect(p.position).toEqual(POSITIONS[variant])
      expect(p.rotation).toEqual([0, Math.PI, 0])
      expect(p.depth).toBe(DEPTHS[variant])
    })
  }

  it('zip hoodie shares the hoodie back entries (scaled once, not twice)', () => {
    expect(V.ziphoodie.areas.back).toBe(V.hoodie.areas.back)
    expect(V.ziphoodie.guides.back).toBe(V.hoodie.guides.back)
  })
})

describe('other areas of the seven variants are untouched', () => {
  it('chest / front_full / shoulders keep their develop numbers', () => {
    expect(V.tshirt.areas.front_full).toEqual({ position: [0, 0.13, 0.3], rotation: [0, 0, 0], size: 0.68, depth: 0.55 })
    expect(V.tshirt.guides.front_full).toEqual({ w: 0.54, h: 0.6, label: 'קדמי מלא' })
    expect(V.tshirt.areas.chest_logo).toEqual({ position: [-0.27, 0.58, 0.28], rotation: [0, 0, 0], size: 0.16, depth: 0.45 })
    expect(V.tshirt.areas.shoulder_right?.position).toEqual([-0.73, 0.36, -0.07])
    expect(V.longsleeve.areas.front_full).toEqual({ position: [0, 0.13, 0.35], rotation: [0, 0, 0], size: 0.62, depth: 0.55 })
    expect(V.longsleeve.guides.front_full).toEqual({ w: 0.5, h: 0.56, label: 'קדמי מלא' })
    expect(V.longsleeve.areas.shoulder_right?.position).toEqual([-0.64, 0.4, -0.05])
    expect(V.polo.guides.front_full).toEqual({ w: 0.4, h: 0.5, label: 'קדמי מלא' })
    expect(V.oversized.guides.front_full).toEqual({ w: 0.54, h: 0.64, label: 'קדמי מלא' })
    expect(V.hoodie.areas.front_full).toEqual({ position: [0, 0.06, 0.33], rotation: [0, 0, 0], size: 0.56, depth: 0.55 })
    expect(V.hoodie.guides.front_full).toEqual({ w: 0.48, h: 0.58, label: 'קדמי מלא' })
    expect(V.sweatshirt.areas.shoulder_right?.position).toEqual([-0.67, 0.18, -0.05])
    expect(V.ziphoodie.areas.shoulder_right?.position).toEqual([-0.67, 0.18, 0.07])
  })
})

describe('non-shirt products: back entries byte-identical to develop', () => {
  it('totevolume / baby / vest', () => {
    expect(V.totevolume.areas.back).toEqual({ position: [0, -0.28, -0.34], rotation: [0, Math.PI, 0], size: 0.72, depth: 0.55 })
    expect(V.totevolume.guides.back).toEqual({ w: 0.6, h: 0.68, label: 'צד אחורי' })
    expect(V.baby.areas.back).toEqual({ position: [0, 0.18, -0.34], rotation: [0, Math.PI, 0], size: 0.62, depth: 0.5 })
    expect(V.baby.guides.back).toEqual({ w: 0.62, h: 0.75, label: 'גב' })
    expect(V.vest.areas.back).toEqual({ position: [0, 0.42, -0.35], rotation: [0, Math.PI, 0], size: 0.55, depth: 0.3 })
    expect(V.vest.guides.back).toEqual({ w: 0.55, h: 0.48, label: 'גב' })
  })

  it('tote / apron / cap / buff have no back print', () => {
    for (const v of ['tote', 'apron', 'cap', 'buff']) {
      expect(V[v], v).toBeDefined()
      expect(V[v].areas.back, v).toBeUndefined()
    }
  })
})

describe('2D back boxes: width ×1.05, same aspect, still centred', () => {
  const pct = (s: string) => parseFloat(s)
  const CASES = [
    { name: 'tee photos', style: DESIGN_AREA_OVERLAYS.back.style, width: 45, aspect: '180 / 200', top: '24.06%' },
    { name: 'long-sleeve renders', style: LONG_SLEEVE_AREA_OVERRIDES.back, width: 23.1, aspect: '277 / 364', top: '33.63%' },
    { name: 'sweatshirt photos', style: SWEATSHIRT_AREA_OVERRIDES.back, width: 36, aspect: '180 / 200', top: '32.17%' },
  ]
  for (const c of CASES) {
    it(c.name, () => {
      expect(Math.abs(pct(c.style.width) - c.width * 1.05)).toBeLessThan(TOL)
      expect(c.style.aspectRatio).toBe(c.aspect)
      expect(c.style.left).toBe('50%')
      expect(c.style.transform).toBe('translateX(-50%)')
      // top moves up by half the height delta (container W/H: 3/4 tee designer, 1200/1454 sweatshirt photo)
      expect(c.style.top).toBe(c.top)
    })
  }

  it('other 2D boxes untouched', () => {
    expect(DESIGN_AREA_OVERLAYS.front_full.style.width).toBe('40%')
    expect(DESIGN_AREA_OVERLAYS.cap_center.style.width).toBe('20%')
    expect(LONG_SLEEVE_AREA_OVERRIDES.front_full.width).toBe('22.5%')
    expect(SWEATSHIRT_AREA_OVERRIDES.shoulder_right.width).toBe('5%')
  })
})
