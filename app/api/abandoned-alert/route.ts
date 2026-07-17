import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { Resend } from 'resend'
import { escapeHtml } from '@/lib/utils'
import { sendRecoveryWhatsApp, normalizeIlPhone } from '@/lib/manychat'
import { wasCompletedBySibling } from '@/lib/order-fallback'

const STALE_MINUTES = 10 // pending_payment older than this → cart_abandoned

// Lazy-init Resend to avoid build-time errors when API key is missing
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

type AlertSource = 'payment_cancel' | 'payment_failure' | 'cart_revisit'

const SOURCE_LABELS: Record<string, string> = {
  payment_cancel: 'בוטל בתשלום',
  payment_failure: 'נכשל בתשלום',
  cart_revisit: 'חזר לעגלה בלי לשלם',
}

/**
 * Instant abandoned-cart alert: emails the business owner the moment an
 * order becomes abandoned (payment cancel/failure page, or cart revisit).
 *
 * Public endpoint, self-protecting:
 * - Never emails twice per order (abandonAlertSentAt stamp).
 * - Only acts on cart_abandoned orders, or pending_payment orders that are
 *   older than 10 minutes (or any age on explicit payment cancel/failure).
 * - Stamps abandonNotifiedAt so the daily cron never double-reports it.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const orderId = body?.orderId
    const source: AlertSource | undefined = body?.source

    if (typeof orderId !== 'string' || !orderId.trim()) {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
    }

    const docRef = adminDb.collection('orders').doc(orderId.trim())
    const snap = await docRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const data = snap.data()!

    // Idempotency / abuse guard: one alert per order, ever
    if (data.abandonAlertSentAt) {
      return NextResponse.json({ already: true })
    }

    const now = Timestamp.now()
    const status: string = data.status

    // A cart that was actually completed under a duplicate (superseded) order
    // must never trigger an alert or a recovery coupon.
    if (status === 'pending_payment' || status === 'cart_abandoned') {
      const sibling = await wasCompletedBySibling(data, docRef.id)
      if (sibling.superseded) {
        if (!data.supersededByOrderId && sibling.siblingId) {
          await docRef.update({ supersededByOrderId: sibling.siblingId, updatedAt: now })
        }
        return NextResponse.json({ skipped: true, reason: 'superseded' })
      }
    }

    if (status === 'cart_abandoned') {
      // already marked (client/admin) — proceed to alert
    } else if (status === 'pending_payment') {
      const explicitAbort = source === 'payment_cancel' || source === 'payment_failure'
      const createdAt: Date = data.createdAt?.toDate?.() ?? new Date(0)
      const isStale = Date.now() - createdAt.getTime() > STALE_MINUTES * 60 * 1000
      if (!explicitAbort && !isStale) {
        return NextResponse.json({ skipped: true })
      }
      await docRef.update({ status: 'cart_abandoned', updatedAt: now })
    } else {
      // paid / in_production / etc. — never alert
      return NextResponse.json({ skipped: true })
    }

    // Auto WhatsApp recovery via ManyChat (best-effort, independent of the email)
    const whatsapp = await autoSendRecovery(docRef, data, now)

    const emailed = await sendAlertEmail(data, source)

    if (emailed) {
      // Stamp so this order is never emailed again (here or by the daily cron)
      await docRef.update({ abandonAlertSentAt: now, abandonNotifiedAt: now })
    }

    return NextResponse.json({ success: true, emailed, whatsapp })
  } catch (e) {
    console.error('Abandoned-alert endpoint error:', e)
    return NextResponse.json({ error: 'Abandoned-alert failed' }, { status: 500 })
  }
}

/**
 * Best-effort auto WhatsApp recovery: create a BACK5 coupon and send it via
 * ManyChat. Stamps recoverySentAt only on success. Never throws.
 * Pre-checks env + phone before creating the coupon to avoid orphan coupons
 * while the ManyChat flow isn't configured yet.
 */
async function autoSendRecovery(
  docRef: FirebaseFirestore.DocumentReference,
  data: FirebaseFirestore.DocumentData,
  now: Timestamp
): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (data.recoverySentAt) return { sent: false, reason: 'already_sent' }
    if (!process.env.MANYCHAT_API_TOKEN) {
      return { sent: false, reason: 'missing MANYCHAT_API_TOKEN' }
    }
    if (!process.env.MANYCHAT_RECOVERY_FLOW_NS) {
      console.log(`ManyChat recovery skipped for order #${data.orderNumber}: flow not configured`)
      return { sent: false, reason: 'missing MANYCHAT_RECOVERY_FLOW_NS' }
    }
    if (!normalizeIlPhone(data.customer?.phone || '')) {
      return { sent: false, reason: 'unparseable phone' }
    }

    // BACK5 recovery coupon — same doc shape as createRecoveryCoupon() in lib/db.ts
    const code = `BACK5-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 3)
    const restrictedPhone = String(data.customer?.phone || '').replace(/\D/g, '')
    await adminDb.collection('coupons').add({
      code,
      discountPercent: 5,
      isUsed: false,
      isActive: true,
      expiresAt: Timestamp.fromDate(expiresAt),
      orderId: docRef.id,
      ...(restrictedPhone && { restrictedPhone }),
      createdAt: Timestamp.now(),
    })

    const result = await sendRecoveryWhatsApp({
      orderId: docRef.id,
      orderNumber: data.orderNumber ?? 0,
      firstName: data.customer?.firstName || '',
      lastName: data.customer?.lastName || '',
      phone: data.customer?.phone || '',
      couponCode: code,
    })

    if (result.sent) {
      await docRef.update({
        recoverySentAt: now,
        recoveryCouponCode: code,
        recoveryChannel: 'manychat_auto',
      })
    } else {
      // Coupon doc may already exist — acceptable, it's just an unused coupon
      console.log(`ManyChat recovery not sent for order #${data.orderNumber}: ${result.reason}`)
    }
    return result
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error('ManyChat auto-recovery error:', reason)
    return { sent: false, reason }
  }
}

async function sendAlertEmail(
  data: FirebaseFirestore.DocumentData,
  source?: AlertSource
): Promise<boolean> {
  const resend = getResend()
  const to = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (!resend || !to) {
    console.warn('⚠️ Resend or admin email not configured. Abandoned-cart alert not sent.')
    return false
  }

  const orderNumber = data.orderNumber ?? 0
  const customerName =
    `${data.customer?.firstName || ''} ${data.customer?.lastName || ''}`.trim() || '—'
  const phone: string = data.customer?.phone || ''
  const total = data.total ?? 0
  const sourceLabel = (source && SOURCE_LABELS[source]) || 'לא הושלם'

  const phoneHtml = phone
    ? `<a href="tel:${escapeHtml(phone)}" style="color: #2563eb; text-decoration: none; font-weight: bold;">${escapeHtml(phone)}</a>`
    : '—'

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
      <div style="background: #fbbf24; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="margin: 0; color: #1e293b; font-size: 24px;">🛒 עגלה נטושה חדשה</h1>
      </div>
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
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">סכום</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #f59e0b;">₪${total}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">סטטוס</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${sourceLabel}</td>
        </tr>
      </table>
      <p style="color: #64748b; font-size: 14px;">לחצו על 'קופון 5% החזרת לקוח' לשליחת וואטסאפ עם קופון.</p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="https://badfos.co.il/admin/orders" style="background: #fbbf24; color: #1e293b; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">📋 לניהול ההזמנות</a>
      </div>
    </div>
  `

  const { error } = await resend.emails.send({
    from: 'בדפוס <no-reply@badfos.co.il>',
    to,
    subject: `🛒 עגלה נטושה חדשה — הזמנה #${orderNumber} (${total}₪)`,
    html,
  })

  if (error) {
    console.error('Abandoned-cart instant alert Resend error:', error)
    return false
  }
  return true
}
