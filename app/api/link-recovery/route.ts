import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

/**
 * Link a recovered order to its original abandoned order via the personal
 * BACK5 coupon the customer redeemed.
 *
 * The BACK5 coupon doc stores the originating (abandoned) orderId — order A.
 * When a NEW order B is completed with that coupon, this endpoint stamps:
 * - Order B: recoveredFromOrderId / recoveredFromOrderNumber (+ recoverySentAt copied from A)
 * - Order A: recoveredByOrderId / recoveredByOrderNumber
 *
 * Callable with { orderId } (order B) — used automatically by checkout —
 * or with { couponCode } (finds order B by the redeemed coupon) for
 * after-the-fact / manual linking. Idempotent.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const orderId: unknown = body?.orderId
    const couponCodeInput: unknown = body?.couponCode

    let orderBRef: FirebaseFirestore.DocumentReference
    let orderB: FirebaseFirestore.DocumentData

    if (typeof orderId === 'string' && orderId.trim()) {
      const snap = await adminDb.collection('orders').doc(orderId.trim()).get()
      if (!snap.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      orderBRef = snap.ref
      orderB = snap.data()!
    } else if (typeof couponCodeInput === 'string' && couponCodeInput.trim()) {
      // Alternative lookup: find the order that redeemed this coupon
      const code = couponCodeInput.trim().toUpperCase()
      const ordersSnap = await adminDb
        .collection('orders')
        .where('couponCode', '==', code)
        .limit(5)
        .get()
      if (ordersSnap.empty) {
        return NextResponse.json(
          { success: false, reason: 'no_order_found_with_coupon' },
          { status: 404 }
        )
      }
      const doc = ordersSnap.docs[0]
      orderBRef = doc.ref
      orderB = doc.data()
    } else {
      return NextResponse.json({ error: 'Invalid orderId/couponCode' }, { status: 400 })
    }

    const couponCode: string = String(orderB.couponCode || '').toUpperCase()
    if (!couponCode || !couponCode.startsWith('BACK5')) {
      return NextResponse.json({ success: false, reason: 'not_a_back5_coupon' })
    }

    // Idempotency: already linked
    if (orderB.recoveredFromOrderId) {
      return NextResponse.json({ success: true, alreadyLinked: true })
    }

    // Find the coupon doc → its orderId is the original abandoned order (A)
    const couponSnap = await adminDb
      .collection('coupons')
      .where('code', '==', couponCode)
      .limit(1)
      .get()
    if (couponSnap.empty) {
      return NextResponse.json({ success: false, reason: 'coupon_not_found' })
    }
    const originOrderId: string = String(couponSnap.docs[0].data().orderId || '')
    if (!originOrderId) {
      return NextResponse.json({ success: false, reason: 'coupon_has_no_origin_order' })
    }
    if (originOrderId === orderBRef.id) {
      // Customer completed the same order the coupon was created for — nothing to link
      return NextResponse.json({ success: false, reason: 'same_order' })
    }

    const orderASnap = await adminDb.collection('orders').doc(originOrderId).get()
    if (!orderASnap.exists) {
      return NextResponse.json({ success: false, reason: 'origin_order_not_found' })
    }
    const orderA = orderASnap.data()!

    // Stamp order B (the new, completed order)
    await orderBRef.update({
      recoveredFromOrderId: orderASnap.id,
      ...(orderA.orderNumber != null && { recoveredFromOrderNumber: orderA.orderNumber }),
      // Copy the recovery stamp so existing "לקוח חזר" badge logic also keys off it
      ...(orderA.recoverySentAt && !orderB.recoverySentAt && { recoverySentAt: orderA.recoverySentAt }),
    })

    // Stamp order A (the original abandoned order) as resolved
    await orderASnap.ref.update({
      recoveredByOrderId: orderBRef.id,
      ...(orderB.orderNumber != null && { recoveredByOrderNumber: orderB.orderNumber }),
    })

    console.log(
      `Recovery linked: abandoned order #${orderA.orderNumber} → new order #${orderB.orderNumber} (coupon ${couponCode})`
    )

    return NextResponse.json({
      success: true,
      linked: { from: orderA.orderNumber ?? orderASnap.id, to: orderB.orderNumber ?? orderBRef.id },
    })
  } catch (e) {
    console.error('Link-recovery endpoint error:', e)
    return NextResponse.json({ error: 'Link-recovery failed' }, { status: 500 })
  }
}
