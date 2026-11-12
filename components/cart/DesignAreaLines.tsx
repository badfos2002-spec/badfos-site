import type { DesignArea } from '@/lib/types'
import { enlargeLabel, normalizeEnlarge } from '@/lib/enlarge'
import { getLiveEnlargeStepPrice } from '@/lib/constants'
import { formatAmount } from '@/lib/pricing'

/**
 * The "עיצובים:" block of a cart line — each print area, and what its
 * enlargement adds per unit.
 *
 * Naming the surcharge here is the point: the item price already includes it,
 * so without a line saying "הגדלה +2 · +₪3 ליחידה" the customer sees a shirt
 * that costs ₪3 more than the price list for no visible reason.
 *
 * Its own component (rather than markup inside CartItem) so it can be tested:
 * CartItem pulls in the Zustand store, next/navigation and lib/db (Firebase).
 */
export default function DesignAreaLines({
  productType,
  designs,
}: {
  productType?: string
  designs: DesignArea[]
}) {
  if (designs.length === 0) return null

  const stepPrice = getLiveEnlargeStepPrice()

  return (
    <div className="mb-2">
      <p className="text-sm font-medium">עיצובים:</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-gray">
        {designs.map((d) => {
          const steps = normalizeEnlarge(productType, d.area, d.enlarge)
          return (
            <span key={d.area} className="flex flex-wrap items-center gap-1">
              <span>{d.areaName}</span>
              {steps > 0 && (
                <>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                    {enlargeLabel(steps)}
                  </span>
                  <span className="text-xs text-gray-500">
                    +₪{formatAmount(steps * stepPrice)} ליחידה
                  </span>
                </>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
