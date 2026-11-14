import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import BackToSketchButton from '@/components/designer/BackToSketchButton'

// TICKET-011: a floating mobile button that brings the user back to the
// preview once it has scrolled out of view. jsdom has no IntersectionObserver,
// so a controllable stub is installed per test.

type Cb = (entries: Partial<IntersectionObserverEntry>[]) => void
let observers: { cb: Cb; targets: Element[]; disconnected: boolean }[] = []

class IOStub {
  private rec: { cb: Cb; targets: Element[]; disconnected: boolean }
  constructor(cb: Cb) {
    this.rec = { cb, targets: [], disconnected: false }
    observers.push(this.rec)
  }
  observe(el: Element) { this.rec.targets.push(el) }
  unobserve() {}
  disconnect() { this.rec.disconnected = true }
  takeRecords() { return [] }
}

/** Report the preview as in / out of view to every live observer. */
function setInView(isIntersecting: boolean) {
  act(() => {
    for (const o of observers) {
      if (o.disconnected) continue
      o.cb(o.targets.map(target => ({ target, isIntersecting })))
    }
  })
}

function Harness({ hidden = false }: { hidden?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div>
      <div ref={ref} data-testid="preview">preview</div>
      <BackToSketchButton targetRef={ref} hidden={hidden} />
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
