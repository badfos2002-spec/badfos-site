import { adminDb } from '@/lib/firebase-admin'
import { Resend } from 'resend'
import { escapeHtml } from '@/lib/utils'
import {
  pickFallbackOrder,
  orderToCandidate,
  PAID_SIBLING_WINDOW_MS,
  type OrderCandidate,
} from '@/lib/payment-matching'
import { recordUsage } from '@/lib/usage-tracking'

/**
 * Server-side fallback order lookup shared by /api/webhooks and
 * /api/payment/confirm — used only when the exact paymentId match failed.
 * The matching rules themselves are pure (lib/payment-matching.ts).
 *
 * On a suspect duplicate (a sibling order was already paid with the same sum
 * recently) it does NOT mark anything paid: it stamps the open duplicates as
 * superseded (so the abandoned-recovery machinery skips them) and emails the
 * admin "תשלום תואם ליותר מהזמנה אחת — נדרשת בדיקה".
 */

type FallbackOutcome =
  | { outcome: 'match'; doc: FirebaseFirestore.QueryDocumentSnapshot; data: FirebaseFirestore.DocumentData }
  | { outcome: 'flagged' }
  | { outcome: 'none' }

// Lazy-init Resend to avoid build-time errors when API key is missing
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export async function findOrderByFallback(opts: {
  payerPhone?: string
  payerEmail?: string
  paymentSum?: number | string
  transactionPaymentId?: string
  transactionCode?: string
  source: string
}): Promise<FallbackOutcome> {
  const paymentSum =
    opts.paymentSum !== undefined && opts.paymentSum !== null && String(opts.paymentSum) !== ''
      ? Number(opts.paymentSum)
      : undefined

  if (opts.payerPhone) {
    const cleanPhone = opts.payerPhone.replace(/[-\s()]/g, '')
    const phonesToTry = [cleanPhone, opts.payerPhone]
    // Also try with dash: 05X-XXXXXXX
    if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
      phonesToTry.push(`${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3)}`)
    }
    for (const phone of Array.from(new Set(phonesToTry))) {
      const snapshot = await adminDb
        .collection('orders')
        .where('customer.phone', '==', phone)
        .limit(10)
        .get()
      const res = await resolveSnapshot(snapshot, paymentSum, opts, `phone ${phone}`)
      if (res) return res
    }
  }

  if (opts.payerEmail) {
    const snapshot = await adminDb
      .collection('orders')
      .where('customer.email', '==', opts.payerEmail.toLowerCase())
      .limit(10)
      .get()
    const res = await resolveSnapshot(snapshot, paymentSum, opts, `email ${opts.payerEmail}`)
    if (res) return res
  }

  return { outcome: 'none' }
}

async function resolveSnapshot(
  snapshot: FirebaseFirestore.QuerySnapshot,
  paymentSum: number | undefined,
  opts: { transactionPaymentId?: string; transactionCode?: string; source: string },
  identifier: string
): Promise<FallbackOutcome | null> {
  if (snapshot.empty) return null
  const candidates = snapshot.docs.map((d) => orderToCandidate(d.id, d.data()))
  const result = pickFallbackOrder(candidates, {
    paymentSum,
    transactionPaymentId: opts.transactionPaymentId,
  })

  if (result.action === 'suspect_duplicate') {
    console.warn(
      `[${opts.source}] Payment (₪${paymentSum ?? '?'}, ${identifier}) matches open order(s) ` +
        `${result.candidates.map((c) => `#${c.orderNumber}`).join(', ')} but sibling ` +
        `#${result.paidSibling.orderNumber} was already paid with the same sum — NOT auto-marking.`
    )
    // The open duplicates were almost certainly completed by the paid sibling —
    // exclude them from the abandoned-recovery machinery (no coupon WhatsApp
    // for a cart that was actually completed).
    await stampSuperseded(result.candidates, result.paidSibling)
    await sendDuplicatePaymentAlert({
      identifier,
      paymentSum,
      transactionCode: opts.transactionCode,
      paidSibling: result.paidSibling,
      candidates: result.candidates,
      source: opts.source,
    }).catch((e) => console.error('Duplicate-payment alert failed:', e))
    return { outcome: 'flagged' }
  }

  if (result.action === 'match') {
    const doc = snapshot.docs.find((d) => d.id === result.order.id)
    if (!doc) return null
    // Any OTHER open orders matching the same customer+amount are duplicates
    // of the one being paid — stamp them superseded (best-effort).
    const others = result.candidates.filter((c) => c.id !== result.order.id)
    if (others.length > 0) {
      await stampSuperseded(others, result.order)
    }
    return { outcome: 'match', doc, data: doc.data() }
  }

  return null
}

/** Stamp duplicates ↔ survivor so recovery/analytics can tell them apart. Never throws. */
async function stampSuperseded(
  duplicates: OrderCandidate[],
  survivor: OrderCandidate
): Promise<void> {
  try {
    if (duplicates.length === 0) return
    const batch = adminDb.batch()
    const now = new Date()
    for (const dup of duplicates) {
      batch.update(adminDb.collection('orders').doc(dup.id), {
        supersededByOrderId: survivor.id,
        updatedAt: now,
      })
    }
    batch.update(adminDb.collection('orders').doc(survivor.id), {
      supersedesOrderId: duplicates[0].id,
      updatedAt: now,
    })
    await batch.commit()
  } catch (e) {
    console.error('Failed to stamp superseded orders:', e)
  }
}

/**
 * Was another order of the same customer already paid with (about) the same
 * total recently? Used by the abandoned-recovery machinery so a cart that was
 * actually completed under a duplicate order never gets a recovery coupon.
 * Never throws.
 */
export async function wasCompletedBySibling(
  data: FirebaseFirestore.DocumentData,
  excludeId: string
): Promise<{ superseded: boolean; siblingId?: string }> {
  try {
    if (data.supersededByOrderId) {
      return { superseded: true, siblingId: String(data.supersededByOrderId) }
    }
    const phone = String(data.customer?.phone || '')
    const total = Number(data.total) || 0
    if (!phone || !total) return { superseded: false }

    const snapshot = await adminDb
      .collection('orders')
      .where('customer.phone', '==', phone)
      .limit(10)
      .get()
    const now = Date.now()
    for (const doc of snapshot.docs) {
      if (doc.id === excludeId) continue
      const c = orderToCandidate(doc.id, doc.data())
      if (c.status === 'pending_payment' || c.status === 'cart_abandoned') continue
      if (typeof c.paidAtMs !== 'number' || now - c.paidAtMs > PAID_SIBLING_WINDOW_MS) continue
      if (Math.abs((c.paymentSum ?? c.total) - total) < 0.5) {
        return { superseded: true, siblingId: doc.id }
      }
    }
    return { superseded: false }
  } catch (e) {
    console.error('wasCompletedBySibling check failed:', e)
    return { superseded: false }
  }
}

async function sendDuplicatePaymentAlert(info: {
  identifier: string
  paymentSum?: number
  transactionCode?: string
  paidSibling: OrderCandidate
  candidates: OrderCandidate[]
  source: string
}): Promise<void> {
  const resend = getResend()
  const to = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (!resend || !to) {
    console.warn('⚠️ Resend or admin email not configured. Duplicate-payment alert not sent.')
    return
  }

  const rows = info.candidates
    .map(
      (c) =>
        `<li style="margin-bottom: 4px;">הזמנה <b>#${c.orderNumber ?? '?'}</b> (סטטוס: ${escapeHtml(c.status)}, ₪${c.total})</li>`
    )
    .join('')

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
      <div style="background: #fecaca; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="margin: 0; color: #7f1d1d; font-size: 22px;">⚠️ תשלום תואם ליותר מהזמנה אחת — נדרשת בדיקה</h1>
      </div>
      <p style="color: #334155;">
        התקבל אישור תשלום (${escapeHtml(info.identifier)}${info.paymentSum ? `, ₪${info.paymentSum}` : ''}${info.transactionCode ? `, אסמכתא ${escapeHtml(String(info.transactionCode))}` : ''})
        שתואם ליותר מהזמנה אחת של אותו לקוח.
      </p>
      <p style="color: #334155;">
        הזמנה <b>#${info.paidSibling.orderNumber ?? '?'}</b> כבר סומנה כשולמה באותו סכום —
        לכן ההזמנות הבאות <b>לא</b> סומנו אוטומטית כשולמו:
      </p>
      <ul style="color: #334155;">${rows}</ul>
      <p style="color: #64748b; font-size: 14px;">
        ההזמנות הפתוחות סומנו כמוחלפות (superseded) ולא יקבלו קופון החזרה.
        אם מדובר בתשלום אמיתי נוסף — יש לסמן ידנית באדמין.
      </p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="https://badfos.co.il/admin/orders" style="background: #fbbf24; color: #1e293b; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">📋 לניהול ההזמנות</a>
      </div>
    </div>
  `

  const { error } = await resend.emails.send({
    from: 'בדפוס <no-reply@badfos.co.il>',
    to,
    subject: `⚠️ תשלום תואם ליותר מהזמנה אחת — נדרשת בדיקה${info.paymentSum ? ` (₪${info.paymentSum})` : ''}`,
    html,
  })

  if (error) {
    console.error('Duplicate-payment alert Resend error:', error)
  } else {
    await recordUsage('resend_email')
  }
}
