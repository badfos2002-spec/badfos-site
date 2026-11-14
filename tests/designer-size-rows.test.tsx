import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DesignArea } from '@/lib/types'

// TICKET-010, both designers end to end: the size rows render under the
// preview (mobile preview block AND desktop preview column — both layouts are
// mounted, CSS hides one), never inside the step card, and a press turns the
// preview to that side. TICKET-011: the mobile block is no longer a shrinking
// sticky block; it is an in-flow placeholder whose content docks (fixed) under
// the header once the placeholder has scrolled out.
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
  expect(block.getAttribute('data-docked')).toBe('false')
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

  it('the mobile rows sit inside the (undocked, non-sticky) preview placeholder', () => {
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



// ── TICKET-011 revision: the docked compact preview ───────────────────────────

/** Fake the placeholder's position: everything reads its bottom edge. */
async function placeholderAt(bottom: number) {
  const { act } = await import('@testing-library/react')
  const block = mobileBlock()!
  block.getBoundingClientRect = () => ({ bottom, top: bottom - 694, height: 694, width: 390, left: 0, right: 390, x: 0, y: bottom - 694, toJSON() {} }) as DOMRect
  Object.defineProperty(block, 'offsetHeight', { get: () => 694, configurable: true })
  act(() => { window.dispatchEvent(new Event('scroll')) })
}
const bar = () => mobileBlock()!.querySelector<HTMLElement>('[data-dock-bar]')!
const mobileBox = () => mobileBlock()!.querySelector<HTMLElement>('[data-preview-box]')!
const HIDE = ['[&_[data-stage-badge]]:!hidden', '[&_[data-stage-hint]]:!hidden', '[&_[data-stage-caption]]:!hidden']

function expectDocked(withRows: boolean) {
  const block = mobileBlock()!
  expect(block.getAttribute('data-docked')).toBe('true')
  // The placeholder keeps the height it had, so nothing in flow moves.
  expect(block.style.height).toBe('694px')
  for (const c of ['fixed', 'top-20', 'z-30', 'inset-x-0']) expect(bar().className).toContain(c)
  for (const c of [...HIDE, 'max-w-[165px]']) expect(mobileBox().className).toContain(c)
  // 360 while docked: the compact canvas owns the touch (horizontal AND vertical).
  expect(mobileBox().className).toContain('[&_canvas]:![touch-action:none]')
  // ViewTabs and the ✓ chip are gone while docked.
  expect(within(block).queryByText(/✓ \d+ (עיצובים|אזורים)/)).not.toBeInTheDocument()
  const rows = block.querySelector('[data-enlarge-rows]')
  if (withRows) {
    expect(rows).not.toBeNull()
    // Beside the compact preview.
    expect(bar().querySelector('.flex.items-center')).not.toBeNull()
  } else expect(rows).toBeNull()
}

describe('Docked compact preview (mobile)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { cb(0); return 1 })
  })
  afterEach(() => vi.restoreAllMocks())

  it('t-shirt step 3: placeholder out under the header → docked bar with the rows beside; back → expanded', async () => {
    seedTshirtSession([D('front_full', 'קידמי מלא')])
    render(<TshirtDesigner use3DPreview />)
    expect(within(mobileBlock()!).getByText(/✓ 1 עיצובים/)).toBeInTheDocument()
    expect(bar().className).not.toContain('fixed')
    for (const c of HIDE) expect(mobileBox().className).not.toContain(c)
    await placeholderAt(60)
    expectDocked(true)
    // The same stage element both ways — the canvas is never remounted.
    const stageBefore = mobileBlock()!.querySelector('[data-testid="stage"]')
    await placeholderAt(150)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('true')
    await placeholderAt(300)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('false')
    expect(mobileBlock()!.style.height).toBe('')
    expect(bar().className).not.toContain('fixed')
    expect(mobileBlock()!.querySelector('[data-testid="stage"]')).toBe(stageBefore)
    // The stage itself never gets noHint (the hide is the mobile box's job).
    for (const s of stages()) expect(s.getAttribute('data-nohint')).toBe('false')
  })

  it('t-shirt step 4 (sizes): never docks', async () => {
    sessionStorage.setItem(
      'designer_session',
      JSON.stringify({
        step: 4,
        config: { productType: 'tshirt', fabricType: 'cotton', color: 'white', designs: [D('front_full', 'קידמי מלא')], sizes: [] },
        timestamp: Date.now(),
      })
    )
    render(<TshirtDesigner use3DPreview />)
    await placeholderAt(20)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('false')
    expect(bar().className).not.toContain('fixed')
  })

  it('sweatshirt step 1: docks centred with no rows', async () => {
    render(<SweatshirtDesignerPage />)
    await placeholderAt(40)
    expectDocked(false)
    expect(mobileBox().className).toContain('mx-auto')
  })

  it('sweatshirt step 3 docks with the rows beside; step 4 never docks', async () => {
    const user = userEvent.setup()
    render(<SweatshirtDesignerPage />)
    await user.click(screen.getAllByRole('button', { name: /קנגרו/ })[0])
    await user.click(screen.getAllByRole('button', { name: 'הבא' })[0])
    await user.click(screen.getAllByRole('button', { name: 'שחור' })[0])
    await user.click(screen.getAllByRole('button', { name: 'הבא' })[0])
    const [label] = screen.getAllByLabelText(/העלאת עיצוב לאזור קידמי מלא/)
    await user.upload(label.querySelector('input[type="file"]') as HTMLInputElement, pngFile())
    await waitFor(() => expect(allRows().length).toBe(2))
    await placeholderAt(40)
    expectDocked(true)
    await placeholderAt(400)
    await user.click(screen.getAllByRole('button', { name: 'הבא' })[0])
    await waitFor(() => expect(allRows()).toHaveLength(0))
    await placeholderAt(20)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('false')
  })
})
