import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

/**
 * Client-side fallback confirmation.
 * Called from the /payment/success page when customer returns from Grow.
 *
 * Security: requires orderId + customer phone to match.
 * Without the phone that was used to create the order, the request is rejected.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, phone } = body

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Missing phone' }, { status: 400 })
    }

    let orderDoc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot | null = null
    let order: any = null

    // Try 1: Direct document ID lookup
    const docRef = await adminDb.collection('orders').doc(orderId).get()
    if (docRef.exists) {
      orderDoc = docRef
      order = docRef.data()
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
      }
    }

    if (!orderDoc || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify phone matches the order — prevents unauthorized status changes
    const orderPhone = (order.customer?.phone || '').replace(/[-\s]/g, '')
    const requestPhone = phone.replace(/[-\s]/g, '')
    if (orderPhone !== requestPhone) {
      console.error(`Client-confirm: phone mismatch for order #${order.orderNumber}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only update if still pending or abandoned — use transaction to prevent race
    if (order.status === 'pending_payment' || order.status === 'cart_abandoned') {
      const orderRef = adminDb.collection('orders').doc(orderDoc.id)
      await adminDb.runTransaction(async (transaction) => {
        const freshDoc = await transaction.get(orderRef)
        const freshData = freshDoc.data()
        if (!freshData) return
        if (freshData.status !== 'pending_payment' && freshData.status !== 'cart_abandoned') return

        transaction.update(orderRef, {
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
          paidVia: 'client_fallback',
        })

        // Mark coupon as used atomically
        if (freshData.couponCode) {
          const couponSnap = await adminDb
            .collection('coupons')
            .where('code', '==', freshData.couponCode)
            .limit(1)
            .get()
          if (!couponSnap.empty) {
            transaction.update(couponSnap.docs[0].ref, {
              isUsed: true,
              updatedAt: new Date(),
            })
          }
        }
      })
    }

    return NextResponse.json({ success: true, status: order.status })
  } catch (error) {
    console.error('Client confirm error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
