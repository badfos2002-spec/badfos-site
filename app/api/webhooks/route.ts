import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

/**
 * Webhook endpoint for Grow (Meshulam) payment notifications.
 * Uses Firebase Admin SDK (bypasses security rules).
 *
 * Configure in Grow dashboard: הגדרות → ניהול וובהוקים
 * URL: https://badfos.co.il/api/webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🔔 Webhook received:', JSON.stringify(body, null, 2))

    // Extract paymentId from various possible locations
    const paymentId =
      body.purchaseCustomField?.cField1 ||
      body.cField1 ||
      body.orderId ||
      body.paymentId

    const transactionCode = body.transactionCode
    const paymentSum = body.paymentSum || body.amount

    console.log('🔍 Extracted:', JSON.stringify({ paymentId, transactionCode, paymentSum }))

    if (!paymentId) {
      console.error('❌ No paymentId found in webhook body')
      return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })
    }

    // Query Firestore via Admin SDK — find order by paymentId
    const snapshot = await adminDb
      .collection('orders')
      .where('paymentId', '==', paymentId)
      .limit(1)
      .get()

    if (snapshot.empty) {
      console.error(`❌ No order found with paymentId: ${paymentId}`)
      return NextResponse.json({ error: `Order not found for paymentId: ${paymentId}` }, { status: 404 })
    }

    const orderDoc = snapshot.docs[0]
    const order = orderDoc.data()
    console.log(`📦 Found order: ${orderDoc.id} (#${order.orderNumber}), current status: ${order.status}`)

    // Update status to 'new' (paid, ready for processing)
    await adminDb.collection('orders').doc(orderDoc.id).update({
      status: 'new',
      updatedAt: new Date(),
    })
    console.log(`✅ Order #${order.orderNumber} updated to 'new' (₪${paymentSum || order.total})`)

    // Send confirmation email to customer
    const email = order.customer?.email || body.payerEmail
    if (email) {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://badfos.co.il'}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order_confirmation',
          data: {
            orderId: orderDoc.id,
            orderNumber: order.orderNumber,
            customer: order.customer,
            total: order.total,
          },
        }),
      }).catch(err => console.error('Failed to send confirmation email:', err))
    }

    return NextResponse.json({
      success: true,
      orderId: orderDoc.id,
      orderNumber: order.orderNumber,
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ error: 'Failed to process webhook', details: String(error) }, { status: 500 })
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
