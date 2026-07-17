import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminStorage } from '@/lib/firebase-admin'
import { randomUUID } from 'crypto'

// Downloading a 4x image (can be several MB) + re-uploading to Storage
// needs more than the default duration on Vercel Hobby
export const maxDuration = 60

/**
 * Replicate completion webhook for design upscaling.
 * Called as: POST /api/upscale-callback?orderId=<id>&key=<itemIdx_areaId>
 * Body: the finished prediction object ({ id, status, output, error, ... }).
 *
 * Trust model: the request is only honored when the prediction id in the body
 * matches the predictionId we stored on the order when creating the
 * prediction — a caller who doesn't know both the orderId, the design key
 * AND the exact prediction id can't affect anything.
 *
 * On succeeded: download the upscaled output, store it in Firebase Storage
 * next to the original (designs/<orderId>/<key>-upscaled.png), save URL.
 * On failed: mark failed — the original design stays fully usable.
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const orderId = url.searchParams.get('orderId') || ''
    const key = url.searchParams.get('key') || ''

    // Strict key format (`${itemIdx}_${areaId}`) — also guards the Firestore
    // field paths and the Storage file path built from it below
    if (!orderId || !/^[A-Za-z0-9_-]+$/.test(orderId) || !/^\d+_[A-Za-z0-9_]+$/.test(key)) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const predictionId = body?.id
    const status = body?.status
    if (typeof predictionId !== 'string' || !predictionId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const orderRef = adminDb.collection('orders').doc(orderId)
    const snap = await orderRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const entry = snap.data()?.upscales?.[key]
    // Only trust callbacks for a prediction we actually created for this design
    if (!entry || entry.predictionId !== predictionId) {
      console.error(`Upscale callback: unknown prediction ${predictionId} for order ${orderId} [${key}]`)
      return NextResponse.json({ error: 'Unknown prediction' }, { status: 404 })
    }

    // Idempotency — Replicate may retry webhooks
    if (entry.status === 'done' && entry.url) {
      return NextResponse.json({ success: true, alreadyDone: true })
    }

    if (status !== 'succeeded') {
      const reason = typeof body?.error === 'string' ? body.error.slice(0, 300) : `prediction ${status}`
      await orderRef.update({
        [`upscales.${key}.status`]: 'failed',
        [`upscales.${key}.error`]: reason,
        [`upscales.${key}.completedAt`]: new Date(),
      })
      console.error(`Upscale callback: prediction ${predictionId} ${status} for order ${orderId} [${key}]: ${reason}`)
      return NextResponse.json({ success: true, failed: true })
    }

    // Real-ESRGAN output is a single URL (be lenient about array form)
    const output = Array.isArray(body.output) ? body.output[0] : body.output
    if (typeof output !== 'string' || !output.startsWith('https://')) {
      await orderRef.update({
        [`upscales.${key}.status`]: 'failed',
        [`upscales.${key}.error`]: 'missing output url',
        [`upscales.${key}.completedAt`]: new Date(),
      })
      return NextResponse.json({ success: true, failed: true })
    }

    // Download the upscaled image from Replicate (their URLs expire after ~1h,
    // so we must persist a copy) and upload next to the original design
    const imgRes = await fetch(output)
    if (!imgRes.ok) {
      throw new Error(`Failed to download upscaled image: ${imgRes.status}`)
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const contentType = imgRes.headers.get('content-type') || 'image/png'

    const bucket = adminStorage.bucket()
    const filePath = `designs/${orderId}/${key}-upscaled.png`
    const downloadToken = randomUUID()
    await bucket.file(filePath).save(buffer, {
      metadata: {
        contentType,
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    })
    const downloadUrl =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`

    await orderRef.update({
      [`upscales.${key}.status`]: 'done',
      [`upscales.${key}.url`]: downloadUrl,
      [`upscales.${key}.completedAt`]: new Date(),
    })

    console.log(`Upscale callback: order ${orderId} [${key}] done (${Math.round(buffer.length / 1024)}KB)`)
    return NextResponse.json({ success: true, url: downloadUrl })
  } catch (error) {
    console.error('Upscale callback error:', error)
    // Non-2xx → Replicate retries the webhook a few times
    return NextResponse.json({ error: 'Callback failed' }, { status: 500 })
  }
}
