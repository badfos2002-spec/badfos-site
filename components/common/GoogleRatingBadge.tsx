'use client'

import { useEffect, useState } from 'react'

type GoogleRating = { rating: number; reviewCount: number }

// One request per page load, shared by every badge on the page (CDN caches the route for 6h)
let ratingPromise: Promise<GoogleRating | null> | null = null

function loadGoogleRating(): Promise<GoogleRating | null> {
  if (!ratingPromise) {
    ratingPromise = fetch('/api/google-business')
      .then(r => (r.ok ? r.json() : null))
      .then(data =>
        typeof data?.rating === 'number' && typeof data?.reviewCount === 'number' && data.reviewCount > 0
          ? { rating: data.rating, reviewCount: data.reviewCount }
          : null
      )
      .catch(() => null)
  }
  return ratingPromise
}

// Live text + number-free fallback (no fake numbers while loading / on failure).
// minWidth roughly reserves the live text width so the swap doesn't shift layout.
const VARIANTS = {
  full: { live: (r: string, n: number) => `${r}★ · ${n} ביקורות בגוגל`, fallback: 'ביקורות בגוגל', minWidth: '19ch' },
  short: { live: (r: string) => `${r} בגוגל`, fallback: 'ביקורות בגוגל', minWidth: '7ch' },
  score: { live: (r: string) => `${r} מתוך 5`, fallback: 'מה הלקוחות אומרים', minWidth: '8ch' },
  count: { live: (_r: string, n: number) => `${n} ביקורות בגוגל`, fallback: 'ביקורות אמיתיות בגוגל', minWidth: '13ch' },
} as const

// Live rating for callers that render their own UI (e.g. star rows); null while loading / on failure
export function useGoogleRating(): GoogleRating | null {
  const [data, setData] = useState<GoogleRating | null>(null)
  useEffect(() => {
    let alive = true
    loadGoogleRating().then(d => { if (alive) setData(d) })
    return () => { alive = false }
  }, [])
  return data
}

export default function GoogleRatingBadge({
  variant = 'full',
  className,
}: {
  variant?: keyof typeof VARIANTS
  className?: string
}) {
  const data = useGoogleRating()
  const v = VARIANTS[variant]
  return (
    <span className={className} style={{ display: 'inline-block', minWidth: v.minWidth }}>
      {data ? v.live(data.rating.toFixed(1), data.reviewCount) : v.fallback}
    </span>
  )
}
