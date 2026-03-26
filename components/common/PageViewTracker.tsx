'use client'

import { useEffect } from 'react'

/**
 * Fires a page_view event to gtag when the component mounts.
 * Used on key pages (designer, cart) to ensure Google Tag Assistant detects conversions.
 */
export default function PageViewTracker({ pageName }: { pageName: string }) {
  useEffect(() => {
    // Wait for gtag to be available
    const tryFire = () => {
      if (window.gtag) {
        window.gtag('event', 'page_view', {
          page_title: pageName,
          page_location: window.location.href,
        })
      }
    }

    // Try immediately, then retry after scripts load
    tryFire()
    const timer = setTimeout(tryFire, 2000)
    return () => clearTimeout(timer)
  }, [pageName])

  return null
}
