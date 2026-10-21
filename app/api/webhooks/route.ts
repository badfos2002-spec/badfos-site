import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { adminDb } from '@/lib/firebase-admin'
import { findOrderByFallback, alertUnmatchedPayment, alertNotPaidWebhook } from '@/lib/order-fallback'
import { isPaymentSucceeded } from '@/lib/payment-matching'
import { notifyOwnerNewOrder } from '@/lib/telegram'
import { PAID_OR_LATER, paidRecently, sendPaidOrderEmails } from '@/lib/order-emails'

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
    // STRUCTURAL ONLY — no status condition here: Grow changed the webhook format (4.10)
    // and `status` now arrives as the Hebrew string 'שולם' instead of 1, which made the
    // old status===1 condition reject real paid webhooks with 401. Payment success is
    // checked separately below (paymentSucceeded).
    const looksLikeGrow = !!(
      d.transactionToken &&
      d.processToken &&
      d.sum &&
      (d.payerPhone || d.payerEmail)
    )

    if (!isAuthedByHeader && !isAuthedByQuery && !isFromGrowByKey && !looksLikeGrow) {
      console.error('Webhook unauthorized — no valid auth method', { hasData: !!body.data, status: d.status })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Payment success — separated from auth (Grow format change, 4.10): status may be
    // 1, '1' or 'שולם'. A verified webhook for a non-successful payment is acknowledged
    // (200) WITHOUT touching state — never mark paid on a failed/unknown status.
    // Checked on both d and body, like every other field extraction here (d || body).
    const paymentSucceeded = isPaymentSucceeded(d) || isPaymentSucceeded(body)
    if (!paymentSucceeded) {
      console.log('[WEBHOOK_NOT_PAID] verified webhook without a successful payment status — ack, no state change', {
        status: d.status,
        statusCode: d.statusCode,
      })
      // Alert the admin (deduped) — if Grow changes the status wording again
      // (the 4.10 incident: 1 → 'שולם'), this silent 200 must stay visible.
      waitUntil(alertNotPaidWebhook({
        ...(d.status !== undefined ? { rawStatus: d.status } : body.status !== undefined ? { rawStatus: body.status } : {}),
        ...(d.statusCode !== undefined ? { rawStatusCode: d.statusCode } : {}),
        paymentSum: d.sum || body.paymentSum || body.amount,
        ...((d.payerPhone || body.payerPhone) && { payerPhone: String(d.payerPhone || body.payerPhone) }),
        ...((d.payerEmail || body.payerEmail) && { payerEmail: String(d.payerEmail || body.payerEmail) }),
        ...((d.asmachta || body.transactionCode || body.asmachta) && { transactionCode: String(d.asmachta || body.transactionCode || body.asmachta) }),
        ...(d.transactionToken && { transactionToken: String(d.transactionToken) }),
      }))
      return NextResponse.json({
        success: false,
        notPaid: true,
        message: 'Payment status is not successful — no state change',
      }, { status: 200 })
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
      // A verified SUCCESSFUL payment with no matching order must never fail
      // silently — alert the admin (deduped via unmatched_payments, so Grow
      // retries don't flood). Reaching here implies paymentSucceeded (non-paid
      // webhooks returned 200 above). The 404 stays: Grow retries, and a late
      // retry can still match if the order gets saved meanwhile.
      waitUntil(alertUnmatchedPayment({
        paymentSum,
        ...(payerPhone && { payerPhone: String(payerPhone) }),
        ...(payerEmail && { payerEmail: String(payerEmail) }),
        ...(paymentId && { paymentId: String(paymentId) }),
        ...(transactionCode && { transactionCode: String(transactionCode) }),
        ...(d.transactionToken && { transactionToken: String(d.transactionToken) }),
      }))
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Atomic transaction — prevents race condition between webhook/confirm/client-confirm
    const orderRef = adminDb.collection('orders').doc(orderDoc.id)
    let alreadyProcessed = false
    let freshStatus: string | undefined
    let freshRecent = false

    await adminDb.runTransaction(async (transaction) => {
      const freshDoc = await transaction.get(orderRef)
      const freshData = freshDoc.data()
      if (!freshData) throw new Error('Order disappeared')

      freshStatus = freshData.status
      freshRecent = paidRecently(freshData)
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
      // Paid earlier (e.g. via client-confirm, which sends no emails) — make sure
      // the customer emails went out; the once-claims make this a no-op otherwise.
      if (freshStatus && PAID_OR_LATER.includes(freshStatus) && freshRecent) {
        waitUntil(sendPaidOrderEmails(orderRef).catch(err => console.error('Failed to send paid-order emails:', err)))
      }
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

    // Send confirmation + design mockup emails (direct call, each once per order)
    waitUntil(sendPaidOrderEmails(orderRef).catch(err => console.error('Failed to send paid-order emails:', err)))

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
