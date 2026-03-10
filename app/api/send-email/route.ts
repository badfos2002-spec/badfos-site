import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { Order, Lead } from '@/lib/types'
import { OrderConfirmationEmail } from '@/lib/email-templates/order-confirmation'
import { OrderInProductionEmail } from '@/lib/email-templates/order-in-production'
import { OrderShippedEmail } from '@/lib/email-templates/order-shipped'
import { NewLeadEmail } from '@/lib/email-templates/new-lead'
import { DesignMockupEmail } from '@/lib/email-templates/design-mockup'

// Lazy-init Resend to avoid build-time errors when API key is missing
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// Simple in-memory rate limiter (per IP, resets on redeploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 5
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

function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { type, data, couponCode, trackingNumber } = body

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data' },
        { status: 400 }
      )
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ Resend API key not configured. Email not sent.')
      return NextResponse.json(
        { success: true, message: 'Email skipped (Resend not configured)' },
        { status: 200 }
      )
    }

    let emailHtml: string
    let subject: string
    let to: string

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
        const lead = data as Lead
        emailHtml = NewLeadEmail({ lead })
        subject = `🔔 ליד חדש מ-${lead.source} - ${lead.name}`
        to = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'badfos2002@gmail.com'
        break

      case 'new_order':
        const { customer: newOrderCustomer, itemsCount, total: newOrderTotal, orderId: newOrderId } = data as {
          customer: { firstName: string; lastName: string; phone: string; email: string }
          itemsCount: number
          total: number
          orderId: string
        }
        emailHtml = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
            <div style="background: #fbbf24; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
              <h1 style="margin: 0; color: #1e293b; font-size: 24px;">🛒 הזמנה חדשה התקבלה!</h1>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 8px 0; color: #64748b; width: 40%;">לקוח</td><td style="padding: 8px 0; font-weight: bold;">${escapeHtml(newOrderCustomer.firstName)} ${escapeHtml(newOrderCustomer.lastName)}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">טלפון</td><td style="padding: 8px 0; font-weight: bold;">${escapeHtml(newOrderCustomer.phone)}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">אימייל</td><td style="padding: 8px 0;">${escapeHtml(newOrderCustomer.email) || '—'}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">פריטים</td><td style="padding: 8px 0;">${itemsCount}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">סה"כ</td><td style="padding: 8px 0; font-weight: bold; color: #f59e0b; font-size: 20px;">₪${newOrderTotal}</td></tr>
            </table>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://badfos.co.il/admin/orders" style="background: #fbbf24; color: #1e293b; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">📋 צפה בהזמנה במערכת</a>
            </div>
          </div>
        `
        subject = `🛒 הזמנה חדשה — ${escapeHtml(newOrderCustomer.firstName)} ${escapeHtml(newOrderCustomer.lastName)} — ₪${newOrderTotal}`
        to = 'badfos2002@gmail.com'
        break

      case 'design_mockup':
        const { customer: mockupCustomer, items: mockupItems } = data as {
          customer: { firstName: string; lastName: string; email: string; phone: string }
          items: { productType: string; color: string; fabricType?: string; designs: any[]; totalQuantity: number }[]
        }
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://badfos.co.il'
        emailHtml = DesignMockupEmail({ customer: mockupCustomer, items: mockupItems, siteUrl })
        subject = `הדמיית העיצוב שלך - בדפוס`
        to = mockupCustomer.email
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    // Send email using Resend
    const resend = getResend()
    if (!resend) {
      return NextResponse.json({ error: 'Resend not configured' }, { status: 500 })
    }
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'בדפוס <no-reply@badfos.co.il>',
      to,
      subject,
      html: emailHtml,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: emailError.message }, { status: 500 })
    }

    console.log('Email sent successfully:', emailResult?.id, 'to:', to)
    return NextResponse.json({ success: true, emailId: emailResult?.id }, { status: 200 })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
