import { describe, it, expect, vi } from 'vitest'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { SEO_PAGES } from '@/lib/seo-pages'
import { generateMetadata } from '@/app/[slug]/page'

// TICKET-031 item D: every product landing page gets its own 1200x630 og:image
// cropped from that page's own galleryImages, instead of the generic /og/home.jpg.

vi.mock('@/lib/tracking', () => ({ trackWhatsAppClick: vi.fn() }))
vi.mock('@/components/common/GoogleRatingBadge', () => ({ default: () => null }))

const GENERIC = '/og/home.jpg'
const MAX_BYTES = 300 * 1024
const publicPath = (src: string) => join(__dirname, '..', 'public', decodeURIComponent(src))

const productPages = SEO_PAGES.filter((page) => page.productType)

/** Sample of the product pages, asserted through the real generateMetadata(). */
const META_SLUGS = ['הדפסה-על-כובעים', 'הדפסת-תיקי-בד', 'בגדי-גוף-מודפסים-לתינוקות']

describe('og:image files', () => {
  // Regression guard — green before this ticket too (all 14 existing /og files are
  // already 1200x630 and well under 300 KB). It is here so the 11 new files are
  // held to the same contract the moment they land.
  it.each(SEO_PAGES.map((page) => [page.slug, page.ogImage] as const))(
    '%s — ogImage exists under /public and is 1200x630',
    async (_slug, ogImage) => {
      expect(ogImage.startsWith('/og/'), ogImage).toBe(true)
      expect(existsSync(publicPath(ogImage)), ogImage).toBe(true)
      const meta = await sharp(publicPath(ogImage)).metadata()
      expect({ width: meta.width, height: meta.height }).toEqual({ width: 1200, height: 630 })
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
