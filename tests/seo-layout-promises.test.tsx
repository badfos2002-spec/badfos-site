import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import type { ComponentType } from 'react'
import { getSeoPage } from '@/lib/seo-pages'
import { applyPricingOverrides } from '@/lib/constants'
import { LAYOUTS, DefaultLayout, type SeoLayoutProps } from '@/components/seo/layouts'

// TICKET-031F: the SEO layout components carried two hardcoded over-promises
// («תוך דקות» in the ideas subtitle, «ומקבלות מהר» in the bachelorette CTA).
// The business-facts rule forbids speed promises; the registry copy was already
// cleaned in 54ed1db, these hid in the layouts.

vi.mock('@/lib/tracking', () => ({ trackWhatsAppClick: vi.fn() }))
vi.mock('@/components/common/GoogleRatingBadge', () => ({ default: () => <span>ביקורות בגוגל</span> }))

const WA_URL = 'https://wa.me/972500000000'

// DefaultLayout has no registry entry — any page without one renders through it.
const LAYOUT_SLUGS: Array<[name: string, slug: string]> = [
  ['DefaultLayout', 'הדפסת-חולצות-שרוול-ארוך'],
  ['BacheloretteLayout', 'חולצות-למסיבת-רווקות'],
  ['BirthdayLayout', 'חולצות-ליום-הולדת'],
  ['EndOfYearLayout', 'חולצות-לסוף-שנה'],
  ['FamilyLayout', 'חולצות-משפחתיות'],
  ['SoldiersLayout', 'חולצות-לחיילים'],
]

const renderLayout = (slug: string) => {
  const page = getSeoPage(slug)!
  const Layout: ComponentType<SeoLayoutProps> = LAYOUTS[slug] ?? DefaultLayout
  return render(<Layout page={page} waUrl={WA_URL} />).container.textContent ?? ''
}

beforeAll(() => {
  applyPricingOverrides({})
  if (!('IntersectionObserver' in globalThis)) {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() { return [] }
      },
    )
  }
})

describe('ideas-section subtitle — no speed promise', () => {
  for (const [name, slug] of LAYOUT_SLUGS) {
    it(`${name} (${slug}) says «מעצבים אונליין בקלות», never «תוך דקות»`, () => {
      const text = renderLayout(slug)
      expect(text).not.toContain('תוך דקות')
      expect(text).not.toContain('מקבלות מהר')
      expect(text).toContain('מעצבים אונליין בקלות')
    })
  }
})

describe('bachelorette closing CTA — no speed promise', () => {
  it('says «ומקבלות הצעה בוואטסאפ», never «ומקבלות מהר»', () => {
    const text = renderLayout('חולצות-למסיבת-רווקות')
    expect(text).not.toContain('מקבלות מהר')
    expect(text).toContain('מעצבות יחד אונליין, רואות תצוגה מקדימה חיה ומקבלות הצעה בוואטסאפ — גם כשנזכרתן ברגע האחרון.')
  })
})
