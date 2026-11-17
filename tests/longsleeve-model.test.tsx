import { describe, it, expect, vi } from 'vitest'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react'
import { getModel3D } from '@/lib/constants'
import { VARIANTS } from '@/components/designer/three/placements'
import {
  DESIGN_AREA_OVERLAYS,
  LONG_SLEEVE_AREA_OVERRIDES,
  longSleeveMockups,
  longSleeveMockupsBack,
  overlayStyle,
  tshirtMockupSrc,
  tshirtMockups,
  tshirtMockupsBack,
} from '@/lib/mockup-data'
import MockupPreview from '@/components/designer/MockupPreview'
import { DesignMockupEmail } from '@/lib/email-templates/design-mockup'
import type { DesignArea, DesignAreaType } from '@/lib/types'

vi.mock('next/image', () => ({
  default: ({ fill: _f, priority: _p, loader: _l, ...props }: Record<string, unknown>) => <img {...props} />,
}))

// TICKET-018: the long-sleeve cotton tee (TICKET-017's `long-sleeve` fabric)
// gets its real 3D model and per-colour renders for the cart, the share pages,
// the 2D fallback and the design-mockup email.

const PUBLIC = join(process.cwd(), 'public')
const NINE = [
  'front_full', 'back', 'chest_logo', 'chest_logo_right', 'chest_logo_center',
  'shoulder_right', 'shoulder_left', 'sleeve_right', 'sleeve_left',
] as const

describe('getModel3D — long-sleeve maps to its own model', () => {
  it("('tshirt', 'long-sleeve') → longsleeve variant + new GLB", () => {
    expect(getModel3D('tshirt', 'long-sleeve')).toEqual({ variant: 'longsleeve', url: '/models/longsleeve-web.glb' })
  })

  it('the variant exists in the 3D registry', () => {
    expect(Object.keys(VARIANTS)).toContain('longsleeve')
  })

  it('the other t-shirt fabrics are unchanged', () => {
    expect(getModel3D('tshirt', 'cotton')).toEqual({ variant: 'tshirt', url: '/models/tshirt-web.glb' })
    expect(getModel3D('tshirt', 'polo')).toEqual({ variant: 'polo', url: '/models/polo-web.glb' })
    expect(getModel3D('tshirt', 'oversized')).toEqual({ variant: 'oversized', url: '/models/oversized-web.glb' })
  })
})

describe('longsleeve-web.glb — the shipped model', () => {
  const file = join(PUBLIC, 'models', 'longsleeve-web.glb')

  it('exists and is small (< 3 MB)', () => {
    expect(existsSync(file)).toBe(true)
    expect(statSync(file).size).toBeLessThan(3 * 1024 * 1024)
  })

  it('is a meshopt-compressed, quantized single-mesh GLB with no embedded images', () => {
    const buf = readFileSync(file)
    expect(buf.subarray(0, 4).toString('ascii')).toBe('glTF')
    const jsonLen = buf.readUInt32LE(12)
    const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
    expect(json.extensionsUsed).toContain('EXT_meshopt_compression')
    expect(json.extensionsUsed).toContain('KHR_mesh_quantization')
    expect(json.meshes).toHaveLength(1)
    expect(json.meshes[0].primitives).toHaveLength(1)
    expect(json.images ?? []).toHaveLength(0)
    // avatar joints stripped: only the cloth node remains
    expect(json.nodes).toHaveLength(1)
    expect(Object.keys(json.meshes[0].primitives[0].attributes)).toEqual(
      expect.arrayContaining(['POSITION', 'NORMAL', 'TEXCOORD_0'])
    )
  })
})

describe('per-colour renders — white and black, front and back', () => {
  for (const color of ['white', 'black']) {
    it(`${color}: front and back files exist under public/`, () => {
      expect(longSleeveMockups[color]).toBeTruthy()
      expect(longSleeveMockupsBack[color]).toBeTruthy()
      expect(existsSync(join(PUBLIC, longSleeveMockups[color]))).toBe(true)
      expect(existsSync(join(PUBLIC, longSleeveMockupsBack[color]))).toBe(true)
      expect(longSleeveMockups[color]).not.toBe(longSleeveMockupsBack[color])
    })
  }

  it('tshirtMockupSrc picks the long-sleeve render for the long-sleeve fabric', () => {
    expect(tshirtMockupSrc('white', 'front', 'long-sleeve')).toBe(longSleeveMockups.white)
    expect(tshirtMockupSrc('black', 'back', 'long-sleeve')).toBe(longSleeveMockupsBack.black)
  })

  it('an unknown colour on a long-sleeve falls back to the black render, never a short-sleeve photo', () => {
    expect(tshirtMockupSrc('olive', 'front', 'long-sleeve')).toBe(longSleeveMockups.black)
  })

  it('every other fabric keeps the short-sleeve photos (behaviour unchanged)', () => {
    expect(tshirtMockupSrc('white', 'front', 'cotton')).toBe(tshirtMockups.white)
    expect(tshirtMockupSrc('navy', 'back')).toBe(tshirtMockupsBack.blue)
    expect(tshirtMockupSrc('nope', 'front', 'polo')).toBe(tshirtMockups.black)
  })
})

describe('overlay boxes on the long-sleeve renders', () => {
  it('every one of the nine areas has its own box', () => {
    for (const a of NINE) {
      expect(LONG_SLEEVE_AREA_OVERRIDES[a], a).toBeDefined()
      expect(LONG_SLEEVE_AREA_OVERRIDES[a].width, a).toMatch(/%$/)
      expect(LONG_SLEEVE_AREA_OVERRIDES[a].top, a).toMatch(/%$/)
    }
  })

  it('every one of the nine areas still has a front/back view in the shared map', () => {
    for (const a of NINE) expect(DESIGN_AREA_OVERLAYS[a]?.view, a).toMatch(/^(front|back)$/)
    expect(DESIGN_AREA_OVERLAYS.sleeve_right.view).toBe('front')
    expect(DESIGN_AREA_OVERLAYS.sleeve_left.view).toBe('front')
  })

  it('arm boxes mirror: left(right) + width + left(left) = 100', () => {
    const pct = (s: string) => parseFloat(s)
    for (const [r, l] of [['shoulder_right', 'shoulder_left'], ['sleeve_right', 'sleeve_left']]) {
      const R = LONG_SLEEVE_AREA_OVERRIDES[r], L = LONG_SLEEVE_AREA_OVERRIDES[l]
      expect(pct(R.left) + pct(R.width) + pct(L.left)).toBeCloseTo(100, 5)
      expect(R.top).toBe(L.top)
      // wearer's right = viewer's left on a front render
      expect(pct(R.left)).toBeLessThan(50)
    }
  })

  it('the sleeve boxes are tall and narrow, below the shoulder boxes', () => {
    const s = LONG_SLEEVE_AREA_OVERRIDES.sleeve_right, sh = LONG_SLEEVE_AREA_OVERRIDES.shoulder_right
    expect(parseFloat(s.top)).toBeGreaterThan(parseFloat(sh.top))
    expect(s.aspectRatio).toBeDefined()
    const [w, h] = s.aspectRatio.split('/').map(Number)
    expect(h / w).toBeGreaterThanOrEqual(2.5)
  })

  it('overlayStyle: long-sleeve → the render box; other fabrics → the shared box', () => {
    expect(overlayStyle('sleeve_right', 'long-sleeve')).toBe(LONG_SLEEVE_AREA_OVERRIDES.sleeve_right)
    expect(overlayStyle('front_full', 'long-sleeve')).toBe(LONG_SLEEVE_AREA_OVERRIDES.front_full)
    expect(overlayStyle('front_full', 'cotton')).toBe(DESIGN_AREA_OVERLAYS.front_full.style)
    expect(overlayStyle('shoulder_right')).toBe(DESIGN_AREA_OVERLAYS.shoulder_right.style)
    expect(overlayStyle('no_such_area', 'long-sleeve')).toBeUndefined()
  })
})

describe('consumers pick the long-sleeve image', () => {
  it('MockupPreview shows the long-sleeve render for fabricType long-sleeve', () => {
    const { container } = render(
      <MockupPreview config={{ productType: 'tshirt', fabricType: 'long-sleeve' as never, color: 'white', designs: [] } as never} />
    )
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe(longSleeveMockups.white)
  })

  it('MockupPreview keeps the short-sleeve photo for cotton', () => {
    const { container } = render(
      <MockupPreview config={{ productType: 'tshirt', fabricType: 'cotton', color: 'white', designs: [] } as never} />
    )
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/חולצה לבנה קדימה.webp')
  })

  it('the design-mockup email uses the long-sleeve renders for a long-sleeve item', () => {
    const design = (area: DesignAreaType): DesignArea => ({ area, areaName: area, imageUrl: 'https://example.com/a.png', fileName: 'a.png' })
    const html = DesignMockupEmail({
      customer: { firstName: 'דנה', lastName: 'כהן', email: 'd@example.com', phone: '0500000000' } as never,
      items: [{ productType: 'tshirt', fabricType: 'long-sleeve', color: 'black', designs: [design('sleeve_right'), design('back')], totalQuantity: 2 }],
      siteUrl: 'https://badfos.co.il',
    })
    expect(html).toContain(`https://badfos.co.il${longSleeveMockups.black}`)
    expect(html).toContain(`https://badfos.co.il${longSleeveMockupsBack.black}`)
    expect(html).not.toContain('חולצה שחורה קדימה.webp')
  })
})
