'use client'

import { useEffect } from 'react'

export default function PricingLoader() {
  useEffect(() => {
    // Dynamic import keeps Firebase out of the initial bundle; load the price
    // overrides ASAP so pages never show the hardcoded default price for long.
    let cancelled = false
    import('@/lib/db').then(({ getDocument }) => {
      import('@/lib/constants').then(({ applyPricingOverrides }) => {
        getDocument<Record<string, any>>('settings', 'pricing')
          .then(data => {
            if (data && !cancelled) applyPricingOverrides(data as any)
          })
          .catch(() => {})
      })
    })
    return () => {
      cancelled = true
    }
  }, [])
  return null
}
