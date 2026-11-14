import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EnlargeControl from '@/components/designer/EnlargeControl'
import { withEnlarge } from '@/lib/enlarge'
import type { DesignArea, DesignAreaType } from '@/lib/types'

// TICKET-010: the control is a four-button segmented row — רגיל / +1 / +2 / +3 —
// titled "גודל ההדפס · <area>", with a small per-step price line under it. It
// replaces TICKET-005's "+" / reset / chip. Still NO centimetres, percentages or
// size words anywhere — the customer judges the size from the mockup.
//
// The step price is admin-editable, so the line must come from the live
// override getter, never a literal: the mock below sets it to 2.
//
// vitest.config.mts has no `globals: true`, so Testing Library's automatic
// cleanup never registers — afterEach(cleanup) is mandatory in every .test.tsx.

vi.mock('@/lib/constants', async (orig) => ({
  ...(await orig<typeof import('@/lib/constants')>()),
  getLiveEnlargeStepPrice: () => 2,
}))

afterEach(cleanup)

function design(area: DesignAreaType, enlarge?: number): DesignArea {
  return {
    area,
    areaName: area,
    imageUrl: 'https://example.com/art.png',
    fileName: 'art.png',
    ...(enlarge === undefined ? {} : { enlarge: enlarge as 1 | 2 | 3 }),
  }
}

/** The control is controlled by its designer; this is that designer's state. */
function Harness({
  productType = 'tshirt',
  area = 'front_full' as DesignAreaType,
  hasDesign = true,
  initial,
  onChange,
}: {
  productType?: string
  area?: DesignAreaType
  hasDesign?: boolean
  initial?: number
  onChange?: (steps: number) => void
}) {
  const [designs, setDesigns] = useState<DesignArea[]>([design(area, initial)])
  const current = designs.find(d => d.area === area)
  return (
    <>
      <EnlargeControl
        productType={productType}
        area={area}
        hasDesign={hasDesign}
        enlarge={current?.enlarge}
        onChange={steps => {
          onChange?.(steps)
          setDesigns(prev => withEnlarge(prev, productType, area, steps))
        }}
      />
      {/* What the designer would hand to the cart — proves the stored shape. */}
      <output data-testid="stored">{JSON.stringify(designs)}</output>
    </>
  )
}

const stored = () => JSON.parse(screen.getByTestId('stored').textContent || '[]')
const btn = (label: string) => screen.getByRole('button', { name: label })
const pressed = () =>
  screen.getAllByRole('button').filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent)

describe('EnlargeControl — four segmented buttons', () => {
  it('renders exactly רגיל, +1, +2, +3 in a radiogroup', () => {
    render(<Harness />)
    const group = screen.getByRole('radiogroup')
    const labels = within(group).getAllByRole('button').map(b => b.textContent)
    expect(labels).toEqual(['רגיל', '+1', '+2', '+3'])
  })

  it('the radiogroup label names the area', () => {
    render(<Harness />)
    expect(screen.getByRole('radiogroup', { name: 'גודל ההדפס — קידמי מלא' })).toBeInTheDocument()
  })

  it('the title line names the area (back on a sweatshirt)', () => {
    render(<Harness productType="sweatshirt" area="back" />)
    expect(screen.getByText('גודל ההדפס · גב')).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'גודל ההדפס — גב' })).toBeInTheDocument()
  })

  it('aria-pressed sits on רגיל at 0', () => {
    render(<Harness />)
    expect(pressed()).toEqual(['רגיל'])
  })

  it('aria-pressed sits on +2 at 2', () => {
    render(<Harness initial={2} />)
    expect(pressed()).toEqual(['+2'])
  })

  it('every button carries aria-pressed', () => {
    render(<Harness initial={1} />)
    for (const b of screen.getAllByRole('button')) expect(b).toHaveAttribute('aria-pressed')
  })
})

describe('EnlargeControl — pressing', () => {
  it('+2 reports 2 and moves the selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(btn('+2'))
    expect(onChange).toHaveBeenCalledWith(2)
    expect(pressed()).toEqual(['+2'])
    expect(stored()[0].enlarge).toBe(2)
  })

  it('רגיל reports 0 and strips the key (addDoc throws on undefined)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness initial={3} onChange={onChange} />)
    await user.click(btn('רגיל'))
    expect(onChange).toHaveBeenCalledWith(0)
    expect('enlarge' in stored()[0]).toBe(false)
  })

  it('pressing the already-selected button does nothing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness initial={1} onChange={onChange} />)
    await user.click(btn('+1'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('pressing רגיל at 0 does nothing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(btn('רגיל'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('an out-of-range value is shown clamped at +3', () => {
    render(<Harness initial={7} />)
    expect(pressed()).toEqual(['+3'])
  })
})

describe('EnlargeControl — the price line', () => {
  it('shows the live step price from the override getter', () => {
    render(<Harness />)
    expect(screen.getByText('₪2 לכל הגדלה')).toBeInTheDocument()
    expect(screen.queryByText(/לכל צעד ליחידה/)).not.toBeInTheDocument()
  })
})

describe('EnlargeControl — nothing about physical size', () => {
  it('no %, centimetres or cm anywhere', () => {
    const { container } = render(<Harness initial={2} />)
    expect(container.textContent).not.toMatch(/%|ס"מ|סמ|cm/)
  })

  it('no old "+"-strip vocabulary is left', () => {
    render(<Harness initial={2} />)
    expect(screen.queryByText('חזרה לגודל רגיל')).not.toBeInTheDocument()
    expect(screen.queryByText(/הגדלה \+/)).not.toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })
})

describe('EnlargeControl — it is not rendered where enlargement does not exist', () => {
  it('nothing for chest_logo', () => {
    const { container } = render(<Harness area="chest_logo" initial={2} />)
    expect(container.querySelector('[role="radiogroup"]')).toBeNull()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('nothing for shoulder_right', () => {
    render(<Harness area="shoulder_right" initial={2} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('nothing for a tote, even on front_full', () => {
    render(<Harness productType="tote" initial={2} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('nothing before a design is uploaded', () => {
    render(<Harness hasDesign={false} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/גודל ההדפס/)).not.toBeInTheDocument()
  })
})

describe('EnlargeControl — touch targets (jsdom has no layout, so pin the classes)', () => {
  it('every button is at least 44 px tall and takes an equal share', () => {
    render(<Harness />)
    for (const b of screen.getAllByRole('button')) {
      expect(b.className).toContain('min-h-[44px]')
      expect(b.className).toContain('flex-1')
    }
  })
})
