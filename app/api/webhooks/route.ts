import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

/**
 * Webhook endpoint for Grow (Meshulam) payment notifications.
 * Uses Firebase Admin SDK (bypasses security rules).
 *
 * Configure in Grow dashboard: הגדרות → ניהול וובהוקים
 * URL: https://badfos.co.il/api/webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // --- Webhook signature / secret validation ---
    if (!WEBHOOK_SECRET) {
      console.error('WEBHOOK_SECRET is not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    const authHeader = request.headers.get('x-webhook-secret') || request.headers.get('authorization')
    if (authHeader !== WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Extract paymentId from various possible locations
    const paymentId =
      body.purchaseCustomField?.cField1 ||
      body.cField1 ||
      body.orderId ||
      body.paymentId

    const transactionCode = body.transactionCode
    const paymentSum = body.paymentSum || body.amount

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })
    }

    // Query Firestore via Admin SDK — find order by paymentId
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

    // Only update if order is still pending payment (idempotency + status guard)
    if (order.status !== 'pending_payment') {
      return NextResponse.json({
        success: true,
        message: `Order already processed (status: ${order.status})`,
        orderId: orderDoc.id,
      }, { status: 200 })
    }

    // Update status to 'paid' (payment confirmed, ready for processing)
    await adminDb.collection('orders').doc(orderDoc.id).update({
      status: 'paid',
      updatedAt: new Date(),
    })

    // Mark coupon as used if order has one
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

    // Send confirmation email to customer with full order data
    const email = order.customer?.email || body.payerEmail
    if (email) {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://badfos.co.il'}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order_confirmation',
          data: { id: orderDoc.id, ...order },
        }),
      }).catch(err => console.error('Failed to send confirmation email:', err))
    }

    return NextResponse.json({
      success: true,
      orderId: orderDoc.id,
      orderNumber: order.orderNumber,
    }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}

/**
 * GET endpoint to verify webhook is active
 */
export async function GET() {
  return NextResponse.json({
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  })
}
