import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DesignArea } from '@/lib/types'

// TICKET-010, both designers end to end: the size rows render under the
// preview (mobile sticky block AND desktop preview column — both layouts are
// mounted, CSS hides one), never inside the step card, and a press turns the
// preview to that side.
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

  it('the mobile rows sit inside the sticky preview block', () => {
    render(<TshirtDesigner use3DPreview />)
    const block = document.querySelector<HTMLElement>('[data-compact]')
    expect(block).not.toBeNull()
    expect(block!.className).toContain('sticky')
    // Above the step card's z-10/z-20 children (tile × badges, upload overlay,
    // nav row) that scroll under it; below the site header (z-[100]).
    expect(block!.className).toContain('z-30')
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

  it('renders the rows in the mobile sticky block and the desktop column, none in the step card', async () => {
    const user = userEvent.setup()
    await toDesignStepWithFront(user)
    const all = screen.getAllByRole('radiogroup')
    expect(all).toHaveLength(2)
    for (const g of all) {
      expect(g.getAttribute('aria-label')).toBe('גודל ההדפס — קידמי מלא')
      expect(g.closest('[data-enlarge-rows]')).not.toBeNull()
    }
    const block = document.querySelector<HTMLElement>('[data-compact]')
    expect(block!.className).toContain('sticky')
    // Above the step card's z-10/z-20 children (tile × badges, upload overlay,
    // nav row) that scroll under it; below the site header (z-[100]).
    expect(block!.className).toContain('z-30')
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

describe('Compact sticky preview on mobile', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { cb(0); return 1 })
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })
  afterEach(() => vi.restoreAllMocks())

  const scrollTo = async (y: number) => {
    const { act } = await import('@testing-library/react')
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
    act(() => { window.dispatchEvent(new Event('scroll')) })
  }

  it('t-shirt: the block goes compact on scroll, keeps the rows, and expands at the top', async () => {
    seedTshirtSession([D('front_full', 'קידמי מלא')])
    render(<TshirtDesigner use3DPreview />)
    const block = () => document.querySelector<HTMLElement>('[data-compact]')!
    expect(block().getAttribute('data-compact')).toBe('false')
    expect(within(block()).getByText(/✓ 1 עיצובים/)).toBeInTheDocument()
    await scrollTo(300)
    expect(block().getAttribute('data-compact')).toBe('true')
    expect(within(block()).queryByText(/✓ 1 עיצובים/)).not.toBeInTheDocument()
    expect(block().querySelector('[data-enlarge-rows]')).not.toBeNull()
    await scrollTo(0)
    expect(block().getAttribute('data-compact')).toBe('false')
  })
})

describe('Compact mode clears the overlays off the 135×180 canvas (mobile)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { cb(0); return 1 })
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })
  afterEach(() => vi.restoreAllMocks())

  const scrollTo = async (y: number) => {
    const { act } = await import('@testing-library/react')
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
    act(() => { window.dispatchEvent(new Event('scroll')) })
  }
  const mobileStage = () => document.querySelector<HTMLElement>('[data-compact] [data-testid="stage"]')!
  // The «360°» badge is drawn by the stage itself; the mobile preview box hides
  // it through its data-stage-badge hook while compact.
  const mobileBox = () => mobileStage().closest<HTMLElement>('[data-preview-box]')!

  // Both overlays are hidden by the MOBILE box (data-stage-* hooks), never via
  // the shared stage element — a noHint prop would leak to the desktop stage.
  const BADGE = '[&_[data-stage-badge]]:!hidden'
  const HINT = '[&_[data-stage-hint]]:!hidden'

  it('t-shirt: badge and hint hidden on the mobile box only while compact; stage never gets noHint', async () => {
    seedTshirtSession([D('front_full', 'קידמי מלא')])
    render(<TshirtDesigner use3DPreview />)
    expect(mobileBox().className).not.toContain(BADGE)
    expect(mobileBox().className).not.toContain(HINT)
    await scrollTo(300)
    expect(mobileBox().className).toContain(BADGE)
    expect(mobileBox().className).toContain(HINT)
    for (const s of stages()) expect(s.getAttribute('data-nohint')).toBe('false')
    await scrollTo(0)
    expect(mobileBox().className).not.toContain(BADGE)
    expect(mobileBox().className).not.toContain(HINT)
  })

  it('sweatshirt: badge and hint hidden on the mobile box only while compact; stage never gets noHint', async () => {
    render(<SweatshirtDesignerPage />)
    await scrollTo(300)
    expect(mobileBox().className).toContain(BADGE)
    expect(mobileBox().className).toContain(HINT)
    for (const s of stages()) expect(s.getAttribute('data-nohint')).toBe('false')
    await scrollTo(0)
    expect(mobileBox().className).not.toContain(HINT)
  })
})
