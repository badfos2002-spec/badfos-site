import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// TICKET-022 Addendum A: app/page.tsx (server) reads the hero deal and passes it to NewHeroSection.

const h = vi.hoisted(() => ({ heroDeal: null as unknown, getHeroDeal: vi.fn() }))
vi.mock('@/lib/deals-server', () => ({ getHeroDeal: h.getHeroDeal }))
vi.mock('@/components/home/NewHeroSection', () => ({
  default: ({ heroDeal }: { heroDeal?: { title: string } | null }) => <div data-testid="hero">{heroDeal ? heroDeal.title : 'default'}</div>,
}))
vi.mock('@/components/home/IntroOverlay', () => ({ default: () => null }))
vi.mock('@/components/common/SmoothScrollProvider', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/home/NewWhyChooseSection', () => ({ default: () => null }))
vi.mock('@/components/home/NewPackagesSection', () => ({ default: () => null }))
vi.mock('@/components/home/EventLinksSection', () => ({ default: () => null }))
vi.mock('next/dynamic', () => ({ default: () => () => null }))

import RootPage, { revalidate } from '@/app/page'

afterEach(() => cleanup())

describe('home page hero loader', () => {
  it('passes the server-read hero deal to the hero', async () => {
    h.getHeroDeal.mockResolvedValueOnce({ id: 'a', title: 'מבצע חורף' })
    render(await RootPage())
    expect(screen.getByTestId('hero')).toHaveTextContent('מבצע חורף')
    expect(revalidate).toBe(60)
  })
  it('renders the default hero when there is no hero deal', async () => {
    h.getHeroDeal.mockResolvedValueOnce(null)
    render(await RootPage())
    expect(screen.getByTestId('hero')).toHaveTextContent('default')
  })
})
