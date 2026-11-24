import { describe, it, expect, vi, beforeAll } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { SEO_PAGES, getSeoPage } from '@/lib/seo-pages'
import { getBasePrice, applyPricingOverrides } from '@/lib/constants'
import { validateSeoPage, splitPriceText, resolvePriceToken } from '@/lib/seo-price-tokens'

// TICKET-020: SEO product page for the long-sleeve cotton tee.

vi.mock('@/lib/tracking', () => ({ trackWhatsAppClick: vi.fn() }))
vi.mock('@/components/common/GoogleRatingBadge', () => ({ default: () => <span>ביקורות בגוגל</span> }))

const SLUG = 'הדפסת-חולצות-שרוול-ארוך'
const CTA = '/designer/tshirt?fabric=long-sleeve'
const page = () => getSeoPage(SLUG)!

beforeAll(() => {
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

describe('registry entry', () => {
  it('exists with the required fields', () => {
    const p = page()
    expect(p).toBeTruthy()
    expect(p.productType).toBe('tshirt')
    expect(p.fabric).toBe('long-sleeve')
    expect(p.h1).toBe('הדפסה על חולצות שרוול ארוך')
    expect(p.metaTitle).toBe('הדפסת חולצות שרוול ארוך בעיצוב אישי | בדפוס')
    expect(p.h1).toContain('שרוול ארוך')
    expect(p.metaTitle).toContain('שרוול ארוך')
    expect(p.metaDescription.length).toBeGreaterThan(50)
    expect(p.metaDescription.length).toBeLessThanOrEqual(160)
    expect(p.heroText.length).toBeGreaterThan(100)
    expect(p.audienceLine).toBeTruthy()
    expect(p.accent?.emoji).toBeTruthy()
    expect(p.ideas?.items).toHaveLength(8)
    expect(new Set(p.ideas!.items).size).toBe(8)
    expect(p.benefits).toHaveLength(4)
    expect(p.paragraphs).toHaveLength(4)
    expect(p.faq).toHaveLength(5)
    expect(p.galleryImages.length).toBeGreaterThan(0)
    expect(p.related).toEqual(['הדפסה-על-סווטשרטים', 'הדפסת-חולצות-לעסקים', 'חולצות-ליום-גיבוש', 'הדפסת-גלילי-dtf-לפי-מטר'])
    for (const r of p.related) expect(getSeoPage(r)).toBeTruthy()
  })

  it('every gallery image exists under public/', () => {
    for (const src of page().galleryImages) {
      expect(existsSync(join(__dirname, '..', 'public', decodeURIComponent(src))), src).toBe(true)
    }
  })

  it('sits right after the sweatshirt page (footer order)', () => {
    const i = SEO_PAGES.findIndex((x) => x.slug === 'הדפסה-על-סווטשרטים')
    expect(SEO_PAGES[i + 1]?.slug).toBe(SLUG)
  })

  it('passes the build-time token contract', () => {
    expect(() => validateSeoPage(page(), true)).not.toThrow()
  })
})

describe('price tokens', () => {
  const tokenFields = () => {
    const p = page()
    return [p.heroText, ...p.benefits.map((b) => b.text), ...p.paragraphs.map((x) => x.text), ...p.faq.map((f) => f.aLive ?? '')]
  }
  const resolveAll = (text: string) =>
    splitPriceText(text).map((part) => ('token' in part ? resolvePriceToken(part.token) : part.text)).join('')

  it('every token resolves and none is left behind', () => {
    for (const text of tokenFields()) expect(resolveAll(text)).not.toContain('{{')
  })

  it('uses the long-sleeve base price token and it yields the long-sleeve price', () => {
    const all = tokenFields().join('\n')
    expect(all).toContain('{{base:tshirt:long-sleeve}}')
    for (const t of ['{{area:tshirt:front_full}}', '{{area:tshirt:back}}', '{{area:tshirt:chest_logo}}', '{{area:tshirt:shoulder_right}}', '{{discountPct}}', '{{discountMin}}', '{{shipping}}']) {
      expect(all).toContain(t)
    }
    expect(resolvePriceToken('base:tshirt:long-sleeve')).toBe(`₪${getBasePrice('tshirt', 'long-sleeve')}`)
  })
})

describe('content rules (business-facts)', () => {
  const text = () => JSON.stringify(page())
  it('no forbidden phrases', () => {
    for (const bad of ['חשבונית', 'קבלה', 'מהיום למחר', 'מינימום', 'שעות איסוף', 'כמה כתובות', '3XL', '4XL', 'ילדים']) {
      expect(text(), bad).not.toContain(bad)
    }
    expect(text()).not.toMatch(/כביסות\s*\d/)
    expect(text()).not.toMatch(/\d+\s*כביסות/)
  })
  it('required phrases present', () => {
    expect(text()).toContain('זמן האספקה המשוער הוא עד 7 ימי עסקים מתחילת הייצור, שמתחיל אחרי אישור הסקיצה והתשלום')
    expect(text()).toContain('איסוף עצמי חינם מאליהו איתן 3 בראשון לציון')
    expect(text()).toContain('עמיד לכביסות רבות, לפי הוראות הכביסה')
  })
})

describe('rendered page', () => {
  it('renders h1, CTAs to the long-sleeve designer, the FAQ and the long-sleeve base price', async () => {
    applyPricingOverrides({})
    const { default: SeoLandingPage } = await import('@/app/[slug]/page')
    const { container } = render(<SeoLandingPage params={{ slug: encodeURIComponent(SLUG) }} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('הדפסה על חולצות שרוול ארוך')
    const ctas = Array.from(container.querySelectorAll('a')).filter((a) => a.getAttribute('href') === CTA)
    expect(ctas.length).toBeGreaterThanOrEqual(3) // hero, pricing strip, final CTA
    expect(container.querySelector('a[href="/designer/tshirt"]')).toBeNull()
    for (const f of page().faq) expect(screen.getByText(f.q)).toBeInTheDocument()
    expect(container.textContent).not.toContain('{{')
    expect(container.textContent).toContain(`מחיר בסיס: ₪${getBasePrice('tshirt', 'long-sleeve')} ליחידה`)
  })

  it('generateStaticParams includes the slug', async () => {
    const { generateStaticParams } = await import('@/app/[slug]/page')
    expect(generateStaticParams()).toContainEqual({ slug: SLUG })
  })
})

describe('discoverability', () => {
  it('sitemap lists the encoded slug', async () => {
    const { default: sitemap } = await import('@/app/sitemap')
    expect((await sitemap()).map((e) => e.url)).toContain(`https://badfos.co.il/${encodeURIComponent(SLUG)}`)
  })
  it('footer «המוצרים שלנו» links the page', async () => {
    const { default: Footer } = await import('@/components/layout/Footer')
    render(<Footer />)
    const link = screen.getByRole('link', { name: 'הדפסה על חולצות שרוול ארוך' })
    expect(decodeURIComponent(link.getAttribute('href')!)).toBe(`/${SLUG}`)
  })
})
