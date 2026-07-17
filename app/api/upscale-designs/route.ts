import { NextRequest, NextResponse } from 'next/server'
import { runUpscaleForOrder } from '@/lib/upscale-order'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

/**
 * Kick off automatic 4x upscaling (Replicate Real-ESRGAN) for every design
 * image of a PAID order. Called fire-and-forget from the payment webhook /
 * confirm / client-confirm routes whenever an order transitions to paid.
 *
 * The claim/idempotency/retry logic lives in lib/upscale-order.ts —
 * shared with the nightly self-healing cron (cleanup-old-designs).
 */
export async function POST(request: NextRequest) {
  try {
    // Internal endpoint — only our own server-side payment routes call it
    if (!WEBHOOK_SECRET) {
      console.error('Upscale designs: WEBHOOK_SECRET is not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    const authHeader = request.headers.get('x-webhook-secret')
    if (authHeader !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const orderId = body?.orderId
    if (typeof orderId !== 'string' || !orderId.trim()) {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
    }

    const result = await runUpscaleForOrder(orderId.trim())

    if (result.notFound) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    // HARD RULE: never spend a prediction on an unpaid order — even a
    // stray/manual call is rejected unless the order is in the paid family
    if (result.wrongStatus) {
      console.error(`Upscale designs: rejected — order ${orderId.trim()} is ${result.wrongStatus}, not paid`)
      return NextResponse.json({ error: 'order_not_paid', status: result.wrongStatus }, { status: 400 })
    }
    if (result.total === 0) {
      return NextResponse.json({ success: true, created: 0, message: 'Nothing to upscale' })
    }

    return NextResponse.json({ success: true, created: result.created, total: result.total })
  } catch (error) {
    console.error('Upscale designs error:', error)
    return NextResponse.json({ error: 'Failed to start upscaling' }, { status: 500 })
  }
}
