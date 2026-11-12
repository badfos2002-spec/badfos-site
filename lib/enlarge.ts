/**
 * Print enlargement in steps.
 *
 * The customer presses "+" to grow a print by 10% of its default size, up to
 * three presses, centred in its area. There is no "−", no slider and no
 * dragging, and nothing anywhere states a physical size — the customer judges
 * it from the mockup and the 3D model, and the owner sets the real print size
 * from the sketch.
 *
 * ONE COPY OF EACH NUMBER. The 10% step and the 3-step ceiling live here and
 * nowhere else: the 2D overlays, the 3D decal transform, the price, the cart-item
 * id, the order sanitiser and the admin card all come through these helpers. The
 * money per step is NOT here — it is admin-editable, so it lives next to the
 * other live prices in lib/constants.ts (getLiveEnlargeStepPrice).
 *
 * TWO INVARIANTS WORTH KNOWING BEFORE YOU EDIT THIS FILE:
 *
 * 1. The gate is productType AND area, never area alone. `front_full` and
 *    `back` exist on totes and baby bodysuits too, and `back` on the vest —
 *    none of which offers enlargement. An area-only check would price and
 *    render an enlargement on a tote.
 *
 * 2. A value out of range is CLAMPED, never dropped. `enlarge: 7` from a
 *    crafted payload becomes 3 in the sanitised document, in the price the
 *    server verifies and in the scale the preview draws — so the stored order
 *    and the amount charged can never disagree. Dropping it in one place and
 *    clamping in another is how that happens.
 */

import type { DesignArea } from './types'

/** How many times "+" can be pressed. */
export const ENLARGE_MAX_STEPS = 3

/** How much bigger each press makes the print, as a fraction of its default. */
export const ENLARGE_STEP_SCALE = 0.1

/** The only print areas big enough to be worth enlarging. */
export const ENLARGEABLE_AREAS: readonly string[] = ['front_full', 'back']

/** The only products that offer it. */
export const ENLARGEABLE_PRODUCTS: readonly string[] = ['tshirt', 'sweatshirt']

/** Does this product/area pair offer enlargement at all? */
export function canEnlarge(productType?: string, area?: string): boolean {
  if (!productType || !area) return false
  return ENLARGEABLE_PRODUCTS.includes(productType) && ENLARGEABLE_AREAS.includes(area)
}

/**
 * The step count that actually applies — the single gate every consumer goes
 * through. 0 means "no enlargement", and 0 is also what an area or product
 * without the feature always gets, however the value arrived.
 */
export function normalizeEnlarge(productType: unknown, area: unknown, enlarge: unknown): number {
  if (!canEnlarge(typeof productType === 'string' ? productType : undefined, typeof area === 'string' ? area : undefined)) {
    return 0
  }
  return clampSteps(enlarge)
}

/** Steps alone, with no product/area context — clamped into 0…3. */
function clampSteps(enlarge: unknown): number {
  const n = typeof enlarge === 'number' && isFinite(enlarge) ? Math.floor(enlarge) : 0
  if (n <= 0) return 0
  return Math.min(n, ENLARGE_MAX_STEPS)
}

/** The visual scale factor: 1 at rest, +10% per step, 1.3 at the ceiling. */
export function enlargeScale(enlarge?: number): number {
  return 1 + ENLARGE_STEP_SCALE * clampSteps(enlarge)
}

/** The shape the 3D decal takes. Enlargement grows the print in place, so the
 *  offsets are always 0 — only the admin sketch tool ever moves a design. */
export type EnlargeTransform = { dx: number; dy: number; scale: number }

export function enlargeTransform(enlarge?: number): EnlargeTransform {
  return { dx: 0, dy: 0, scale: enlargeScale(enlarge) }
}

/** The chip the customer reads. The ONLY readout of the enlargement. */
export function enlargeLabel(steps: number): string {
  return `הגדלה +${steps}`
}

/**
 * Write a step count onto one area's design.
 *
 * At 0 — and on any product/area without the feature — the key is DELETED
 * rather than set, because lib/firebase.ts has no `ignoreUndefinedProperties`
 * and addDoc throws on an explicit undefined; an `enlarge: 0` would also split
 * the cart-item id away from the identical plain design.
 */
export function withEnlarge<T extends DesignArea>(
  designs: T[],
  productType: string | undefined,
  area: string,
  steps: number
): T[] {
  return designs.map((d) => {
    if (d.area !== area) return d
    const normalized = normalizeEnlarge(productType, area, steps)
    const { enlarge: _dropped, ...rest } = d
    return (normalized > 0 ? { ...rest, enlarge: normalized } : rest) as T
  })
}

/** A design as the previews hold it: the 3D stage and the 2D overlays. */
export type PreviewDesign = {
  area: string
  url: string
  enlarge?: number
  /** An admin sketch's own placement, which always wins over the enlargement. */
  transform?: EnlargeTransform
}

/**
 * The designs → `ShirtDesign[]` mapping every Preview3DStage caller uses.
 *
 * It lives in lib/ and not under components/designer/three/ so it can be tested
 * without React Three Fiber, and so the 3D stage keeps its single `transform`
 * entry point instead of growing a second notion of size.
 */
export function to3DDesigns(
  productType: string | undefined,
  designs: PreviewDesign[]
): { area: string; url: string; transform: EnlargeTransform }[] {
  return designs.map((d) => ({
    area: d.area,
    url: d.url,
    transform: d.transform ?? enlargeTransform(normalizeEnlarge(productType, d.area, d.enlarge)),
  }))
}
