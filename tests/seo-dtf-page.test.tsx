import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, cleanup, within } from '@testing-library/react'
import sharp from 'sharp'
import { SEO_PAGES, getSeoPage } from '@/lib/seo-pages'
import { validateSeoPage, splitPriceText, resolvePriceToken } from '@/lib/seo-price-tokens'

// TICKET-030: SEO service page for DTF rolls sold per running meter. DTF is not a
// product in lib/constants, so «35 ₪» is plain text (no token to invent) — and it is
// allowed ONLY in the fields DefaultLayout runs through <PriceText>.

vi.mock('@/lib/tracking', () => ({ trackWhatsAppClick: vi.fn() }))
vi.mock('@/components/common/GoogleRatingBadge', () => ({ default: () => <span>ביקורות בגוגל</span> }))
vi.mock('@/lib/deals-server', () => ({ getLiveDeals: async () => [] }))

const SLUG = 'הדפסת-גלילי-dtf-לפי-מטר'
const H1 = 'הדפסת גלילי DTF לפי מטר רץ'
const DEAL = '/deals/הדפסת-גליל-dtf-החל-מ35'
const LINKED_BACK = ['הדפסת-חולצות-לעסקים', 'הדפסת-חולצות-בראשון-לציון', 'הדפסת-חולצות-שרוול-ארוך', 'הדפסה-על-סווטשרטים']
const PUBLIC = join(__dirname, '..', 'public')
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

afterEach(() => cleanup())

describe('registry entry', () => {
  it('exists, is last in SEO_PAGES and is a service page (no designer)', () => {
    const p = page()
    expect(p).toBeTruthy()
    expect(SEO_PAGES[SEO_PAGES.length - 1].slug).toBe(SLUG)
    expect(p.productType).toBeUndefined()
    expect(p.fabric).toBeUndefined()
    expect(p.h1).toBe(H1)
    expect(p.metaTitle).toBe('גלילי DTF לפי מטר רץ | הדפסת DTF להדבקה בבית ובעסק | בדפוס')
    expect(p.metaTitle.length).toBeLessThanOrEqual(60)
    expect(p.metaDescription.length).toBeGreaterThan(50)
    expect(p.metaDescription.length).toBeLessThanOrEqual(160)
    expect(p.heroText.length).toBeGreaterThan(100)
    expect(p.audienceLine).toBeTruthy()
    expect(p.accent?.emoji).toBe('🎨')
    expect(p.ctaText).toBe('לפרטי המבצע')
    expect(p.waMessage).toBe('היי! אני מתעניין בהדפסת גליל DTF לפי מטר רץ 🙂')
    expect(p.ogImage).toBe('/og/dtf.jpg')
    expect(p.updatedAt).toBe('2026-11-24')
  })

  it('has the blocks the ticket specs', () => {
    const p = page()
    expect(p.ideas?.items).toHaveLength(8)
    expect(new Set(p.ideas!.items).size).toBe(8)
    expect(p.benefits).toHaveLength(4)
    expect(p.paragraphs).toHaveLength(5)
    expect(p.steps).toHaveLength(3)
    expect(p.checklist).toHaveLength(6)
    expect(new Set(p.checklist!).size).toBe(6)
    expect(p.faq).toHaveLength(7)
    expect(p.priceExamples).toBeUndefined()
  })

  it('is a service page pointing at the live deal', () => {
    const p = page()
    expect(p.service?.ctaHref).toBe(DEAL)
    expect(p.service?.closingTitle).toBe('מוכנים להזמין גליל DTF?')
    expect(p.service?.closingText).toBe(
      'שולחים לנו את העיצובים בוואטסאפ, מקבלים סקיצה לאישור, ומקבלים את הגליל עד הבית או באיסוף עצמי.',
    )
  })

  it('cross-links out and back', () => {
    const p = page()
    expect(p.related).toEqual(['הדפסת-חולצות-לעסקים', 'הדפסת-חולצות-בראשון-לציון', 'הדפסה-על-סווטשרטים'])
    for (const r of p.related) expect(getSeoPage(r), r).toBeTruthy()
    for (const slug of LINKED_BACK) {
      const other = getSeoPage(slug)!
      expect(other.related, slug).toContain(SLUG)
      expect(other.updatedAt, slug).toBe('2026-11-24')
    }
  })

  it('passes the build-time token contract', () => {
    expect(() => validateSeoPage(page(), true)).not.toThrow()
  })

  // Green by design — a no-regression guard for the shared registry.
  it('every page in the registry still passes the token contract', () => {
    for (const p of SEO_PAGES) expect(() => validateSeoPage(p, true), p.slug).not.toThrow()
  })
})

describe('price copy (Q1/Q2) — «35 ₪» as plain text, only in the PriceText fields', () => {
  const priceFields = () => {
    const p = page()
    return [
      ['heroText', p.heroText] as [string, string],
      ...p.benefits.map((b, i) => [`benefits[${i}].text`, b.text] as [string, string]),
      ...p.paragraphs.map((x, i) => [`paragraphs[${i}].text`, x.text] as [string, string]),
      ...p.faq.map((f, i) => [`faq[${i}].aLive`, f.aLive ?? ''] as [string, string]),
    ]
  }

  const numberFreeFields = () => {
    const p = page()
    const fields: [string, string][] = [
      ['metaTitle', p.metaTitle],
      ['metaDescription', p.metaDescription],
      ['h1', p.h1],
      ['audienceLine', p.audienceLine ?? ''],
      ['ctaText', p.ctaText],
      ['waMessage', p.waMessage ?? ''],
      ['galleryNote', p.galleryNote ?? ''],
      ['ideas.title', p.ideas?.title ?? ''],
      ['service.closingTitle', p.service?.closingTitle ?? ''],
      ['service.closingText', p.service?.closingText ?? ''],
    ]
    p.ideas?.items.forEach((item, i) => fields.push([`ideas.items[${i}]`, item]))
    p.benefits.forEach((b, i) => fields.push([`benefits[${i}].title`, b.title]))
    p.paragraphs.forEach((x, i) => fields.push([`paragraphs[${i}].title`, x.title]))
    p.steps?.forEach((s, i) => fields.push([`steps[${i}].title`, s.title], [`steps[${i}].text`, s.text]))
    p.checklist?.forEach((c, i) => fields.push([`checklist[${i}]`, c]))
    p.faq.forEach((f, i) => fields.push([`faq[${i}].q`, f.q], [`faq[${i}].a`, f.a]))
    p.galleryAlts?.forEach((a, i) => fields.push([`galleryAlts[${i}]`, a]))
    return fields
  }

  it('the price appears in the hero and exactly once more per body field group', () => {
    const p = page()
    expect(p.heroText).toContain('35 ₪')
    expect(p.benefits.filter((b) => b.text.includes('35 ₪'))).toHaveLength(1)
    expect(p.paragraphs.filter((x) => x.text.includes('35 ₪'))).toHaveLength(1)
    expect(p.faq.filter((f) => (f.aLive ?? '').includes('35 ₪'))).toHaveLength(1)
  })

  it('no shekel amount other than «35 ₪» in the body fields', () => {
    for (const [label, text] of priceFields()) {
      const plain = text.replace(/\{\{[^}]*\}\}/g, '')
      for (const m of plain.matchAll(/\d[\d.,]*\s*₪|₪\s*\d[\d.,]*/g)) expect(m[0], label).toBe('35 ₪')
      expect(plain, label).not.toMatch(/ש״ח|ש"ח|שקלים/)
    }
  })

  it('metadata, titles, FAQ answers and chips carry no price at all', () => {
    for (const [label, text] of numberFreeFields()) {
      expect(text, label).not.toContain('35')
      expect(text, label).not.toContain('₪')
      expect(text, label).not.toMatch(/ש״ח|ש"ח|שקלים/)
    }
  })

  it('below 10 meters the copy asks for a quote and never a second number', () => {
    const body = priceFields().map(([, text]) => text).join('\n')
    expect(body).toContain('כתבו לנו בוואטסאפ')
    expect(body).toContain('10 מטרים')
    expect(body).toContain('40 ס״מ')
  })

  it('only the shipping token is used (no invented DTF price token) and every token resolves', () => {
    const all = priceFields().map(([, text]) => text).join('\n')
    expect(all).toContain('{{shipping}}')
    const tokens = Array.from(all.matchAll(/\{\{([^{}]*)\}\}/g)).map((m) => m[1])
    expect(new Set(tokens)).toEqual(new Set(['shipping']))
    for (const [label, text] of priceFields()) {
      const resolved = splitPriceText(text)
        .map((part) => ('token' in part ? resolvePriceToken(part.token) : part.text))
        .join('')
      expect(resolved, label).not.toContain('{{')
    }
  })
})

describe('home iron (Q3 b) — no numbers at all', () => {
  const ironParagraph = () => page().paragraphs.filter((x) => x.title.includes('מגהץ'))
  const ironFaq = () => page().faq.filter((f) => f.q.includes('מגהץ'))

  it('the iron paragraph is digit-free', () => {
    const paragraphs = ironParagraph()
    expect(paragraphs).toHaveLength(1)
    expect(paragraphs[0].title).not.toMatch(/\d/)
    expect(paragraphs[0].text).not.toMatch(/\d/)
  })

  it('the iron FAQ answer is digit-free and has no live-priced sentence', () => {
    const faq = ironFaq()
    expect(faq).toHaveLength(1)
    expect(faq[0].a).not.toMatch(/\d/)
    expect(faq[0].aLive).toBeUndefined()
  })

  it('the steps appear in the order the ticket lists them', () => {
    const text = ironParagraph()[0].text
    const order = ['גיהוץ מקדים', 'ללא אדים', 'הפילם כלפי מעלה', 'נייר אפייה', 'להתקרר', 'מקלפים']
    const positions = order.map((marker) => {
      expect(text, marker).toContain(marker)
      return text.indexOf(marker)
    })
    expect(positions, order.join(' → ')).toEqual([...positions].sort((a, b) => a - b))
  })

  it('mentions the heat press and the fabrics it sticks to', () => {
    const text = ironParagraph()[0].text
    for (const part of ['מכבש חום', 'כותנה', 'פוליאסטר']) expect(text, part).toContain(part)
  })
})

describe('content rules (business-facts)', () => {
  const text = () => JSON.stringify(page())

  it('no forbidden phrases', () => {
    for (const bad of ['חשבונית', 'קבלה', 'מהיום למחר', 'ימים ספורים', 'אין מינימום', 'כמה כתובות', 'שעות פתיחה']) {
      expect(text(), bad).not.toContain(bad)
    }
    expect(text()).not.toMatch(/כביסות\s*\d/)
    expect(text()).not.toMatch(/\d+\s*כביסות/)
  })

  it('required phrases present', () => {
    expect(text()).toContain('זמן האספקה המשוער הוא עד 7 ימי עסקים מתחילת הייצור')
    expect(text()).toContain('אליהו איתן 3 בראשון לציון')
    expect(text()).toContain('עמיד לכביסות רבות, לפי הוראות הכביסה')
  })

  it('explains DTF accurately and carries the target keywords', () => {
    for (const keyword of ['גלילי DTF', 'גליל DTF', 'הדפסת DTF לפי מטר', 'טרנספר DTF']) {
      expect(text(), keyword).toContain(keyword)
    }
    for (const fact of ['פילם', 'אבקת הדבקה', 'חום ולחץ', 'בסיס לבן']) {
      expect(text(), fact).toContain(fact)
    }
  })
})

describe('images (Q6)', () => {
  it('the gallery is the two banner crops, with real alts', () => {
    const p = page()
    expect(p.galleryImages).toEqual(['/assets/dtf-roll-square.webp', '/assets/dtf-roll-printer.webp'])
    expect(p.galleryAlts).toHaveLength(2)
    expect(p.galleryNote).toBe('תמונות להמחשה מהמבצע')
  })

  it('every gallery image exists under public/ as a 1080² webp', async () => {
    for (const src of page().galleryImages) {
      const file = join(PUBLIC, decodeURIComponent(src))
      expect(existsSync(file), src).toBe(true)
      const meta = await sharp(file).metadata()
      expect([meta.format, meta.width, meta.height], src).toEqual(['webp', 1080, 1080])
    }
  })

  it('the og image is a 1200×630 jpeg under 300 KB', async () => {
    const file = join(PUBLIC, 'og', 'dtf.jpg')
    expect(existsSync(file)).toBe(true)
    const meta = await sharp(file).metadata()
    expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', 1200, 630])
    expect(statSync(file).size).toBeLessThanOrEqual(300 * 1024)
  })
})

describe('rendered page', () => {
  it('sends both CTAs to the deal page and closes with the service copy', async () => {
    const { default: SeoLandingPage } = await import('@/app/[slug]/page')
    const { container } = render(<SeoLandingPage params={{ slug: encodeURIComponent(SLUG) }} />)
    const p = page()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(H1)
    const ctas = Array.from(container.querySelectorAll('a')).filter(
      (a) => decodeURIComponent(a.getAttribute('href') ?? '') === DEAL,
    )
    expect(ctas).toHaveLength(2)
    for (const cta of ctas) expect(cta.textContent).toContain(p.ctaText)

    expect(container.textContent).toContain(p.service!.closingTitle)
    expect(container.textContent).toContain(p.service!.closingText)
    expect(container.textContent).not.toContain('מוכנים להתחיל לעצב?')
    expect(container.textContent).not.toContain('מתחילים לעצב')
    expect(container.querySelector('a[href^="/designer"]')).toBeNull()
    expect(container.textContent).not.toContain('{{')

    for (const f of p.faq) expect(screen.getByText(f.q)).toBeInTheDocument()

    const wa = Array.from(container.querySelectorAll('a')).filter((a) =>
      (a.getAttribute('href') ?? '').startsWith('https://wa.me/'),
    )
    expect(wa.length).toBeGreaterThanOrEqual(1)
    for (const link of wa) expect(decodeURIComponent(link.getAttribute('href')!)).toContain(p.waMessage!)
  })

  it('generateStaticParams includes the slug', async () => {
    const { generateStaticParams } = await import('@/app/[slug]/page')
    expect(generateStaticParams()).toContainEqual({ slug: SLUG })
  })
})

describe('discoverability', () => {
  it('sitemap dates the new page today and leaves untouched pages alone', async () => {
    const { default: sitemap } = await import('@/app/sitemap')
    const entries = await sitemap()
    const url = (slug: string) => `https://badfos.co.il/${encodeURIComponent(slug)}`
    expect(entries.find((e) => e.url === url(SLUG))?.lastModified).toBe('2026-11-24')
    // Untouched by this ticket — keeps the registry-wide fallback date
    expect(entries.find((e) => e.url === url('חולצות-למסיבת-רווקים'))?.lastModified).toBe('2026-10-21')
  })

  it('footer lists the page under «המוצרים שלנו» only', async () => {
    const { default: Footer } = await import('@/components/layout/Footer')
    const { container } = render(<Footer />)
    const section = (heading: string) => {
      const h3 = Array.from(container.querySelectorAll('h3')).find((el) => el.textContent === heading)
      expect(h3, heading).toBeTruthy()
      return h3!.parentElement as HTMLElement
    }
    const link = within(section('המוצרים שלנו')).getByRole('link', { name: H1 })
    expect(decodeURIComponent(link.getAttribute('href')!)).toBe(`/${SLUG}`)
    expect(within(section('הדפסת חולצות לכל אירוע')).queryByRole('link', { name: H1 })).toBeNull()
  })
})
