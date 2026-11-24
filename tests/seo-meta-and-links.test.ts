import { describe, it, expect, vi } from 'vitest'
import { SEO_PAGES, getSeoPage } from '@/lib/seo-pages'
import { validateSeoPage } from '@/lib/seo-price-tokens'
import { LAYOUTS } from '@/components/seo/layouts'

// TICKET-031 items A/B/C/F: the 11 long meta descriptions come down to 120–160
// chars, three over-promising sentences lose the speed/amount claim, every page
// gets at least two incoming `related` links (and no page more than four
// outgoing ones), and every entry this ticket edits is dated in the sitemap.

vi.mock('@/lib/deals-server', () => ({ getLiveDeals: async () => [] }))

/** The one page whose own entry item A+F edits — the sitemap date proves F landed. */
const DATED = 'חולצות-לחיילים'
const TODAY = '2026-11-24'

const page = (slug: string) => getSeoPage(slug)!

const incomingLinks = (slug: string) => SEO_PAGES.filter((p) => p.related.includes(slug)).map((p) => p.slug)

describe('item A — meta descriptions are 120–160 chars and price-free', () => {
  // The evaluated string is what Google sees: הדפסה-על-כובעים and באפים-מודפסים
  // are template literals, so .length already includes the interpolated constant.
  it.each(SEO_PAGES.map((p) => [p.slug, p.metaDescription] as const))(
    '%s is 120–160 chars',
    (_slug, metaDescription) => {
      expect(metaDescription.length).toBeGreaterThanOrEqual(120)
      expect(metaDescription.length).toBeLessThanOrEqual(160)
    },
  )

  // Green by design — a no-regression guard: metadata is number-free copy, prices
  // live only in the {{token}} fields DefaultLayout renders through <PriceText>.
  it('never quotes a price or leaves a token in the description', () => {
    for (const p of SEO_PAGES) {
      expect(p.metaDescription, p.slug).not.toContain('₪')
      expect(p.metaDescription, p.slug).not.toContain('{{')
      expect(p.metaDescription, p.slug).not.toMatch(/\d+\s*(₪|ש״ח|שקלים|שקל)/)
    }
  })

  // tests/kangaroo-no-4xl.test.tsx pins this claim (TICKET-026): the shortened
  // description may not drop the qualifier and start promising 4XL kangaroo.
  it('keeps «קנגרו עד 3XL» in the sweatshirt description', () => {
    expect(page('הדפסה-על-סווטשרטים').metaDescription).toContain('קנגרו עד 3XL')
  })
})

describe('item B — no speed promise, no shekel amount', () => {
  it('the bachelorette description offers a quote instead of «מהר»', () => {
    const p = page('חולצות-למסיבת-רווקות')
    expect(p.metaDescription).not.toContain('ומקבלות מהר')
    expect(p.metaDescription).toContain('ומקבלות הצעה בוואטסאפ')
  })

  it('the bachelorette hero states the lead time instead of «מהר»', () => {
    const p = page('חולצות-למסיבת-רווקות')
    expect(p.heroText).not.toContain('וזה אצלכן מהר')
    expect(p.heroText).toContain('זמן האספקה המשוער עד 7 ימי עסקים מתחילת הייצור')
  })

  it('the business page drops the «עשרות שקלים בודדים» figure', () => {
    const texts = page('הדפסת-חולצות-לעסקים').paragraphs.map((x) => x.text)
    expect(texts.some((t) => t.includes('עשרות שקלים בודדים'))).toBe(false)
    expect(texts.some((t) => t.includes('בהשקעה חד־פעמית קטנה'))).toBe(true)
  })
})

describe('item C — the cross-link graph', () => {
  it.each(SEO_PAGES.map((p) => p.slug))('%s has at least two incoming links', (slug) => {
    const sources = incomingLinks(slug)
    expect(sources.length, `incoming: ${sources.join(', ') || 'none'}`).toBeGreaterThanOrEqual(2)
  })

  it('keeps every page at four related links or fewer (the chips row)', () => {
    for (const p of SEO_PAGES) expect(p.related.length, p.slug).toBeLessThanOrEqual(4)
  })

  // Green by design — guards against a typo in a slug or a self-link while the
  // three parallel branches edit this file.
  it('links only to pages that exist, and never to itself', () => {
    for (const p of SEO_PAGES) {
      expect(p.related, p.slug).not.toContain(p.slug)
      expect(new Set(p.related).size, p.slug).toBe(p.related.length)
      for (const r of p.related) expect(getSeoPage(r), `${p.slug} → ${r}`).toBeTruthy()
    }
  })
})

// Green by design — the build-time contract (app/[slug]/page.tsx runs it in
// generateStaticParams): the rewritten copy on a custom-layout page may not
// introduce a price token.
describe('the build-time contract still holds for every page', () => {
  it.each(SEO_PAGES.map((p) => p.slug))('%s passes validateSeoPage', (slug) => {
    const p = page(slug)
    expect(() => validateSeoPage(p, !LAYOUTS[p.slug])).not.toThrow()
  })
})

describe('item F — sitemap dates', () => {
  it(`dates ${DATED} ${TODAY} and leaves an untouched page on the fallback`, async () => {
    const { default: sitemap } = await import('@/app/sitemap')
    const entries = await sitemap()
    const url = (slug: string) => `https://badfos.co.il/${encodeURIComponent(slug)}`
    expect(entries.find((e) => e.url === url(DATED))?.lastModified).toBe(TODAY)
    // Untouched by this ticket (only its incoming links changed) — same fixture
    // tests/seo-dtf-page.test.tsx relies on
    expect(entries.find((e) => e.url === url('חולצות-למסיבת-רווקים'))?.lastModified).toBe('2026-10-21')
  })
})
