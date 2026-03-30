import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

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
      // Parse form-urlencoded
      const params = new URLSearchParams(bodyText)
      body = Object.fromEntries(params.entries())
      // Grow sends nested fields like purchaseCustomField[cField1]
      const cField1 = params.get('purchaseCustomField[cField1]') || params.get('cField1')
      if (cField1) {
        body.purchaseCustomField = { cField1 }
      }
    } else {
      try { body = JSON.parse(bodyText) } catch { body = {} }
    }

    console.log('Webhook received:', JSON.stringify({
      contentType,
      hasTransactionCode: !!body.transactionCode,
      hasPurchaseCustomField: !!body.purchaseCustomField,
      cField1: body.purchaseCustomField?.cField1 || body.cField1 || 'MISSING',
      bodyKeys: Object.keys(body).join(','),
    }))

    // --- Auth validation ---
    const authHeader = request.headers.get('x-webhook-secret') || request.headers.get('authorization')
    const querySecret = url.searchParams.get('secret') || url.searchParams.get('key')

    const isAuthedByHeader = WEBHOOK_SECRET && (
      authHeader === WEBHOOK_SECRET || authHeader === `Bearer ${WEBHOOK_SECRET}`
    )
    const isAuthedByQuery = WEBHOOK_SECRET && querySecret === WEBHOOK_SECRET

    // Verify Grow webhook key (specific to our Grow account)
    const GROW_WEBHOOK_KEY = 'f05a8802-a073-bfa6-1b44-8c4e3466e7d6'
    const isFromGrow = body.webhookKey === GROW_WEBHOOK_KEY

    if (!isAuthedByHeader && !isAuthedByQuery && !isFromGrow) {
      console.error('Webhook unauthorized — no valid auth method')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract paymentId from various possible locations
    const paymentId =
      body.purchaseCustomField?.cField1 ||
      body.cField1 ||
      body.orderId ||
      body.paymentId

    const transactionCode = body.transactionCode || body.asmachta
    const paymentSum = body.paymentSum || body.amount
    const payerPhone = body.payerPhone || ''
    const payerEmail = body.payerEmail || ''

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

    // Fallback: find by phone — try multiple formats (with/without dashes)
    if (!order && payerPhone) {
      const cleanPhone = payerPhone.replace(/[-\s()]/g, '')
      const phonesToTry = [cleanPhone, payerPhone]
      // Also try with dash: 05X-XXXXXXX
      if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
        phonesToTry.push(`${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3)}`)
      }

      for (const phone of phonesToTry) {
        if (order) break
        const snapshot = await adminDb
          .collection('orders')
          .where('customer.phone', '==', phone)
          .limit(10)
          .get()
        const pending = snapshot.docs
          .map(d => ({ doc: d, data: d.data() }))
          .filter(x => x.data.status === 'pending_payment' || x.data.status === 'cart_abandoned')
          .sort((a, b) => (b.data.createdAt?.toMillis?.() || 0) - (a.data.createdAt?.toMillis?.() || 0))
        if (pending.length > 0) {
          orderDoc = pending[0].doc as FirebaseFirestore.QueryDocumentSnapshot
          order = pending[0].data
          console.log(`Webhook: found order by phone ${phone}, #${order.orderNumber}`)
        }
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
        orderDoc = pending[0].doc as FirebaseFirestore.QueryDocumentSnapshot
        order = pending[0].data
        console.log(`Webhook: found order by email ${payerEmail}, #${order.orderNumber}`)
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
