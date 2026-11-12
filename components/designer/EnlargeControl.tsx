'use client'

import { canEnlarge, enlargeLabel, ENLARGE_MAX_STEPS, normalizeEnlarge } from '@/lib/enlarge'

/**
 * The print-enlargement control, shared by both designers and both widths.
 *
 * A "+" that grows the print 10% per press up to three presses, a reset, and a
 * "הגדלה +n" chip. There is deliberately NO "−", no slider and no drag: the
 * steps are the whole vocabulary, and a reset covers every way back.
 *
 * NOTHING HERE STATES A PHYSICAL SIZE. No centimetres, no "large/medium", no
 * explanation of what the print will measure — the customer judges it from the
 * mockup and the 3D model growing in front of them, and the owner sets the real
 * print size from the sketch. The chip is the only readout.
 *
 * One component for mobile and desktop: a wrapping inline row that fits beside
 * an upload card at 360 px and sits in the same place on a desktop card. The
 * "+" and the reset are both at least 44×44 px so they are thumb-reachable, and
 * the whole row stays inline with the area it belongs to rather than below the
 * fold.
 *
 * Renders NOTHING at all when the product/area has no enlargement (a chest
 * logo, a shoulder, any product that is not a t-shirt or a sweatshirt) or
 * before the area holds a design — not a disabled control, nothing.
 */
export default function EnlargeControl({
  productType,
  area,
  hasDesign,
  enlarge,
  onChange,
}: {
  productType?: string
  area: string
  /** The area must already hold artwork — there is nothing to enlarge otherwise. */
  hasDesign: boolean
  enlarge?: number
  onChange: (steps: number) => void
}) {
  if (!canEnlarge(productType, area) || !hasDesign) return null

  const steps = normalizeEnlarge(productType, area, enlarge)
  const atMax = steps >= ENLARGE_MAX_STEPS

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-label="הגדלת העיצוב"
        disabled={atMax}
        onClick={() => onChange(Math.min(steps + 1, ENLARGE_MAX_STEPS))}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-yellow-300 bg-white text-xl font-bold leading-none text-yellow-600 transition-colors hover:border-yellow-400 hover:bg-yellow-50 active:bg-yellow-100 disabled:opacity-50 disabled:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
      >
        +
      </button>

      <span className="text-[11px] font-medium text-gray-500">הגדלת העיצוב</span>

      {steps > 0 && (
        <>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
            {enlargeLabel(steps)}
          </span>
          <button
            type="button"
            onClick={() => onChange(0)}
            className="min-h-[44px] rounded-lg px-3 text-xs font-medium text-gray-500 underline transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
          >
            חזרה לגודל רגיל
          </button>
        </>
      )}
    </div>
  )
}
