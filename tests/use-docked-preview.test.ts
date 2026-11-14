import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useDockedPreview } from '@/hooks/useDockedPreview'

// TICKET-011 (revision): the mobile preview docks under the 80 px sticky header
// once its in-flow PLACEHOLDER has scrolled out, and undocks only when the
// placeholder is well back in view (hysteresis). The placeholder never changes
// size, so docking cannot move the page — the decision reads its rect only.

let bottom = 300
let height = 694
const el = document.createElement('div')
el.getBoundingClientRect = () => ({ bottom, top: bottom - height, height, width: 390, left: 0, right: 390, x: 0, y: bottom - height, toJSON() {} }) as DOMRect
Object.defineProperty(el, 'offsetHeight', { get: () => height, configurable: true })
const ref = { current: el }

function scrollPlaceholderTo(b: number) {
  bottom = b
  act(() => { window.dispatchEvent(new Event('scroll')) })
}

beforeEach(() => {
  bottom = 300
  height = 694
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { cb(0); return 1 })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useDockedPreview', () => {
  it('placeholder in view (bottom 300) → not docked', () => {
    const { result } = renderHook(() => useDockedPreview(ref))
    expect(result.current.docked).toBe(false)
  })

  it('docks under the header (bottom 60), stays docked in the band (150), undocks past 220 (240)', () => {
    const { result } = renderHook(() => useDockedPreview(ref))
    scrollPlaceholderTo(60)
    expect(result.current.docked).toBe(true)
    scrollPlaceholderTo(150)
    expect(result.current.docked).toBe(true)
    scrollPlaceholderTo(240)
    expect(result.current.docked).toBe(false)
  })

  it('reports the placeholder height measured while undocked, to reserve it while docked', () => {
    const { result } = renderHook(() => useDockedPreview(ref))
    expect(result.current.height).toBe(694)
    scrollPlaceholderTo(60)
    // Docked: the content left the placeholder; the reserved height must not follow it.
    height = 0
    scrollPlaceholderTo(50)
    expect(result.current.docked).toBe(true)
    expect(result.current.height).toBe(694)
  })

  it('docks on first read when the page is already scrolled', () => {
    bottom = 20
    const { result } = renderHook(() => useDockedPreview(ref))
    expect(result.current.docked).toBe(true)
  })

  it('disabled (last step) never docks', () => {
    const { result } = renderHook(() => useDockedPreview(ref, { enabled: false }))
    scrollPlaceholderTo(20)
    expect(result.current.docked).toBe(false)
  })

  it('removes its scroll listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useDockedPreview(ref))
    unmount()
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
