import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SEO_PAGES, getSeoPage } from '@/lib/seo-pages'
import { CONTACT_INFO } from '@/lib/constants'
import { LAYOUTS, DefaultLayout } from '@/components/seo/layouts'

const BASE_URL = 'https://badfos.co.il'

// Static generation of exactly the SEO_PAGES slugs — unknown slugs return 404
export const dynamicParams = false

export function generateStaticParams() {
  return SEO_PAGES.map((page) => ({ slug: page.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = getSeoPage(decodeURIComponent(params.slug))
  if (!page) return {}

  const canonicalPath = `/${encodeURIComponent(page.slug)}`
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `${BASE_URL}${canonicalPath}`,
      siteName: 'בדפוס',
      locale: 'he_IL',
      type: 'website',
    },
  }
}

export default function SeoLandingPage({ params }: { params: { slug: string } }) {
  const page = getSeoPage(decodeURIComponent(params.slug))
  if (!page) notFound()

  const pageUrl = `${BASE_URL}/${encodeURIComponent(page.slug)}`
  const waUrl = `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(`היי! הגעתי מהאתר ואני מתעניין ב${page.h1} 🙂`)}`

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'בית', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: page.h1, item: pageUrl },
    ],
  }

  // Per-slug editorial layout — pages without a custom layout keep the default look
  const Layout = LAYOUTS[page.slug] ?? DefaultLayout

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />
      <Layout page={page} waUrl={waUrl} />
    </>
  )
}
