import { describe, it, expect, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EnlargeControl from '@/components/designer/EnlargeControl'
import { withEnlarge } from '@/lib/enlarge'
import type { DesignArea, DesignAreaType } from '@/lib/types'

// TICKET-005: the one control both designers use, at both widths. A "+" that
// adds 10% per press up to three presses, a "חזרה לגודל רגיל" reset, and a
// "הגדלה +n" chip. NO "−", no slider, no drag, and no centimetres or size
// wording anywhere — the customer judges the size from the mockup.
//
// vitest.config.mts has no `globals: true`, so Testing Library's automatic
// cleanup never registers — afterEach(cleanup) is mandatory in every .test.tsx.

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
}: {
  productType?: string
  area?: DesignAreaType
  hasDesign?: boolean
  initial?: number
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
        onChange={steps => setDesigns(prev => withEnlarge(prev, productType, area, steps))}
      />
      {/* What the designer would hand to the cart — proves the stored shape. */}
      <output data-testid="stored">{JSON.stringify(designs)}</output>
    </>
  )
}

const stored = () => JSON.parse(screen.getByTestId('stored').textContent || '[]')
const plusButton = () => screen.getByRole('button', { name: 'הגדלת העיצוב' })
const resetButton = () => screen.getByRole('button', { name: 'חזרה לגודל רגיל' })

describe('EnlargeControl — the "+" steps up to 3 and then stops', () => {
  it('renders a "+" on front_full with an uploaded design', () => {
    render(<Harness />)
    expect(plusButton()).toBeInTheDocument()
    expect(plusButton()).not.toBeDisabled()
  })

  it('three presses report 1, then 2, then 3', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(plusButton())
    expect(screen.getByText('הגדלה +1')).toBeInTheDocument()
    await user.click(plusButton())
    expect(screen.getByText('הגדלה +2')).toBeInTheDocument()
    await user.click(plusButton())
    expect(screen.getByText('הגדלה +3')).toBeInTheDocument()
  })

  it('the third press leaves the "+" DISABLED', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(plusButton())
    await user.click(plusButton())
    expect(plusButton()).not.toBeDisabled()
    await user.click(plusButton())
    expect(plusButton()).toBeDisabled()
  })

  it('a fourth press cannot push it past 3', async () => {
    const user = userEvent.setup()
    render(<Harness initial={3} />)
    await user.click(plusButton())
    expect(screen.getByText('הגדלה +3')).toBeInTheDocument()
    expect(stored()[0].enlarge).toBe(3)
  })

  it('it is already disabled when the area arrives at 3', () => {
    render(<Harness initial={3} />)
    expect(plusButton()).toBeDisabled()
  })
})

describe('EnlargeControl — the reset', () => {
  it('returns the design to its normal size', async () => {
    const user = userEvent.setup()
    render(<Harness initial={2} />)
    await user.click(resetButton())
    expect(screen.queryByText('הגדלה +2')).not.toBeInTheDocument()
    expect(screen.queryByText(/הגדלה \+/)).not.toBeInTheDocument()
  })

  it('re-enables the "+" after it was disabled at 3', async () => {
    const user = userEvent.setup()
    render(<Harness initial={3} />)
    await user.click(resetButton())
    expect(plusButton()).not.toBeDisabled()
  })

  it('is not offered when there is nothing to reset', () => {
    render(<Harness />)
    expect(screen.queryByRole('button', { name: 'חזרה לגודל רגיל' })).not.toBeInTheDocument()
  })
})

describe('EnlargeControl — the chip is the only readout', () => {
  it('reads exactly "הגדלה +2" at two steps', () => {
    render(<Harness initial={2} />)
    expect(screen.getByText('הגדלה +2')).toBeInTheDocument()
  })

  it('there is no chip at all at 0', () => {
    render(<Harness />)
    expect(screen.queryByText(/הגדלה \+/)).not.toBeInTheDocument()
  })

  it('says nothing about centimetres or physical size', () => {
    const { container } = render(<Harness initial={2} />)
    expect(container.textContent).not.toMatch(/ס["״']?מ|סנטימטר|גודל הדפסה|cm/)
  })
})

describe('EnlargeControl — there is no way to shrink', () => {
  it('renders no "−" and no "הקטנה"', () => {
    render(<Harness initial={2} />)
    expect(screen.queryByText('−')).not.toBeInTheDocument()
    expect(screen.queryByText('-')).not.toBeInTheDocument()
    expect(screen.queryByText(/הקטנה|הקטן/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /הקטנ/ })).not.toBeInTheDocument()
  })

  it('renders no slider', () => {
    render(<Harness initial={2} />)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('offers exactly two buttons at full size: the disabled "+" and the reset', () => {
    render(<Harness initial={3} />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})

describe('EnlargeControl — it is not rendered where enlargement does not exist', () => {
  it('nothing is rendered for chest_logo', () => {
    render(<Harness area="chest_logo" initial={2} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/הגדלה/)).not.toBeInTheDocument()
  })

  it('nothing is rendered for shoulder_right', () => {
    render(<Harness area="shoulder_right" initial={2} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('nothing is rendered for a tote, even on front_full', () => {
    render(<Harness productType="tote" initial={2} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('nothing is rendered before a design is uploaded', () => {
    render(<Harness hasDesign={false} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('it IS rendered for back on a sweatshirt', () => {
    render(<Harness productType="sweatshirt" area="back" />)
    expect(plusButton()).toBeInTheDocument()
  })
})

describe('EnlargeControl — what reaches Firestore', () => {
  it('the design carries NO enlarge key at 0 (addDoc throws on undefined)', () => {
    render(<Harness />)
    expect('enlarge' in stored()[0]).toBe(false)
  })

  it('the key is stripped again after a reset, not written as 0', async () => {
    const user = userEvent.setup()
    render(<Harness initial={2} />)
    await user.click(resetButton())
    expect('enlarge' in stored()[0]).toBe(false)
  })

  it('two presses store enlarge: 2', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(plusButton())
    await user.click(plusButton())
    expect(stored()[0].enlarge).toBe(2)
  })
})

describe('EnlargeControl — touch targets (jsdom has no layout, so pin the classes)', () => {
  it('the "+" is at least 44×44 px', () => {
    render(<Harness />)
    expect(plusButton().className).toContain('min-h-[44px]')
    expect(plusButton().className).toContain('min-w-[44px]')
  })

  it('the reset is at least 44 px tall', () => {
    render(<Harness initial={1} />)
    expect(resetButton().className).toContain('min-h-[44px]')
  })

  it('the disabled "+" is visibly disabled, not just inert', () => {
    render(<Harness initial={3} />)
    expect(plusButton().className).toContain('disabled:opacity-50')
  })
})
