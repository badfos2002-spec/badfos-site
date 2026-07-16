import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import {
  round2,
  sanitizeItems,
  sanitizeCustomer,
  sanitizeShipping,
  sanitizePackages,
} from '@/lib/order-sanitize'

/**
 * Server-side sync of an EXISTING order at re-checkout (customer pressed Back
 * from the payment page, possibly edited the cart / applied a coupon, and is
 * checking out again).
 *
 * Root cause this replaces: CartPage used to call the client-side Firestore
 * updateDocument('orders', ...) here, but firestore.rules only allow admins to
 * update orders — so the sync ALWAYS failed silently (permission-denied) and
 * the order kept its pre-coupon subtotal/discount/couponCode/total and a stale
 * paymentId (which also broke webhook matching). Bug seen on order #1310.
 *
 * Security (public endpoint, like /api/payment/client-confirm):
 * - orderId must exist AND the provided phone must match the order's phone
 * - only orders still in the payment window can be synced
 * - all written fields are whitelisted/sanitized
 * - the amount actually charged is verified separately in /api/payment/create,
 *   and the webhook stores the real paid sum (paymentSum)
 */

const SYNCABLE_STATUSES = ['pending_payment', 'cart_abandoned']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const orderId = body?.orderId
    const phone = body?.phone

    if (
      typeof orderId !== 'string' || !orderId.trim() ||
      typeof phone !== 'string' || !phone.trim()
    ) {
      return NextResponse.json({ synced: false, reason: 'invalid_payload' })
    }

    const docRef = adminDb.collection('orders').doc(orderId.trim())
    const snap = await docRef.get()
    if (!snap.exists) {
      return NextResponse.json({ synced: false, reason: 'order_not_found' })
    }

    const data = snap.data()!
    const orderPhone = String(data.customer?.phone || '').replace(/[-\s]/g, '')
    if (!orderPhone || orderPhone !== phone.replace(/[-\s]/g, '')) {
      return NextResponse.json({ synced: false, reason: 'unauthorized' }, { status: 403 })
    }

    if (!SYNCABLE_STATUSES.includes(data.status)) {
      return NextResponse.json({ synced: false, reason: 'status_not_syncable' })
    }

    // Pricing must arrive as one coherent set
    const subtotal = round2(body?.subtotal)
    const discount = round2(body?.discount)
    const total = round2(body?.total)
    const couponCode = typeof body?.couponCode === 'string' ? body.couponCode.slice(0, 40) : ''
    if (total <= 0 || total > 20000 || subtotal < 0 || discount < 0 || discount > subtotal) {
      return NextResponse.json({ synced: false, reason: 'invalid_pricing' })
    }

    const update: Record<string, unknown> = {
      subtotal,
      discount,
      couponCode,
      total,
      updatedAt: Timestamp.now(),
    }
    if (Array.isArray(body?.items) && body.items.length > 0) {
      update.items = sanitizeItems(body.items)
    }
    if (body?.customer && typeof body.customer === 'object') {
      update.customer = sanitizeCustomer(body.customer)
    }
    if (body?.shipping && typeof body.shipping === 'object') {
      update.shipping = sanitizeShipping(body.shipping)
    }
    if (Array.isArray(body?.packages)) {
      update.packages = sanitizePackages(body.packages)
    }
    if (typeof body?.paymentId === 'string' && body.paymentId.trim()) {
      // Keep webhook matching working if a fresh payment link was created
      update.paymentId = body.paymentId.trim().slice(0, 60)
    }

    await docRef.update(update)
    return NextResponse.json({ synced: true })
  } catch (e) {
    // A sync failure must never block checkout — the client treats any
    // non-synced response as best-effort and continues to payment.
    console.error('order-sync endpoint error:', e)
    const reason = e instanceof Error ? e.message : 'internal_error'
    return NextResponse.json({ synced: false, reason })
  }
}
