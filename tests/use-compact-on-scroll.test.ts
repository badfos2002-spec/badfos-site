import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useCompactOnScroll } from '@/hooks/useCompactOnScroll'

// TICKET-010: the mobile preview shrinks once the page is scrolled and grows
// back at the top. HYSTERESIS is the point — compact past 160, expand only
// under 40 — because shrinking the sticky block shortens the document and
// moves scrollY; a single threshold would flip back and forth.

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  act(() => { window.dispatchEvent(new Event('scroll')) })
}

beforeEach(() => {
  // rAF throttle: run the frame synchronously.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { cb(0); return 1 })
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useCompactOnScroll', () => {
  it('is expanded at the top', () => {
    const { result } = renderHook(() => useCompactOnScroll())
    expect(result.current).toBe(false)
  })

  it('compacts past compactAt, stays compact in the band, expands under expandAt', () => {
    const { result } = renderHook(() => useCompactOnScroll())
    scrollTo(200)
    expect(result.current).toBe(true)
    scrollTo(100)
    expect(result.current).toBe(true)
    scrollTo(20)
    expect(result.current).toBe(false)
  })

  it('does not compact inside the band from expanded', () => {
    const { result } = renderHook(() => useCompactOnScroll())
    scrollTo(100)
    expect(result.current).toBe(false)
  })

  it('honours custom thresholds', () => {
    const { result } = renderHook(() => useCompactOnScroll({ compactAt: 50, expandAt: 10 }))
    scrollTo(60)
    expect(result.current).toBe(true)
    scrollTo(20)
    expect(result.current).toBe(true)
    scrollTo(5)
    expect(result.current).toBe(false)
  })

  it('starts compact when mounted already scrolled', () => {
    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })
    const { result } = renderHook(() => useCompactOnScroll())
    expect(result.current).toBe(true)
  })

  it('listens passively and removes the listener on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useCompactOnScroll())
    const call = add.mock.calls.find(c => c[0] === 'scroll')
    expect(call).toBeDefined()
    expect(call![2]).toMatchObject({ passive: true })
    unmount()
    expect(remove).toHaveBeenCalledWith('scroll', call![1])
  })
})
