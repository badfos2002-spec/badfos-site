import { describe, it, expect, vi, beforeAll } from 'vitest'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { MetadataRoute } from 'next'
import sharp from 'sharp'
import { SEO_PAGES } from '@/lib/seo-pages'
import { generateMetadata } from '@/app/[slug]/page'
import sitemap from '@/app/sitemap'

// TICKET-031 item D: every product landing page gets its own 1200x630 og:image
// cropped from that page's own galleryImages, instead of the generic /og/home.jpg.
// Item F: every page this lane edits carries updatedAt, which the sitemap serves
// as lastModified instead of the '2026-10-21' fallback.

vi.mock('@/lib/tracking', () => ({ trackWhatsAppClick: vi.fn() }))
vi.mock('@/components/common/GoogleRatingBadge', () => ({ default: () => null }))
vi.mock('@/lib/deals-server', () => ({ getLiveDeals: vi.fn(async () => []) }))

const BASE_URL = 'https://badfos.co.il'
const GENERIC = '/og/home.jpg'
const EDITED_AT = '2026-11-24'
const MAX_BYTES = 300 * 1024
const publicPath = (src: string) => join(__dirname, '..', 'public', decodeURIComponent(src))

const productPages = SEO_PAGES.filter((page) => page.productType)

/** Pages whose share image must be their own: the 11 product pages plus the DTF
 *  service page TICKET-030 introduced — `service` is not `productType`, so the
 *  no-generic-og rule has to name both or the new page slips past it. */
const shareablePages = SEO_PAGES.filter((page) => page.productType || page.service)

/** Sample of the product pages, asserted through the real generateMetadata(). */
const META_SLUGS = ['הדפסה-על-כובעים', 'הדפסת-תיקי-בד', 'בגדי-גוף-מודפסים-לתינוקות']

describe('og:image files', () => {
  // Regression guard over EVERY SEO page, product pages and the rest alike — green
  // before this ticket too (all 14 pre-existing /og files are already 1200x630 and
  // at most 203 KB). It is here so the whole /og set is held to one contract.
  it.each(SEO_PAGES.map((page) => [page.slug, page.ogImage] as const))(
    '%s — ogImage exists under /public, is 1200x630 and at most 300 KB',
    async (_slug, ogImage) => {
      expect(ogImage.startsWith('/og/'), ogImage).toBe(true)
      expect(existsSync(publicPath(ogImage)), ogImage).toBe(true)
      const meta = await sharp(publicPath(ogImage)).metadata()
      expect({ width: meta.width, height: meta.height }).toEqual({ width: 1200, height: 630 })
      expect(statSync(publicPath(ogImage)).size, ogImage).toBeLessThanOrEqual(MAX_BYTES)
    },
  )
})

describe('page-specific og:image for product pages', () => {
  it('covers all 11 pages that carry a productType', () => {
    expect(productPages).toHaveLength(11)
  })

  it.each(productPages.map((page) => [page.slug, page.ogImage] as const))(
    '%s — has its own og:image, 1200x630 and at most 300 KB',
    async (_slug, ogImage) => {
      expect(ogImage).not.toBe(GENERIC)
      expect(existsSync(publicPath(ogImage)), ogImage).toBe(true)
      const meta = await sharp(publicPath(ogImage)).metadata()
      expect({ width: meta.width, height: meta.height }).toEqual({ width: 1200, height: 630 })
      expect(statSync(publicPath(ogImage)).size).toBeLessThanOrEqual(MAX_BYTES)
    },
  )

  it('gives every product page a distinct og:image', () => {
    const images = productPages.map((page) => page.ogImage)
    expect(new Set(images).size).toBe(images.length)
  })
})

describe('no page that sells something falls back to the generic og:image', () => {
  it('covers the 11 product pages and the DTF service page', () => {
    expect(shareablePages).toHaveLength(12)
  })

  it.each(shareablePages.map((page) => [page.slug, page.ogImage] as const))(
    '%s — ogImage is its own, not /og/home.jpg',
    (_slug, ogImage) => {
      expect(ogImage).not.toBe(GENERIC)
    },
  )

  it('gives all 12 of them a distinct og:image', () => {
    const images = shareablePages.map((page) => page.ogImage)
    expect(new Set(images).size).toBe(images.length)
  })
})

describe('sitemap lastModified', () => {
  let entries: MetadataRoute.Sitemap

  beforeAll(async () => {
    entries = await sitemap()
  })

  it.each(productPages.map((page) => page.slug))(
    `%s — an edited page reports ${EDITED_AT} as lastModified`,
    (slug) => {
      const entry = entries.find((item) => item.url === `${BASE_URL}/${encodeURIComponent(slug)}`)
      expect(entry, slug).toBeDefined()
      expect(entry?.lastModified, slug).toBe(EDITED_AT)
    },
  )
})

describe('generateMetadata', () => {
  it.each(META_SLUGS)('%s — og:image and twitter:image point at the page image', (slug) => {
    const page = SEO_PAGES.find((entry) => entry.slug === slug)!
    const meta = generateMetadata({ params: { slug: encodeURIComponent(slug) } })
    const image = meta.openGraph?.images as { url: string; width: number; height: number }[]

    expect(image[0].url).toBe(`https://badfos.co.il${page.ogImage}`)
    expect(image[0].url).not.toBe(`https://badfos.co.il${GENERIC}`)
    expect({ width: image[0].width, height: image[0].height }).toEqual({ width: 1200, height: 630 })
    expect(meta.twitter?.images).toEqual([`https://badfos.co.il${page.ogImage}`])
  })
})
