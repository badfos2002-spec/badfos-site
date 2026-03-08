import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

/**
 * Called from the payment success page to mark an order as paid.
 * Acts as a fallback when the Grow webhook isn't configured.
 */
export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json()

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })
    }

    const snapshot = await adminDb
      .collection('orders')
      .where('paymentId', '==', paymentId)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const orderDoc = snapshot.docs[0]
    const order = orderDoc.data()

    // Only update if still pending
    if (order.status === 'pending_payment') {
      await adminDb.collection('orders').doc(orderDoc.id).update({
        status: 'new',
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({ success: true, orderId: orderDoc.id })
  } catch (error) {
    console.error('Payment confirm error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
