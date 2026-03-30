import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

/**
 * Returns the GCLID for an order found by phone/email.
 * Used by Make to send offline conversions to Google Ads.
 *
 * POST /api/order/gclid
 * Headers: x-webhook-secret
 * Body: { payerPhone, payerEmail }
 * Returns: { gclid, orderId, total }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get('x-webhook-secret')
    if (!WEBHOOK_SECRET || authHeader !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { payerPhone, payerEmail } = body

    if (!payerPhone && !payerEmail) {
      return NextResponse.json({ error: 'Missing phone or email' }, { status: 400 })
    }

    // Find order by phone (try multiple formats)
    let order: any = null
    let orderId = ''

    if (payerPhone) {
      const cleanPhone = payerPhone.replace(/[-\s()]/g, '')
      const phonesToTry = [cleanPhone, payerPhone]
      if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
        phonesToTry.push(`${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3)}`)
      }

      for (const phone of phonesToTry) {
        if (order) break
        const snapshot = await adminDb
          .collection('orders')
          .where('customer.phone', '==', phone)
          .limit(5)
          .get()
        // Find most recent order (paid or pending)
        const sorted = snapshot.docs
          .map(d => ({ id: d.id, data: d.data() }))
          .sort((a, b) => (b.data.createdAt?.toMillis?.() || 0) - (a.data.createdAt?.toMillis?.() || 0))
        if (sorted.length > 0) {
          order = sorted[0].data
          orderId = sorted[0].id
        }
      }
    }

    // Fallback: find by email
    if (!order && payerEmail) {
      const snapshot = await adminDb
        .collection('orders')
        .where('customer.email', '==', payerEmail.toLowerCase())
        .limit(5)
        .get()
      const sorted = snapshot.docs
        .map(d => ({ id: d.id, data: d.data() }))
        .sort((a, b) => (b.data.createdAt?.toMillis?.() || 0) - (a.data.createdAt?.toMillis?.() || 0))
      if (sorted.length > 0) {
        order = sorted[0].data
        orderId = sorted[0].id
      }
    }

    if (!order) {
      return NextResponse.json({ gclid: '', orderId: '', total: 0 })
    }

    return NextResponse.json({
      gclid: order.gclid || '',
      orderId,
      orderNumber: order.orderNumber,
      total: order.total || 0,
    })
  } catch (error) {
    console.error('Order GCLID lookup error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
