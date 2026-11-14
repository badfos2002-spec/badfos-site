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
// The docked presentation lives in app/globals.css, keyed on the placeholder's
// attributes (jsdom has no layout, so the CSS itself is pinned by a source test
// below). Here: the attributes, the pinned height, and that the pin follows the
// expanded layout while docked.

/** Expanded layout height in this fake: 501 + 193 per size-rows group. */
const expandedHeight = (block: HTMLElement) => 501 + 193 * block.querySelectorAll('[role="radiogroup"]').length

/** Fake the placeholder's layout and put its bottom edge at `bottom`. */
async function placeholderAt(bottom: number) {
  const { act } = await import('@testing-library/react')
  const block = mobileBlock()!
  const h = () => (!block.hasAttribute('data-measuring') && block.style.height ? parseFloat(block.style.height) : expandedHeight(block))
  Object.defineProperty(block, 'offsetHeight', { get: h, configurable: true })
  block.getBoundingClientRect = () => ({ bottom, top: bottom - h(), height: h(), width: 390, left: 0, right: 390, x: 0, y: bottom - h(), toJSON() {} }) as DOMRect
  act(() => { window.dispatchEvent(new Event('scroll')) })
}

/** Record (data-docked, style.height) after every mutation batch on the placeholder. */
function watchPairs(block: HTMLElement) {
  const pairs: string[] = []
  const mo = new MutationObserver(() => pairs.push(`${block.getAttribute('data-docked')}|${block.style.height}`))
  mo.observe(block, { attributes: true, attributeFilter: ['data-docked', 'style'] })
  return { pairs, stop: () => mo.disconnect() }
}

function expectDocked(withRows: boolean) {
  const block = mobileBlock()!
  expect(block.getAttribute('data-docked')).toBe('true')
  expect(block.hasAttribute('data-measuring')).toBe(false)
  // Pinned to the EXPANDED height, so nothing in flow moves.
  expect(block.style.height).toBe(`${expandedHeight(block)}px`)
  expect(block.querySelector('[data-dock-bar]')).not.toBeNull()
  expect(block.querySelector('[data-preview-box]')).not.toBeNull()
  // The ✓ chip (and the t-shirt's 2D view tabs) are tagged for the docked CSS to hide.
  const chip = within(block).queryByText(/✓ \d+ (עיצובים|אזורים)/)
  if (chip) expect(chip.closest('[data-dock-hide]')).not.toBeNull()
  const row = block.querySelector<HTMLElement>('[data-dock-row]')!
  if (withRows) {
    expect(row.hasAttribute('data-has-rows')).toBe(true)
    expect(row.querySelector('[data-rows-wrap] [data-enlarge-rows]')).not.toBeNull()
  } else {
    expect(row.hasAttribute('data-has-rows')).toBe(false)
    expect(block.querySelector('[data-enlarge-rows]')).toBeNull()
  }
}

async function sweatshirtToDesignStep(user: ReturnType<typeof userEvent.setup>) {
  render(<SweatshirtDesignerPage />)
  await user.click(screen.getAllByRole('button', { name: /קנגרו/ })[0])
  await user.click(screen.getAllByRole('button', { name: 'הבא' })[0])
  await user.click(screen.getAllByRole('button', { name: 'שחור' })[0])
  await user.click(screen.getAllByRole('button', { name: 'הבא' })[0])
}
async function uploadFront(user: ReturnType<typeof userEvent.setup>) {
  const [label] = screen.getAllByLabelText(/העלאת עיצוב לאזור קידמי מלא/)
  await user.upload(label.querySelector('input[type="file"]') as HTMLInputElement, pngFile())
  await waitFor(() => expect(allRows().length).toBe(2))
}

describe('Docked compact preview (mobile)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { cb(0); return 1 })
  })
  afterEach(() => vi.restoreAllMocks())

  it('t-shirt step 3: docks past the header with the rows beside; undocks only past 300', async () => {
    seedTshirtSession([D('front_full', 'קידמי מלא')])
    render(<TshirtDesigner use3DPreview />)
    await placeholderAt(400)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('false')
    expect(mobileBlock()!.style.height).toBe('')
    await placeholderAt(60)
    expectDocked(true)
    const stageBefore = mobileBlock()!.querySelector('[data-testid="stage"]')
    await placeholderAt(290)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('true')
    await placeholderAt(320)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('false')
    expect(mobileBlock()!.style.height).toBe('')
    // The same stage element both ways — the canvas is never remounted.
    expect(mobileBlock()!.querySelector('[data-testid="stage"]')).toBe(stageBefore)
    for (const s of stages()) expect(s.getAttribute('data-nohint')).toBe('false')
  })

  it('t-shirt: removing the design while docked shrinks the pin, no undock/re-dock', async () => {
    const user = userEvent.setup()
    seedTshirtSession([D('front_full', 'קידמי מלא'), D('back', 'גב')])
    render(<TshirtDesigner use3DPreview />)
    await placeholderAt(60)
    expectDocked(true)
    expect(mobileBlock()!.style.height).toBe(`${501 + 193 * 2}px`)
    const w = watchPairs(mobileBlock()!)
    await user.click(screen.getAllByRole('button', { name: 'הסרת עיצוב מאזור גב' })[0])
    await waitFor(() => expect(mobileBlock()!.style.height).toBe(`${501 + 193}px`))
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('true')
    w.stop()
    expect(w.pairs.every(p => p.startsWith('true|'))).toBe(true)
  })

  it('t-shirt step 3 → 4 while docked: undocked and unpinned together, never compact-but-unpinned', async () => {
    const user = userEvent.setup()
    seedTshirtSession([D('front_full', 'קידמי מלא')])
    render(<TshirtDesigner use3DPreview />)
    await placeholderAt(60)
    expectDocked(true)
    const w = watchPairs(mobileBlock()!)
    await user.click(screen.getAllByRole('button', { name: 'הבא' })[0])
    await waitFor(() => expect(mobileBlock()!.getAttribute('data-docked')).toBe('false'))
    await new Promise(r => setTimeout(r, 0))
    w.stop()
    expect(mobileBlock()!.style.height).toBe('')
    expect(w.pairs.length).toBeGreaterThan(0)
    for (const p of w.pairs) expect(p === 'false|' || /^true\|\d+px$/.test(p)).toBe(true)
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
    expect(mobileBlock()!.style.height).toBe('')
  })

  it('sweatshirt step 1: docks centred with no rows', async () => {
    render(<SweatshirtDesignerPage />)
    await placeholderAt(40)
    expectDocked(false)
  })

  it('sweatshirt: rows arriving while docked grow the pin, still docked (no undock)', async () => {
    const user = userEvent.setup()
    await sweatshirtToDesignStep(user)
    await placeholderAt(40)
    expectDocked(false)
    expect(mobileBlock()!.style.height).toBe('501px')
    const w = watchPairs(mobileBlock()!)
    await uploadFront(user)
    await waitFor(() => expect(mobileBlock()!.style.height).toBe(`${501 + 193}px`))
    expectDocked(true)
    w.stop()
    expect(w.pairs.every(p => p.startsWith('true|'))).toBe(true)
  })

  it('sweatshirt step 3 → 4: never docks on the last step', async () => {
    const user = userEvent.setup()
    await sweatshirtToDesignStep(user)
    await uploadFront(user)
    await placeholderAt(400)
    await user.click(screen.getAllByRole('button', { name: 'הבא' })[0])
    await waitFor(() => expect(allRows()).toHaveLength(0))
    await placeholderAt(20)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('false')
  })
})

describe('the docked CSS (app/globals.css)', () => {
  it('styles the docked bar, compact box and hides from the placeholder attributes, not while measuring', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const css = readFileSync(join(__dirname, '..', 'app', 'globals.css'), 'utf8')
    const at = css.indexOf('TICKET-011')
    expect(at).toBeGreaterThan(-1)
    const block = css.slice(at)
    const D = '[data-mobile-preview][data-docked="true"]:not([data-measuring])'
    expect(block).toContain(`${D} [data-dock-bar]`)
    expect(block).toMatch(/position:\s*fixed/)
    expect(block).toMatch(/top:\s*5rem/)
    expect(block).toMatch(/z-index:\s*30/)
    expect(block).toMatch(/background(-color)?:\s*#fff\b/)
    expect(block).toContain('165px')
    expect(block).toContain('[data-stage-caption]')
    expect(block).toContain('[data-stage-badge]')
    expect(block).toContain('[data-stage-hint]')
    expect(block).toContain('[data-dock-hide]')
    expect(block).toMatch(/touch-action:\s*none\s*!important/)
    // Opaque bar: no see-through blur.
    expect(block).not.toContain('backdrop-filter')
  })
})
