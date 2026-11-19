import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import { createFakeDb, FIXTURE_DEALS } from './helpers/fake-deals-db'

// TICKET-022: /deals (grid of live deals) and /deals/[slug] (detail with a
// sticky WhatsApp/call bar on mobile). Both read on the server via adminDb.

const h = vi.hoisted(() => ({
  fake: null as unknown as ReturnType<typeof import('./helpers/fake-deals-db').createFakeDb>,
}))

vi.mock('@/lib/firebase-admin', () => ({
  get adminDb() {
    return h.fake.db
  },
  adminAuth: {},
}))

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  usePathname: () => '/deals',
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/tracking', () => ({
  trackWhatsAppClick: vi.fn(),
  trackPhoneClick: vi.fn(),
}))

import DealsPage, { generateMetadata as listMetadata } from '@/app/deals/page'
import DealPage, { generateMetadata as detailMetadata } from '@/app/deals/[slug]/page'
import { trackWhatsAppClick } from '@/lib/tracking'

beforeEach(() => {
  h.fake = createFakeDb(FIXTURE_DEALS)
})
afterEach(() => cleanup())

const enc = (s: string) => encodeURIComponent(s)

describe('/deals list', () => {
  it('renders one card per live deal, in order, nothing expired or inactive', async () => {
    render(await DealsPage())
    expect(screen.getByRole('heading', { level: 1, name: 'מבצעים' })).toBeInTheDocument()
    const cards = screen.getAllByTestId('deal-card')
    expect(cards).toHaveLength(2)
    expect(within(cards[0]).getByText('כובעים לקבוצות')).toBeInTheDocument()
    expect(within(cards[1]).getByText('מבצע חורף')).toBeInTheDocument()
    expect(screen.queryByText('מבצע שנגמר')).not.toBeInTheDocument()
    expect(screen.queryByText('מבצע כבוי')).not.toBeInTheDocument()
  })

  it('WhatsApp link carries the encoded title; call link is tel:', async () => {
    render(await DealsPage())
    const card = screen.getAllByTestId('deal-card')[1]
    const wa = within(card).getByRole('link', { name: /וואטסאפ/ })
    expect(wa.getAttribute('href')).toContain('https://wa.me/972559885954?text=')
    expect(wa.getAttribute('href')).toContain(enc('«מבצע חורף»'))
    expect(within(card).getByRole('link', { name: /חיוג/ })).toHaveAttribute('href', 'tel:+972559885954')
    fireEvent.click(wa)
    expect(trackWhatsAppClick).toHaveBeenCalledWith('deal')
  })

  it('shows the order button and coupon only on the deal that has them', async () => {
    render(await DealsPage())
    const [caps, winter] = screen.getAllByTestId('deal-card')
    expect(within(caps).queryByRole('link', { name: /להזמנ/ })).not.toBeInTheDocument()
    expect(within(caps).queryByText(/קוד קופון/)).not.toBeInTheDocument()
    expect(within(winter).getByRole('link', { name: 'להזמנת סווטשרט' })).toHaveAttribute('href', '/designer/sweatshirt')
    expect(within(winter).getByText(/קוד קופון/)).toBeInTheDocument()
    expect(within(winter).getByText('WINTER20')).toBeInTheDocument()
    expect(within(winter).getByRole('button', { name: /העתק/ })).toBeInTheDocument()
  })

  it('shows the end date chip and links the title to the detail page', async () => {
    render(await DealsPage())
    const winter = screen.getAllByTestId('deal-card')[1]
    expect(within(winter).getByText('עד 31.12.2099')).toBeInTheDocument()
    expect(within(winter).getByRole('link', { name: 'מבצע חורף' })).toHaveAttribute('href', `/deals/${enc('מבצע-חורף')}`)
  })

  it('uses a <picture> with the desktop source and the mobile img', async () => {
    const { container } = render(await DealsPage())
    const winter = screen.getAllByTestId('deal-card')[1]
    const source = winter.querySelector('picture source')
    expect(source).toHaveAttribute('srcset', '/images/deals/d.jpg')
    expect(source).toHaveAttribute('media', '(min-width: 768px)')
    expect(winter.querySelector('picture img')).toHaveAttribute('src', '/images/deals/m.jpg')
    expect(container).toBeTruthy()
  })

  it('empty state when there are no live deals', async () => {
    h.fake = createFakeDb({ expired: FIXTURE_DEALS.expired })
    render(await DealsPage())
    expect(screen.getByText('אין מבצעים פעילים כרגע')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /חבילות/ })).toHaveAttribute('href', '/packages')
    expect(screen.queryAllByTestId('deal-card')).toHaveLength(0)
  })

  it('metadata title «מבצעים | בדפוס»', async () => {
    const md = await listMetadata()
    expect(md.title).toBe('מבצעים | בדפוס')
  })
})

describe('/deals/[slug] detail', () => {
  it('renders the deal with the sticky contact bar and a link back', async () => {
    render(await DealPage({ params: { slug: enc('מבצע-חורף') } }))
    expect(screen.getByRole('heading', { level: 1, name: 'מבצע חורף' })).toBeInTheDocument()
    expect(screen.getAllByText('20% הנחה').length).toBeGreaterThan(0)
    const bar = screen.getByTestId('deal-sticky-bar')
    expect(within(bar).getByRole('link', { name: /וואטסאפ/ }).getAttribute('href')).toContain(enc('«מבצע חורף»'))
    expect(within(bar).getByRole('link', { name: /חיוג/ })).toHaveAttribute('href', 'tel:+972559885954')
    expect(screen.getByRole('link', { name: /לכל המבצעים/ })).toHaveAttribute('href', '/deals')
    expect(screen.getByRole('link', { name: 'להזמנת סווטשרט' })).toHaveAttribute('href', '/designer/sweatshirt')
  })

  it('generateMetadata uses the desktop image, the title and the short text', async () => {
    const md = await detailMetadata({ params: { slug: enc('מבצע-חורף') } })
    expect(md.title).toBe('מבצע חורף | מבצע בבדפוס')
    expect(md.description).toBe('סווטשרטים במחיר מיוחד לכל החורף')
    const images = md.openGraph?.images as { url: string }[]
    expect(images[0].url).toBe('https://badfos.co.il/images/deals/d.jpg')
  })

  it('generateMetadata falls back to the mobile image', async () => {
    const md = await detailMetadata({ params: { slug: enc('כובעים') } })
    const images = md.openGraph?.images as { url: string }[]
    expect(images[0].url).toBe('https://badfos.co.il/images/deals/cap.jpg')
  })

  it('notFound for an expired, inactive or unknown deal', async () => {
    await expect(DealPage({ params: { slug: enc('נגמר') } })).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(DealPage({ params: { slug: enc('כבוי') } })).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(DealPage({ params: { slug: 'nope' } })).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
