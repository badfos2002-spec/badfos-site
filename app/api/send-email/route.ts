import { NextRequest, NextResponse } from 'next/server'
import { Order, Lead, LeadSource } from '@/lib/types'
import { OrderInProductionEmail } from '@/lib/email-templates/order-in-production'
import { OrderShippedEmail } from '@/lib/email-templates/order-shipped'
import { NewLeadEmail } from '@/lib/email-templates/new-lead'
import { OrderConfirmationEmail } from '@/lib/email-templates/order-confirmation'
import { rejectUnlessAdmin } from '@/lib/admin-request-auth'
import { isSingleEmail, ownerRecipients, resendConfigured, sendEmail, sendNewOrderOwnerEmail, sendOwnerEmail } from '@/lib/order-emails'

/**
 * Who may send what (this route is public):
 * - order_confirmation / order_in_production / order_shipped: admin only
 *   (Firebase ID token, rejectUnlessAdmin). Server routes import
 *   lib/order-emails directly instead of calling this route.
 * - new_order: { orderId } only — always to the owner, once per order
 *   (lib/order-emails). design_mockup is not accepted here: it is sent only by
 *   the payment-verified server paths (payment/confirm, webhooks).
 * - new_lead: always to the fixed owner address; fields escaped in the template.
 */

// Simple in-memory rate limiter (per IP, resets on redeploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 15
const RATE_LIMIT_WINDOW = 60_000 // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { type, data, couponCode, trackingNumber } = body ?? {}

    // Owner new-order alert: only orderId travels; recipient is always the owner.
    if (type === 'new_order') {
      const { status, body: resBody } = await sendNewOrderOwnerEmail(body.orderId)
      return NextResponse.json(resBody, { status })
    }

    const adminOnly = type === 'order_confirmation' || type === 'order_in_production' || type === 'order_shipped'
    if (adminOnly) {
      const denied = await rejectUnlessAdmin(request, 'send-email')
      if (denied) return denied
    }

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data' },
        { status: 400 }
      )
    }

    let emailHtml: string
    let subject: string
    let to: string
    let ownerBound = false

    switch (type) {
      case 'order_confirmation':
        const order = data as Order
        emailHtml = OrderConfirmationEmail({ order, couponCode })
        subject = `אישור הזמנה #${order.orderNumber} - בדפוס`
        to = order.customer.email
        break

      case 'order_in_production':
        const prodOrder = data as Order
        emailHtml = OrderInProductionEmail({ order: prodOrder })
        subject = `ההזמנה שלך בייצור 🎨 - הזמנה #${prodOrder.orderNumber}`
        to = prodOrder.customer.email
        break

      case 'order_shipped':
        const shipOrder = data as Order
        emailHtml = OrderShippedEmail({ order: shipOrder, trackingNumber })
        subject = `ההזמנה שלך נשלחה 📦 - הזמנה #${shipOrder.orderNumber}`
        to = shipOrder.customer.email
        break

      case 'new_lead':
        const lead = sanitizeLead(data)
        if (!lead) return NextResponse.json({ error: 'Invalid lead' }, { status: 400 })
        emailHtml = NewLeadEmail({ lead })
        subject = `🔔 ליד חדש מ-${lead.source} - ${lead.name}`
        to = ''
        ownerBound = true
        if (ownerRecipients().length === 0) return NextResponse.json({ error: 'Admin email not configured' }, { status: 500 })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    if (!ownerBound && !isSingleEmail(to)) {
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 })
    }

    // Check if Resend is configured
    if (!resendConfigured()) {
      console.warn('⚠️ Resend API key not configured. Email not sent.')
      return NextResponse.json(
        { success: true, message: 'Email skipped (Resend not configured)' },
        { status: 200 }
      )
    }

    try {
      const emailId = ownerBound ? await sendOwnerEmail(subject, emailHtml) : await sendEmail(to, subject, emailHtml)
      return NextResponse.json({ success: true, emailId }, { status: 200 })
    } catch (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

const LEAD_SOURCES: LeadSource[] = ['popup', 'bottom_form', 'contact_form', 'landing']

/** Only known string fields, length-capped, no line breaks in header-bound fields. */
function sanitizeLead(data: unknown): Lead | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const str = (v: unknown, max: number, oneLine = true) => {
    if (typeof v !== 'string') return ''
    const s = oneLine ? v.replace(/[\r\n]+/g, ' ') : v
    return s.trim().slice(0, max)
  }
  const source = d.source as LeadSource
  if (!LEAD_SOURCES.includes(source)) return null
  const name = str(d.name, 100)
  const phone = str(d.phone, 30)
  if (!name || !phone) return null
  return {
    name,
    phone,
    email: str(d.email, 200) || undefined,
    subject: str(d.subject, 200) || undefined,
    // landing form sends its description as `notes`
    message: str(d.message ?? d.notes, 2000, false) || undefined,
    source,
    status: 'new',
  } as Lead
}
