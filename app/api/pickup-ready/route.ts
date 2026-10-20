import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { sendPickupReadyWhatsApp } from '@/lib/manychat'
import { isManualOrder } from '@/lib/manual-order'
import { rejectUnlessAdmin } from '@/lib/admin-request-auth'

/**
 * "Order ready for pickup" WhatsApp via ManyChat — triggered by the admin
 * when a pickup order's status is set to 'completed'.
 *
 * Self-protecting:
 * - Admin only (Bearer Firebase ID token) — otherwise anyone with an orderId
 *   could trigger the customer WhatsApp.
 * - Only acts on pickup orders (shipping.method === 'pickup').
 * - Never sends twice per order (pickupReadySentAt stamp).
 */
export async function POST(req: NextRequest) {
  const rejected = await rejectUnlessAdmin(req, 'pickup-ready')
  if (rejected) return rejected

  try {
    const body = await req.json().catch(() => null)
    const orderId = body?.orderId

    if (typeof orderId !== 'string' || !orderId.trim()) {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
    }

    const docRef = adminDb.collection('orders').doc(orderId.trim())
    const snap = await docRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const data = snap.data()!

    // Manual order — the partner handles the customer himself, no WhatsApp.
    if (isManualOrder(data)) {
      return NextResponse.json({ success: true, skipped: 'manual_order' })
    }

    if (data.shipping?.method !== 'pickup') {
      return NextResponse.json(
        { error: 'Order shipping method is not pickup' },
        { status: 400 }
      )
    }

    // Idempotency: one pickup-ready message per order, ever
    if (data.pickupReadySentAt) {
      return NextResponse.json({ success: true, alreadySent: true })
    }

    const whatsapp = await sendPickupReadyWhatsApp({
      phone: data.customer?.phone || '',
      firstName: data.customer?.firstName || '',
      lastName: data.customer?.lastName || '',
    })

    if (whatsapp.sent) {
      await docRef.update({
        pickupReadySentAt: Timestamp.now(),
        pickupReadyChannel: 'manychat_auto',
      })
      console.log(`Pickup-ready WhatsApp sent for order #${data.orderNumber} (${docRef.id})`)
    } else {
      console.log(`Pickup-ready not sent for order #${data.orderNumber}: ${whatsapp.reason}`)
    }

    return NextResponse.json({ success: true, whatsapp })
  } catch (e) {
    console.error('Pickup-ready endpoint error:', e)
    return NextResponse.json({ error: 'Pickup-ready failed' }, { status: 500 })
  }
}
