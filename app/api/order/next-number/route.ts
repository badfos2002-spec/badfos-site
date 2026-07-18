import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

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
 */
export async function POST() {
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
