import type { Metadata } from 'next'
import { adminDb } from '@/lib/firebase-admin'
import { getColorLabel, getProductLabel } from '@/lib/constants'
import { PREVIEW_WIDTH, PREVIEW_HEIGHT } from '@/lib/sketch-preview'
import ShareClient from './ShareClient'

// generateMetadata reads Firestore per id, so the route must never be cached
// into the full route cache — a stale entry would keep serving the old preview.
export const dynamic = 'force-dynamic'

/** Today's generic preview. Kept as the fallback for sketches created before
 *  previewUrl existed, and for any capture that failed: WhatsApp renders a bare
 *  grey link when og:image is missing or broken, which is worse than the logo. */
const LOGO_IMAGE = { url: 'https://badfos.co.il/logo.png', width: 512, height: 512, alt: 'בדפוס' }

/** Same constants the capture is sized to, so og:image:width/height can never
 *  drift from the bytes WhatsApp actually fetches. */
const PREVIEW_IMAGE_SIZE = { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }

const FALLBACK_TITLE = 'העיצוב שלי | בדפוס'
const FALLBACK_DESCRIPTION = 'צפו בעיצוב שנוצר בבדפוס — הדפסת חולצות בעיצוב אישי'

type SharedDesignMeta = { productType?: string; color?: string; previewUrl?: string }

/** Fetch the shared design for metadata only. Any failure (Admin SDK not
 *  configured, network, missing doc) resolves to null and the page falls back
 *  to the logo — metadata must never break the page. */
async function fetchDesignMeta(id: string): Promise<SharedDesignMeta | null> {
  try {
    const snap = await adminDb.collection('shared_designs').doc(id).get()
    if (!snap.exists) return null
    return (snap.data() ?? null) as SharedDesignMeta | null
  } catch (err) {
    console.error('share metadata lookup failed:', err instanceof Error ? err.message : err)
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const design = await fetchDesignMeta(params.id)

  // Only https Storage URLs are trusted as og:image — a doc field must never be
  // able to point the crawler at an arbitrary or non-https host.
  const preview =
    design?.previewUrl && /^https:\/\/firebasestorage\.googleapis\.com\//.test(design.previewUrl)
      ? design.previewUrl
      : null

  // Labels come from the shared id→Hebrew lookups, so nothing raw from the
  // document is interpolated into the tags.
  const product = design?.productType ? getProductLabel(design.productType) : null
  const color = design?.color ? getColorLabel(design.color, design.productType) : null

  const title = product ? `הסקיצה שלך מוכנה — ${product} בהתאמה אישית | בדפוס` : FALLBACK_TITLE
  const description = product
    ? `${product}${color ? ` בצבע ${color}` : ''} עם העיצוב שלך — לחצו לצפייה בסקיצה בתלת־ממד מכל הזוויות.`
    : FALLBACK_DESCRIPTION

  const image = preview
    ? { url: preview, ...PREVIEW_IMAGE_SIZE, alt: title }
    : LOGO_IMAGE

  return {
    title,
    description,
    robots: 'noindex',
    openGraph: {
      title,
      description,
      siteName: 'בדפוס',
      locale: 'he_IL',
      type: 'website',
      images: [image],
    },
  }
}

export default function SharePage() {
  return <ShareClient />
}
