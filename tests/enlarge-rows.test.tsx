import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EnlargeRows from '@/components/designer/EnlargeRows'
import type { DesignArea, DesignAreaType } from '@/lib/types'

// TICKET-010: the size rows live under the preview, not in the area grid. One
// segmented row per design whose area can be enlarged (front_full, back — in
// that order), and a press also turns the preview to that side.

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

describe('EnlargeRows', () => {
  it('renders one group per enlargeable design, front_full first', () => {
    render(
      <EnlargeRows
        productType="tshirt"
        designs={[design('chest_logo'), design('back', 1), design('front_full')]}
        onChange={() => {}}
      />
    )
    const groups = screen.getAllByRole('radiogroup')
    expect(groups.map(g => g.getAttribute('aria-label'))).toEqual([
      'גודל ההדפס — קידמי מלא',
      'גודל ההדפס — גב',
    ])
    // back arrives at 1
    expect(within(groups[1]).getByRole('button', { name: '+1' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('pressing +3 on back reports the change AND focuses the back', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onFocusArea = vi.fn()
    render(
      <EnlargeRows
        productType="tshirt"
        designs={[design('chest_logo'), design('back', 1), design('front_full')]}
        onChange={onChange}
        onFocusArea={onFocusArea}
      />
    )
    const back = screen.getByRole('radiogroup', { name: 'גודל ההדפס — גב' })
    await user.click(within(back).getByRole('button', { name: '+3' }))
    expect(onChange).toHaveBeenCalledWith('back', 3)
    expect(onFocusArea).toHaveBeenCalledWith('back')
  })

  it('renders null when no design can be enlarged', () => {
    const { container } = render(
      <EnlargeRows productType="tshirt" designs={[design('chest_logo'), design('chest_logo_right')]} onChange={() => {}} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('shoulders never get a group', () => {
    const { container } = render(
      <EnlargeRows productType="sweatshirt" designs={[design('shoulder_right'), design('shoulder_left')]} onChange={() => {}} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('a product without enlargement gets nothing', () => {
    const { container } = render(
      <EnlargeRows productType="tote" designs={[design('front_full'), design('back')]} onChange={() => {}} />
    )
    expect(container.innerHTML).toBe('')
  })
})
