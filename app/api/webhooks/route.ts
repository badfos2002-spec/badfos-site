import { NextRequest, NextResponse } from 'next/server'
import { updateOrderStatus, getDocument } from '@/lib/db'
import { Order } from '@/lib/types'

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
      // Add more fields based on payment gateway
    } = body

    // Handle different payment statuses
    switch (status) {
      case 'success':
      case 'completed':
        // Payment successful - update order status
        if (order_number) {
          await updateOrderStatus(order_number, 'paid')

          // Send confirmation email
          const order = await getDocument<Order>('orders', order_number)
          if (order) {
            // TODO: Generate coupon and send email
            // await fetch('/api/send-email', {
            //   method: 'POST',
            //   body: JSON.stringify({
            //     type: 'order_confirmation',
            //     data: order,
            //     couponCode: generatedCoupon
            //   })
            // })
          }
        }
        break

      case 'failed':
      case 'declined':
        // Payment failed
        if (order_number) {
          await updateOrderStatus(order_number, 'payment_failed')
        }
        break

      case 'pending':
        // Payment pending
        if (order_number) {
          await updateOrderStatus(order_number, 'pending_payment')
        }
        break

      default:
        console.warn('Unknown payment status:', status)
    }

    // Return success to webhook sender
    return NextResponse.json(
      {
        success: true,
        message: 'Webhook processed',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error,
      },
      { status: 500 }
    )
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

/**
 * Example function to verify PayPlus signature
 * TODO: Implement based on payment gateway documentation
 */
function verifyPayPlusSignature(body: any, signature: string | null): boolean {
  if (!signature) return false

  // TODO: Implement signature verification
  // const secret = process.env.PAYPLUS_SECRET_KEY
  // const computedSignature = crypto
  //   .createHmac('sha256', secret)
  //   .update(JSON.stringify(body))
  //   .digest('hex')
  //
  // return computedSignature === signature

  return true // Placeholder
}
