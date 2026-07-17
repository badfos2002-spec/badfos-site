/**
 * Pure decision logic for the pending-order lifecycle on the cart page.
 *
 * Root cause of duplicate orders #1312/#1313: a customer who returned to the
 * cart after >10 minutes had their order marked cart_abandoned AND the
 * tracked orderId thrown away — so an ACTIVE re-checkout created a brand-new
 * order with the same phone/total, and one payment ended up marking both.
 *
 * The rule now: the 10-minute abandonment marking stays (alerts, recovery),
 * but the orderId is KEPT so an active re-checkout reuses + revives the SAME
 * order (via /api/order-sync, which flips cart_abandoned back to
 * pending_payment). Only a paid/deleted order stops being tracked.
 */

export const PENDING_ORDER_STALE_MS = 10 * 60 * 1000

export type CartRevisitAction =
  /** order still fresh — leave everything as is */
  | 'keep_waiting'
  /** stale + still pending → mark cart_abandoned, but KEEP the orderId for reuse */
  | 'mark_abandoned'
  /** already cart_abandoned → keep the orderId, an active re-checkout revives it */
  | 'keep_for_reuse'
  /** paid / gone → stop tracking this order */
  | 'forget'

export function resolveCartRevisit(
  ageMs: number,
  orderStatus: string | null | undefined
): CartRevisitAction {
  if (ageMs < PENDING_ORDER_STALE_MS) return 'keep_waiting'
  if (orderStatus === 'pending_payment') return 'mark_abandoned'
  if (orderStatus === 'cart_abandoned') return 'keep_for_reuse'
  return 'forget'
}

/**
 * order-sync failure reasons after which paying against the existing order
 * would be WRONG (it's paid, deleted, or belongs to another customer) —
 * checkout must create a brand-new order with a FRESH paymentId instead.
 * Any other failure is treated as transient: reuse the order (best-effort,
 * exactly like before).
 */
export const CREATE_FRESH_ORDER_REASONS = [
  'order_not_found',
  'unauthorized',
  'status_not_syncable',
]
