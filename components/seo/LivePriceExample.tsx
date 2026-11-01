'use client'

// Live-priced scenario card for SEO pages (SeoPage.priceExamples). Priced on the
// client from the same getters the designers/cart use, once the admin pricing
// overrides load (PricingLoader); until then — and in the SSG HTML — it shows a
// number-free placeholder, so the page never quotes a stale code default.

import { useSyncExternalStore } from 'react'
import {
  getBasePrice,
  getDesignAreasByProductType,
  getLiveQuantityDiscount,
  getSizeSurcharge,
  subscribePricing,
  getPricingVersion,
} from '@/lib/constants'
import { applyQuantityDiscount } from '@/lib/pricing'
import type { SeoPagePriceExample } from '@/lib/seo-pages'

const SERVER_VERSION = () => 0

/** Same rounding as the cart's formatPrice (toFixed(0)), plus a thousands separator */
const shekel = (n: number) => `₪${Math.round(n).toLocaleString('en-US')}`

export default function LivePriceExample({ example }: { example: SeoPagePriceExample }) {
  const version = useSyncExternalStore(subscribePricing, getPricingVersion, SERVER_VERSION)
  const loaded = version > 0

  const { productType, fabric, areas, size, label, note } = example
  const quantity = example.quantity ?? 1
  const productAreas = getDesignAreasByProductType(productType)
  const areasPrice = areas.reduce((sum, id) => {
    return sum + (productAreas.find((a) => a.id === id)?.price ?? 0)
  }, 0)
  const unit = getBasePrice(productType, fabric) + areasPrice + (size ? getSizeSurcharge(size) : 0)
  const subtotal = unit * quantity
  const discount = applyQuantityDiscount(quantity, subtotal)
  const { minQuantity, discountPercent } = getLiveQuantityDiscount()

  return (
    <div className="flex h-full flex-col rounded-3xl border border-black/5 bg-white p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.25)]">
      <h3 className="font-extrabold text-lg text-[#1e293b] mb-3">{label}</h3>
      <p className="text-3xl font-black text-[#b45309]">
        {loaded ? shekel(unit) : '₪…'}
        <span className="text-base font-bold text-[#64748b]"> ליחידה</span>
      </p>
      {quantity > 1 && (
        // Reserve the discount tag's line while prices load, so cards don't jump
        <div className={`mt-2 ${quantity >= minQuantity ? 'min-h-[3.5rem]' : ''}`}>
          <p className="flex flex-wrap items-baseline gap-x-2 font-bold text-[#1e293b]">
            <span>{quantity} יחידות:</span>
            {loaded && discount > 0 && (
              <s className="font-semibold text-[#94a3b8]">{shekel(subtotal)}</s>
            )}
            <span>{loaded ? shekel(subtotal - discount) : '₪…'}</span>
          </p>
          {loaded && discount > 0 && (
            <span className="mt-1.5 block w-fit rounded-full bg-[#ecfdf3] px-2.5 py-0.5 text-xs font-extrabold text-[#15803d]">
              כולל {discountPercent}% הנחת כמות
            </span>
          )}
        </div>
      )}
      {note && <p className="mt-3 text-sm leading-relaxed text-[#64748b]">{note}</p>}
    </div>
  )
}
