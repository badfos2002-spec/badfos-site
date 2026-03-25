'use client'

import { useEffect } from 'react'

export default function PricingLoader() {
  useEffect(() => {
    // Dynamic import — Firebase not bundled in initial load
    const timer = setTimeout(() => {
      import('@/lib/db').then(({ getDocument }) => {
        import('@/lib/constants').then(({ applyPricingOverrides }) => {
          getDocument<Record<string, any>>('settings', 'pricing')
            .then(data => {
              if (data) applyPricingOverrides(data as any)
            })
            .catch(() => {})
        })
      })
    }, 2000)
    return () => clearTimeout(timer)
  }, [])
  return null
}
