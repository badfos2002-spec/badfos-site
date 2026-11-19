import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// TICKET-022: app/page.tsx (server) reads the live deals ONCE, passes the hero deal to
// NewHeroSection (Addendum A) and up to 3 deals to NewDealsSection (review H4).

const h = vi.hoisted(() => ({ getLiveDeals: vi.fn() }))
vi.mock('@/lib/deals-server', () => ({ getLiveDeals: h.getLiveDeals }))
vi.mock('@/components/home/NewHeroSection', () => ({
  default: ({ heroDeal }: { heroDeal?: { title: string } | null }) => <div data-testid="hero">{heroDeal ? heroDeal.title : 'default'}</div>,
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
})
