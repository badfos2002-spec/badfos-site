'use client'

// Live base price for SEO product pages — same subscription pattern as the
// designers: SSR renders the code default, and once the admin pricing
// overrides load (PricingLoader) the component re-renders with the live price.

import { useSyncExternalStore } from 'react'
import { getBasePrice, subscribePricing, getPricingVersion } from '@/lib/constants'
import type { ProductType } from '@/lib/types'

export default function LiveBasePrice({ productType }: { productType: ProductType }) {
  useSyncExternalStore(subscribePricing, getPricingVersion, getPricingVersion)
  return <>{getBasePrice(productType)}₪</>
}
