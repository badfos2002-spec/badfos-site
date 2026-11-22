import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within, act } from '@testing-library/react'
import type { Deal } from '@/lib/types'
import type { HeroSlide } from '@/components/home/HeroCarousel'

// TICKET-022 Addendum A: the home hero follows the deal marked hero.enabled.
// TICKET-025B: the deal no longer replaces the carousel — it joins it as slide 0
// (8000 ms) and the copy follows the active slide. Both copy states stay in the
// DOM, stacked in one grid cell, the inactive one an invisible aria-hidden
// sizer, so nothing moves on the swap. Without a heroDeal: today's hero.
// TICKET-027: the reservation moved from per element to per block — two cells
// (hero-copy-above / hero-copy-below), each holding both states as one block,
// so the leftover height is split above/below the shorter block and never
// between its lines.
// TICKET-029: `heroDeal` becomes `heroDeals: Deal[]` — every live deal marked
// «בהירו» opens the carousel, and the copy follows the slide per deal: deal k is
// the active state while slide === k, the default copy once the deal slides are
// past. Every stacked cell holds one state per deal plus the default state LAST.

vi.mock('@gsap/react', () => ({ useGSAP: () => {} }))
vi.mock('@/components/common/useTilt', () => ({ useTilt: () => ({ current: null }) }))
vi.mock('@/components/common/GoogleRatingBadge', () => ({ default: () => <span>rating</span> }))
// The carousel is the real one now, only wrapped in the `hero-carousel` testid
// the tests have always looked for, so slide 0 can be inspected.
vi.mock('@/components/home/HeroCarousel', async () => {
  const actual = await vi.importActual<typeof import('@/components/home/HeroCarousel')>('@/components/home/HeroCarousel')
  const RealCarousel = actual.default
  return {
    default: (props: { leadSlides?: HeroSlide[]; onChange?: (index: number) => void }) => (
      <div data-testid="hero-carousel"><RealCarousel {...props} /></div>
    ),
  }
})
// next/image is stubbed so the product slides render a plain <img> in jsdom.
vi.mock('next/image', () => ({
  default: ({ fill: _fill, priority: _priority, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...(props as Record<string, string>)} />
  ),
}))
vi.mock('@/components/home/ProductRiver', () => ({ ProductRiver: () => <div data-testid="product-river" /> }))
vi.mock('@/components/common/RevealText', () => ({
  default: ({ text, as: Tag = 'h2', className }: { text: string; as?: any; className?: string }) => <Tag className={className}>{text}</Tag>,
}))
vi.mock('@/lib/db', () => ({ getDocument: async () => null }))
vi.mock('@/lib/tracking', () => ({ trackWhatsAppClick: vi.fn(), trackPhoneClick: vi.fn() }))

import NewHeroSection from '@/components/home/NewHeroSection'

let reducedMotion = false

beforeEach(() => {
  reducedMotion = false
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
  })) as unknown as typeof window.matchMedia
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const DEAL: Deal = {
  id: 'a',
  slug: 'מבצע-חורף',
  title: 'מבצע חורף',
  shortText: 'סווטשרטים במחיר מיוחד',
  priceText: '20% הנחה',
  imageSquare: '/images/deals/s.jpg',
  imageMobile: '/images/deals/m.jpg',
  imageDesktop: '/images/deals/d.jpg',
  isActive: true,
  sortOrder: 0,
  hero: { enabled: true },
  createdAt: '',
  updatedAt: '',
}
/** TICKET-029: a second deal marked «בהירו» — its own copy, price, image and slug. */
const DEAL_B: Deal = {
  id: 'b',
  slug: 'מבצע-קבוצות',
  title: 'מבצע קבוצות',
  shortText: '10 חולצות ו-10 קפוצ׳ונים לכל הקבוצה',
  priceText: '₪1500',
  imageSquare: '/images/deals/b-s.jpg',
  isActive: true,
  sortOrder: 1,
  hero: { enabled: true },
  createdAt: '',
  updatedAt: '',
}
const enc = encodeURIComponent

const PRODUCT_1 = '/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.webp'
const PRODUCT_2 = '/assets/64ab08d41_IMG_3252.webp'

/** Fake-timer step inside act(); one step per state change (the dwell effect
    re-registers its timer between act() calls, not inside one). */
const adv = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
/** The deal's 8000 ms dwell + the 500 ms crossfade → the first product slide. */
const toProductSlide = () => { adv(8000); adv(500) }
const slideImg = () => screen.getByTestId('hero-carousel').querySelector('img')
/** Only the active copy state is in the a11y tree — the sizer is aria-hidden. */
const activeTitle = () => screen.getByRole('heading', { level: 1 })
/** TICKET-027: the two block-level copy cells. Scoped on purpose — the desktop
    CTA cell holds two states as well, so a document-wide count would be wrong. */
const copyCells = () => [screen.getByTestId('hero-copy-above'), screen.getByTestId('hero-copy-below')]
/** The two state blocks of a copy cell: deal state first, default state second. */
const blocksIn = (cell: HTMLElement) => Array.from(cell.children) as HTMLElement[]
/** Every h1 that is NOT inside an aria-hidden sizer — there must be exactly one. */
const visibleTitles = () =>
  Array.from(document.querySelectorAll('h1')).filter((h) => !h.closest('[aria-hidden="true"]'))
const hrefsIn = (el: HTMLElement) => Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'))

describe('NewHeroSection with a hero deal', () => {
  it('defaults: deal title as h1, shortText, «מבצע» badge, CTA «לפרטי המבצע» → deal page, WhatsApp', () => {
    render(<NewHeroSection heroDeals={[DEAL]} />)
    expect(activeTitle()).toHaveTextContent('מבצע חורף')
    expect(screen.getByText('סווטשרטים במחיר מיוחד')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('20% הנחה') // the priceText line (§B.7)
    expect(screen.getByTestId('hero-deal-badge')).toHaveTextContent('מבצע')
    const ctas = screen.getAllByRole('link', { name: 'לפרטי המבצע' })
    expect(ctas.length).toBeGreaterThan(0)
    ctas.forEach((a) => expect(a).toHaveAttribute('href', `/deals/${enc('מבצע-חורף')}`))
    const wa = screen.getAllByRole('link', { name: /וואטסאפ/ })[0]
    expect(wa.getAttribute('href')).toContain(enc('«מבצע חורף»'))
    // the carousel is back (TICKET-025B) and the default copy is only the sizer
    expect(screen.getByTestId('hero-carousel')).toBeInTheDocument()
    const sizer = screen.getByText('הפכו את הרעיונות שלכם').closest('[aria-hidden="true"]')
    expect(sizer).toBeTruthy()
    expect(sizer!.className).toContain('invisible')
    expect(screen.queryByRole('link', { name: /התחילו לעצב/ })).not.toBeInTheDocument()
    expect(screen.getByTestId('product-river')).toBeInTheDocument()
  })

  it('slide 0 is the deal: the square image as a plain eager <img> linking to the deal', () => {
    render(<NewHeroSection heroDeals={[DEAL]} />)
    const img = slideImg()!
    expect(img).toHaveAttribute('src', '/images/deals/s.jpg') // the square slot, not the 4:5 one
    expect(img).toHaveAttribute('alt', 'מבצע חורף')
    expect(img).toHaveAttribute('loading', 'eager')
    expect(img).toHaveAttribute('fetchpriority', 'high')
    expect(img.closest('a')).toHaveAttribute('href', `/deals/${enc('מבצע-חורף')}`)
    // the fixed deal box is gone — the carousel owns the image now
    expect(screen.queryByTestId('hero-deal-image')).not.toBeInTheDocument()
    // one dot per slide: the deal + the 5 product photos
    expect(within(screen.getByTestId('hero-carousel')).getAllByRole('button')).toHaveLength(6)
  })

  it('falls back to the nearest shape when the deal has no square image', () => {
    render(<NewHeroSection heroDeals={[{ ...DEAL, imageSquare: undefined }]} />)
    expect(slideImg()).toHaveAttribute('src', '/images/deals/m.jpg')
  })

  it('after the deal dwell the copy is today’s default and the CTA is /designer', () => {
    vi.useFakeTimers()
    render(<NewHeroSection heroDeals={[DEAL]} />)
    expect(activeTitle()).toHaveTextContent('מבצע חורף')
    toProductSlide()
    expect(slideImg()).toHaveAttribute('src', PRODUCT_1)
    expect(activeTitle()).toHaveTextContent('הפכו את הרעיונות שלכם')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('דיוק • איכות • מיתוג')
    const ctas = screen.getAllByRole('link', { name: /התחילו לעצב/ })
    expect(ctas.length).toBeGreaterThan(0)
    ctas.forEach((a) => expect(a).toHaveAttribute('href', '/designer'))
    // the deal copy is now the sizer: out of the a11y tree, still holding its space
    expect(screen.queryByRole('link', { name: 'לפרטי המבצע' })).not.toBeInTheDocument()
    expect(screen.getByText('סווטשרטים במחיר מיוחד').closest('[aria-hidden="true"]')).toBeTruthy()
  })

  it('after a product dwell the next product photo shows and the copy stays the default', () => {
    vi.useFakeTimers()
    render(<NewHeroSection heroDeals={[DEAL]} />)
    toProductSlide()
    adv(5000)
    adv(500)
    expect(slideImg()).toHaveAttribute('src', PRODUCT_2)
    expect(activeTitle()).toHaveTextContent('הפכו את הרעיונות שלכם')
  })

  it('mobile: the actions row is there on every slide — two buttons on the deal, one on a product', () => {
    vi.useFakeTimers()
    render(<NewHeroSection heroDeals={[DEAL]} />)
    const row = screen.getByTestId('hero-deal-mobile-actions')
    expect(row.className).toContain('order-5')
    expect(row.className).toContain('md:hidden')
    const dealLinks = within(row).getAllByRole('link')
    expect(dealLinks).toHaveLength(2)
    expect(dealLinks[0]).toHaveTextContent('לפרטי המבצע')
    expect(dealLinks[0]).toHaveAttribute('href', `/deals/${enc('מבצע-חורף')}`)
    expect(dealLinks[1]).toHaveTextContent('וואטסאפ')
    dealLinks.forEach((a) => {
      expect(a.className).toContain('min-h-[48px]')
      expect(a.className).toContain('flex-1')
    })
    // the description still follows the row, and no absolute button overlaps the image
    expect(screen.getByText('סווטשרטים במחיר מיוחד').closest('.order-6')).toBeTruthy()
    expect(screen.getByTestId('hero-carousel').closest('.order-5')!.querySelector('.absolute.bottom-0')).toBeNull()

    toProductSlide()
    const productLinks = within(row).getAllByRole('link')
    expect(productLinks).toHaveLength(1)
    expect(productLinks[0]).toHaveTextContent('התחילו לעצב')
    expect(productLinks[0]).toHaveAttribute('href', '/designer')
    expect(productLinks[0].className).toContain('min-h-[48px]')
    expect(productLinks[0].className).toContain('w-full')
  })

  it('prefers-reduced-motion: the hero rests on the deal slide with the deal copy', () => {
    reducedMotion = true
    vi.useFakeTimers()
    render(<NewHeroSection heroDeals={[DEAL]} />)
    adv(30000)
    expect(slideImg()).toHaveAttribute('src', '/images/deals/s.jpg')
    expect(activeTitle()).toHaveTextContent('מבצע חורף')
  })

  it('both copy states share one grid cell per block, so the swap moves nothing', () => {
    render(<NewHeroSection heroDeals={[DEAL]} />)
    // The h1 and the default title now live inside their state block, and both
    // blocks share the «above» cell — one cell per block, not one per element.
    const dealBlock = activeTitle().parentElement!
    const defaultBlock = screen.getByText('הפכו את הרעיונות שלכם').parentElement!
    expect(dealBlock.parentElement).toBe(defaultBlock.parentElement)
    expect(dealBlock.parentElement).toBe(screen.getByTestId('hero-copy-above'))
    for (const cell of copyCells()) {
      expect(cell.className).toContain('grid')
      for (const block of blocksIn(cell)) {
        expect(block.className).toContain('col-start-1')
        expect(block.className).toContain('row-start-1')
        // The copy crossfade must use a theme duration: tailwindcss-animate
        // overrides duration/delay and drops arbitrary values, so `duration-[400ms]`
        // compiles to nothing at all and the swap would be instant (checked with
        // the tailwind CLI against this project's config). 500 ms = the slide fade.
        expect(block.className).not.toMatch(/duration-\[/)
        expect(block.className).toContain('duration-500')
      }
      const [onDeal, onProduct] = blocksIn(cell)
      expect(onDeal).not.toHaveAttribute('aria-hidden')
      expect(onDeal.className).toContain('opacity-100')
      expect(onProduct).toHaveAttribute('aria-hidden', 'true')
      expect(onProduct.className).toContain('invisible')
    }
    // the CTA pair and the designer button share a cell too, so the chips and
    // the rating row below them never move
    const dealCta = screen.getAllByRole('link', { name: 'לפרטי המבצע' })[0].closest('[class*="col-start-1"]')!
    const designerCta = screen.getAllByText(/התחילו לעצב/)[0].closest('[class*="col-start-1"]')!
    expect(dealCta.parentElement).toBe(designerCta.parentElement)
  })

  it('exactly two copy cells — «above» (order-1) and «below» (order-6) the carousel — with two state blocks each', () => {
    render(<NewHeroSection heroDeals={[DEAL]} />)
    // The five per-element slots are replaced by two block-level cells.
    expect(document.querySelectorAll('[data-testid^="hero-copy-"]')).toHaveLength(2)
    const [above, below] = copyCells()
    // The mobile ladder: above(1) → carousel + actions(5) → below(6) → rating(7).
    // md:order-none is load-bearing — order-* is not mobile-scoped, so without it
    // the «below» cell would sort after the desktop CTA/chips/rating.
    expect(above.className).toContain('order-1')
    expect(above.className).toContain('md:order-none')
    expect(below.className).toContain('order-6')
    expect(below.className).toContain('md:order-none')
    expect(screen.getByTestId('hero-carousel').closest('.order-5')).toBeTruthy()
    // scoped per cell: the desktop CTA cell holds two states too
    expect(blocksIn(above)).toHaveLength(2)
    expect(blocksIn(below)).toHaveLength(2)
  })

  it('inside a state block the lines are adjacent, and no block is an empty reservation', () => {
    render(<NewHeroSection heroDeals={[DEAL]} />)
    // The deal state: badge → title → price, nothing reserved in between.
    expect(activeTitle().nextElementSibling).toHaveTextContent('20% הנחה')
    // The default state: title2 directly under title1 (its -mt-3 can bite again).
    const title1 = screen.getByText('הפכו את הרעיונות שלכם')
    expect(title1.nextElementSibling).toHaveTextContent('לבגדים מדהימים')
    // No `<CopyState>{null}</CopyState>` anywhere: every block carries copy.
    for (const cell of copyCells()) {
      for (const block of blocksIn(cell)) {
        expect(block.children.length).toBeGreaterThan(0)
      }
    }
  })

  it('the swap never remounts the copy, so the RevealText entrance plays once on mount', () => {
    // RevealText is mocked here, so this asserts the structural guarantee behind
    // it: both copy states stay mounted — not keyed by the slide, never
    // conditionally rendered — so React keeps the very same elements.
    vi.useFakeTimers()
    render(<NewHeroSection heroDeals={[DEAL]} />)
    const before = Array.from(document.querySelectorAll('h1'))
    expect(before).toHaveLength(2) // the deal title + the default title (the sizer)
    expect(before[0]).toHaveTextContent('מבצע חורף')
    toProductSlide()
    const after = Array.from(document.querySelectorAll('h1'))
    expect(after).toHaveLength(2)
    expect(after[0]).toBe(before[0])
    expect(after[1]).toBe(before[1])
  })

  it('the copy rhythm is carried by the state blocks, not by per-element cells', () => {
    render(<NewHeroSection heroDeals={[DEAL]} />)
    // Every state block reproduces the no-deal hero's rhythm: 16 px on mobile,
    // 20 px on desktop, between each of its own lines.
    for (const cell of copyCells()) {
      for (const block of blocksIn(cell)) {
        for (const token of ['flex', 'flex-col', 'items-center', 'gap-4', 'md:gap-5']) {
          expect(block.classList.contains(token)).toBe(true)
        }
      }
    }
    // title2 pulls back under title1 on mobile (16 − 12 = 4 px) and lets the
    // block's md:gap-5 stand on desktop (20 px). Nested in a block the -mt-3 is
    // no longer outranked by the wrapper's md:space-y-5, so it is cancelled on
    // the element itself — the one place nothing outranks it.
    const title2 = screen.getByText('לבגדים מדהימים')
    expect(title2.classList.contains('-mt-3')).toBe(true)
    expect(title2.classList.contains('md:mt-0')).toBe(true)
    // and the old cancelling md:mt-3 on a state cell is gone with the slots
    for (const cell of copyCells()) {
      expect(cell.classList.contains('md:mt-3')).toBe(false)
      for (const block of blocksIn(cell)) expect(block.classList.contains('md:mt-3')).toBe(false)
    }
  })

  it('uses the hero overrides when set', () => {
    render(<NewHeroSection heroDeals={[{ ...DEAL, hero: { enabled: true, title: 'כותרת הירו', text: 'טקסט הירו', ctaLabel: 'לפרטים' } }]} />)
    expect(activeTitle()).toHaveTextContent('כותרת הירו')
    expect(screen.getByText('טקסט הירו')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'לפרטים' })[0]).toHaveAttribute('href', `/deals/${enc('מבצע-חורף')}`)
    expect(slideImg()).toHaveAttribute('alt', 'כותרת הירו')
  })
})

// TICKET-029 (user: «שים לב אם יש שני מבצעים אני רוצה שגם הם יופיעו ביחד
// בקרוסלת ההירו»): deal k owns the copy while the carousel shows slide k.
describe('NewHeroSection with two hero deals', () => {
  const BOTH = [DEAL, DEAL_B]
  const pathA = `/deals/${enc('מבצע-חורף')}`
  const pathB = `/deals/${enc('מבצע-קבוצות')}`
  /** One deal slide forward: its 8000 ms dwell + the 500 ms crossfade. */
  const step = () => { adv(8000); adv(500) }

  it('at t0 the hero is the first deal: its badge, h1, price, CTA hrefs and WhatsApp', () => {
    render(<NewHeroSection heroDeals={BOTH} />)
    expect(slideImg()).toHaveAttribute('src', '/images/deals/s.jpg')
    expect(activeTitle()).toHaveTextContent('מבצע חורף')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('20% הנחה')
    expect(screen.getAllByTestId('hero-deal-badge')[0]).toHaveTextContent('מבצע')
    const ctas = screen.getAllByRole('link', { name: 'לפרטי המבצע' })
    expect(ctas.length).toBeGreaterThan(0)
    ctas.forEach((a) => expect(a).toHaveAttribute('href', pathA))
    screen.getAllByRole('link', { name: /וואטסאפ/ }).forEach((a) => {
      expect(a.getAttribute('href')).toContain(enc('«מבצע חורף»'))
    })
    // deal B's copy is mounted but only as an invisible sizer
    const sizer = screen.getByText('10 חולצות ו-10 קפוצ׳ונים לכל הקבוצה').closest('[aria-hidden="true"]')
    expect(sizer).toBeTruthy()
    expect(sizer!.className).toContain('invisible')
    // one badge per deal — the multi-deal tests use getAllByTestId
    expect(screen.getAllByTestId('hero-deal-badge')).toHaveLength(2)
  })

  it('the copy follows the slide: deal A → deal B → today’s default copy', () => {
    vi.useFakeTimers()
    render(<NewHeroSection heroDeals={BOTH} />)
    expect(activeTitle()).toHaveTextContent('מבצע חורף')

    step() // slide 1 — the second deal, not a product photo
    expect(slideImg()).toHaveAttribute('src', '/images/deals/b-s.jpg')
    expect(activeTitle()).toHaveTextContent('מבצע קבוצות')
    expect(screen.getByText('10 חולצות ו-10 קפוצ׳ונים לכל הקבוצה')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('₪1500')
    const ctasB = screen.getAllByRole('link', { name: 'לפרטי המבצע' })
    expect(ctasB.length).toBeGreaterThan(0)
    ctasB.forEach((a) => expect(a).toHaveAttribute('href', pathB))
    screen.getAllByRole('link', { name: /וואטסאפ/ }).forEach((a) => {
      expect(a.getAttribute('href')).toContain(enc('«מבצע קבוצות»'))
    })
    // deal A is the sizer now
    expect(screen.getByText('סווטשרטים במחיר מיוחד').closest('[aria-hidden="true"]')).toBeTruthy()

    step() // slide 2 — the first product photo, so the default copy takes over
    expect(slideImg()).toHaveAttribute('src', PRODUCT_1)
    expect(activeTitle()).toHaveTextContent('הפכו את הרעיונות שלכם')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('דיוק • איכות • מיתוג')
    const designer = screen.getAllByRole('link', { name: /התחילו לעצב/ })
    expect(designer.length).toBeGreaterThan(0)
    designer.forEach((a) => expect(a).toHaveAttribute('href', '/designer'))
    expect(screen.queryByRole('link', { name: 'לפרטי המבצע' })).not.toBeInTheDocument()
  })

  it('exactly one visible h1 at every step — the other two are aria-hidden sizers', () => {
    vi.useFakeTimers()
    render(<NewHeroSection heroDeals={BOTH} />)
    expect(document.querySelectorAll('h1')).toHaveLength(3) // deal A + deal B + the default
    expect(visibleTitles().map((h) => h.textContent)).toEqual(['מבצע חורף'])
    step()
    expect(visibleTitles().map((h) => h.textContent)).toEqual(['מבצע קבוצות'])
    step()
    expect(visibleTitles().map((h) => h.textContent)).toEqual(['הפכו את הרעיונות שלכם'])
  })

  it('every stacked cell holds one state per deal in deals order, with the default LAST', () => {
    render(<NewHeroSection heroDeals={BOTH} />)
    const [above, below] = copyCells()
    const desktopCta = screen.getAllByRole('link', { name: 'לפרטי המבצע' })[0]
      .closest('[class*="col-start-1"]')!.parentElement as HTMLElement
    const mobile = screen.getByTestId('hero-deal-mobile-actions')

    // The order is load-bearing: TICKET-027's block reservation keeps the cell as
    // tall as the tallest state, and the existing one-deal tests read the blocks
    // positionally (deal first, default second).
    for (const [cell, texts] of [
      [above, ['מבצע חורף', 'מבצע קבוצות', 'הפכו את הרעיונות שלכם']],
      [below, ['סווטשרטים במחיר מיוחד', '10 חולצות ו-10 קפוצ׳ונים לכל הקבוצה', 'חולצות, קפוצ׳ונים, כובעים']],
    ] as [HTMLElement, string[]][]) {
      const blocks = blocksIn(cell)
      expect(blocks).toHaveLength(3)
      blocks.forEach((b, i) => expect(b).toHaveTextContent(texts[i]))
    }
    // the CTA cells are told apart by their hrefs, not their label
    for (const cell of [desktopCta, mobile]) {
      const blocks = blocksIn(cell)
      expect(blocks).toHaveLength(3)
      expect(hrefsIn(blocks[0])[0]).toBe(pathA)
      expect(hrefsIn(blocks[0])[1]).toContain(enc('«מבצע חורף»'))
      expect(hrefsIn(blocks[1])[0]).toBe(pathB)
      expect(hrefsIn(blocks[1])[1]).toContain(enc('«מבצע קבוצות»'))
      expect(hrefsIn(blocks[2])).toEqual(['/designer'])
    }
    // all three states stay mounted, only deal A's is visible at mount (SSR = slide 0)
    for (const cell of [above, below, desktopCta, mobile]) {
      const [a, b, d] = blocksIn(cell)
      expect(a).not.toHaveAttribute('aria-hidden')
      expect(a.className).toContain('opacity-100')
      for (const sizer of [b, d]) {
        expect(sizer).toHaveAttribute('aria-hidden', 'true')
        expect(sizer.className).toContain('invisible')
        expect(sizer.className).toContain('duration-500')
        expect(sizer.className).not.toMatch(/duration-\[/)
      }
    }
  })

  it('the mobile actions row shows each deal’s pair, then the single designer button', () => {
    vi.useFakeTimers()
    render(<NewHeroSection heroDeals={BOTH} />)
    const row = screen.getByTestId('hero-deal-mobile-actions')

    let links = within(row).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveTextContent('לפרטי המבצע')
    expect(links[0]).toHaveAttribute('href', pathA)
    expect(links[1]).toHaveTextContent('וואטסאפ')
    expect(links[1].getAttribute('href')).toContain(enc('«מבצע חורף»'))

    step()
    links = within(row).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', pathB)
    expect(links[1].getAttribute('href')).toContain(enc('«מבצע קבוצות»'))

    step()
    links = within(row).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveTextContent('התחילו לעצב')
    expect(links[0]).toHaveAttribute('href', '/designer')
    expect(links[0].className).toContain('w-full')
  })

  it('prefers-reduced-motion: the hero rests on the first deal with its copy', () => {
    reducedMotion = true
    vi.useFakeTimers()
    render(<NewHeroSection heroDeals={BOTH} />)
    adv(30000)
    expect(slideImg()).toHaveAttribute('src', '/images/deals/s.jpg')
    expect(activeTitle()).toHaveTextContent('מבצע חורף')
    expect(visibleTitles()).toHaveLength(1)
  })

  it('one dot per slide: a dot for every deal plus the 5 product photos', () => {
    render(<NewHeroSection heroDeals={BOTH} />)
    expect(within(screen.getByTestId('hero-carousel')).getAllByRole('button')).toHaveLength(7)
  })
})

describe('NewHeroSection without a hero deal', () => {
  it('renders today’s hero: default heading, carousel, designer CTA', () => {
    render(<NewHeroSection />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('הפכו את הרעיונות שלכם')
    expect(screen.getByTestId('hero-carousel')).toBeInTheDocument()
    expect(screen.queryByTestId('hero-deal-badge')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /התחילו לעצב/ })[0]).toHaveAttribute('href', '/designer')
    expect(within(document.body).queryByTestId('hero-deal-image')).not.toBeInTheDocument()
  })

  // TICKET-029 gate: no live deal is marked «בהירו» → the page passes an empty
  // array, which must be the very same hero as passing nothing at all.
  it('heroDeals={[]} renders exactly the same markup as no props at all', () => {
    const empty = render(<NewHeroSection heroDeals={[]} />).container.innerHTML
    cleanup()
    const none = render(<NewHeroSection />).container.innerHTML
    expect(empty).toBe(none)
    expect(screen.queryByTestId('hero-deal-mobile-actions')).not.toBeInTheDocument()
    expect(screen.queryByTestId('hero-copy-above')).not.toBeInTheDocument()
  })
})
