import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import DealDetail from '@/components/deals/DealDetail'
import { getLiveDealBySlug } from '@/lib/deals-server'
import { dealImage, dealPath, dealUrl, SITE_URL } from '@/lib/deals'

export const revalidate = 60

type Props = { params: { slug: string } }

const abs = (u: string) => (u.startsWith('/') ? `${SITE_URL}${u}` : u)

function slugOf(params: Props['params']): string {
  try {
    return decodeURIComponent(params.slug)
  } catch {
    return params.slug
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const deal = await getLiveDealBySlug(slugOf(params))
  if (!deal) return {}
  const title = `${deal.title} | מבצע בבדפוס`
  const img = dealImage(deal, 'desktop')
  const image = img ? abs(img) : `${SITE_URL}/logo.png`
  return {
    title,
    description: deal.shortText,
    alternates: { canonical: dealPath(deal.slug) },
    openGraph: {
      title,
      description: deal.shortText,
      url: dealUrl(deal.slug),
      siteName: 'בדפוס',
      locale: 'he_IL',
      type: 'website',
      images: [{ url: image, alt: deal.title }],
    },
    twitter: { card: 'summary_large_image', title, description: deal.shortText, images: [image] },
  }
}

export default async function DealPage({ params }: Props) {
  const deal = await getLiveDealBySlug(slugOf(params))
  if (!deal) notFound()
  return <DealDetail deal={deal} />
}
