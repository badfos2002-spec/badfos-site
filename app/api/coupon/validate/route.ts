import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { phonesMatch } from '@/lib/utils'

/**
 * Server-side coupon validation (admin SDK).
 *
 * Root cause this replaces: the cart used to validate coupons by reading the
 * `coupons` collection directly from the browser (firestore.rules had
 * `coupons read: if true`), which let anyone dump ALL coupon codes and the
 * `restrictedPhone` (customer PII) of personal coupons. This endpoint runs the
 * SAME validation logic server-side and returns ONLY the queried coupon's
 * result — never the code list, never restrictedPhone. With this in place
 * `coupons read` is locked to `if false` in firestore.rules.
 *
 * Mirrors the previous client logic in lib/db.ts validateCoupon +
 * components/cart/OrderSummary.tsx handleApplyCoupon:
 *   - coupon must exist, be active, unused and not expired
 *   - a personal coupon (restrictedPhone) requires a phone that matches it
 *
 * Response shape: { valid, discountPercent?, reason? }
 *   reason ∈ 'invalid' | 'personal_needs_phone' | 'personal_wrong_phone'
 * The client maps `reason` to the existing Hebrew messages.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
    const phone = typeof body?.phone === 'string' ? body.phone : ''

    if (!code) {
      return NextResponse.json({ valid: false, reason: 'invalid' })
    }

    const snap = await adminDb
      .collection('coupons')
      .where('code', '==', code)
      .where('isActive', '==', true)
      .where('isUsed', '==', false)
      .limit(1)
      .get()

    if (snap.empty) {
      return NextResponse.json({ valid: false, reason: 'invalid' })
    }

    const coupon = snap.docs[0].data()

    // Expiry — compare seconds like the previous client logic
    const nowSeconds = Date.now() / 1000
    const expiresSeconds = coupon.expiresAt?.seconds ?? coupon.expiresAt?._seconds ?? 0
    if (!(expiresSeconds > nowSeconds)) {
      return NextResponse.json({ valid: false, reason: 'invalid' })
    }

    // Personal coupon — only valid for the phone it was issued to.
    // restrictedPhone is NEVER returned to the client.
    if (coupon.restrictedPhone) {
      if (!phone) {
        return NextResponse.json({ valid: false, reason: 'personal_needs_phone' })
      }
      if (!phonesMatch(coupon.restrictedPhone, phone)) {
        return NextResponse.json({ valid: false, reason: 'personal_wrong_phone' })
      }
    }

    const discountPercent = Number(coupon.discountPercent) || 0
    if (discountPercent <= 0) {
      return NextResponse.json({ valid: false, reason: 'invalid' })
    }

    return NextResponse.json({ valid: true, discountPercent })
  } catch (e) {
    console.error('coupon/validate endpoint error:', e)
    // On any server error return an invalid result — the client shows the
    // default "invalid coupon" message and checkout is never blocked.
    return NextResponse.json({ valid: false, reason: 'invalid' })
  }
}
