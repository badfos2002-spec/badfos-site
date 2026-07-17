import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createUpscalePrediction } from '@/lib/upscale'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://badfos.co.il'

// Statuses in which an order's designs should be print-ready
const UPSCALABLE_STATUSES = ['paid', 'in_production', 'shipped', 'completed']

/**
 * Kick off automatic 4x upscaling (Replicate Real-ESRGAN) for every design
 * image of a PAID order. Called fire-and-forget from the payment webhook /
 * confirm / client-confirm routes whenever an order transitions to paid.
 *
 * Idempotent: each design gets an entry in order.upscales keyed
 * `${itemIndex}_${areaId}` — designs already pending/done are skipped, so
 * multiple triggers (webhook + confirm + client-confirm) are safe.
 * Failed designs are retried on the next trigger.
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

    const orderRef = adminDb.collection('orders').doc(orderId.trim())

    // Atomically claim the designs that still need upscaling — prevents
    // duplicate predictions when several triggers fire at once.
    const claimed: { key: string; imageUrl: string }[] = []
    let notFound = false
    let wrongStatus: string | null = null

    await adminDb.runTransaction(async (tx) => {
      claimed.length = 0
      notFound = false
      wrongStatus = null

      const snap = await tx.get(orderRef)
      if (!snap.exists) {
        notFound = true
        return
      }
      const order = snap.data()!

      if (!UPSCALABLE_STATUSES.includes(order.status)) {
        wrongStatus = order.status
        return
      }

      const upscales = order.upscales || {}
      const updates: Record<string, any> = {}

      const items = Array.isArray(order.items) ? order.items : []
      items.forEach((item: any, itemIdx: number) => {
        const designs = Array.isArray(item?.designs) ? item.designs : []
        designs.forEach((design: any) => {
          const area = typeof design?.area === 'string' ? design.area : ''
          const imageUrl = typeof design?.imageUrl === 'string' ? design.imageUrl : ''
          // Only Storage/https URLs — Replicate can't fetch base64 blobs this large
          if (!area || !imageUrl.startsWith('https://')) return

          const key = `${itemIdx}_${area}`
          const existing = upscales[key]
          if (existing && existing.status !== 'failed') return // done or pending

          claimed.push({ key, imageUrl })
          updates[`upscales.${key}`] = {
            status: 'pending',
            sourceUrl: imageUrl,
            createdAt: new Date(),
          }
        })
      })

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date()
        tx.update(orderRef, updates)
      }
    })

    if (notFound) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    // HARD RULE: never spend a prediction on an unpaid order — even a
    // stray/manual call is rejected unless the order is in the paid family
    if (wrongStatus) {
      console.error(`Upscale designs: rejected — order ${orderRef.id} is ${wrongStatus}, not paid`)
      return NextResponse.json({ error: 'order_not_paid', status: wrongStatus }, { status: 400 })
    }
    if (claimed.length === 0) {
      return NextResponse.json({ success: true, created: 0, message: 'Nothing to upscale' })
    }

    // Create Replicate predictions (completion webhook — we don't wait)
    let created = 0
    for (const { key, imageUrl } of claimed) {
      const callbackUrl =
        `${SITE_URL}/api/upscale-callback?orderId=${encodeURIComponent(orderRef.id)}&key=${encodeURIComponent(key)}`
      try {
        const { id } = await createUpscalePrediction(imageUrl, callbackUrl)
        await orderRef.update({ [`upscales.${key}.predictionId`]: id })
        created++
        console.log(`Upscale designs: prediction ${id} created for order ${orderRef.id} [${key}]`)
      } catch (err) {
        console.error(`Upscale designs: failed to create prediction for ${orderRef.id} [${key}]:`, err)
        await orderRef.update({
          [`upscales.${key}.status`]: 'failed',
          [`upscales.${key}.error`]: err instanceof Error ? err.message.slice(0, 300) : 'prediction creation failed',
        }).catch(() => {})
      }
    }

    return NextResponse.json({ success: true, created, total: claimed.length })
  } catch (error) {
    console.error('Upscale designs error:', error)
    return NextResponse.json({ error: 'Failed to start upscaling' }, { status: 500 })
  }
}
