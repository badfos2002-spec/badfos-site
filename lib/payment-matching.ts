/**
 * Pure payment→order matching logic for the Grow webhook / payment-confirm
 * FALLBACK path (used when the transaction can't be matched by exact
 * paymentId — Grow sometimes omits cField1).
 *
 * Extracted to a pure, unit-testable function after orders #1312/#1313 were
 * BOTH marked paid for a single payment: the customer's first order was
 * abandoned+recreated at re-checkout, client-confirm marked the new order
 * paid, and then the webhook's phone+amount fallback — which only looked at
 * still-open orders — found exactly one "match": the stale duplicate.
 *
 * Guards implemented here:
 * (b) among fallback candidates, prefer the MOST RECENT open order
 * (c) NEVER auto-mark via fallback when a sibling order was already paid
 *     with the same sum recently — flag for manual review instead
 * (d) skip candidates whose paymentId is set and differs from the
 *     transaction's paymentId
 * (a) — exact paymentId match first — stays in the routes, before this runs.
 */

export interface OrderCandidate {
  id: string
  status: string
  total: number
  createdAtMs: number
  orderNumber?: number
  paymentId?: string
  paidAtMs?: number
  paymentSum?: number
  supersededByOrderId?: string
}

/** A sibling paid with the same sum within this window blocks fallback matching */
export const PAID_SIBLING_WINDOW_MS = 6 * 60 * 60 * 1000 // 6 hours

const AMOUNT_TOLERANCE = 0.5

const OPEN_STATUSES = ['pending_payment', 'cart_abandoned']

export type FallbackResult =
  | { action: 'match'; order: OrderCandidate; candidates: OrderCandidate[] }
  | { action: 'suspect_duplicate'; paidSibling: OrderCandidate; candidates: OrderCandidate[] }
  | { action: 'none' }

/** Convert a Firestore order doc (id + data) to a plain, matchable candidate */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function orderToCandidate(id: string, data: any): OrderCandidate {
  return {
    id,
    status: String(data?.status || ''),
    total: Number(data?.total) || 0,
    createdAtMs: data?.createdAt?.toMillis?.() || 0,
    orderNumber: data?.orderNumber,
    paymentId: typeof data?.paymentId === 'string' ? data.paymentId : undefined,
    paidAtMs: data?.paidAt?.toMillis?.() ?? undefined,
    paymentSum: typeof data?.paymentSum === 'number' ? data.paymentSum : undefined,
    supersededByOrderId:
      typeof data?.supersededByOrderId === 'string' ? data.supersededByOrderId : undefined,
  }
}

function sameAmount(a: number, b: number): boolean {
  return Math.abs(a - b) < AMOUNT_TOLERANCE
}

export function pickFallbackOrder(
  orders: OrderCandidate[],
  opts: { paymentSum?: number; transactionPaymentId?: string; nowMs?: number } = {}
): FallbackResult {
  const now = opts.nowMs ?? Date.now()
  const paidSum =
    typeof opts.paymentSum === 'number' && isFinite(opts.paymentSum) && opts.paymentSum > 0
      ? opts.paymentSum
      : undefined

  let candidates = orders.filter((o) => OPEN_STATUSES.includes(o.status))
  // Never match an order already superseded by a completed sibling
  candidates = candidates.filter((o) => !o.supersededByOrderId)
  // (d) If the transaction carries a paymentId, skip candidates tied to a
  // DIFFERENT payment link
  if (opts.transactionPaymentId) {
    candidates = candidates.filter(
      (o) => !o.paymentId || o.paymentId === opts.transactionPaymentId
    )
  }
  // Match by amount when provided
  if (paidSum !== undefined) {
    candidates = candidates.filter((o) => sameAmount(o.total, paidSum))
  }
  if (candidates.length === 0) return { action: 'none' }

  // (c) Double-mark guard: if ANOTHER order of this customer was already paid
  // with the same sum recently, this transaction almost certainly belongs to
  // it (webhook + client-confirm racing across duplicate orders — the
  // #1312/#1313 bug). Never auto-mark — flag for manual review.
  if (paidSum !== undefined) {
    const paidSibling = orders.find(
      (o) =>
        !OPEN_STATUSES.includes(o.status) &&
        typeof o.paidAtMs === 'number' &&
        now - o.paidAtMs <= PAID_SIBLING_WINDOW_MS &&
        sameAmount(o.paymentSum ?? o.total, paidSum)
    )
    if (paidSibling) return { action: 'suspect_duplicate', paidSibling, candidates }
  }

  // (b) Prefer the MOST RECENT open order
  const sorted = [...candidates].sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
  return { action: 'match', order: sorted[0], candidates: sorted }
}
