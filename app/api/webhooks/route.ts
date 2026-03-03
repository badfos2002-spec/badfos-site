import { NextRequest, NextResponse } from 'next/server'
import { updateOrderStatus, getOrderByNumber } from '@/lib/db'

/**
 * Webhook endpoint for payment gateway (PayPlus/Meshulam)
 * This is a placeholder for future payment integration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('🔔 Webhook received:', body)

    // TODO: Verify webhook signature
    // Example for PayPlus:
    // const signature = request.headers.get('x-payplus-signature')
    // if (!verifyPayPlusSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    // Extract payment data
    const {
      transaction_id,
      order_number,
      status,
      amount,
      customer_email,
    } = body

    // Handle different payment statuses
    switch (status) {
      case 'success':
      case 'completed': {
        if (order_number) {
          // Look up order by sequential orderNumber to get the Firestore document ID
          const order = await getOrderByNumber(Number(order_number))
          if (order) {
            await updateOrderStatus(order.id, 'paid')

            // TODO: Generate coupon and send confirmation email
            // const couponCode = await createCoupon(10, order.id)
            // await fetch('/api/send-email', {
            //   method: 'POST',
            //   body: JSON.stringify({ type: 'order_confirmation', data: order, couponCode })
            // })
          } else {
            console.warn(`⚠️ Order not found for orderNumber: ${order_number}`)
          }
        }
        break
      }

      case 'failed':
      case 'declined': {
        if (order_number) {
          const order = await getOrderByNumber(Number(order_number))
          if (order) {
            await updateOrderStatus(order.id, 'cancelled')
          }
        }
        break
      }

      case 'pending': {
        // No change needed — order already starts as pending_payment
        break
      }

      default:
        console.warn('Unknown payment status:', status)
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' }, { status: 200 })
  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}

/**
 * GET endpoint to test webhook is working
 */
export async function GET() {
  return NextResponse.json({
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  })
}
