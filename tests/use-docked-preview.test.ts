import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useDockedPreview } from '@/hooks/useDockedPreview'

// TICKET-011 (revision): the mobile preview docks under the 80 px sticky header
// once its in-flow PLACEHOLDER has scrolled out, and undocks only when the
// placeholder is well back in view (hysteresis). While docked the placeholder is
// pinned to its EXPANDED height; when that layout changes (rows appear or go,
// step changes) the pin is re-measured in the same layout pass, so undocking
// never changes the page's height.

let bottom = 300
/** The height the placeholder has in its expanded (undocked / measuring) layout. */
let expanded = 694
const el = document.createElement('div')
el.getBoundingClientRect = () => {
  const h = el.offsetHeight
  return { bottom, top: bottom - h, height: h, width: 390, left: 0, right: 390, x: 0, y: bottom - h, toJSON() {} } as DOMRect
}
// Docked + pinned → the pin; measuring or unpinned → the expanded layout.
Object.defineProperty(el, 'offsetHeight', {
  get: () => (!el.hasAttribute('data-measuring') && el.style.height ? parseFloat(el.style.height) : expanded),
  configurable: true,
})
const ref = { current: el }

function scrollPlaceholderTo(b: number) {
  bottom = b
  act(() => { window.dispatchEvent(new Event('scroll')) })
}

beforeEach(() => {
  bottom = 300
  expanded = 694
  el.style.height = ''
  el.removeAttribute('data-measuring')
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { cb(0); return 1 })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useDockedPreview', () => {
  it('placeholder in view (bottom 400) → not docked', () => {
    bottom = 400
    const { result } = renderHook(() => useDockedPreview(ref))
    expect(result.current.docked).toBe(false)
  })

  it('docks under the header (bottom 60), stays docked up to 300 (240, 300), undocks past 300 (310)', () => {
    const { result } = renderHook(() => useDockedPreview(ref))
    scrollPlaceholderTo(60)
    expect(result.current.docked).toBe(true)
    scrollPlaceholderTo(240)
    expect(result.current.docked).toBe(true)
    scrollPlaceholderTo(300)
    expect(result.current.docked).toBe(true)
    scrollPlaceholderTo(310)
    expect(result.current.docked).toBe(false)
  })

  it('reports the placeholder height measured while undocked, to reserve it while docked', () => {
    const { result } = renderHook(() => useDockedPreview(ref))
    expect(result.current.height).toBe(694)
    scrollPlaceholderTo(60)
    expect(result.current.docked).toBe(true)
    expect(result.current.height).toBe(694)
  })

  it('rows appear while docked → the pin grows to the new expanded height, still docked', () => {
    expanded = 501
    const { result, rerender } = renderHook(({ k }) => useDockedPreview(ref, { measureKey: k }), { initialProps: { k: '3|0' } })
    scrollPlaceholderTo(60)
    expect(result.current).toEqual({ docked: true, height: 501 })
    el.style.height = '501px' // what the designer pins from `height`
    expanded = 694
    rerender({ k: '3|1' })
    expect(result.current).toEqual({ docked: true, height: 694 })
    expect(el.style.height).toBe('694px')
    expect(el.hasAttribute('data-measuring')).toBe(false)
  })

  it('rows removed while docked → the pin shrinks, no undock/re-dock', () => {
    const { result, rerender } = renderHook(({ k }) => useDockedPreview(ref, { measureKey: k }), { initialProps: { k: '3|2' } })
    scrollPlaceholderTo(60)
    el.style.height = '694px'
    expanded = 501
    rerender({ k: '3|0' })
    expect(result.current).toEqual({ docked: true, height: 501 })
    // A shrink of ~193 px moves the bottom by at most that much: still inside the gap.
    scrollPlaceholderTo(60 + 193)
    expect(result.current.docked).toBe(true)
  })

  it('pins the sub-pixel height (rect), not the rounded offsetHeight — a 0.4 px pin error showed as a 1 px jump at undock', () => {
    const rect = el.getBoundingClientRect
    el.getBoundingClientRect = () => {
      const r = rect()
      const h = !el.hasAttribute('data-measuring') && el.style.height ? parseFloat(el.style.height) : expanded + 0.4
      return { ...r, height: h, top: bottom - h } as DOMRect
    }
    try {
      const { result, rerender } = renderHook(({ k }) => useDockedPreview(ref, { measureKey: k }), { initialProps: { k: 'a' } })
      scrollPlaceholderTo(60)
      expect(result.current.height).toBeCloseTo(694.4)
      el.style.height = '694.4px'
      expanded = 600
      rerender({ k: 'b' })
      expect(result.current.height).toBeCloseTo(600.4)
    } finally {
      el.getBoundingClientRect = rect
    }
  })

  it('docks on first read when the page is already scrolled', () => {
    bottom = 20
    const { result } = renderHook(() => useDockedPreview(ref))
    expect(result.current.docked).toBe(true)
  })

  it('a placeholder that is not laid out (desktop: display:none) never docks', () => {
    bottom = 0
    expanded = 0
    const { result } = renderHook(() => useDockedPreview(ref))
    expect(result.current.docked).toBe(false)
  })

  it('disabled (last step) never docks, and turning it off while docked undocks', () => {
    const { result, rerender } = renderHook(({ on }) => useDockedPreview(ref, { enabled: on }), { initialProps: { on: true } })
    scrollPlaceholderTo(20)
    expect(result.current.docked).toBe(true)
    rerender({ on: false })
    expect(result.current.docked).toBe(false)
    scrollPlaceholderTo(10)
    expect(result.current.docked).toBe(false)
  })

  it('removes its scroll listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useDockedPreview(ref))
    unmount()
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
