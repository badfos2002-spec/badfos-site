import { NextResponse } from 'next/server'

const PLACE_ID = 'ChIJdWBwSp2984gRNGbFgb-Kykc'
const API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

// In-memory cache — refreshes every 6 hours
let cache: { data: any; ts: number } | null = null
const CACHE_TTL = 6 * 60 * 60 * 1000

type ReviewData = {
  author: string
  authorPhoto: string
  rating: number
  text: string
  time: string
  googleMapsUrl: string
}

function mapReviews(reviews: any[]): ReviewData[] {
  return (reviews || []).map((r: any) => ({
    author: r.authorAttribution?.displayName || 'אנונימי',
    authorPhoto: r.authorAttribution?.photoUri || '',
    rating: r.rating || 5,
    text: r.text?.text || '',
    time: r.relativePublishTimeDescription || '',
    googleMapsUrl: r.authorAttribution?.uri || '',
  }))
}

async function fetchPlace(fieldMask: string) {
  const url = `https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=he`
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': fieldMask,
    },
  })
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  if (!API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY is not set')
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const mainFields = 'id,displayName,formattedAddress,rating,userRatingCount,reviews,nationalPhoneNumber,websiteUri,currentOpeningHours,googleMapsUri'
    const mainRes = await fetchPlace(mainFields)

    if (!mainRes.ok) {
      const errText = await mainRes.text()
      console.error('Google Places API error:', mainRes.status, errText)
      // Return empty fallback instead of 502 — prevents console errors
      return NextResponse.json({
        name: 'בדפוס הדפסת חולצות',
        address: 'דובנוב 10, ראשון לציון',
        phone: '055-988-5954',
        rating: 5,
        reviewCount: 30,
        googleMapsUrl: '',
        website: 'https://badfos.co.il',
        openingHours: [],
        isOpenNow: false,
        reviews: [],
      })
    }

    const raw = await mainRes.json()

    // Fetch newest reviews separately to get more unique reviews
    let newestReviews: ReviewData[] = []
    try {
      const newestRes = await fetch(
        `https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=he`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': 'reviews',
          },
        }
      )
      if (newestRes.ok) {
        const newestRaw = await newestRes.json()
        newestReviews = mapReviews(newestRaw.reviews)
      }
    } catch { /* ignore secondary fetch failure */ }

    // Merge and deduplicate
    const mainReviews = mapReviews(raw.reviews)
    const seen = new Set<string>()
    const allReviews: ReviewData[] = []
    for (const r of [...mainReviews, ...newestReviews]) {
      const key = r.author + r.text.slice(0, 30)
      if (!seen.has(key)) {
        seen.add(key)
        allReviews.push(r)
      }
    }

    const data = {
      name: raw.displayName?.text || 'בדפוס הדפסת חולצות',
      address: raw.formattedAddress || '',
      phone: raw.nationalPhoneNumber || '',
      rating: raw.rating || 5,
      reviewCount: raw.userRatingCount || 0,
      googleMapsUrl: raw.googleMapsUri || '',
      website: raw.websiteUri || '',
      openingHours: (raw.currentOpeningHours?.periods || []).map((p: any) => ({
        day: p.open?.day,
        open: `${String(p.open?.hour ?? 0).padStart(2, '0')}:${String(p.open?.minute ?? 0).padStart(2, '0')}`,
        close: `${String(p.close?.hour ?? 0).padStart(2, '0')}:${String(p.close?.minute ?? 0).padStart(2, '0')}`,
      })),
      isOpenNow: raw.currentOpeningHours?.openNow ?? false,
      reviews: allReviews,
    }

    cache = { data, ts: Date.now() }
    return NextResponse.json(data)
  } catch (err) {
    console.error('Google Places fetch error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
