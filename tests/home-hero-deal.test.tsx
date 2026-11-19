import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { Deal } from '@/lib/types'

// TICKET-022 Addendum A: the home hero follows the deal marked hero.enabled.
// With a heroDeal: deal title/text, «מבצע» badge, CTA → /deals/{slug}, WhatsApp,
// and the deal <picture> instead of the carousel. Without: today's hero.

vi.mock('@gsap/react', () => ({ useGSAP: () => {} }))
vi.mock('@/components/common/useTilt', () => ({ useTilt: () => ({ current: null }) }))
vi.mock('@/components/common/GoogleRatingBadge', () => ({ default: () => <span>rating</span> }))
vi.mock('@/components/home/HeroCarousel', () => ({ default: () => <div data-testid="hero-carousel" /> }))
vi.mock('@/components/home/ProductRiver', () => ({ ProductRiver: () => <div data-testid="product-river" /> }))
vi.mock('@/components/common/RevealText', () => ({
  default: ({ text, as: Tag = 'h2', className }: { text: string; as?: any; className?: string }) => <Tag className={className}>{text}</Tag>,
}))
vi.mock('@/lib/db', () => ({ getDocument: async () => null }))
vi.mock('@/lib/tracking', () => ({ trackWhatsAppClick: vi.fn(), trackPhoneClick: vi.fn() }))

import NewHeroSection from '@/components/home/NewHeroSection'

afterEach(() => cleanup())

const DEAL: Deal = {
  id: 'a',
  slug: 'מבצע-חורף',
  title: 'מבצע חורף',
  shortText: 'סווטשרטים במחיר מיוחד',
  priceText: '20% הנחה',
  imageMobile: '/images/deals/m.jpg',
  imageDesktop: '/images/deals/d.jpg',
  isActive: true,
  sortOrder: 0,
  hero: { enabled: true },
  createdAt: '',
  updatedAt: '',
}
const enc = encodeURIComponent

describe('NewHeroSection with a hero deal', () => {
  it('defaults: deal title as h1, shortText, «מבצע» badge, CTA «לפרטי המבצע» → deal page, WhatsApp', () => {
    render(<NewHeroSection heroDeal={DEAL} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('מבצע חורף')
    expect(screen.getByText('סווטשרטים במחיר מיוחד')).toBeInTheDocument()
    expect(screen.getByTestId('hero-deal-badge')).toHaveTextContent('מבצע')
    const ctas = screen.getAllByRole('link', { name: 'לפרטי המבצע' })
    expect(ctas.length).toBeGreaterThan(0)
    ctas.forEach((a) => expect(a).toHaveAttribute('href', `/deals/${enc('מבצע-חורף')}`))
    const wa = screen.getAllByRole('link', { name: /וואטסאפ/ })[0]
    expect(wa.getAttribute('href')).toContain(enc('«מבצע חורף»'))
    expect(screen.queryByText('הפכו את הרעיונות שלכם')).not.toBeInTheDocument()
    expect(screen.queryByTestId('hero-carousel')).not.toBeInTheDocument()
    expect(screen.getByTestId('product-river')).toBeInTheDocument()
  })

  it('uses the hero overrides when set', () => {
    render(<NewHeroSection heroDeal={{ ...DEAL, hero: { enabled: true, title: 'כותרת הירו', text: 'טקסט הירו', ctaLabel: 'לפרטים' } }} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('כותרת הירו')
    expect(screen.getByText('טקסט הירו')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'לפרטים' })[0]).toHaveAttribute('href', `/deals/${enc('מבצע-חורף')}`)
  })

  it('shows the deal image as a <picture> with mobile + desktop sources, linking to the deal', () => {
    render(<NewHeroSection heroDeal={DEAL} />)
    const box = screen.getByTestId('hero-deal-image')
    expect(box.closest('a') ?? box.querySelector('a')).toHaveAttribute('href', `/deals/${enc('מבצע-חורף')}`)
    expect(box.querySelector('picture source')).toHaveAttribute('srcset', '/images/deals/d.jpg')
    expect(box.querySelector('picture img')).toHaveAttribute('src', '/images/deals/m.jpg')
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
