import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'

// TICKET-022: «חבילות» and «מבצעים» are two separate pages — two links in the
// header (desktop + mobile menu) and the footer; the old combined label is gone.

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/hooks/useCart', () => {
  const state = { getCartItemCount: () => 0, addPackageItem: () => {}, addItem: () => {} }
  return { useCart: (sel?: (s: typeof state) => unknown) => (sel ? sel(state) : state) }
})
vi.mock('@/lib/db', () => ({ getAllDocuments: async () => [] }))

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PackagesPage from '@/app/packages/page'

afterEach(() => cleanup())

function expectBothLinks(scope: HTMLElement) {
  expect(within(scope).getByRole('link', { name: 'חבילות' })).toHaveAttribute('href', '/packages')
  expect(within(scope).getByRole('link', { name: 'מבצעים' })).toHaveAttribute('href', '/deals')
}

describe('Header', () => {
  it('desktop nav has «חבילות» → /packages and «מבצעים» → /deals', () => {
    render(<Header />)
    expectBothLinks(screen.getByRole('navigation'))
    expect(screen.queryByText('חבילות ומבצעים')).not.toBeInTheDocument()
  })

  it('mobile menu has both links', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: 'פתח תפריט' }))
    const menu = screen.getByRole('dialog')
    expectBothLinks(menu)
    expect(within(menu).queryByText('חבילות ומבצעים')).not.toBeInTheDocument()
  })
})

describe('Footer', () => {
  it('has both links and no combined label', () => {
    render(<Footer />)
    expectBothLinks(screen.getByRole('contentinfo'))
    expect(screen.queryByText('חבילות ומבצעים')).not.toBeInTheDocument()
  })
})

describe('/packages', () => {
  it('h1 is «חבילות» and the combined label is gone', () => {
    render(<PackagesPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^חבילות$/)
    expect(screen.queryByText('חבילות ומבצעים')).not.toBeInTheDocument()
  })
})
