import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { Resend } from 'resend'
import { escapeHtml } from '@/lib/utils'
import { round2, itemsSignature, sanitizeItems } from '@/lib/order-sanitize'
import { recordUsage } from '@/lib/usage-tracking'

/**
 * Runtime consistency guard: called (fire-and-forget) from /payment/success
 * with the SAME items snapshot that built the design_mockup email.
 *
 * Compares a stable signature of the snapshot items against the Firestore
 * order's items. If they diverge (the class of bug fixed in c36f8ac — order
 * showing different designs than the email), it SELF-HEALS: rewrites the
 * order's items from the snapshot, stamps syncHealedAt/syncHealReason, and
 * emails the admin so the fix is never silent.
 *
 * Must never break the success page: all failures return 200 with
 * { consistent: null, reason }.
 */

// Only heal orders that are still in the payment window — never overwrite
// an order that production already started working from.
const HEALABLE_STATUSES = ['pending_payment', 'paid', 'new', 'cart_abandoned']

// Lazy-init Resend to avoid build-time errors when API key is missing
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const orderId = body?.orderId
    const items = body?.items
    const total = body?.total
    const phone = body?.phone

    if (typeof orderId !== 'string' || !orderId.trim() || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ consistent: null, reason: 'invalid_payload' })
    }

    const docRef = adminDb.collection('orders').doc(orderId.trim())
    const snap = await docRef.get()
    if (!snap.exists) {
      return NextResponse.json({ consistent: null, reason: 'order_not_found' })
    }

    const data = snap.data()!

    // Ownership gate (public endpoint, same model as /api/order-sync and
    // /api/payment/client-confirm): the caller MUST prove knowledge of the
    // order's phone before we ever overwrite items/total. Without this an
    // attacker who learns any orderId could rewrite that order's contents.
    const orderPhone = String(data.customer?.phone || '').replace(/[-\s]/g, '')
    const requestPhone = typeof phone === 'string' ? phone.replace(/[-\s]/g, '') : ''
    if (!orderPhone || !requestPhone || orderPhone !== requestPhone) {
      return NextResponse.json({ consistent: null, reason: 'unauthorized' }, { status: 403 })
    }
    const orderSig = itemsSignature(Array.isArray(data.items) ? data.items : [])
    const snapshotSig = itemsSignature(items)

    // Pricing coherence: the snapshot total is what the customer actually paid
    // (coupon included). If the order doc's total diverged — e.g. a coupon was
    // applied at re-checkout but the order sync didn't land — that's a mismatch
    // too, even when the items themselves are identical (bug of order #1310:
    // admin showed the pre-coupon price).
    const snapTotalValid = typeof total === 'number' && isFinite(total) && total > 0
    const itemsMismatch = orderSig !== snapshotSig
    const totalMismatch = snapTotalValid && Math.abs(round2(data.total) - round2(total)) >= 0.5

    if (!itemsMismatch && !totalMismatch) {
      return NextResponse.json({ consistent: true })
    }

    // MISMATCH — the order in Firestore diverged from what the customer paid
    // for (and from the design_mockup email). Self-heal from the snapshot.
    console.error(
      `Order sync mismatch for order #${data.orderNumber} (${docRef.id}) [items=${itemsMismatch}, total=${totalMismatch}]:\n  order:    ${orderSig} (total ${data.total})\n  snapshot: ${snapshotSig} (total ${total})`
    )

    let healed = false
    const now = Timestamp.now()
    if (HEALABLE_STATUSES.includes(data.status)) {
      // The pricing fields travel together as one coherent set — never write a
      // discounted total while leaving subtotal/discount/couponCode stale.
      const subtotal = body?.subtotal
      const discount = body?.discount
      const couponCode = body?.couponCode
      await docRef.update({
        ...(itemsMismatch ? { items: sanitizeItems(items) } : {}),
        ...(snapTotalValid ? { total: round2(total) } : {}),
        ...(typeof subtotal === 'number' && isFinite(subtotal) && subtotal >= 0 ? { subtotal: round2(subtotal) } : {}),
        ...(typeof discount === 'number' && isFinite(discount) && discount >= 0 ? { discount: round2(discount) } : {}),
        ...(typeof couponCode === 'string' ? { couponCode: couponCode.slice(0, 40) } : {}),
        syncHealedAt: now,
        syncHealReason: itemsMismatch
          ? 'items_signature_mismatch_at_payment_success'
          : 'total_mismatch_at_payment_success',
        updatedAt: now,
      })
      healed = true
    }

    await sendMismatchAlert(data, healed)

    return NextResponse.json({ consistent: false, healed })
  } catch (e) {
    // The guard must never break the success page — swallow everything
    console.error('verify-order-sync endpoint error:', e)
    const reason = e instanceof Error ? e.message : 'internal_error'
    return NextResponse.json({ consistent: null, reason })
  }
}

async function sendMismatchAlert(
  data: FirebaseFirestore.DocumentData,
  healed: boolean
): Promise<void> {
  try {
    const resend = getResend()
    const to = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!resend || !to) {
      console.warn('⚠️ Resend or admin email not configured. Order-sync alert not sent.')
      return
    }

    const orderNumber = data.orderNumber ?? 0
    const customerName =
      `${data.customer?.firstName || ''} ${data.customer?.lastName || ''}`.trim() || '—'
    const phone: string = data.customer?.phone || ''
    const phoneHtml = phone
      ? `<a href="tel:${escapeHtml(phone)}" style="color: #2563eb; text-decoration: none; font-weight: bold;">${escapeHtml(phone)}</a>`
      : '—'

    const healLine = healed
      ? 'ההזמנה עודכנה אוטומטית לפי העיצובים שהלקוח שילם עליהם (זהים למייל העיצובים).'
      : 'ההזמנה כבר בטיפול (סטטוס מתקדם) ולכן לא עודכנה אוטומטית — יש להשוות ידנית מול מייל העיצובים!'

    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
        <div style="background: #f59e0b; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; color: #1e293b; font-size: 22px;">⚠️ זוהה פער בין ההזמנה לעיצובים ששולמו</h1>
        </div>
        <p style="color: #1e293b; font-size: 15px; line-height: 1.6;">
          בעת אישור התשלום זוהה שהפריטים השמורים בהזמנה שונים מהפריטים שהלקוח שילם עליהם בפועל.
          <br /><strong>${healLine}</strong>
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: right;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">מספר הזמנה</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">#${orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">שם הלקוח</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${escapeHtml(customerName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">טלפון</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${phoneHtml}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">תוקן אוטומטית</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${healed ? 'כן ✓' : 'לא — נדרשת בדיקה ידנית!'}</td>
          </tr>
        </table>
        <div style="text-align: center; margin-top: 24px;">
          <a href="https://badfos.co.il/admin/orders" style="background: #f59e0b; color: #1e293b; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">📋 לניהול ההזמנות</a>
        </div>
      </div>
    `

    const { error } = await resend.emails.send({
      from: 'בדפוס <no-reply@badfos.co.il>',
      to,
      subject: `⚠️ תוקן פער בין הזמנה למייל — הזמנה #${orderNumber}`,
      html,
    })
    if (error) console.error('Order-sync alert Resend error:', error)
    else await recordUsage('resend_email')
  } catch (e) {
    console.error('Order-sync alert email error:', e)
  }
}
