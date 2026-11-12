import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import DesignAreaLines from '@/components/cart/DesignAreaLines'
import { applyPricingOverrides } from '@/lib/constants'
import type { DesignArea, DesignAreaType } from '@/lib/types'

// TICKET-005: the cart line names the enlargement and what it costs —
// "הגדלה +2" plus "+₪3 ליחידה" — so the extra on the bill is never a mystery.
//
// CartItem itself cannot be rendered here: it pulls in the Zustand store,
// next/navigation and lib/db (Firebase). The design lines are therefore a
// small presentational component that CartItem renders, and that is what this
// file tests — the same split TICKET-004 used for the cart thumbnail.
//
// Pinned: enlarge step ₪1.5, so 2 steps = ₪3 per unit.

afterEach(() => {
  cleanup()
  applyPricingOverrides({})
})

function design(area: DesignAreaType, areaName: string, enlarge?: number): DesignArea {
  return {
    area,
    areaName,
    imageUrl: 'https://example.com/art.png',
    fileName: 'art.png',
    ...(enlarge === undefined ? {} : { enlarge: enlarge as 1 | 2 | 3 }),
  }
}

describe('DesignAreaLines — an enlarged design states its step and its price', () => {
  it('shows "הגדלה +2" and "+₪3 ליחידה"', () => {
    render(<DesignAreaLines productType="tshirt" designs={[design('back', 'גב', 2)]} />)
    expect(screen.getByText('הגדלה +2')).toBeInTheDocument()
    expect(screen.getByText('+₪3 ליחידה')).toBeInTheDocument()
  })

  it('one step is "+₪1.5 ליחידה" — the half shekel is not rounded away', () => {
    render(<DesignAreaLines productType="tshirt" designs={[design('front_full', 'קדמי מלא', 1)]} />)
    expect(screen.getByText('הגדלה +1')).toBeInTheDocument()
    expect(screen.getByText('+₪1.5 ליחידה')).toBeInTheDocument()
  })

  it('three steps are "+₪4.5 ליחידה"', () => {
    render(<DesignAreaLines productType="tshirt" designs={[design('back', 'גב', 3)]} />)
    expect(screen.getByText('+₪4.5 ליחידה')).toBeInTheDocument()
  })

  it('an admin step price of 2 makes two steps read "+₪4 ליחידה"', () => {
    applyPricingOverrides({ enlargeStepPrice: 2 })
    render(<DesignAreaLines productType="tshirt" designs={[design('back', 'גב', 2)]} />)
    expect(screen.getByText('+₪4 ליחידה')).toBeInTheDocument()
  })

  it('still names the area it belongs to', () => {
    render(<DesignAreaLines productType="tshirt" designs={[design('back', 'גב', 2)]} />)
    expect(screen.getByText(/גב/)).toBeInTheDocument()
  })

  it('names each area separately when both are enlarged', () => {
    render(
      <DesignAreaLines
        productType="tshirt"
        designs={[design('front_full', 'קדמי מלא', 1), design('back', 'גב', 3)]}
      />
    )
    expect(screen.getByText('הגדלה +1')).toBeInTheDocument()
    expect(screen.getByText('הגדלה +3')).toBeInTheDocument()
    expect(screen.getByText('קדמי מלא')).toBeInTheDocument()
    expect(screen.getByText('גב')).toBeInTheDocument()
  })
})

describe('DesignAreaLines — a plain item says nothing about enlargement', () => {
  it('shows neither the step nor a price for a plain design', () => {
    render(<DesignAreaLines productType="tshirt" designs={[design('back', 'גב')]} />)
    expect(screen.getByText('גב')).toBeInTheDocument()
    expect(screen.queryByText(/הגדלה/)).not.toBeInTheDocument()
    expect(screen.queryByText(/ליחידה/)).not.toBeInTheDocument()
  })

  it('enlarge: 0 shows nothing', () => {
    render(<DesignAreaLines productType="tshirt" designs={[design('back', 'גב', 0)]} />)
    expect(screen.queryByText(/הגדלה/)).not.toBeInTheDocument()
  })

  it('a stale enlargement on chest_logo shows nothing — that area has no enlargement', () => {
    render(<DesignAreaLines productType="tshirt" designs={[design('chest_logo', 'סמל כיס ימין', 2)]} />)
    expect(screen.getByText('סמל כיס ימין')).toBeInTheDocument()
    expect(screen.queryByText(/הגדלה/)).not.toBeInTheDocument()
  })

  it('a tote front_full shows nothing — that product has no enlargement', () => {
    render(<DesignAreaLines productType="tote" designs={[design('front_full', 'צד קדמי', 2)]} />)
    expect(screen.queryByText(/הגדלה/)).not.toBeInTheDocument()
  })

  it('a hostile enlarge 7 is shown clamped to +3', () => {
    render(<DesignAreaLines productType="tshirt" designs={[design('back', 'גב', 7)]} />)
    expect(screen.getByText('הגדלה +3')).toBeInTheDocument()
    expect(screen.getByText('+₪4.5 ליחידה')).toBeInTheDocument()
  })

  it('an item with no designs renders nothing at all', () => {
    const { container } = render(<DesignAreaLines productType="tshirt" designs={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
