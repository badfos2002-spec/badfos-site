import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// TICKET-010's globals.css fix (overflow-x: clip instead of hidden on
// body/main) made `position: sticky` actually work site-wide. The cart's
// desktop order summary (`sticky top-24`) now really pins — and with three or
// four items or a coupon row it is taller than the window, so the totals and
// the checkout button would sit below the fold until the grid ends. The
// wrapper is capped at the viewport minus its top-24 offset (6rem) and scrolls
// on its own.

describe('cart order summary — sticky with a viewport guard', () => {
  it('the sticky top-24 wrapper also has max-h-[calc(100vh-6rem)] and overflow-y-auto', () => {
    const src = readFileSync(join(__dirname, '..', 'components', 'cart', 'CartPage.tsx'), 'utf8')
    const line = src.split('\n').find(l => l.includes('sticky top-24'))
    expect(line).toBeDefined()
    expect(line).toContain('max-h-[calc(100vh-6rem)]')
    expect(line).toContain('overflow-y-auto')
  })
})
