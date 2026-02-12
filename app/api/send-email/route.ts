import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { Order, Lead } from '@/lib/types'
import { OrderConfirmationEmail } from '@/lib/email-templates/order-confirmation'
import { OrderInProductionEmail } from '@/lib/email-templates/order-in-production'
import { OrderShippedEmail } from '@/lib/email-templates/order-shipped'
import { NewLeadEmail } from '@/lib/email-templates/new-lead'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
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
        to = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'info@badfos.co.il'
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    // Send email using Resend
    const result = await resend.emails.send({
      from: 'בדפוס <no-reply@badfos.co.il>',
      to,
      subject,
      html: emailHtml,
    })

    console.log('✅ Email sent successfully:', result)

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (error) {
    console.error('❌ Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: error },
      { status: 500 }
    )
  }
}
