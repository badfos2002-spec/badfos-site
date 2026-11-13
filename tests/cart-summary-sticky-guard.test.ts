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
//
// DESKTOP ONLY (lg:). On mobile the cart is one column and sticky does
// nothing; an unprefixed max-h/overflow would turn a tall summary into a
// nested scroll box hiding «המשך לתשלום».

describe('cart order summary — sticky with a viewport guard, desktop only', () => {
  const src = readFileSync(join(__dirname, '..', 'components', 'cart', 'CartPage.tsx'), 'utf8')
  const line = src.split('\n').find(l => l.includes('top-24')) ?? ''

  it('the wrapper is lg:sticky lg:top-24 with lg:max-h-[calc(100vh-6rem)] and lg:overflow-y-auto', () => {
    for (const cls of ['lg:sticky', 'lg:top-24', 'lg:max-h-[calc(100vh-6rem)]', 'lg:overflow-y-auto']) {
      expect(line).toContain(cls)
    }
  })

  it('no unprefixed height cap or scroll box (mobile checkout stays one page)', () => {
    expect(line).not.toContain(' max-h-[')
    expect(line).not.toContain(' overflow-y-auto')
    expect(line).not.toMatch(/"(max-h-\[|overflow-y-auto|sticky )/)
  })
})
