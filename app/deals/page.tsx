import type { Metadata } from 'next'
import DealsGrid from '@/components/deals/DealsGrid'
import { getLiveDeals } from '@/lib/deals-server'
import { dealImage, SITE_URL } from '@/lib/deals'

export const revalidate = 60

const TITLE = 'מבצעים | בדפוס'
const DESCRIPTION = 'המבצעים הפעילים של בדפוס על הדפסת חולצות ומוצרי טקסטיל. לפרטים — וואטסאפ או טלפון.'

const abs = (u: string) => (u.startsWith('/') ? `${SITE_URL}${u}` : u)

export async function generateMetadata(): Promise<Metadata> {
  const [first] = await getLiveDeals()
  const img = first ? dealImage(first, 'desktop') : undefined
  const image = img ? abs(img) : `${SITE_URL}/logo.png`
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: '/deals' },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: `${SITE_URL}/deals`,
      siteName: 'בדפוס',
      locale: 'he_IL',
      type: 'website',
      images: [{ url: image, alt: 'מבצעים בבדפוס' }],
    },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [image] },
  }
}

export default async function DealsPage() {
  const deals = await getLiveDeals()
  return <DealsGrid deals={deals} />
}
