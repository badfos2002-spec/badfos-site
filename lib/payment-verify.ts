/**
 * The two halves of one contract: the item list the cart sends to
 * /api/payment/create, and the server-side check that re-prices it.
 *
 * They live together, in lib/ and not in the route, for two reasons. They have
 * to agree — the server can only verify a field the client actually sends, and
 * the bug this file exists to prevent is exactly that gap (see
 * buildPaymentItems below). And Next 14 type-validates route exports and
 * rejects anything that is not an HTTP method, so verifyAmount could not be
 * exported from app/api/payment/create/route.ts to be tested.
 *
 * Nothing here may import firebase-admin or anything else server-only:
 * CartPage imports buildPaymentItems into the browser bundle.
 */

import type { CartItem } from './types'
import { EXPRESS_PICKUP, getLiveShippingCost } from './constants'
import { calculateItemPrice, applyQuantityDiscount } from './pricing'
import { normalizeEnlarge } from './enlarge'

/**
 * The items the cart sends with every payment-link request.
 *
 * Items are ALWAYS sent — server-side amount verification must run on EVERY
 * link request, prefetches included. (The old pre-fetch omitted them and
 * silently skipped verifyAmount — never again.)
 *
 * Only the fields verification needs are sent, never the artwork. That list
 * used to be `{ area: d.area }` and nothing else, which is why the print
 * enlargement had to be added here as well as to the price: without it the
 * server re-prices an enlarged cart at the plain price, finds the customer's
 * total too high and refuses the charge with "Amount verification failed".
 *
 * `enlarge` goes out only above 0 step, already normalised — so a plain design
 * sends exactly the bytes it sends today, and a crafted value is clamped
 * before it can be verified against.
 */
export function buildPaymentItems(items: CartItem[]): Record<string, unknown>[] {
  return items.map((i) => ({
    productType: i.productType,
    fabricType: i.fabricType,
    designs: i.designs.map((d) => {
      const steps = normalizeEnlarge(i.productType, d.area, d.enlarge)
      return steps > 0 ? { area: d.area, enlarge: steps } : { area: d.area }
    }),
    sizes: i.sizes,
    fixedPrice: i.fixedPrice,
    totalQuantity: i.totalQuantity,
  }))
}

/**
 * Server-side price verification — runs THE SAME code the cart runs.
 *
 * History, so nobody reintroduces the bug: the payment route used to carry its
 * own hardcoded price table "mirroring" lib/constants.ts. It drifted — cap was
 * 0 (falsy → fell back to 37 instead of the real 30), and tote/baby/vest were
 * missing entirely — so once verification started running on every request
 * (checkout reorder, a423003), every cap/tote/vest/baby cart was refused with
 * "Amount verification failed" and customers could not pay. A copied table
 * WILL rot; calculateItemPrice/applyQuantityDiscount from lib/pricing are the
 * exact functions the customer's cart used to display the total.
 *
 * Admin price overrides (settings/pricing, editable at /admin/pricing) are
 * loaded into the same module state the client hydrates via PricingLoader —
 * without this, any admin price change would break verification the same way.
 * The caller is responsible for having applied them (loadPricingOverrides in
 * the route) before calling in.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function verifyAmount(items: any[], clientAmount: number, couponDiscount: number = 0, express: boolean = false): boolean {
  if (!items || items.length === 0) return true

  let subtotal = 0
  let totalQuantity = 0
  for (const item of items) {
    // calculateItemPrice is the exact per-unit price the cart displayed,
    // including fixed-price packages, per-product area prices, print
    // enlargement and weighted size surcharges — all with admin overrides
    // applied.
    const unit = calculateItemPrice({ ...item, designs: item.designs || [], sizes: item.sizes || [] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qty = (item.sizes || []).reduce((sum: number, s: any) => sum + (Number(s?.quantity) || 0), 0)
    subtotal += unit * qty
    totalQuantity += qty
  }

  const discount = applyQuantityDiscount(totalQuantity, subtotal)
  const serverAmount = subtotal - discount - couponDiscount

  // Express pickup surcharge is legitimate ONLY for small orders —
  // never a silent ₪50 allowance on a big order
  const expressAllowance = express && totalQuantity <= EXPRESS_PICKUP.maxQuantity ? EXPRESS_PICKUP.cost : 0
  // Allow only shipping variance + express (when eligible) + ₪2 rounding tolerance
  const min = serverAmount - 2 // rounding
  const max = serverAmount + getLiveShippingCost('delivery') + expressAllowance + 2 // shipping + express + rounding
  if (clientAmount < min || clientAmount > max) {
    console.error(`Price mismatch: server=${serverAmount}, client=${clientAmount}, diff=${clientAmount - serverAmount}`)
    return false
  }
  return true
}
