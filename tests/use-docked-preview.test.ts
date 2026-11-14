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

  // TICKET-013: docks earlier (bottom < 280: the lower part of the big box is
  // still on screen, so the zoom into the bar is seen), undocks past 480 (gap 200).
  it('docks under 280 (not at 290), stays docked up to 480, undocks past 480', () => {
    const { result } = renderHook(() => useDockedPreview(ref))
    scrollPlaceholderTo(290)
    expect(result.current.docked).toBe(false)
    scrollPlaceholderTo(270)
    expect(result.current.docked).toBe(true)
    scrollPlaceholderTo(400)
    expect(result.current.docked).toBe(true)
    scrollPlaceholderTo(480)
    expect(result.current.docked).toBe(true)
    scrollPlaceholderTo(490)
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
    expect(result.current).toEqual({ docked: true, height: 501, hasDocked: true })
    el.style.height = '501px' // what the designer pins from `height`
    expanded = 694
    rerender({ k: '3|1' })
    expect(result.current).toEqual({ docked: true, height: 694, hasDocked: true })
    expect(el.style.height).toBe('694px')
    expect(el.hasAttribute('data-measuring')).toBe(false)
  })

  it('rows removed while docked → the pin shrinks, no undock/re-dock', () => {
    const { result, rerender } = renderHook(({ k }) => useDockedPreview(ref, { measureKey: k }), { initialProps: { k: '3|2' } })
    scrollPlaceholderTo(60)
    el.style.height = '694px'
    expanded = 501
    rerender({ k: '3|0' })
    expect(result.current).toEqual({ docked: true, height: 501, hasDocked: true })
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

  // TICKET-012: the return animation is gated on "has docked at least once",
  // so it never runs on first paint.
  it('hasDocked: false until the first dock, then stays true through undock', () => {
    const { result } = renderHook(() => useDockedPreview(ref))
    expect(result.current.hasDocked).toBe(false)
    scrollPlaceholderTo(300)
    expect(result.current.hasDocked).toBe(false)
    scrollPlaceholderTo(60)
    expect(result.current.hasDocked).toBe(true)
    scrollPlaceholderTo(500)
    expect(result.current.docked).toBe(false)
    expect(result.current.hasDocked).toBe(true)
  })

  it('hasDocked is true on first read when the page is already scrolled', () => {
    bottom = 20
    const { result } = renderHook(() => useDockedPreview(ref))
    expect(result.current.hasDocked).toBe(true)
  })

  it('hasDocked stays true when disabling undocks', () => {
    const { result, rerender } = renderHook(({ on }) => useDockedPreview(ref, { enabled: on }), { initialProps: { on: true } })
    scrollPlaceholderTo(20)
    rerender({ on: false })
    expect(result.current.docked).toBe(false)
    expect(result.current.hasDocked).toBe(true)
  })

  it('removes its scroll listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useDockedPreview(ref))
    unmount()
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})

// TICKET-013: a continuous FLIP zoom of the preview box between its two layout
// states. First = the box's visual rect right before the flip (includes any
// in-flight transform); last = its rect after the commit, once running box
// animations are cancelled; invert with translate + scale, play to none.
describe('useDockedPreview — FLIP of the preview box', () => {
  const BIG = { left: 16, top: -260, width: 358, height: 477.33 }
  const SMALL = { left: 105, top: 88, width: 180, height: 240 }
  const rectOf = (r: typeof BIG) =>
    ({ ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top, toJSON() {} }) as DOMRect

  let box: HTMLDivElement
  let boxRef: { current: HTMLDivElement }
  let events: string[]
  let animate: ReturnType<typeof vi.fn>
  let running: { cancel: () => void }[]
  let reduced = false

  beforeEach(() => {
    events = []
    running = []
    reduced = false
    box = document.createElement('div')
    boxRef = { current: box }
    // The box's layout follows the docked state the hook has committed.
    let docked = false
    box.getBoundingClientRect = () => {
      events.push('measure')
      return rectOf(docked ? SMALL : BIG)
    }
    animate = vi.fn(() => {
      const a = { cancel: () => events.push('cancel') }
      running.push(a)
      return a as unknown as Animation
    })
    ;(box as unknown as { animate: unknown }).animate = animate
    ;(box as unknown as { getAnimations: unknown }).getAnimations = () => running.splice(0)
    setDocked = v => { docked = v }
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (q: string) => ({ matches: reduced && q.includes('prefers-reduced-motion'), media: q, addEventListener() {}, removeEventListener() {} }),
    })
  })
  let setDocked: (v: boolean) => void = () => {}

  /** Render the hook and keep the fake box layout in step with the committed state. */
  function setup() {
    return renderHook(() => {
      const r = useDockedPreview(ref, { boxRef })
      setDocked(r.docked)
      return r
    })
  }

  it('dock: animates the box from the big rect (translate + uniform scale) to none, 320 ms, the easing', () => {
    const { result } = setup()
    scrollPlaceholderTo(270)
    expect(result.current.docked).toBe(true)
    expect(animate).toHaveBeenCalledTimes(1)
    const [frames, opts] = animate.mock.calls[0] as [Keyframe[], KeyframeAnimationOptions]
    const sx = BIG.width / SMALL.width
    const sy = BIG.height / SMALL.height
    expect(sx).toBeCloseTo(sy, 2) // both boxes are 3:4 — a true zoom
    const m = String(frames[0].transform).match(/^translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\((-?[\d.]+), (-?[\d.]+)\)$/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeCloseTo(BIG.left - SMALL.left)
    expect(Number(m![2])).toBeCloseTo(BIG.top - SMALL.top)
    expect(Number(m![3])).toBeCloseTo(sx, 3)
    expect(Number(m![4])).toBeCloseTo(sy, 3)
    expect(frames[frames.length - 1].transform).toBe('none')
    expect(opts.duration).toBe(320)
    expect(opts.easing).toBe('cubic-bezier(.2,.8,.2,1)')
    expect(opts.id).toBe('preview-flip')
  })

  it('undock: the reverse — from the small rect back to the big one', () => {
    const { result } = setup()
    scrollPlaceholderTo(270)
    scrollPlaceholderTo(490)
    expect(result.current.docked).toBe(false)
    expect(animate).toHaveBeenCalledTimes(2)
    const [frames] = animate.mock.calls[1] as [Keyframe[]]
    const m = String(frames[0].transform).match(/^translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\((-?[\d.]+), (-?[\d.]+)\)$/)
    expect(Number(m![1])).toBeCloseTo(SMALL.left - BIG.left)
    expect(Number(m![2])).toBeCloseTo(SMALL.top - BIG.top)
    expect(Number(m![3])).toBeCloseTo(SMALL.width / BIG.width, 3)
    expect(frames[frames.length - 1].transform).toBe('none')
  })

  it('cancels the running box animation before measuring the new rect (mid-animation reversal starts where the box is)', () => {
    setup()
    scrollPlaceholderTo(270)
    events.length = 0
    scrollPlaceholderTo(490)
    // first (visual, in-flight) → cancel → last
    expect(events).toEqual(['measure', 'cancel', 'measure'])
  })

  it('no FLIP for a scroll that does not flip the state', () => {
    setup()
    scrollPlaceholderTo(400)
    scrollPlaceholderTo(300)
    expect(animate).not.toHaveBeenCalled()
  })

  it('reduced motion → no FLIP, plain state change', () => {
    reduced = true
    const { result } = setup()
    scrollPlaceholderTo(270)
    expect(result.current.docked).toBe(true)
    expect(animate).not.toHaveBeenCalled()
  })

  it('a page that loads already scrolled docks with no zoom (that big rect was never painted)', () => {
    bottom = 20
    const { result } = setup()
    expect(result.current.docked).toBe(true)
    expect(animate).not.toHaveBeenCalled()
  })

  it('works without the Web Animations API (no animate on the element)', () => {
    delete (box as unknown as { animate?: unknown }).animate
    delete (box as unknown as { getAnimations?: unknown }).getAnimations
    const { result } = setup()
    scrollPlaceholderTo(270)
    expect(result.current.docked).toBe(true)
  })
})
