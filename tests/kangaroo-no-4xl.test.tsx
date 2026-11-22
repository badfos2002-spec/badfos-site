import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import SizeQuantityStep from '@/components/designer/SizeQuantityStep'
import { sizeOptions } from '@/lib/manual-order'
import { validateSeoPage } from '@/lib/seo-price-tokens'
import { getSeoPage } from '@/lib/seo-pages'
import type { ProductConfig, SizeQuantity } from '@/lib/types'

// TICKET-026: the kangaroo hoodie has no 4XL (XS–3XL only, 3XL keeps +₪12).
// putter and zip stay XS–4XL, t-shirt rules unchanged. The rule lives in three
// mirrors that must stay identical — the designer grid, the admin manual order
// and the SEO price-token guard — and the sweatshirt SEO copy must say so.

vi.mock('@/components/common/AnnouncementBar', () => ({ default: () => null }))

afterEach(cleanup)

function renderStep(
  config: { productType: string; fabricType?: string; color?: string },
  sizes: SizeQuantity[] = [],
  onUpdate = vi.fn(),
) {
  render(
    <SizeQuantityStep
      sizes={sizes}
      onUpdate={onUpdate}
      config={{ color: 'black', designs: [], sizes, ...config } as unknown as ProductConfig}
    />,
  )
  return onUpdate
}

const listedSizes = () =>
  screen.getAllByLabelText(/^כמות למידה /).map(el => el.getAttribute('aria-label')!.replace('כמות למידה ', ''))

const ALL_STANDARD = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']

describe('SizeQuantityStep — kangaroo sweatshirt', () => {
  it('lists XS…3XL, no 4XL control', () => {
    renderStep({ productType: 'sweatshirt', fabricType: 'kangaroo' })
    expect(listedSizes()).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'])
  })

  it('putter and zip still list 4XL (unchanged)', () => {
    renderStep({ productType: 'sweatshirt', fabricType: 'putter' })
    expect(listedSizes()).toEqual(ALL_STANDARD)
    cleanup()
    renderStep({ productType: 'sweatshirt', fabricType: 'zip' })
    expect(listedSizes()).toEqual(ALL_STANDARD)
  })

  it('drops a 4XL row carried over from putter/zip, keeps the rest', () => {
    const onUpdate = renderStep({ productType: 'sweatshirt', fabricType: 'kangaroo' }, [
      { size: 'M', quantity: 2 },
      { size: '4XL', quantity: 3 },
      { size: '3XL', quantity: 1 },
    ])
    expect(onUpdate).toHaveBeenCalledWith([
      { size: 'M', quantity: 2 },
      { size: '3XL', quantity: 1 },
    ])
  })

  it('keeps a 4XL row on putter', () => {
    const onUpdate = renderStep({ productType: 'sweatshirt', fabricType: 'putter' }, [
      { size: '4XL', quantity: 3 },
    ])
    expect(onUpdate).not.toHaveBeenCalled()
  })
})

// The stale-row cleanup is generalised to "any size the fabric doesn't offer".
// These pin what it must NOT touch, plus the oversized rows it now covers too.
describe('SizeQuantityStep — the generalised stale-row cleanup', () => {
  it('leaves kid rows alone on cotton white (they are not standard sizes)', () => {
    const onUpdate = renderStep({ productType: 'tshirt', fabricType: 'cotton', color: 'white' }, [
      { size: 'M', quantity: 1 },
      { size: '4', quantity: 2 },
    ])
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('leaves the buff quantity row alone', () => {
    const onUpdate = renderStep({ productType: 'buff' }, [{ size: 'one-size', quantity: 50 }])
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('drops XS/3XL/4XL rows on oversized, like dri-fit and long-sleeve', () => {
    const onUpdate = renderStep({ productType: 'tshirt', fabricType: 'oversized' }, [
      { size: 'XS', quantity: 1 },
      { size: 'L', quantity: 2 },
      { size: '3XL', quantity: 1 },
      { size: '4XL', quantity: 1 },
    ])
    expect(onUpdate).toHaveBeenCalledWith([{ size: 'L', quantity: 2 }])
  })
})

describe('manual order — sizeOptions', () => {
  it('kangaroo has no 4XL, putter and zip do', () => {
    expect(sizeOptions('sweatshirt', 'kangaroo', 'black').map(o => o.id)).toEqual([
      'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL',
    ])
    expect(sizeOptions('sweatshirt', 'putter', 'black').map(o => o.id)).toEqual(ALL_STANDARD)
    expect(sizeOptions('sweatshirt', 'zip', 'black').map(o => o.id)).toEqual(ALL_STANDARD)
  })

  it('t-shirt sizes are untouched', () => {
    expect(sizeOptions('tshirt', 'cotton', 'gray').map(o => o.id)).toEqual(ALL_STANDARD)
  })
})

describe('SEO price-token guard — a page can never quote a size that is not sold', () => {
  const page = (example: { fabric: string; size: string }) => ({
    slug: 'בדיקה',
    productType: 'sweatshirt' as const,
    heroText: '',
    benefits: [],
    paragraphs: [],
    faq: [],
    priceExamples: [
      {
        label: 'קפוצ׳ון',
        productType: 'sweatshirt' as const,
        fabric: example.fabric,
        areas: ['front_full'],
        quantity: 15,
        size: example.size,
      },
    ],
  })

  it('kangaroo + 4XL throws «not offered»', () => {
    expect(() => validateSeoPage(page({ fabric: 'kangaroo', size: '4XL' }), true)).toThrow(/not offered/)
  })

  it('kangaroo + 3XL passes, and putter + 4XL passes', () => {
    expect(() => validateSeoPage(page({ fabric: 'kangaroo', size: '3XL' }), true)).not.toThrow()
    expect(() => validateSeoPage(page({ fabric: 'putter', size: '4XL' }), true)).not.toThrow()
  })
})

describe('the sweatshirt SEO page copy', () => {
  const sweatshirt = () => getSeoPage('הדפסה-על-סווטשרטים')!

  it('says kangaroo goes up to 3XL in the metaDescription and in the intro', () => {
    expect(sweatshirt().metaDescription).toContain('קנגרו עד 3XL')
    expect(sweatshirt().heroText).toContain('קנגרו עד 3XL')
  })
})
