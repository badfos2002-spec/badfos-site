import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import SizeQuantityStep from '@/components/designer/SizeQuantityStep'
import type { ProductConfig, SizeQuantity } from '@/lib/types'

// TICKET-017: the long-sleeve tee comes in XS–XXL only — no 3XL/4XL and no
// kids sizes (kids stay cotton-only).

vi.mock('@/components/common/AnnouncementBar', () => ({ default: () => null }))

afterEach(cleanup)

function renderStep(fabricType: string, color = 'white', sizes: SizeQuantity[] = [], onUpdate = vi.fn()) {
  const config = { productType: 'tshirt', fabricType, color, designs: [], sizes } as unknown as ProductConfig
  render(<SizeQuantityStep sizes={sizes} onUpdate={onUpdate} config={config} />)
  return onUpdate
}

const listedSizes = () =>
  screen.getAllByLabelText(/^כמות למידה /).map(el => el.getAttribute('aria-label')!.replace('כמות למידה ', ''))

describe('SizeQuantityStep — long-sleeve', () => {
  it('lists XS…XXL only', () => {
    renderStep('long-sleeve')
    expect(listedSizes()).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
  })

  it('no kids section, even in white or black', () => {
    renderStep('long-sleeve', 'black')
    expect(screen.queryByText(/מידות ילדים/)).toBeNull()
  })

  it('drops 3XL/4XL rows carried over from another fabric', () => {
    const onUpdate = renderStep('long-sleeve', 'white', [
      { size: 'M', quantity: 2 },
      { size: '3XL', quantity: 1 },
      { size: '4XL', quantity: 1 },
    ])
    expect(onUpdate).toHaveBeenCalledWith([{ size: 'M', quantity: 2 }])
  })

  it('cotton still lists 3XL/4XL (unchanged)', () => {
    renderStep('cotton', 'gray')
    expect(listedSizes()).toContain('4XL')
  })
})
