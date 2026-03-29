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
    const payerPhone = body.payerPhone || body.phone || ''
    const payerEmail = body.payerEmail || body.email || ''

    if (!orderId && !payerPhone && !payerEmail) {
      console.error('Payment confirm: no identifier found', body)
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    console.log(`Payment confirm: orderId=${orderId || 'NONE'}, hasPhone=${!!payerPhone}, hasEmail=${!!payerEmail}`)

    // Find order — try paymentId, then doc ID, then phone/email
    let orderDoc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot | null = null
    let order: any = null

    if (orderId) {
      const snapshot = await adminDb
        .collection('orders')
        .where('paymentId', '==', orderId)
        .limit(1)
        .get()

      if (!snapshot.empty) {
        orderDoc = snapshot.docs[0]
        order = orderDoc.data()
      } else {
        const docRef = await adminDb.collection('orders').doc(orderId).get()
        if (docRef.exists) {
          orderDoc = docRef
          order = docRef.data()
        }
      }
    }

    // Fallback: find by phone (simple query — no composite index needed)
    if (!order && payerPhone) {
      const snapshot = await adminDb
        .collection('orders')
        .where('customer.phone', '==', payerPhone)
        .limit(10)
        .get()
      // Find most recent pending/abandoned
      const pending = snapshot.docs
        .map(d => ({ doc: d, data: d.data() }))
        .filter(x => x.data.status === 'pending_payment' || x.data.status === 'cart_abandoned')
        .sort((a, b) => (b.data.createdAt?.toMillis?.() || 0) - (a.data.createdAt?.toMillis?.() || 0))
      if (pending.length > 0) {
        orderDoc = pending[0].doc
        order = pending[0].data
      }
    }

    // Fallback: find by email
    if (!order && payerEmail) {
      const snapshot = await adminDb
        .collection('orders')
        .where('customer.email', '==', payerEmail.toLowerCase())
        .limit(10)
        .get()
      const pending = snapshot.docs
        .map(d => ({ doc: d, data: d.data() }))
        .filter(x => x.data.status === 'pending_payment' || x.data.status === 'cart_abandoned')
        .sort((a, b) => (b.data.createdAt?.toMillis?.() || 0) - (a.data.createdAt?.toMillis?.() || 0))
      if (pending.length > 0) {
        orderDoc = pending[0].doc
        order = pending[0].data
      }
    }

    if (!orderDoc || !order) {
      console.error(`Payment confirm: order not found`, { orderId, payerPhone, payerEmail })
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Atomic transaction — prevents race condition
    const orderRef = adminDb.collection('orders').doc(orderDoc.id)
    let alreadyProcessed = false

    await adminDb.runTransaction(async (transaction) => {
      const freshDoc = await transaction.get(orderRef)
      const freshData = freshDoc.data()
      if (!freshData) throw new Error('Order disappeared')

      if (freshData.status !== 'pending_payment' && freshData.status !== 'cart_abandoned') {
        alreadyProcessed = true
        return
      }

      transaction.update(orderRef, {
        status: 'paid',
        ...(transactionCode && { transactionCode }),
        ...(paymentSum && { paymentSum: Number(paymentSum) }),
        paidAt: new Date(),
        updatedAt: new Date(),
      })

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

    if (alreadyProcessed) {
      return NextResponse.json({
        success: true,
        message: `Order already processed`,
        orderId: orderDoc.id,
        orderNumber: order.orderNumber,
      })
    }

    console.log(`Payment confirm: order ${orderDoc.id} (#${order.orderNumber}) → paid`)

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
