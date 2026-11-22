import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// TICKET-022: app/page.tsx (server) reads the live deals ONCE, passes the hero deal to
// NewHeroSection (Addendum A) and up to 3 deals to NewDealsSection (review H4).
// TICKET-029: the hero takes the ARRAY of every live deal marked «בהירו», in the
// read's order (already sortDeals order) — `data-hero-count` records the array's
// length, so «none» (the prop missing) is told apart from an empty array.

const h = vi.hoisted(() => ({ getLiveDeals: vi.fn() }))
vi.mock('@/lib/deals-server', () => ({ getLiveDeals: h.getLiveDeals }))
vi.mock('@/components/home/NewHeroSection', () => ({
  default: ({ heroDeals }: { heroDeals?: { title: string }[] }) => (
    <div data-testid="hero" data-hero-count={heroDeals ? String(heroDeals.length) : 'none'}>
      {heroDeals?.length ? heroDeals.map((d) => d.title).join(',') : 'default'}
    </div>
  ),
}))
vi.mock('@/components/home/NewDealsSection', () => ({
  default: ({ deals }: { deals: { id: string }[] }) => <div data-testid="deals">{deals.map((d) => d.id).join(',')}</div>,
}))
vi.mock('@/components/home/IntroOverlay', () => ({ default: () => null }))
vi.mock('@/components/common/SmoothScrollProvider', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/home/NewWhyChooseSection', () => ({ default: () => null }))
vi.mock('@/components/home/NewPackagesSection', () => ({ default: () => null }))
vi.mock('@/components/home/EventLinksSection', () => ({ default: () => null }))
vi.mock('next/dynamic', () => ({ default: () => () => null }))

import RootPage, { revalidate } from '@/app/page'

afterEach(() => {
  cleanup()
  h.getLiveDeals.mockReset()
})

const deal = (id: string, hero = false) => ({ id, title: `t-${id}`, ...(hero ? { hero: { enabled: true } } : {}) })

describe('home page deals loader', () => {
  it('passes the hero deal and the first 3 live deals, from one read', async () => {
    h.getLiveDeals.mockResolvedValueOnce([deal('a'), deal('b', true), deal('c'), deal('d')])
    render(await RootPage())
    expect(screen.getByTestId('hero')).toHaveTextContent('t-b')
    expect(screen.getByTestId('deals')).toHaveTextContent('a,b,c')
    expect(h.getLiveDeals).toHaveBeenCalledTimes(1)
    expect(revalidate).toBe(60)
  })
  it('renders the default hero and no deals when there are none', async () => {
    h.getLiveDeals.mockResolvedValueOnce([])
    render(await RootPage())
    expect(screen.getByTestId('hero')).toHaveTextContent('default')
    expect(screen.getByTestId('deals')).toHaveTextContent('')
  })

  // TICKET-029: every deal marked «בהירו» reaches the hero, not just the first.
  it('passes every deal marked «בהירו», in the read’s order, from the same single read', async () => {
    h.getLiveDeals.mockResolvedValueOnce([deal('a'), deal('b', true), deal('c'), deal('d', true)])
    render(await RootPage())
    expect(screen.getByTestId('hero')).toHaveTextContent('t-b,t-d')
    expect(screen.getByTestId('hero')).toHaveAttribute('data-hero-count', '2')
    expect(screen.getByTestId('deals')).toHaveTextContent('a,b,c')
    expect(h.getLiveDeals).toHaveBeenCalledTimes(1)
    expect(revalidate).toBe(60)
  })

  it('one marked deal → an array of one', async () => {
    h.getLiveDeals.mockResolvedValueOnce([deal('a'), deal('b', true), deal('c')])
    render(await RootPage())
    expect(screen.getByTestId('hero')).toHaveAttribute('data-hero-count', '1')
    expect(screen.getByTestId('hero')).toHaveTextContent('t-b')
  })

  it('no marked deal → an empty array, not undefined, and the default hero', async () => {
    h.getLiveDeals.mockResolvedValueOnce([deal('a'), deal('b'), deal('c')])
    render(await RootPage())
    expect(screen.getByTestId('hero')).toHaveAttribute('data-hero-count', '0')
    expect(screen.getByTestId('hero')).toHaveTextContent('default')
    expect(screen.getByTestId('deals')).toHaveTextContent('a,b,c')
  })
})
