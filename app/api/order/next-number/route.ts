import { NextResponse } from 'next/server'
import { adminDb, adminSdkUnavailable } from '@/lib/firebase-admin'

/**
 * Server-side order-number allocation (admin SDK).
 *
 * Root cause this replaces: getNextOrderNumber() used to read+increment
 * `counters/orders` from the browser (firestore.rules had
 * `counters read, write: if true`), which let anyone overwrite the counter and
 * sabotage order numbering. The increment now runs here inside a transaction
 * (atomic — no duplicate numbers under concurrent checkouts), and
 * `counters` is locked to `if isAdmin()` in firestore.rules (admin quote
 * numbering still runs client-side; anonymous access is denied; this route
 * uses the admin SDK which bypasses rules).
 *
 * Semantics match the previous client logic exactly: existing counter →
 * current + 1; missing counter → initialize to 1001.
 *
 * ── This route FAILS CLOSED, on purpose ─────────────────────────────────────
 * It is the single most expensive failure in the Admin-SDK surface: checkout
 * calls it (lib/db.ts getNextOrderNumber → createOrder) AFTER the Grow payment
 * link has been created but BEFORE the redirect, so a failure here aborts the
 * checkout of every FIRST-TIME customer and orphans a live payment link. Only
 * re-checkouts against an existing order survive, because they skip
 * createOrder entirely. The shape is the one that made the orders-pause flag so
 * costly: a site-wide sales outage whose only symptom is sales that never
 * arrive.
 *
 * It still fails closed, and unlike the pause flag that is the CHEAPER mistake
 * here, for two reasons:
 *
 *  1. There is no safe number to invent. orderNumber is the business's identity
 *     for an order — admin lookup (getOrderByNumber returns the FIRST match),
 *     the duplicate-payment matching in lib/payment-matching + lib/order-fallback,
 *     every email, WhatsApp and Telegram message. A fabricated or duplicated
 *     number does not fail; it silently mislabels orders and misroutes payments,
 *     which is far worse than a refusal.
 *  2. When this route is down the Admin SDK is down, which means /api/webhooks,
 *     /api/payment/confirm AND /api/payment/client-confirm are down with it. A
 *     charge let through would be money taken with no order markable as paid, no
 *     Telegram alert and no path to confirmation. The pause flag was the
 *     opposite case: everything downstream of it was healthy.
 *
 * What it must never be again is invisible. A refusal is a 503 (an outage, not
 * a bug in the request), carries the ADMIN_SDK_UNAVAILABLE marker in the Vercel
 * log, and reaches the customer as Hebrew — see getNextOrderNumber in lib/db.ts.
 */
export async function POST() {
  const unavailable = adminSdkUnavailable()
  if (unavailable) {
    console.error(
      '[ADMIN_SDK_UNAVAILABLE] order/next-number cannot allocate an order number. ' +
      'CHECKOUT IS BLOCKED FOR EVERY NEW CUSTOMER for as long as this lasts — no order is created and no ' +
      'payment page is reached. Fix FIREBASE_ADMIN_* on Vercel. Reason:',
      unavailable
    )
    return NextResponse.json({ error: 'admin_sdk_unavailable' }, { status: 503 })
  }

  try {
    const ref = adminDb.collection('counters').doc('orders')

    const orderNumber = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists) {
        tx.set(ref, { current: 1001 })
        return 1001
      }
      const current = snap.data()?.current || 1000
      tx.update(ref, { current: current + 1 })
      return current + 1
    })

    return NextResponse.json({ orderNumber })
  } catch (e) {
    console.error('order/next-number endpoint error:', e)
    return NextResponse.json({ error: 'failed_to_allocate' }, { status: 500 })
  }
}
