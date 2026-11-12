import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import ProductSelector from '@/components/designer/ProductSelector'

// Render-only test: the cards call warmModel() -> fetch on hover/tap/click, and
// tests/setup.ts makes fetch throw synchronously, so no user events here.
// next/image and next/link are stubbed so jsdom renders a plain <img>/<a>
// without the App Router context Next 14 expects.
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    loader: _loader,
    ...props
  }: Record<string, unknown>) => <img {...props} />,
}))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// vitest.config.mts does not set `globals`, so Testing Library's automatic
// cleanup is not registered — unmount by hand between tests.
afterEach(cleanup)

describe('ProductSelector category images', () => {
  // The image path is written out as a literal on purpose: a change to the
  // category map breaks this test instead of silently passing.
  it('shows the original tote image on the tote card', () => {
    render(<ProductSelector />)

    expect(screen.getByAltText('תיקים')).toHaveAttribute(
      'src',
      '/assets/tote-category.jpg'
    )
  })

  it('leaves the vest card image untouched', () => {
    render(<ProductSelector />)

    expect(screen.getByAltText('וסטים זוהרים')).toHaveAttribute(
      'src',
      '/assets/vest-category.jpg'
    )
  })
})
