import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DesignArea } from '@/lib/types'

// TICKET-010, both designers end to end: the size rows render under the
// preview (mobile preview block AND desktop preview column — both layouts are
// mounted, CSS hides one), never inside the step card, and a press turns the
// preview to that side. TICKET-011: the mobile block is no longer sticky or
// compact; a floating «לסקיצה» button leads back to it instead.
//
// The 3D stage is replaced by a stub that exposes the area it is turned to.
// Nothing touches the network: storage and print-image are mocked.

vi.mock('next/dynamic', () => ({
  default: () =>
    function StageStub(props: { activeArea?: string; noHint?: boolean; designs?: { area: string; transform: { scale: number } }[] }) {
      return (
        <div
          data-testid="stage"
          data-nohint={props.noHint ? 'true' : 'false'}
          data-active={props.activeArea ?? ''}
          data-scales={(props.designs ?? []).map(d => `${d.area}:${d.transform.scale}`).join(',')}
        />
      )
    },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  usePathname: () => '/designer/tshirt',
}))

vi.mock('@/lib/storage', () => ({
  uploadDesignFile: async () => 'https://storage.example.com/designs/s1/art.png',
  generateUniqueFileName: (name: string) => name,
}))

vi.mock('@/lib/print-image', () => ({
  preparePrintFile: async (file: File) => file,
  printUploadErrorMessage: () => 'שגיאה',
}))

import TshirtDesigner from '@/components/designer/TshirtDesigner'
import SweatshirtDesignerPage from '@/app/designer/sweatshirt/page'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

const groupsIn = (el: HTMLElement) => within(el).queryAllByRole('radiogroup')
const allRows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-enlarge-rows]'))
const stages = () => screen.getAllByTestId('stage')
const mobileBlock = () => document.querySelector<HTMLElement>('[data-mobile-preview]')

function expectPlainMobileBlock(block: HTMLElement) {
  expect(block.className).not.toMatch(/\bsticky\b/)
  expect(block.hasAttribute('data-compact')).toBe(false)
  expect(document.querySelector('[data-compact]')).toBeNull()
  // Lands under the 80 px sticky header when the button scrolls to it.
  expect(block.className).toContain('scroll-mt-20')
}

function seedTshirtSession(designs: DesignArea[]) {
  sessionStorage.setItem(
    'designer_session',
    JSON.stringify({
      step: 3,
      config: { productType: 'tshirt', fabricType: 'cotton', color: 'white', designs, sizes: [] },
      timestamp: Date.now(),
    })
  )
}

const D = (area: DesignArea['area'], areaName: string): DesignArea => ({
  area,
  areaName,
  imageUrl: 'https://example.com/a.png',
  fileName: 'a.png',
})

describe('TshirtDesigner — size rows under the preview', () => {
  beforeEach(() => seedTshirtSession([D('front_full', 'קידמי מלא'), D('back', 'גב')]))

  it('renders two groups in the mobile block and two in the desktop column, none elsewhere', () => {
    render(<TshirtDesigner use3DPreview />)
    const rows = allRows()
    expect(rows).toHaveLength(2)
    for (const r of rows) {
      expect(groupsIn(r).map(g => g.getAttribute('aria-label'))).toEqual([
        'גודל ההדפס — קידמי מלא',
        'גודל ההדפס — גב',
      ])
    }
    // Every radiogroup on the page lives inside a rows block.
    const all = screen.getAllByRole('radiogroup')
    expect(all).toHaveLength(4)
    for (const g of all) expect(g.closest('[data-enlarge-rows]')).not.toBeNull()
  })

  it('the mobile rows sit inside the plain (non-sticky, non-compact) preview block', () => {
    render(<TshirtDesigner use3DPreview />)
    const block = mobileBlock()
    expect(block).not.toBeNull()
    expectPlainMobileBlock(block!)
    expect(block!.querySelector('[data-enlarge-rows]')).not.toBeNull()
  })

  it('+2 on the front grows the print in the preview; +1 on the back turns it to the back', async () => {
    const user = userEvent.setup()
    render(<TshirtDesigner use3DPreview />)
    const [mobileRows] = allRows()
    const front = within(mobileRows).getByRole('radiogroup', { name: 'גודל ההדפס — קידמי מלא' })
    await user.click(within(front).getByRole('button', { name: '+2' }))
    expect(within(front).getByRole('button', { name: '+2' })).toHaveAttribute('aria-pressed', 'true')
    expect(stages()[0].getAttribute('data-scales')).toContain('front_full:1.2')
    expect(stages()[0].getAttribute('data-active')).toBe('front_full')

    const back = within(mobileRows).getByRole('radiogroup', { name: 'גודל ההדפס — גב' })
    await user.click(within(back).getByRole('button', { name: '+1' }))
    for (const s of stages()) expect(s.getAttribute('data-active')).toBe('back')
    expect(stages()[0].getAttribute('data-scales')).toContain('back:1.1')
  })

  it('no rows on step 3 without an enlargeable design', () => {
    sessionStorage.clear()
    seedTshirtSession([D('chest_logo', 'לוגו')])
    render(<TshirtDesigner use3DPreview />)
    expect(allRows()).toHaveLength(0)
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })
})

describe('TshirtDesigner — no rows outside the design step', () => {
  it('step 4 shows no size rows even with designs', () => {
    sessionStorage.setItem(
      'designer_session',
      JSON.stringify({
        step: 4,
        config: { productType: 'tshirt', fabricType: 'cotton', color: 'white', designs: [D('front_full', 'קידמי מלא')], sizes: [] },
        timestamp: Date.now(),
      })
    )
    render(<TshirtDesigner use3DPreview />)
    expect(allRows()).toHaveLength(0)
  })
})

/** A real PNG header, so nothing goes down a re-encode path. */
function pngFile(): File {
  const bytes = new Uint8Array(128)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  return new File([bytes], 'art.png', { type: 'image/png' })
}

describe('Sweatshirt designer — size rows under the preview', () => {
  async function toDesignStepWithFront(user: ReturnType<typeof userEvent.setup>) {
    render(<SweatshirtDesignerPage />)
    await user.click(screen.getAllByRole('button', { name: /קנגרו/ })[0])
    await user.click(screen.getAllByRole('button', { name: 'הבא' })[0])
    await user.click(screen.getAllByRole('button', { name: 'שחור' })[0])
    await user.click(screen.getAllByRole('button', { name: 'הבא' })[0])
    const [label] = screen.getAllByLabelText(/העלאת עיצוב לאזור קידמי מלא/)
    await user.upload(label.querySelector('input[type="file"]') as HTMLInputElement, pngFile())
    await waitFor(() => expect(allRows().length).toBe(2))
  }

  it('renders the rows in the mobile preview block and the desktop column, none in the step card', async () => {
    const user = userEvent.setup()
    await toDesignStepWithFront(user)
    const all = screen.getAllByRole('radiogroup')
    expect(all).toHaveLength(2)
    for (const g of all) {
      expect(g.getAttribute('aria-label')).toBe('גודל ההדפס — קידמי מלא')
      expect(g.closest('[data-enlarge-rows]')).not.toBeNull()
    }
    const block = mobileBlock()
    expect(block).not.toBeNull()
    expectPlainMobileBlock(block!)
    expect(block!.querySelector('[data-enlarge-rows]')).not.toBeNull()
  })

  it('a press grows the print and focuses that area in the preview', async () => {
    const user = userEvent.setup()
    await toDesignStepWithFront(user)
    // Move the area selection away first, so the focus is proven by the press.
    await user.click(screen.getAllByRole('button', { name: /^גב/ })[0])
    expect(stages()[0].getAttribute('data-active')).toBe('back')
    const [mobileRows] = allRows()
    await user.click(within(mobileRows).getByRole('button', { name: '+3' }))
    expect(stages()[0].getAttribute('data-active')).toBe('front_full')
    expect(stages()[0].getAttribute('data-scales')).toContain('front_full:1.3')
  })
})


// ── TICKET-011: the floating «לסקיצה» button ─────────────────────────────────

type IOCb = (entries: Partial<IntersectionObserverEntry>[]) => void
let ioObservers: { cb: IOCb; targets: Element[] }[] = []
class IOStub {
  private rec: { cb: IOCb; targets: Element[] }
  constructor(cb: IOCb) { this.rec = { cb, targets: [] }; ioObservers.push(this.rec) }
  observe(el: Element) { this.rec.targets.push(el) }
  unobserve() {}
  disconnect() { ioObservers = ioObservers.filter(o => o !== this.rec) }
  takeRecords() { return [] }
}

/** Every observed element reports "out of view" (page scrolled to the middle). */
async function scrollEverythingOut() {
  const { act } = await import('@testing-library/react')
  act(() => {
    for (const o of ioObservers) o.cb(o.targets.map(target => ({ target, isIntersecting: false })))
  })
}
const sketchButton = () => screen.queryByRole('button', { name: 'חזרה לסקיצה' })

describe('Back-to-sketch button (mobile)', () => {
  beforeEach(() => {
    ioObservers = []
    vi.stubGlobal('IntersectionObserver', IOStub)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('t-shirt step 3: watches the mobile preview block and appears once it is out of view', async () => {
    seedTshirtSession([D('front_full', 'קידמי מלא')])
    render(<TshirtDesigner use3DPreview />)
    expect(ioObservers.some(o => o.targets.includes(mobileBlock()!))).toBe(true)
    expect(sketchButton()).not.toBeInTheDocument()
    await scrollEverythingOut()
    const b = sketchButton()
    expect(b).toBeInTheDocument()
    // Inside the mobile layout only.
    expect(b!.closest('.lg\\:hidden')).not.toBeNull()
  })

  it('t-shirt step 4 (sizes): never shown', async () => {
    sessionStorage.setItem(
      'designer_session',
      JSON.stringify({
        step: 4,
        config: { productType: 'tshirt', fabricType: 'cotton', color: 'white', designs: [D('front_full', 'קידמי מלא')], sizes: [] },
        timestamp: Date.now(),
      })
    )
    render(<TshirtDesigner use3DPreview />)
    await scrollEverythingOut()
    expect(sketchButton()).not.toBeInTheDocument()
    expectPlainMobileBlock(mobileBlock()!)
  })

  it('sweatshirt: shown on step 3 when the preview is out of view, never on step 4', async () => {
    const user = userEvent.setup()
    render(<SweatshirtDesignerPage />)
    expectPlainMobileBlock(mobileBlock()!)
    await user.click(screen.getAllByRole('button', { name: /קנגרו/ })[0])
    await user.click(screen.getAllByRole('button', { name: 'הבא' })[0])
    await user.click(screen.getAllByRole('button', { name: 'שחור' })[0])
    await user.click(screen.getAllByRole('button', { name: 'הבא' })[0])
    const [label] = screen.getAllByLabelText(/העלאת עיצוב לאזור קידמי מלא/)
    await user.upload(label.querySelector('input[type="file"]') as HTMLInputElement, pngFile())
    await waitFor(() => expect(allRows().length).toBe(2))
    await scrollEverythingOut()
    expect(sketchButton()).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'הבא' })[0])
    await waitFor(() => expect(allRows()).toHaveLength(0))
    await scrollEverythingOut()
    expect(sketchButton()).not.toBeInTheDocument()
  })
})
