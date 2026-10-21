/**
 * Server-only email sending (Resend). Shared by /api/send-email and by the
 * payment-verified server routes (payment/confirm, webhooks).
 *
 * Security model: /api/send-email is public and anyone can create an order
 * doc (firestore.rules allows create), so:
 * - every send goes through sendEmail, which accepts a single plain address only;
 * - customer-facing order emails (order_confirmation, design_mockup) are sent
 *   only from payment-verified server paths or by the admin;
 * - the one public order email (new_order) always goes to the fixed owner
 *   address, at most once per order (emailsSent.<type> claim).
 */
import { Resend } from 'resend'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb, adminSdkUnavailable } from '@/lib/firebase-admin'
import type { Order } from '@/lib/types'
import { escapeHtml } from '@/lib/utils'
import { OrderConfirmationEmail } from '@/lib/email-templates/order-confirmation'
import { DesignMockupEmail } from '@/lib/email-templates/design-mockup'
import { recordUsage } from '@/lib/usage-tracking'

// Lazy-init Resend to avoid build-time errors when API key is missing
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export function resendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

const EMAIL_RE = /^[^\s@<>,;:"'()[\]\\]+@[^\s@<>,;:"'()[\]\\]+\.[^\s@<>,;:"'()[\]\\]+$/

export function isSingleEmail(to: unknown): to is string {
  return typeof to === 'string' && to.length <= 254 && EMAIL_RE.test(to)
}

/**
 * Owner/admin recipients from the trusted env value — may be a comma-separated
 * list; invalid entries are dropped. Empty array = not configured.
 */
export function ownerRecipients(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').split(',').map(s => s.trim()).filter(isSingleEmail)
}

/** Owner-bound send (trusted env list). Throws if no valid owner address. */
export async function sendOwnerEmail(subject: string, html: string): Promise<string | undefined> {
  const to = ownerRecipients()
  if (to.length === 0) throw new Error('owner_email_not_configured')
  return deliver(to, subject, html)
}

/** Customer-bound send: exactly one plain address. Throws on failure. */
export async function sendEmail(to: unknown, subject: string, html: string): Promise<string | undefined> {
  if (!isSingleEmail(to)) throw new Error('invalid_recipient')
  return deliver(to, subject, html)
}

async function deliver(to: string | string[], subject: string, html: string): Promise<string | undefined> {
  const resend = getResend()
  if (!resend) throw new Error('Resend not configured')
  const { data, error } = await resend.emails.send({
    from: 'בדפוס <no-reply@badfos.co.il>',
    to,
    subject,
    html,
  })
  if (error) throw new Error(error.message)
  await recordUsage('resend_email')
  console.log('Email sent successfully:', data?.id, 'to:', to)
  return data?.id
}

// ── Once-per-order claim ────────────────────────────────────────────────────
// emailsSent.<type> = { claimedAt, sentAt? }. A claim without sentAt that is
// older than CLAIM_STALE_MS (sender crashed mid-send) can be reclaimed.

type OnceType = 'new_order' | 'design_mockup' | 'order_confirmation'
const CLAIM_STALE_MS = 10 * 60_000

type ClaimResult = { claimed: true; data: FirebaseFirestore.DocumentData } | { claimed: false; reason: 'sent' | 'in_progress' | 'missing' }

async function claimOnce(ref: FirebaseFirestore.DocumentReference, type: OnceType): Promise<ClaimResult> {
  const flag = `emailsSent.${type}`
  const result = await adminDb.runTransaction(async (t): Promise<ClaimResult> => {
    const fresh = await t.get(ref)
    if (!fresh.exists) return { claimed: false, reason: 'missing' }
    const rec = fresh.get(flag) as { claimedAt?: Timestamp; sentAt?: Timestamp } | undefined
    if (rec?.sentAt) return { claimed: false, reason: 'sent' }
    const claimedMs = rec?.claimedAt?.toMillis?.()
    if (claimedMs && Date.now() - claimedMs < CLAIM_STALE_MS) return { claimed: false, reason: 'in_progress' }
    t.update(ref, { [flag]: { claimedAt: Timestamp.now() } })
    return { claimed: true, data: fresh.data()! }
  })
  console.log(`[email-once] ${type} order ${ref.id}: ${result.claimed ? 'claimed' : `not claimed (${result.reason})`}`)
  return result
}

const OWNER = Symbol('owner')

async function sendClaimed(
  ref: FirebaseFirestore.DocumentReference,
  type: OnceType,
  to: unknown | typeof OWNER,
  subject: string,
  html: string
): Promise<string | undefined> {
  try {
    const id = to === OWNER ? await sendOwnerEmail(subject, html) : await sendEmail(to, subject, html)
    await ref.update({ [`emailsSent.${type}.sentAt`]: Timestamp.now() })
      .catch(e => console.error(`[email-once] ${type} order ${ref.id}: sent but sentAt not stored`, e))
    console.log(`[email-once] ${type} order ${ref.id}: sent`)
    return id
  } catch (e) {
    await ref.update({ [`emailsSent.${type}`]: FieldValue.delete() }).catch(() => {})
    console.error(`[email-once] ${type} order ${ref.id}: send failed, claim released`, e)
    throw e
  }
}

// ── Paid-order customer emails (server-only, payment-verified callers) ───────

/**
 * alreadyProcessed guard: only orders paid (or, without paidAt, created) in the
 * last 24h get the catch-up send — so a late/replayed webhook for an old order
 * never re-emails the customer.
 */
export function paidRecently(data: FirebaseFirestore.DocumentData | undefined): boolean {
  const v = data?.paidAt ?? data?.createdAt
  const ms = typeof v?.toMillis === 'function' ? v.toMillis() : v instanceof Date ? v.getTime() : NaN
  return Number.isFinite(ms) && Date.now() - ms < 24 * 60 * 60_000
}

/** Statuses at which the payment is confirmed (alreadyProcessed branches). */
export const PAID_OR_LATER = ['paid', 'in_production', 'shipped', 'completed']

/**
 * Order confirmation + design mockup, each at most once per order. Safe to call
 * from every payment-verified path (normal and alreadyProcessed) — the claims
 * dedupe. The admin "paid + coupon" send is separate and not deduped.
 */
export async function sendPaidOrderEmails(ref: FirebaseFirestore.DocumentReference): Promise<void> {
  const results = await Promise.allSettled([sendOrderConfirmationOnce(ref), sendDesignMockupEmail(ref)])
  for (const r of results) if (r.status === 'rejected') console.error(`[email-once] paid-order email failed for ${ref.id}:`, r.reason)
}

async function markSkipped(ref: FirebaseFirestore.DocumentReference, type: OnceType, why: string) {
  await ref.update({ [`emailsSent.${type}.sentAt`]: Timestamp.now(), [`emailsSent.${type}.skipped`]: true }).catch(() => {})
  console.log(`[email-once] ${type} order ${ref.id}: skipped (${why})`)
}

export async function sendOrderConfirmationOnce(ref: FirebaseFirestore.DocumentReference): Promise<void> {
  const claim = await claimOnce(ref, 'order_confirmation')
  if (!claim.claimed) return
  const order = { id: ref.id, ...claim.data } as Order
  if (!isSingleEmail(order.customer?.email)) return markSkipped(ref, 'order_confirmation', 'no valid recipient')
  await sendClaimed(
    ref,
    'order_confirmation',
    order.customer.email,
    `אישור הזמנה #${order.orderNumber} - בדפוס`,
    OrderConfirmationEmail({ order })
  )
}

/**
 * Admin "paid" send (/api/send-email, not deduped): record it as the
 * order_confirmation claim so a later payment-verified path (e.g. a Grow
 * webhook hitting alreadyProcessed) doesn't send a second confirmation.
 * Never throws — a failed write is only logged.
 */
export async function recordAdminOrderConfirmationSent(orderId: unknown): Promise<void> {
  if (typeof orderId !== 'string' || !orderId.trim() || orderId.length > 200 || orderId.includes('/')) return
  try {
    const unavailable = adminSdkUnavailable()
    if (unavailable) throw unavailable
    const now = Timestamp.now()
    await adminDb.collection('orders').doc(orderId).update({ 'emailsSent.order_confirmation': { claimedAt: now, sentAt: now } })
    console.log(`[email-once] order_confirmation order ${orderId}: admin send recorded`)
  } catch (e) {
    console.error(`[email-once] order_confirmation order ${orderId}: admin send not recorded`, e)
  }
}

// ── design_mockup ───────────────────────────────────────────────────────────

const MAX_ITEMS = 20
const MAX_DESIGNS_PER_ITEM = 10

/**
 * Like isOwnDesignUrl (lib/manual-order.ts) — same canonical-URL, https, host,
 * bucket and designs/<id>/<file> checks — but the file name only has to be a
 * single non-empty, non-dot segment (any charset, e.g. a Hebrew name with no
 * ASCII extension).
 */
function isOwnMockupDesignUrl(value: unknown, bucket: string | undefined): boolean {
  if (typeof value !== 'string' || !bucket) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.href !== value || url.hash || url.username || url.password) return false
  if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com' || url.port) return false
  if (url.searchParams.get('alt') !== 'media') return false
  const m = /^\/v0\/b\/([^/]+)\/o\/([^/]+)$/.exec(url.pathname)
  if (!m || m[1] !== bucket) return false
  let path: string
  try {
    path = decodeURIComponent(m[2])
  } catch {
    return false
  }
  const parts = path.split('/')
  return (
    parts.length === 3 &&
    parts[0] === 'designs' &&
    /^[A-Za-z0-9_-]+$/.test(parts[1]) &&
    parts[2].length > 0 &&
    !/^\.+$/.test(parts[2]) &&
    !/[\\\u0000-\u001f\u007f]/.test(parts[2])
  )
}

function mockupItems(items: unknown) {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  const list = Array.isArray(items) ? items.slice(0, MAX_ITEMS) : []
  return list
    .map((i: any) => ({
      productType: String(i?.productType ?? '').slice(0, 40),
      color: String(i?.color ?? '').slice(0, 40),
      fabricType: typeof i?.fabricType === 'string' ? i.fabricType.slice(0, 40) : undefined,
      totalQuantity: Number(i?.totalQuantity) || 0,
      designs: (Array.isArray(i?.designs) ? i.designs : [])
        .filter((d: any) => isOwnMockupDesignUrl(d?.imageUrl, bucket))
        .slice(0, MAX_DESIGNS_PER_ITEM)
        .map((d: any) => ({ ...d, area: String(d.area ?? '').slice(0, 40), areaName: String(d.areaName ?? '').slice(0, 60) })),
    }))
    .filter(i => i.designs.length > 0)
}

/**
 * Sends the design mockup to the stored customer email, once per order.
 * Content is built from the order as re-read inside the claim.
 * Call only from payment-verified server paths.
 */
export async function sendDesignMockupEmail(ref: FirebaseFirestore.DocumentReference): Promise<void> {
  const claim = await claimOnce(ref, 'design_mockup')
  if (!claim.claimed) return
  const order = claim.data as Order
  const items = mockupItems(order.items)
  const to = order.customer?.email
  if (!isSingleEmail(to)) return markSkipped(ref, 'design_mockup', 'no valid recipient')
  if (items.length === 0) {
    const hadDesigns = Array.isArray(order.items) && order.items.some(i => Array.isArray(i?.designs) && i.designs.length > 0)
    await markSkipped(ref, 'design_mockup', hadDesigns ? 'no design passed the own-bucket URL check' : 'no designs')
    if (hadDesigns) {
      console.warn(`[email-once] design_mockup order ${ref.id}: designs present but none on our bucket — alerting owner`)
      const n = escapeHtml(String(order.orderNumber ?? ref.id))
      await sendOwnerEmail(
        `מוקאפ לא נשלח ללקוח — הזמנה #${n}`,
        `<div dir="rtl" style="font-family: Arial, sans-serif;"><p>מוקאפ לא נשלח ללקוח — הזמנה #${n}</p><p>אף קובץ עיצוב בהזמנה לא נמצא באחסון של האתר. כדאי לבדוק את ההזמנה במערכת.</p></div>`
      ).catch(e => console.error(`[email-once] design_mockup order ${ref.id}: owner alert failed`, e))
    }
    return
  }
  const customer = {
    ...order.customer,
    firstName: String(order.customer?.firstName ?? '').slice(0, 60),
    lastName: String(order.customer?.lastName ?? '').slice(0, 60),
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://badfos.co.il'
  const html = DesignMockupEmail({ customer, items: items as any, siteUrl })
  await sendClaimed(ref, 'design_mockup', to, `הדמיית העיצוב שלך - בדפוס`, html)
}

// ── new_order (public trigger, fixed owner recipient) ───────────────────────

function buildNewOrderEmail(order: Order): { subject: string; html: string } {
  const c = order.customer
  const express = order.shipping?.method === 'pickup' && order.shipping?.express === true // same rule as CartPage getExpressCost
  const itemsCount = Array.isArray(order.items) ? order.items.length : 0
  const total = Number(order.total) || 0
  const first = String(c?.firstName ?? '').slice(0, 60)
  const last = String(c?.lastName ?? '').slice(0, 60)
  const html = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
            <div style="background: #fbbf24; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
              <h1 style="margin: 0; color: #1e293b; font-size: 24px;">🛒 הזמנה חדשה התקבלה!</h1>
            </div>
            ${express ? `
            <div style="background: #ffedd5; border: 2px solid #f97316; padding: 14px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
              <span style="color: #c2410c; font-size: 18px; font-weight: bold;">⚡ אקספרס — 1-2 ימי עסקים!</span>
            </div>
            ` : ''}
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 8px 0; color: #64748b; width: 40%;">לקוח</td><td style="padding: 8px 0; font-weight: bold;">${escapeHtml(first)} ${escapeHtml(last)}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">טלפון</td><td style="padding: 8px 0; font-weight: bold;">${escapeHtml(String(c?.phone ?? '').slice(0, 30))}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">אימייל</td><td style="padding: 8px 0;">${escapeHtml(String(c?.email ?? '').slice(0, 254)) || '—'}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">פריטים</td><td style="padding: 8px 0;">${itemsCount}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">סה"כ</td><td style="padding: 8px 0; font-weight: bold; color: #f59e0b; font-size: 20px;">₪${total}</td></tr>
            </table>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://badfos.co.il/admin/orders" style="background: #fbbf24; color: #1e293b; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">📋 צפה בהזמנה במערכת</a>
            </div>
          </div>
        `
  const subject = `${express ? '⚡ אקספרס! ' : ''}🛒 הזמנה חדשה — ${escapeHtml(first)} ${escapeHtml(last)} — ₪${total}`.replace(/[\r\n]+/g, ' ')
  return { subject, html }
}

function buildMinimalNewOrderEmail(orderId: string): { subject: string; html: string } {
  const id = escapeHtml(orderId)
  return {
    subject: `🛒 הזמנה חדשה — לא ניתן היה לטעון פרטים, מזהה: ${id}`,
    html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
            <div style="background: #fbbf24; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
              <h1 style="margin: 0; color: #1e293b; font-size: 24px;">🛒 הזמנה חדשה</h1>
            </div>
            <p style="font-size: 16px;">הזמנה חדשה — לא ניתן היה לטעון פרטים, מזהה: <strong>${id}</strong></p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://badfos.co.il/admin/orders" style="background: #fbbf24; color: #1e293b; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">📋 צפה בהזמנה במערכת</a>
            </div>
          </div>
        `,
  }
}

type RouteResult = { status: number; body: Record<string, unknown> }

/**
 * Owner "new order" notification, triggered from the public success page.
 * Recipient is always the owner. At most one email per existing order.
 * Fail-open for the owner: if the order can't be loaded (SDK down / lookup
 * error) a minimal email with the escaped orderId is still sent.
 */
export async function sendNewOrderOwnerEmail(orderId: unknown): Promise<RouteResult> {
  if (typeof orderId !== 'string' || !orderId.trim() || orderId.length > 200) {
    return { status: 400, body: { error: 'Missing orderId' } }
  }
  const id = orderId.trim()
  if (ownerRecipients().length === 0) return { status: 500, body: { error: 'Admin email not configured' } }
  if (!resendConfigured()) {
    console.warn('⚠️ Resend API key not configured. Email not sent.')
    return { status: 200, body: { success: true, message: 'Email skipped (Resend not configured)' } }
  }

  const sendMinimal = async (why: unknown): Promise<RouteResult> => {
    console.error(`[email-once] new_order ${id}: order could not be loaded — sending minimal owner email`, why)
    const { subject, html } = buildMinimalNewOrderEmail(id)
    try {
      const emailId = await sendOwnerEmail(subject, html)
      return { status: 200, body: { success: true, minimal: true, emailId } }
    } catch (e) {
      console.error('Resend error (new_order minimal):', e)
      return { status: 500, body: { error: 'Failed to send email' } }
    }
  }

  if (adminSdkUnavailable()) return sendMinimal(adminSdkUnavailable())

  // Same lookup as /api/payment/client-confirm: doc id, then paymentId.
  let ref: FirebaseFirestore.DocumentReference
  try {
    ref = adminDb.collection('orders').doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      const q = await adminDb.collection('orders').where('paymentId', '==', id).limit(1).get()
      if (q.empty) return { status: 404, body: { error: 'Order not found' } }
      ref = q.docs[0].ref
    }
  } catch (e) {
    return sendMinimal(e)
  }

  let claim: ClaimResult
  try {
    claim = await claimOnce(ref, 'new_order')
  } catch (e) {
    return sendMinimal(e)
  }
  if (!claim.claimed) {
    if (claim.reason === 'missing') return { status: 404, body: { error: 'Order not found' } }
    return { status: 200, body: { success: true, alreadySent: true } }
  }

  const { subject, html } = buildNewOrderEmail({ id: ref.id, ...claim.data } as Order)
  try {
    const emailId = await sendClaimed(ref, 'new_order', OWNER, subject, html)
    return { status: 200, body: { success: true, emailId } }
  } catch {
    return { status: 500, body: { error: 'Failed to send email' } }
  }
}
