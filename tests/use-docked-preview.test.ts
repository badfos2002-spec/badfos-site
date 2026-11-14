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

  // TICKET-013: nothing reads "has docked once" any more (the 012 return
  // animation is gone) — the hook no longer reports it.
  it('returns only docked and height', () => {
    const { result } = renderHook(() => useDockedPreview(ref))
    expect(Object.keys(result.current).sort()).toEqual(['docked', 'height'])
  })

  it('removes its scroll listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useDockedPreview(ref))
    unmount()
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})

// TICKET-013 (follow-up): with the box handed in, the decision reads the
// EXPANDED box's bottom edge — placeholder top + the box's offset and height in
// the expanded layout (layout facts, read via offsetTop/offsetHeight, captured
// while undocked or inside the data-measuring pass) — so the size rows below the
// box no longer move the dock point. Dock under 280, undock over 480.
describe('useDockedPreview — dock point on the expanded box bottom', () => {
  const BOX_TOP = 8
  const BOX_H = 477
  /** Box bottom → placeholder rect (placeholder top = box bottom − offset − height). */
  let boxBottom = 600
  const ph = document.createElement('div')
  const box = document.createElement('div')
  const parent = document.createElement('div')
  let boxH = BOX_H
  ph.getBoundingClientRect = () => {
    const h = ph.offsetHeight
    const top = boxBottom - BOX_TOP - BOX_H
    return { top, bottom: top + h, height: h, width: 390, left: 0, right: 390, x: 0, y: top, toJSON() {} } as DOMRect
  }
  Object.defineProperty(ph, 'offsetHeight', {
    get: () => (!ph.hasAttribute('data-measuring') && ph.style.height ? parseFloat(ph.style.height) : expanded),
    configurable: true,
  })
  Object.defineProperty(ph, 'offsetTop', { get: () => 300, configurable: true })
  Object.defineProperty(ph, 'offsetParent', { get: () => parent, configurable: true })
  // Docked (not measuring) the box is the small fixed one; its layout facts
  // must then never be used — expose a misleading offset to prove it.
  const isDocked = () => ph.getAttribute('data-docked') === 'true' && !ph.hasAttribute('data-measuring')
  Object.defineProperty(box, 'offsetTop', { get: () => (isDocked() ? 0 : 300 + BOX_TOP), configurable: true })
  Object.defineProperty(box, 'offsetHeight', { get: () => (isDocked() ? 240 : boxH), configurable: true })
  Object.defineProperty(box, 'offsetParent', { get: () => (isDocked() ? null : parent), configurable: true })
  const phRef = { current: ph }
  const boxRef = { current: box }

  beforeEach(() => {
    boxBottom = 600
    boxH = BOX_H
    expanded = 501
    ph.style.height = ''
    ph.removeAttribute('data-measuring')
    ph.setAttribute('data-docked', 'false')
  })
  /** Mirror the designer: data-docked + the pin follow the hook's result. */
  function setup(measureKey = 'a') {
    return renderHook(({ k }) => {
      const r = useDockedPreview(phRef, { boxRef, measureKey: k })
      ph.setAttribute('data-docked', r.docked ? 'true' : 'false')
      ph.style.height = r.docked && r.height ? `${r.height}px` : ''
      return r
    }, { initialProps: { k: measureKey } })
  }
  const scrollBoxTo = (b: number) => {
    boxBottom = b
    act(() => { window.dispatchEvent(new Event('scroll')) })
  }

  it('docks when the expanded box bottom is under 280, stays up to 480, undocks past 480', () => {
    const { result } = setup()
    scrollBoxTo(290)
    expect(result.current.docked).toBe(false)
    scrollBoxTo(270)
    expect(result.current.docked).toBe(true)
    scrollBoxTo(480)
    expect(result.current.docked).toBe(true)
    scrollBoxTo(490)
    expect(result.current.docked).toBe(false)
  })

  it('the size rows below the box do not move the dock point', () => {
    expanded = 501 + 193 // rows present: the placeholder is 193 px taller
    const { result } = setup()
    // The placeholder's bottom is now 193 px lower than the box's — the box decides.
    scrollBoxTo(290)
    expect(result.current.docked).toBe(false)
    scrollBoxTo(270)
    expect(result.current.docked).toBe(true)
    scrollBoxTo(490)
    expect(result.current.docked).toBe(false)
  })

  it('while docked, the box geometry comes from the expanded (data-measuring) layout, never the small fixed box', () => {
    const { result, rerender } = setup('a')
    scrollBoxTo(270)
    expect(result.current.docked).toBe(true)
    // Rows arrive while docked → re-measure; the expanded box is unchanged, so
    // the undock point stays at a box bottom of 480.
    expanded = 501 + 193
    rerender({ k: 'b' })
    scrollBoxTo(470)
    expect(result.current.docked).toBe(true)
    scrollBoxTo(490)
    expect(result.current.docked).toBe(false)
  })

  it('a box that is not laid out (offsetHeight 0) falls back to the placeholder bottom', () => {
    boxH = 0
    const { result } = setup()
    // box bottom 600 → placeholder top 115, bottom 616 → fallback: not docked
    scrollBoxTo(600)
    expect(result.current.docked).toBe(false)
    // box bottom 250 → placeholder bottom 266 < 280 → docked via the fallback
    scrollBoxTo(250)
    expect(result.current.docked).toBe(true)
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

  it('a dock caused by a resize (not a scroll) does not zoom', () => {
    const { result } = setup()
    bottom = 270
    act(() => { window.dispatchEvent(new Event('resize')) })
    expect(result.current.docked).toBe(true)
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
