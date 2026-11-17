// Live base price for SEO product pages — the {{base:<product>}} price token
// (cheapest sub-type base, from the live admin pricing). Number-free placeholder
// until the overrides load, so the SSG HTML never shows a stale code default.

import type { ProductType } from '@/lib/types'
import LivePriceToken from './LivePriceToken'

export default function LiveBasePrice({ productType, subType }: { productType: ProductType; subType?: string }) {
  return <LivePriceToken token={subType ? `base:${productType}:${subType}` : `base:${productType}`} />
}
