'use client'

import { useSyncExternalStore } from 'react'
import { canEnlarge, ENLARGE_MAX_STEPS, normalizeEnlarge } from '@/lib/enlarge'
import {
  SWEATSHIRT_DESIGN_AREAS,
  TSHIRT_DESIGN_AREAS,
  getLiveEnlargeStepPrice,
  getPricingVersion,
  subscribePricing,
} from '@/lib/constants'
import { formatPrice } from '@/lib/pricing'

/** 0 = the default size, then one button per step. */
const STEPS = Array.from({ length: ENLARGE_MAX_STEPS + 1 }, (_, i) => i)

/**
 * The print-size control, shared by both designers and both widths.
 *
 * Four joined buttons — רגיל / +1 / +2 / +3 — under a "גודל ההדפס · <area>"
 * title, and a small per-step price line. Pressing a button picks that step
 * outright; רגיל is the way back to the default size. There is deliberately no
 * slider and no drag: the steps are the whole vocabulary.
 *
 * NOTHING HERE STATES A PHYSICAL SIZE. No centimetres, no percentages, no
 * "large/medium" — the customer judges it from the mockup and the 3D model
 * growing in front of them, and the owner sets the real print size from the
 * sketch.
 *
 * The step price is admin-editable (getLiveEnlargeStepPrice), so the line
 * re-renders when the overrides load instead of showing the default.
 *
 * Renders NOTHING at all when the product/area has no enlargement (a chest
 * logo, a shoulder, any product that is not a t-shirt or a sweatshirt) or
 * before the area holds a design — not a disabled control, nothing.
 */
export default function EnlargeControl({
  productType,
  area,
  areaName,
  hasDesign,
  enlarge,
  onChange,
}: {
  productType?: string
  area: string
  /** Defaults to the area's name in the product's area list. */
  areaName?: string
  /** The area must already hold artwork — there is nothing to enlarge otherwise. */
  hasDesign: boolean
  enlarge?: number
  onChange: (steps: number) => void
}) {
  useSyncExternalStore(subscribePricing, getPricingVersion, getPricingVersion)
  if (!canEnlarge(productType, area) || !hasDesign) return null

  const steps = normalizeEnlarge(productType, area, enlarge)
  const areas = productType === 'sweatshirt' ? SWEATSHIRT_DESIGN_AREAS : TSHIRT_DESIGN_AREAS
  const name = areaName ?? areas.find(a => a.id === area)?.name ?? area

  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-gray-700">גודל ההדפס · {name}</div>
      <div
        role="radiogroup"
        aria-label={`גודל ההדפס — ${name}`}
        className="flex overflow-hidden rounded-[10px] border border-yellow-300 bg-white"
      >
        {STEPS.map(n => {
          const active = n === steps
          return (
            <button
              key={n}
              type="button"
              aria-pressed={active}
              onClick={() => { if (!active) onChange(n) }}
              className={`min-h-[44px] flex-1 basis-0 whitespace-nowrap text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-400 ${
                n > 0 ? 'border-r border-yellow-300 ' : ''
              }${
                active
                  ? 'gradient-yellow text-white'
                  : 'bg-white text-yellow-700 hover:bg-yellow-50 active:bg-yellow-100'
              }`}
            >
              {n === 0 ? 'רגיל' : `+${n}`}
            </button>
          )
        })}
      </div>
      <div className="mt-1 text-[11px] text-gray-500">{formatPrice(getLiveEnlargeStepPrice())} לכל צעד ליחידה</div>
    </div>
  )
}
