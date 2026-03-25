'use client'

import { useEffect } from 'react'
import { getDocument } from '@/lib/db'
import { applyPricingOverrides } from '@/lib/constants'

export default function PricingLoader() {
  useEffect(() => {
    // Defer pricing fetch — not needed for initial paint
    const timer = setTimeout(() => {
      getDocument<Record<string, any>>('settings', 'pricing')
        .then(data => {
          if (data) applyPricingOverrides(data as any)
        })
        .catch(() => {})
    }, 2000)
    return () => clearTimeout(timer)
  }, [])
  return null
}
