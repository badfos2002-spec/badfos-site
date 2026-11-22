import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within, act } from '@testing-library/react'
import type { Deal } from '@/lib/types'
import type { HeroSlide } from '@/components/home/HeroCarousel'

// TICKET-022 Addendum A: the home hero follows the deal marked hero.enabled.
// TICKET-025B: the deal no longer replaces the carousel — it joins it as slide 0
// (8000 ms) and the copy follows the active slide. Both copy states stay in the
// DOM, stacked in one grid cell, the inactive one an invisible aria-hidden
// sizer, so nothing moves on the swap. Without a heroDeal: today's hero.

vi.mock('@gsap/react', () => ({ useGSAP: () => {} }))
vi.mock('@/components/common/useTilt', () => ({ useTilt: () => ({ current: null }) }))
vi.mock('@/components/common/GoogleRatingBadge', () => ({ default: () => <span>rating</span> }))
// The carousel is the real one now, only wrapped in the `hero-carousel` testid
// the tests have always looked for, so slide 0 can be inspected.
vi.mock('@/components/home/HeroCarousel', async () => {
  const actual = await vi.importActual<typeof import('@/components/home/HeroCarousel')>('@/components/home/HeroCarousel')
  const RealCarousel = actual.default
  return {
    default: (props: { leadSlide?: HeroSlide | null; onChange?: (index: number) => void }) => (
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

describe('NewHeroSection with a hero deal', () => {
  it('defaults: deal title as h1, shortText, «מבצע» badge, CTA «לפרטי המבצע» → deal page, WhatsApp', () => {
    render(<NewHeroSection heroDeal={DEAL} />)
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
    render(<NewHeroSection heroDeal={DEAL} />)
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
    render(<NewHeroSection heroDeal={{ ...DEAL, imageSquare: undefined }} />)
    expect(slideImg()).toHaveAttribute('src', '/images/deals/m.jpg')
  })

  it('after the deal dwell the copy is today’s default and the CTA is /designer', () => {
    vi.useFakeTimers()
    render(<NewHeroSection heroDeal={DEAL} />)
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
    render(<NewHeroSection heroDeal={DEAL} />)
    toProductSlide()
    adv(5000)
    adv(500)
    expect(slideImg()).toHaveAttribute('src', PRODUCT_2)
    expect(activeTitle()).toHaveTextContent('הפכו את הרעיונות שלכם')
  })

  it('mobile: the actions row is there on every slide — two buttons on the deal, one on a product', () => {
    vi.useFakeTimers()
    render(<NewHeroSection heroDeal={DEAL} />)
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
    render(<NewHeroSection heroDeal={DEAL} />)
    adv(30000)
    expect(slideImg()).toHaveAttribute('src', '/images/deals/s.jpg')
    expect(activeTitle()).toHaveTextContent('מבצע חורף')
  })

  it('both copy states share one grid cell, so the swap moves nothing', () => {
    render(<NewHeroSection heroDeal={DEAL} />)
    const active = activeTitle().parentElement!
    const sizer = screen.getByText('הפכו את הרעיונות שלכם').parentElement!
    expect(active.parentElement).toBe(sizer.parentElement)
    expect(active.parentElement!.className).toContain('grid')
    for (const cell of [active, sizer]) {
      expect(cell.className).toContain('col-start-1')
      expect(cell.className).toContain('row-start-1')
      // The copy crossfade must use a theme duration: tailwindcss-animate
      // overrides duration/delay and drops arbitrary values, so `duration-[400ms]`
      // compiles to nothing at all and the swap would be instant (checked with
      // the tailwind CLI against this project's config). 500 ms = the slide fade.
      expect(cell.className).not.toMatch(/duration-\[/)
      expect(cell.className).toContain('duration-500')
    }
    expect(sizer).toHaveAttribute('aria-hidden', 'true')
    expect(sizer.className).toContain('invisible')
    expect(active).not.toHaveAttribute('aria-hidden')
    expect(active.className).toContain('opacity-100')
    // the CTA pair and the designer button share a cell too, so the chips and
    // the rating row below them never move
    const dealCta = screen.getAllByRole('link', { name: 'לפרטי המבצע' })[0].closest('[class*="col-start-1"]')!
    const designerCta = screen.getAllByText(/התחילו לעצב/)[0].closest('[class*="col-start-1"]')!
    expect(dealCta.parentElement).toBe(designerCta.parentElement)
  })

  it('the swap never remounts the copy, so the RevealText entrance plays once on mount', () => {
    // RevealText is mocked here, so this asserts the structural guarantee behind
    // it: both copy states stay mounted — not keyed by the slide, never
    // conditionally rendered — so React keeps the very same elements.
    vi.useFakeTimers()
    render(<NewHeroSection heroDeal={DEAL} />)
    const before = Array.from(document.querySelectorAll('h1'))
    expect(before).toHaveLength(2) // the deal title + the default title (the sizer)
    expect(before[0]).toHaveTextContent('מבצע חורף')
    toProductSlide()
    const after = Array.from(document.querySelectorAll('h1'))
    expect(after).toHaveLength(2)
    expect(after[0]).toBe(before[0])
    expect(after[1]).toBe(before[1])
  })

  it('the second title line keeps production’s desktop spacing', () => {
    render(<NewHeroSection heroDeal={DEAL} />)
    const title2 = screen.getByText('לבגדים מדהימים')
    expect(title2.className).toContain('-mt-3') // production's markup, untouched
    // In production `md:space-y-5` on the text wrapper outranks that -mt-3
    // (0,3,0 vs 0,1,0) so the desktop gap is the full 20 px. Inside a slot the
    // -mt-3 is nested and nothing overrides it, so the cancelling md:mt-3 must
    // sit on the state cell — on the slot it would be outranked in turn.
    const state = title2.parentElement!
    expect(state.className).toContain('col-start-1')
    expect(state.className).toContain('md:mt-3')
    expect(state.parentElement!.className).not.toContain('md:mt-3')
  })

  it('uses the hero overrides when set', () => {
    render(<NewHeroSection heroDeal={{ ...DEAL, hero: { enabled: true, title: 'כותרת הירו', text: 'טקסט הירו', ctaLabel: 'לפרטים' } }} />)
    expect(activeTitle()).toHaveTextContent('כותרת הירו')
    expect(screen.getByText('טקסט הירו')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'לפרטים' })[0]).toHaveAttribute('href', `/deals/${enc('מבצע-חורף')}`)
    expect(slideImg()).toHaveAttribute('alt', 'כותרת הירו')
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
})
