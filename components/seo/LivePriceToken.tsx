'use client'

// Client island for one {{…}} price token in SEO copy (see lib/seo-price-tokens.ts).
// Until the admin pricing overrides load (PricingLoader → applyPricingOverrides
// bumps the version) it shows a number-free placeholder — the SSG HTML never
// carries a build-time shekel amount that could contradict checkout.

import { useSyncExternalStore } from 'react'
import { subscribePricing, getPricingVersion } from '@/lib/constants'
import { resolvePriceToken, priceTokenPlaceholder } from '@/lib/seo-price-tokens'

const SERVER_VERSION = () => 0

export default function LivePriceToken({ token }: { token: string }) {
  const version = useSyncExternalStore(subscribePricing, getPricingVersion, SERVER_VERSION)
  if (version === 0) return <span className="text-gray-400">{priceTokenPlaceholder(token)}</span>
  return <>{resolvePriceToken(token)}</>
}
