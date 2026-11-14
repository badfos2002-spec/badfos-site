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

  it('t-shirt step 3: docks under 280 with the rows beside; undocks only past 480', async () => {
    seedTshirtSession([D('front_full', 'קידמי מלא')])
    render(<TshirtDesigner use3DPreview />)
    await placeholderAt(400)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('false')
    expect(mobileBlock()!.style.height).toBe('')
    await placeholderAt(60)
    expectDocked(true)
    expect(mobileBlock()!.hasAttribute('data-has-docked')).toBe(false)
    const stageBefore = mobileBlock()!.querySelector('[data-testid="stage"]')
    await placeholderAt(470)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('true')
    await placeholderAt(490)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('false')
    expect(mobileBlock()!.style.height).toBe('')
    expect(mobileBlock()!.hasAttribute('data-has-docked')).toBe(false)
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
    await placeholderAt(400)
    await placeholderAt(40)
    expectDocked(false)
    expect(mobileBlock()!.hasAttribute('data-has-docked')).toBe(false)
    await placeholderAt(500)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('false')
    expect(mobileBlock()!.hasAttribute('data-has-docked')).toBe(false)
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

// TICKET-013: both designers hand the preview box to the hook, which zooms it
// (FLIP via the Web Animations API) between the big and the docked rect.
describe('Docked preview — FLIP zoom of the box (both designers)', () => {
  const BIG = { left: 16, top: -260, width: 358, height: 477.33 }
  const SMALL = { left: 105, top: 88, width: 180, height: 240 }
  let animate: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { cb(0); return 1 })
    animate = vi.fn(() => ({ cancel() {} }) as unknown as Animation)
    ;(HTMLElement.prototype as unknown as { animate: unknown }).animate = animate
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate
  })
  /** The box's rect follows the placeholder's committed data-docked. */
  function fakeBox() {
    const box = mobileBlock()!.querySelector<HTMLElement>('[data-preview-box]')!
    box.getBoundingClientRect = () => {
      const r = mobileBlock()!.getAttribute('data-docked') === 'true' ? SMALL : BIG
      return { ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top, toJSON() {} } as DOMRect
    }
    return box
  }
  const expectZoom = (call: unknown[], from: typeof BIG, to: typeof BIG) => {
    const [frames, opts] = call as [Keyframe[], KeyframeAnimationOptions]
    const m = String(frames[0].transform).match(/^translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\((-?[\d.]+), (-?[\d.]+)\)$/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeCloseTo(from.left - to.left)
    expect(Number(m![2])).toBeCloseTo(from.top - to.top)
    expect(Number(m![3])).toBeCloseTo(from.width / to.width, 3)
    expect(frames[frames.length - 1].transform).toBe('none')
    expect(opts.duration).toBe(320)
  }

  it('t-shirt: dock zooms the box from the big rect into the bar, undock zooms it back', async () => {
    seedTshirtSession([D('front_full', 'קידמי מלא')])
    render(<TshirtDesigner use3DPreview />)
    await placeholderAt(400)
    const box = fakeBox()
    await placeholderAt(270)
    expect(mobileBlock()!.getAttribute('data-docked')).toBe('true')
    expect(animate).toHaveBeenCalledTimes(1)
    expect(animate.mock.contexts[0]).toBe(box)
    expectZoom(animate.mock.calls[0], BIG, SMALL)
    await placeholderAt(490)
    expect(animate).toHaveBeenCalledTimes(2)
    expect(animate.mock.contexts[1]).toBe(box)
    expectZoom(animate.mock.calls[1], SMALL, BIG)
  })

  it('sweatshirt: the same zoom on the box', async () => {
    render(<SweatshirtDesignerPage />)
    await placeholderAt(400)
    const box = fakeBox()
    await placeholderAt(270)
    expect(animate).toHaveBeenCalledTimes(1)
    expect(animate.mock.contexts[0]).toBe(box)
    expectZoom(animate.mock.calls[0], BIG, SMALL)
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

// TICKET-012: a tad bigger at ≥ 390 px, and a dock/undock animation that is
// transform/opacity only (nothing in flow changes size).
describe('the docked CSS — TICKET-012 size and animation', () => {
  const load = async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const css = readFileSync(join(__dirname, '..', 'app', 'globals.css'), 'utf8')
    return css.slice(css.indexOf('TICKET-011'))
  }
  /** Every rule `selector { body }` whose selector contains `needle`, at any nesting. */
  const rules = (css: string, needle: string) =>
    Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g)).filter(m => m[1].includes(needle)).map(m => ({ sel: m[1].trim(), body: m[2] }))
  const keyframes = (css: string) =>
    Object.fromEntries(Array.from(css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g)).map(m => [m[1], m[2]]))
  const animName = (body: string) => body.match(/animation:\s*([\w-]+)/)?.[1]

  it('165 px wide by default, 180 px from 390 px wide', async () => {
    const css = await load()
    const D = '[data-mobile-preview][data-docked="true"]:not([data-measuring]) [data-preview-box]'
    expect(rules(css, D).some(r => /max-width:\s*165px/.test(r.body))).toBe(true)
    const media = css.match(/@media\s*\(min-width:\s*390px\)\s*\{([\s\S]*?\}\s*)\}/)
    expect(media).not.toBeNull()
    expect(media![1]).toContain(D)
    expect(media![1]).toMatch(/max-width:\s*180px/)
  })

  // TICKET-013: the box's zoom is a FLIP in JS (useDockedPreview); the 012
  // box keyframes would fight its transform, so they are gone.
  it('no CSS box keyframes any more: dock-box-settle and undock-arrive are gone', async () => {
    const css = await load()
    expect(css).not.toContain('dock-box-settle')
    expect(css).not.toContain('undock-arrive')
    for (const r of rules(css, '[data-preview-box]')) expect(r.body).not.toMatch(/animation:\s*(?!none)[\w-]/)
  })

  it('the box scales from its top-left corner in BOTH states (transform-origin: 0 0, not docked-gated)', async () => {
    const css = await load()
    const r = rules(css, '[data-preview-box]').find(r => /transform-origin:\s*0\s+0/.test(r.body))
    expect(r).toBeDefined()
    expect(r!.sel.replace(/\/\*[\s\S]*?\*\//g, '').trim()).toBe('[data-mobile-preview] [data-preview-box]')
  })

  it('dock fade is opacity only (no translate) and never fades the flying box: the bar chrome and the rows fade', async () => {
    const css = await load()
    const kf = keyframes(css)
    expect(kf['dock-enter']).toBeDefined()
    expect(kf['dock-enter']).toMatch(/opacity:\s*0\b/)
    expect(kf['dock-enter']).not.toMatch(/transform|translate/)
    const animated = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
      .filter(m => /animation:\s*dock-enter/.test(m[2]))
      .flatMap(m => m[1].replace(/\/\*[\s\S]*?\*\//g, '').split(',').map(sel => sel.trim()))
    // The box lives inside the bar: opacity on the bar itself would fade the box too.
    expect(animated.some(sel => sel.endsWith('[data-dock-bar]'))).toBe(false)
    expect(animated.some(sel => sel.endsWith('[data-dock-bar]::before'))).toBe(true)
    expect(animated.some(sel => sel.endsWith('[data-rows-wrap]'))).toBe(true)
    for (const sel of animated) expect(sel).not.toContain('data-measuring')
  })

  it('the rows fade in ~120 ms after the dock (once the box has mostly landed), opacity only', async () => {
    const css = await load()
    const r = rules(css, '[data-rows-wrap]').filter(r => /animation:/.test(r.body) && !/animation:\s*none/.test(r.body))
    expect(r).toHaveLength(1)
    expect(r[0].sel.replace(/\/\*[\s\S]*?\*\//g, '').trim()).toBe('[data-mobile-preview][data-docked="true"] [data-rows-wrap]')
    expect(r[0].body).toMatch(/animation:\s*dock-enter\s+220ms\s+cubic-bezier\(\.2,\s*\.8,\s*\.2,\s*1\)\s+120ms\s+both/)
  })

  it('docked, the placeholder\'s leftover slot blends into the page: transparent background, no layout change, not while measuring', async () => {
    const css = await load()
    const r = rules(css, '[data-mobile-preview]').filter(r => /background(-color)?:\s*transparent/.test(r.body))
    expect(r).toHaveLength(1)
    expect(r[0].sel.replace(/\/\*[\s\S]*?\*\//g, '').trim()).toBe('[data-mobile-preview][data-docked="true"]:not([data-measuring])')
    expect(r[0].body.replace(/\/\*[\s\S]*?\*\//g, '').trim()).toMatch(/^background-color:\s*transparent;?$/)
  })

  it('reduced motion: no dock or undock animation', async () => {
    const css = await load()
    const rm = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?\}\s*)\}/)
    expect(rm).not.toBeNull()
    expect(rm![1]).toContain('[data-dock-bar]::before')
    expect(rm![1]).toContain('[data-rows-wrap]')
    expect(rm![1]).toMatch(/animation:\s*none/)
  })

  it('animations are transform/opacity only, and never on the placeholder itself', async () => {
    const css = await load()
    const kf = keyframes(css)
    expect(Object.keys(kf).length).toBeGreaterThanOrEqual(1)
    for (const body of Object.values(kf)) {
      const props = Array.from(body.matchAll(/([\w-]+)\s*:/g)).map(m => m[1])
      for (const p of props) expect(['transform', 'opacity']).toContain(p)
      expect(body).not.toMatch(/\b(height|width|margin|top)\b/)
    }
    expect(css).not.toMatch(/transition[^;]*\b(height|width|margin|top)\b/)
    // Transforms sit on the bar and the box, never on the placeholder (an
    // ancestor of the fixed bar) — every animated rule targets one of those.
    for (const r of Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g)).filter(m => /animation:\s*[\w-]/.test(m[2]) && !/animation:\s*none/.test(m[2])))
      expect(r[1].trim()).toMatch(/\[data-dock-bar\]::before$|\[data-rows-wrap\]$/)
  })
})

// The box's scale() animation runs while the docked layout resizes the 3D
// canvas: R3F measures with getBoundingClientRect (transformed) by default, so
// the canvas came out 1.06× the box (191×254 in a 180 box). It must size from
// the layout box (offsetWidth/offsetHeight), which transforms do not touch.
describe('the 3D stage canvas sizes from layout, not the transformed rect', () => {
  it('Preview3DStage passes resize={{ offsetSize: true }} to the Canvas', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(__dirname, '..', 'components', 'designer', 'three', 'Preview3DStage.tsx'), 'utf8')
    const canvas = src.slice(src.indexOf('<Canvas'), src.indexOf('>', src.indexOf('gl={{')) + 1)
    expect(canvas).toMatch(/resize=\{\{\s*offsetSize:\s*true\s*\}\}/)
  })
})
