import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { enlargeOverlayStyle } from '@/lib/enlarge'
import { DESIGN_AREA_OVERLAYS, SWEATSHIRT_AREA_OVERRIDES } from '@/lib/mockup-data'

// TICKET-005, review finding 1. The 2D overlay for front_full and back is
// centred by `left: '50%'` PLUS `transform: 'translateX(-50%)'` — the translate
// IS the centring. Writing the enlargement as
//   { ...overlay.style, transform: `scale(${scale})` }
// REPLACES that translate, so the moment a print is enlarged its left edge pins
// to the middle of the garment and the whole print jumps right by half its own
// width (20% of the mockup for front_full) before it scales.
//
// This is not a hypothetical path: it is what renders when WebGL is missing —
// the ThreeErrorBoundary fallback on the sweatshirt designer and on both share
// pages, plus the share-cart lightbox, which is only reachable from that
// fallback. Old phones and in-app browsers land there.
//
// So the scale is APPENDED to whatever transform the overlay already has, and
// the translate stays leftmost: CSS applies these left to right, and
// `scale(1.2) translateX(-50%)` would move by 1.2 × half-width instead of half.

describe('enlargeOverlayStyle — the scale never replaces the centring', () => {
  it('appends the scale AFTER an existing translate', () => {
    const style = { width: '40%', left: '50%', transform: 'translateX(-50%)' }
    expect(enlargeOverlayStyle(style, 2).transform).toBe('translateX(-50%) scale(1.2)')
  })

  it('keeps the translate leftmost — scale must never come first', () => {
    const t = enlargeOverlayStyle({ transform: 'translateX(-50%)' }, 3).transform!
    expect(t.indexOf('translateX(-50%)')).toBeLessThan(t.indexOf('scale('))
    expect(t.startsWith('translateX(-50%)')).toBe(true)
  })

  it('leaves a style with no transform carrying the scale alone', () => {
    expect(enlargeOverlayStyle({ width: '12%', left: '30%' }, 2).transform).toBe('scale(1.2)')
  })

  it('preserves every other property untouched', () => {
    const style = { width: '40%', aspectRatio: '140 / 120', top: '40%', left: '50%', transform: 'translateX(-50%)', borderRadius: '10px' }
    const out = enlargeOverlayStyle(style, 1)
    expect(out.width).toBe('40%')
    expect(out.aspectRatio).toBe('140 / 120')
    expect(out.top).toBe('40%')
    expect(out.left).toBe('50%')
    expect(out.borderRadius).toBe('10px')
  })

  it('composes with a rotation rather than dropping it', () => {
    expect(enlargeOverlayStyle({ transform: 'rotate(44deg)' }, 1).transform).toBe('rotate(44deg) scale(1.1)')
  })

  it('clamps a hostile step to 1.3 like every other consumer', () => {
    expect(enlargeOverlayStyle({ transform: 'translateX(-50%)' }, 7).transform).toBe('translateX(-50%) scale(1.3)')
  })

  it('does not mutate the style it was given', () => {
    const style = { transform: 'translateX(-50%)' }
    enlargeOverlayStyle(style, 2)
    expect(style.transform).toBe('translateX(-50%)')
  })
})

describe('enlargeOverlayStyle — no enlargement leaves the style exactly as it was', () => {
  it('0 and undefined add no scale at all', () => {
    const style = { width: '40%', left: '50%', transform: 'translateX(-50%)' }
    expect(enlargeOverlayStyle(style, 0).transform).toBe('translateX(-50%)')
    expect(enlargeOverlayStyle(style, undefined).transform).toBe('translateX(-50%)')
    expect(enlargeOverlayStyle(style, 0)).toEqual(style)
  })

  it('a style with no transform gains no transform key', () => {
    const style = { width: '12%', left: '30%' }
    expect('transform' in enlargeOverlayStyle(style, 0)).toBe(false)
  })

  // The fallback views must be PROVABLY untouched at +0, so a plain design
  // gets back the very same object, not a copy that merely compares equal.
  // Same contract withTransform keeps in components/designer/three/decalTransform.ts.
  it('a plain design gets the IDENTICAL object back, not a copy', () => {
    const style = { width: '40%', left: '50%', transform: 'translateX(-50%)' }
    expect(enlargeOverlayStyle(style, 0)).toBe(style)
    expect(enlargeOverlayStyle(style, undefined)).toBe(style)
  })

  it('every real overlay a 2D fallback renders is byte-identical at +0', () => {
    for (const area of Object.keys(DESIGN_AREA_OVERLAYS)) {
      const style = DESIGN_AREA_OVERLAYS[area].style
      expect(enlargeOverlayStyle(style, 0)).toBe(style)
      expect(enlargeOverlayStyle(style, undefined)).toEqual(style)
    }
    for (const area of Object.keys(SWEATSHIRT_AREA_OVERRIDES)) {
      expect(enlargeOverlayStyle(SWEATSHIRT_AREA_OVERRIDES[area], 0)).toBe(SWEATSHIRT_AREA_OVERRIDES[area])
    }
  })
})

describe('the real overlays stay centred while enlarged', () => {
  it('front_full at +2 keeps translateX(-50%) AND gains scale(1.2)', () => {
    const t = enlargeOverlayStyle(DESIGN_AREA_OVERLAYS.front_full.style, 2).transform!
    expect(t).toContain('translateX(-50%)')
    expect(t).toContain('scale(1.2)')
    expect(t).toBe('translateX(-50%) scale(1.2)')
  })

  it('back at +3 keeps translateX(-50%) AND gains scale(1.3)', () => {
    const t = enlargeOverlayStyle(DESIGN_AREA_OVERLAYS.back.style, 3).transform!
    expect(t).toBe('translateX(-50%) scale(1.3)')
  })

  it("the sweatshirt's own back override keeps its centring too", () => {
    const t = enlargeOverlayStyle(SWEATSHIRT_AREA_OVERRIDES.back, 2).transform!
    expect(t).toBe('translateX(-50%) scale(1.2)')
  })

  it('both enlargeable overlays really do rely on a translate for centring', () => {
    // If this ever stops being true the helper is still correct, but the bug it
    // exists to prevent would have changed shape — read the comment at the top.
    for (const area of ['front_full', 'back'] as const) {
      expect(DESIGN_AREA_OVERLAYS[area].style.left).toBe('50%')
      expect(DESIGN_AREA_OVERLAYS[area].style.transform).toBe('translateX(-50%)')
    }
  })
})

describe('every 2D fallback site goes through the helper', () => {
  // These four render the print on the <img> ITSELF (the overlay style and the
  // scale land on one element), which is exactly where the spread was wrong.
  // components/cart/CartItem.tsx and components/designer/TshirtDesigner.tsx are
  // deliberately absent: they put the overlay style on a wrapping div and the
  // scale on the inner img, so their centring was never at risk.
  const sites = [
    'app/designer/sweatshirt/page.tsx',
    'app/share/[id]/ShareClient.tsx',
    'app/share/cart/[id]/page.tsx',
  ]

  for (const site of sites) {
    it(`${site} composes the transform instead of replacing it`, () => {
      const src = readFileSync(join(process.cwd(), site), 'utf8')
      expect(src).toContain('enlargeOverlayStyle')
      // The exact shape of the bug: a bare scale written into `transform`.
      expect(src).not.toMatch(/transform:\s*`scale\(/)
    })
  }

  it('the share-cart page fixed BOTH of its render sites, not just one', () => {
    const src = readFileSync(join(process.cwd(), 'app/share/cart/[id]/page.tsx'), 'utf8')
    expect(src.match(/enlargeOverlayStyle/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
