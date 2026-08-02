import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { adminDb } from '@/lib/firebase-admin'
import { findOrderByFallback } from '@/lib/order-fallback'
import { notifyOwnerNewOrder } from '@/lib/telegram'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

/**
 * Webhook endpoint for Grow (Meshulam) payment notifications.
 * Accepts JSON or form-urlencoded from Grow IPN.
 * Also accepts authenticated requests from Make.
 *
 * notify Url in Grow/Make: https://badfos.co.il/api/webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    const url = new URL(request.url)

    // Parse body — support both JSON and form-urlencoded (Grow sends either)
    let body: any = {}
    const bodyText = await request.text()

    if (contentType.includes('application/json')) {
      try { body = JSON.parse(bodyText) } catch { body = {} }
    } else if (contentType.includes('form-urlencoded') || bodyText.includes('=')) {
      // Parse form-urlencoded — Grow sends nested fields like data[customFields][cField1]
      const params = new URLSearchParams(bodyText)
      body = {}
      for (const [key, value] of params.entries()) {
        // Convert bracket notation to nested object: data[foo][bar] → body.data.foo.bar
        const path = key.replace(/\]/g, '').split('[')
        let obj = body
        for (let i = 0; i < path.length - 1; i++) {
          if (typeof obj[path[i]] !== 'object' || obj[path[i]] === null) obj[path[i]] = {}
          obj = obj[path[i]]
        }
        obj[path[path.length - 1]] = value
      }
    } else {
      try { body = JSON.parse(bodyText) } catch { body = {} }
    }

    // Grow nests fields under `data`. Normalize: prefer body.data.X over body.X
    const d = body.data || body

    console.log('Webhook received:', JSON.stringify({
      contentType,
      hasData: !!body.data,
      cField1: d.customFields?.cField1 || body.purchaseCustomField?.cField1 || body.cField1 || 'MISSING',
      hasPhone: !!(d.payerPhone || body.payerPhone),
      hasEmail: !!(d.payerEmail || body.payerEmail),
      sum: d.sum || body.paymentSum || body.amount || 'MISSING',
      status: d.status || body.status,
    }))

    // --- Auth validation ---
    const authHeader = request.headers.get('x-webhook-secret') || request.headers.get('authorization')
    const querySecret = url.searchParams.get('secret') || url.searchParams.get('key')

    const isAuthedByHeader = WEBHOOK_SECRET && (
      authHeader === WEBHOOK_SECRET || authHeader === `Bearer ${WEBHOOK_SECRET}`
    )
    const isAuthedByQuery = WEBHOOK_SECRET && querySecret === WEBHOOK_SECRET

    const GROW_WEBHOOK_KEY = process.env.GROW_WEBHOOK_KEY
    const isFromGrowByKey = GROW_WEBHOOK_KEY && (body.webhookKey === GROW_WEBHOOK_KEY || d.webhookKey === GROW_WEBHOOK_KEY)

    // Fallback auth: Grow webhooks have a recognizable structure — validates it really is Grow
    // (transactionToken + sum + payerPhone are all present and look right). Auto-trust these.
    const looksLikeGrow = !!(
      d.transactionToken &&
      d.processToken &&
      d.sum &&
      (d.payerPhone || d.payerEmail) &&
      (Number(d.status) === 1 || d.statusCode === '1' || d.status === '1')
    )

    if (!isAuthedByHeader && !isAuthedByQuery && !isFromGrowByKey && !looksLikeGrow) {
      console.error('Webhook unauthorized — no valid auth method', { hasData: !!body.data, status: d.status })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract paymentId — Grow sends it under data.customFields.cField1
    const paymentId =
      d.customFields?.cField1 ||
      body.purchaseCustomField?.cField1 ||
      body.cField1 ||
      body.orderId ||
      body.paymentId

    const transactionCode = d.asmachta || body.transactionCode || body.asmachta
    const paymentSum = d.sum || body.paymentSum || body.amount
    const payerPhone = d.payerPhone || body.payerPhone || ''
    const payerEmail = d.payerEmail || body.payerEmail || ''

    console.log(`Webhook: paymentId=${paymentId || 'NONE'}, hasPhone=${!!payerPhone}, hasEmail=${!!payerEmail}`)

    // Find order — try paymentId first, then by phone/email (Grow doesn't return cField1)
    let orderDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null
    let order: any = null

    if (paymentId) {
      const snapshot = await adminDb
        .collection('orders')
        .where('paymentId', '==', paymentId)
        .limit(1)
        .get()
      if (!snapshot.empty) {
        orderDoc = snapshot.docs[0]
        order = orderDoc.data()
      }
    }

    // Fallback: match by phone/email + amount (Grow sometimes omits cField1).
    // Hardened matching (lib/payment-matching + lib/order-fallback): prefers
    // the most recent open order, skips orders tied to a different payment
    // link, and NEVER auto-marks when a same-sum sibling was already paid
    // recently — that exact race double-marked orders #1312+#1313. On a
    // suspect duplicate the admin gets an alert instead.
    if (!order && (payerPhone || payerEmail)) {
      const fallback = await findOrderByFallback({
        payerPhone,
        payerEmail,
        paymentSum,
        transactionPaymentId: paymentId || undefined,
        transactionCode,
        source: 'webhook',
      })
      if (fallback.outcome === 'flagged') {
        // Deliberately 200 — retries won't change the manual-review outcome
        return NextResponse.json({
          success: false,
          flagged: true,
          message: 'Payment matches more than one order — admin alerted, manual review required',
        }, { status: 200 })
      }
      if (fallback.outcome === 'match') {
        orderDoc = fallback.doc
        order = fallback.data
        console.log(`Webhook: found order by fallback, #${order.orderNumber}`)
      }
    }

    if (!orderDoc || !order) {
      console.error('Webhook: order not found', { paymentId, payerPhone, payerEmail })
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Atomic transaction — prevents race condition between webhook/confirm/client-confirm
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

    if (alreadyProcessed) {
      return NextResponse.json({
        success: true,
        message: `Order already processed`,
        orderId: orderDoc.id,
      }, { status: 200 })
    }

    console.log(`Webhook: order ${orderDoc.id} (#${order.orderNumber}) → paid`)

    // Upscale design images to print quality (fire-and-forget, idempotent)
    waitUntil(fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://badfos.co.il'}/api/upscale-designs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': WEBHOOK_SECRET || '' },
      body: JSON.stringify({ orderId: orderDoc.id }),
    }).catch(err => console.error('Failed to trigger design upscaling:', err)))

    // Notify the owner on Telegram about the new paid order (reliable via waitUntil)
    waitUntil(notifyOwnerNewOrder(order).catch(err => console.error('Failed to notify owner on Telegram:', err)))

    // Send confirmation email
    const email = order.customer?.email || body.payerEmail
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
