import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import BackToSketchButton from '@/components/designer/BackToSketchButton'

// TICKET-011: a floating mobile button that brings the user back to the
// preview once it has scrolled out of view. jsdom has no IntersectionObserver,
// so a controllable stub is installed per test.

type Cb = (entries: Partial<IntersectionObserverEntry>[]) => void
let observers: { cb: Cb; targets: Element[]; disconnected: boolean; options?: IntersectionObserverInit }[] = []

class IOStub {
  private rec: { cb: Cb; targets: Element[]; disconnected: boolean; options?: IntersectionObserverInit }
  constructor(cb: Cb, options?: IntersectionObserverInit) {
    this.rec = { cb, targets: [], disconnected: false, options }
    observers.push(this.rec)
  }
  observe(el: Element) { this.rec.targets.push(el) }
  unobserve() {}
  disconnect() { this.rec.disconnected = true }
  takeRecords() { return [] }
}

/** Report one observed element (default: the preview) as in / out of view. */
function report(isIntersecting: boolean, testId = 'preview') {
  const el = screen.getByTestId(testId)
  act(() => {
    for (const o of observers) {
      if (o.disconnected || !o.targets.includes(el)) continue
      o.cb([{ target: el, isIntersecting }])
    }
  })
}
const setInView = (v: boolean) => report(v)

function Harness({ hidden = false, withNav = false }: { hidden?: boolean; withNav?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  return (
    <div>
      <div ref={ref} data-testid="preview">preview</div>
      {withNav && <div ref={navRef} data-testid="nav">nav</div>}
      <BackToSketchButton targetRef={ref} avoidRef={withNav ? navRef : undefined} hidden={hidden} />
    </div>
  )
}

const button = () => screen.queryByRole('button', { name: 'חזרה לסקיצה' })

beforeEach(() => {
  observers = []
  vi.stubGlobal('IntersectionObserver', IOStub)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('BackToSketchButton', () => {
  it('observes the preview block', () => {
    render(<Harness />)
    expect(observers.length).toBeGreaterThan(0)
    expect(observers[0].targets).toContain(screen.getByTestId('preview'))
  })

  it('the 80 px sticky header does not count as "in view"', () => {
    // A preview hidden behind the sticky header is out of sight for the user,
    // so the observed viewport starts under the header.
    render(<Harness />)
    expect(observers[0].options?.rootMargin).toBe('-80px 0px 0px 0px')
  })

  it('is not shown while the preview is in view', () => {
    render(<Harness />)
    setInView(true)
    expect(button()).not.toBeInTheDocument()
  })

  it('is not shown before the observer has reported', () => {
    render(<Harness />)
    expect(button()).not.toBeInTheDocument()
  })

  it('appears when the preview leaves the view, with the label «לסקיצה»', () => {
    render(<Harness />)
    setInView(false)
    const b = button()
    expect(b).toBeInTheDocument()
    expect(b).toHaveTextContent('לסקיצה')
  })

  it('disappears again when the preview is back in view', () => {
    render(<Harness />)
    setInView(false)
    expect(button()).toBeInTheDocument()
    setInView(true)
    expect(button()).not.toBeInTheDocument()
  })

  it('a tap scrolls the preview into view smoothly', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const preview = screen.getByTestId('preview')
    const scrollIntoView = vi.fn()
    preview.scrollIntoView = scrollIntoView
    setInView(false)
    await user.click(button()!)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('is mobile only and floats above the step card', () => {
    render(<Harness />)
    setInView(false)
    const cls = button()!.className
    expect(cls).toContain('lg:hidden')
    expect(cls).toContain('fixed')
    expect(cls).toContain('z-40')
  })

  it('hidden (last step) renders nothing even when the preview is out of view', () => {
    render(<Harness hidden />)
    setInView(false)
    expect(button()).not.toBeInTheDocument()
  })

  it('steps aside while the nav row («הבא») is in view, so it never covers it', () => {
    render(<Harness withNav />)
    setInView(false)
    report(false, 'nav')
    expect(button()).toBeInTheDocument()
    report(true, 'nav')
    expect(button()).not.toBeInTheDocument()
    report(false, 'nav')
    expect(button()).toBeInTheDocument()
  })

  it('the nav row only counts while it crosses the button\'s bottom band (96 px)', () => {
    // On a tall phone the nav row is on screen for most of the step; hiding the
    // button whenever it is anywhere in view would leave a tiny window. Only
    // the bottom band, where the button sits, matters for the overlap.
    render(<Harness withNav />)
    const nav = screen.getByTestId('nav')
    const navObserver = observers.find(o => o.targets.includes(nav))!
    expect(navObserver.targets).not.toContain(screen.getByTestId('preview'))
    expect(navObserver.options?.rootMargin).toBe(`-${window.innerHeight - 96}px 0px 0px 0px`)
  })

  it('disconnects its observer on unmount', () => {
    const { unmount } = render(<Harness />)
    unmount()
    expect(observers.every(o => o.disconnected)).toBe(true)
  })

  it('renders nothing when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(<Harness />)
    expect(button()).not.toBeInTheDocument()
  })
})
