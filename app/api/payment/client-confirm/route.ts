import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

/**
 * Client-side fallback confirmation.
 * Called from the /payment/success page when customer returns from Grow.
 *
 * Accepts orderId which can be either:
 * - Firestore Document ID (from createOrder return value)
 * - paymentId field value (order-XXXXX format)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    console.log(`Client-confirm: looking for orderId=${orderId}`)

    let orderDoc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot | null = null
    let order: any = null

    // Try 1: Direct document ID lookup
    const docRef = await adminDb.collection('orders').doc(orderId).get()
    if (docRef.exists) {
      orderDoc = docRef
      order = docRef.data()
      console.log(`Client-confirm: found by doc ID, order #${order?.orderNumber}`)
    }

    // Try 2: Search by paymentId field
    if (!order) {
      const snapshot = await adminDb
        .collection('orders')
        .where('paymentId', '==', orderId)
        .limit(1)
        .get()
      if (!snapshot.empty) {
        orderDoc = snapshot.docs[0]
        order = orderDoc.data()
        console.log(`Client-confirm: found by paymentId, order #${order?.orderNumber}`)
      }
    }

    if (!orderDoc || !order) {
      console.error(`Client-confirm: order not found for ${orderId}`)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Only update if still pending or abandoned
    if (order.status === 'pending_payment' || order.status === 'cart_abandoned') {
      await adminDb.collection('orders').doc(orderDoc.id).update({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
        paidVia: 'client_fallback',
      })
      console.log(`Client-confirm: order #${order.orderNumber} → paid`)

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
