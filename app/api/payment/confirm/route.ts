import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { sendServerConversions } from '@/lib/server-tracking'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

/**
 * Payment confirmation endpoint.
 * Called by Make (after receiving IPN from Grow) OR directly by Grow webhook.
 *
 * Configure in Make:
 *   After Grow IPN module → HTTP POST to https://badfos.co.il/api/payment/confirm
 *   Headers: { "x-webhook-secret": "<WEBHOOK_SECRET>" }
 *   Body: { "orderId": "{{cField1}}", "transactionCode": "{{transactionCode}}", "amount": {{paymentSum}} }
 *
 * OR configure directly in Grow dashboard:
 *   הגדרות → ניהול וובהוקים → https://badfos.co.il/api/payment/confirm
 */
export async function POST(request: NextRequest) {
  try {
    // --- Auth: accept secret from header or query param (Grow sometimes sends as query) ---
    if (!WEBHOOK_SECRET) {
      console.error('WEBHOOK_SECRET is not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const authHeader =
      request.headers.get('x-webhook-secret') ||
      request.headers.get('authorization')
    const url = new URL(request.url)
    const authQuery = url.searchParams.get('secret')

    const isAuthed =
      authHeader === WEBHOOK_SECRET ||
      authHeader === `Bearer ${WEBHOOK_SECRET}` ||
      authQuery === WEBHOOK_SECRET

    if (!isAuthed) {
      console.error('Payment confirm: unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Extract orderId from various possible field names (Grow/Make flexibility)
    const orderId =
      body.orderId ||
      body.order_id ||
      body.purchaseCustomField?.cField1 ||
      body.cField1 ||
      body.paymentId

    const transactionCode = body.transactionCode || body.transaction_code || body.asmachta
    const paymentSum = body.amount || body.paymentSum || body.sum

    if (!orderId) {
      console.error('Payment confirm: missing orderId', body)
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    console.log(`Payment confirm: orderId=${orderId}, tx=${transactionCode}, sum=${paymentSum}`)

    // Find order — try paymentId field first, then document ID
    let orderDoc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot | null = null
    let order: any = null

    const snapshot = await adminDb
      .collection('orders')
      .where('paymentId', '==', orderId)
      .limit(1)
      .get()

    if (!snapshot.empty) {
      orderDoc = snapshot.docs[0]
      order = orderDoc.data()
    } else {
      // Fallback: try as document ID
      const docRef = await adminDb.collection('orders').doc(orderId).get()
      if (docRef.exists) {
        orderDoc = docRef
        order = docRef.data()
      }
    }

    if (!orderDoc || !order) {
      console.error(`Payment confirm: order not found for ${orderId}`)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Idempotency: if already paid or beyond, don't touch
    if (order.status !== 'pending_payment' && order.status !== 'cart_abandoned') {
      return NextResponse.json({
        success: true,
        message: `Order already processed (status: ${order.status})`,
        orderId: orderDoc.id,
        orderNumber: order.orderNumber,
      })
    }

    // *** THIS IS THE KEY FIX: paid always wins over abandoned ***
    await adminDb.collection('orders').doc(orderDoc.id).update({
      status: 'paid',
      ...(transactionCode && { transactionCode }),
      ...(paymentSum && { paymentSum: Number(paymentSum) }),
      paidAt: new Date(),
      updatedAt: new Date(),
    })

    console.log(`Payment confirm: order ${orderDoc.id} (#${order.orderNumber}) → paid`)

    // Mark coupon as used
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

    // Send confirmation email
    const email = order.customer?.email
    if (email) {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://badfos.co.il'}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order_confirmation',
          data: { id: orderDoc.id, ...order, status: 'paid' },
        }),
      }).catch(err => console.error('Failed to send confirmation email:', err))
    }

    // Server-side conversion tracking (backup for when client doesn't fire)
    // GA4 Measurement Protocol + Meta Conversions API
    sendServerConversions({
      orderId: orderDoc.id,
      total: order.total || Number(paymentSum) || 0,
      email: order.customer?.email,
      phone: order.customer?.phone,
      firstName: order.customer?.firstName,
      lastName: order.customer?.lastName,
      items: order.items,
    }).catch(err => console.error('Server conversion tracking error:', err))

    return NextResponse.json({
      success: true,
      orderId: orderDoc.id,
      orderNumber: order.orderNumber,
    })
  } catch (error) {
    console.error('Payment confirm error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET — verify endpoint is reachable (for Make/Grow testing)
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/payment/confirm',
    timestamp: new Date().toISOString(),
  })
}
