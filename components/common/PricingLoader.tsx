'use client'

import { useEffect } from 'react'
import { getDocument } from '@/lib/db'
import { applyPricingOverrides } from '@/lib/constants'

export default function PricingLoader() {
  useEffect(() => {
    getDocument<Record<string, any>>('settings', 'pricing')
      .then(data => {
        if (data) applyPricingOverrides(data as any)
      })
      .catch(() => {})
  }, [])
  return null
}
