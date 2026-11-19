import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import type { Deal } from '@/lib/types'

// TICKET-022: the home deals section shows up to 3 live deals from /api/deals
// + «לכל המבצעים»; hidden when there are none; the old settings/deals banner is gone.

const getDoc = vi.fn()
vi.mock('firebase/firestore', () => ({ getDoc, doc: vi.fn() }))
vi.mock('@/lib/firebase', () => ({ db: {} }))

import NewDealsSection from '@/components/home/NewDealsSection'

function d(i: number): Deal {
  return {
    id: `d${i}`,
    slug: `deal-${i}`,
    title: `מבצע ${i}`,
    shortText: 'טקסט',
    priceText: `₪${30 + i}`,
    imageMobile: `/images/deals/${i}.jpg`,
    isActive: true,
    sortOrder: i,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }
}

let payload: { deals: Deal[] } = { deals: [] }
const fetchSpy = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }))

beforeEach(() => {
  fetchSpy.mockClear()
  getDoc.mockClear()
  vi.stubGlobal('fetch', fetchSpy)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('NewDealsSection', () => {
  it('shows at most 3 deals with title + price and a link to /deals', async () => {
    payload = { deals: [d(1), d(2), d(3), d(4)] }
    render(<NewDealsSection />)
    const cards = await screen.findAllByTestId('home-deal-card')
    expect(cards).toHaveLength(3)
    expect(within(cards[0]).getByText('מבצע 1')).toBeInTheDocument()
    expect(within(cards[0]).getByText('₪31')).toBeInTheDocument()
    expect(cards[0].closest('a') ?? cards[0].querySelector('a')).toHaveAttribute('href', '/deals/deal-1')
    expect(screen.queryByText('מבצע 4')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /לכל המבצעים/ })).toHaveAttribute('href', '/deals')
    expect(fetchSpy).toHaveBeenCalledWith('/api/deals')
  })

  it('renders nothing when there are no live deals', async () => {
    payload = { deals: [] }
    const { container } = render(<NewDealsSection />)
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0))
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the API fails', async () => {
    fetchSpy.mockImplementationOnce(async () => new Response('x', { status: 500 }))
    const { container } = render(<NewDealsSection />)
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0))
    expect(container).toBeEmptyDOMElement()
  })

  it('never reads the old settings/deals banner doc', async () => {
    payload = { deals: [d(1)] }
    render(<NewDealsSection />)
    await screen.findAllByTestId('home-deal-card')
    expect(getDoc).not.toHaveBeenCalled()
  })
})
