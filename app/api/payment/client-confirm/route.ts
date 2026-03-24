import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

/**
 * Client-side fallback confirmation.
 * Called from the /payment/success page when customer returns from Grow.
 * Only updates pending_payment → paid (safe: if webhook already set it, this is a no-op).
 *
 * This is a FALLBACK — the primary confirmation should come from Make/Grow webhook
 * via /api/payment/confirm. This catches cases where the webhook is delayed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    // Find order by paymentId
    const snapshot = await adminDb
      .collection('orders')
      .where('paymentId', '==', orderId)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const orderDoc = snapshot.docs[0]
    const order = orderDoc.data()

    // Only update if still pending — don't overwrite if webhook already processed
    if (order.status === 'pending_payment') {
      await adminDb.collection('orders').doc(orderDoc.id).update({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
        paidVia: 'client_fallback', // mark that this was the fallback, not webhook
      })

      // Mark coupon
      if (order.couponCode) {
        const couponSnap = await adminDb
          .collection('coupons')
          .where('code', '==', order.couponCode)
          .limit(1)
          .get()
        if (!couponSnap.empty) {
          await adminDb.collection('coupons').doc(couponSnap.docs[0].id).update({
            isUsed: true,
            updatedAt: new Date(),
          })
        }
      }
    }

    return NextResponse.json({ success: true, status: order.status })
  } catch (error) {
    console.error('Client confirm error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
