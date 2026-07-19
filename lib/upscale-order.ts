import { adminDb } from '@/lib/firebase-admin'
import { createUpscalePrediction, SKIP_UPSCALE_PIXELS, PIXEL_LIMIT_ERROR } from '@/lib/upscale'
import { readImagePixels } from '@/lib/image-dims'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://badfos.co.il'

// Statuses in which an order's designs should be print-ready
export const UPSCALABLE_STATUSES = ['paid', 'in_production', 'shipped', 'completed']

/** A pending upscale older than this is considered stuck (lost Replicate webhook) */
export const STUCK_PENDING_MS = 60 * 60 * 1000 // 1 hour

/** Total prediction attempts per design before giving up permanently (gave_up) */
export const MAX_UPSCALE_ATTEMPTS = 3

/**
 * Best-effort millis for an upscale entry's createdAt, which may be a
 * Firestore Timestamp, a Date, or a serialized date. null = unknown age.
 */
export function upscaleEntryMillis(v: unknown): number | null {
  if (!v) return null
  const ts = v as { toMillis?: () => number }
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'string' || typeof v === 'number') {
    const ms = new Date(v).getTime()
    return Number.isNaN(ms) ? null : ms
  }
  return null
}

export interface UpscaleRunResult {
  notFound?: boolean
  /** Set when the order is not in the paid family — nothing was done */
  wrongStatus?: string
  created: number
  total: number
  gaveUp: number
  /** Designs already at/above the model limit — used the original as print file */
  skipped: number
  /** Existing pixel-limit failures/gave_ups converted in-place to done+original */
  healed: number
}

/**
 * Kick off automatic 4x upscaling (Replicate Real-ESRGAN) for every design
 * image of a PAID order. Shared by the payment triggers
 * (/api/upscale-designs) and the nightly self-healing cron.
 *
 * Idempotent: each design gets an entry in order.upscales keyed
 * `${itemIndex}_${areaId}` — designs already done/pending are skipped, so
 * multiple triggers (webhook + confirm + client-confirm + cron) are safe.
 *
 * Retry policy: `failed` entries are retried; with `retryStuckPending`
 * (cron), `pending` entries older than STUCK_PENDING_MS (lost webhook) are
 * retried too. Every prediction creation increments `attempts` — after
 * MAX_UPSCALE_ATTEMPTS the entry is permanently marked `gave_up` and the
 * admin simply uses the original image.
 */
export async function runUpscaleForOrder(
  orderId: string,
  opts: { retryStuckPending?: boolean } = {}
): Promise<UpscaleRunResult> {
  const orderRef = adminDb.collection('orders').doc(orderId)

  // Atomically claim the designs that still need upscaling — prevents
  // duplicate predictions when several triggers fire at once.
  const claimed: { key: string; imageUrl: string }[] = []
  let notFound = false
  let wrongStatus: string | null = null
  let gaveUp = 0
  let healed = 0

  await adminDb.runTransaction(async (tx) => {
    claimed.length = 0
    notFound = false
    wrongStatus = null
    gaveUp = 0
    healed = 0

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

        // Self-heal: an entry that failed/gave up on the model's pixel limit is
        // actually already high-res — convert it in place to done+original.
        // No network I/O here — pure data, safe inside the transaction.
        if (
          existing &&
          (existing.status === 'failed' || existing.status === 'gave_up') &&
          typeof existing.error === 'string' &&
          PIXEL_LIMIT_ERROR.test(existing.error)
        ) {
          updates[`upscales.${key}.status`] = 'done'
          updates[`upscales.${key}.url`] = existing.sourceUrl || imageUrl
          updates[`upscales.${key}.alreadyHighRes`] = true
          updates[`upscales.${key}.completedAt`] = new Date()
          healed++
          return
        }

        let attempts = 0
        if (existing) {
          if (existing.status === 'done' || existing.status === 'gave_up') return
          // Entries created before attempt tracking count as one attempt
          attempts = typeof existing.attempts === 'number' ? existing.attempts : 1
          if (existing.status === 'pending') {
            if (!opts.retryStuckPending) return
            const ms = upscaleEntryMillis(existing.createdAt)
            // Fresh pending — the completion webhook may still arrive
            if (ms !== null && Date.now() - ms < STUCK_PENDING_MS) return
          }
          // failed / stuck pending — permanent fallback after MAX attempts
          if (attempts >= MAX_UPSCALE_ATTEMPTS) {
            updates[`upscales.${key}.status`] = 'gave_up'
            gaveUp++
            return
          }
        }

        claimed.push({ key, imageUrl })
        updates[`upscales.${key}`] = {
          status: 'pending',
          sourceUrl: imageUrl,
          createdAt: new Date(),
          attempts: attempts + 1,
        }
      })
    })

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date()
      tx.update(orderRef, updates)
    }
  })

  if (notFound) return { notFound: true, created: 0, total: 0, gaveUp: 0, skipped: 0, healed: 0 }
  if (wrongStatus) return { wrongStatus, created: 0, total: 0, gaveUp: 0, skipped: 0, healed: 0 }

  // Create Replicate predictions (completion webhook — we don't wait).
  // Network I/O only — never inside the claim transaction above.
  let created = 0
  let skipped = 0
  for (const { key, imageUrl } of claimed) {
    // Pre-check: images already at/above the model's usable size can't be
    // upscaled (the model rejects them) and don't need to be — they're already
    // print-ready. Use the original as the print file, skip the prediction.
    // Unknown dimensions (null) → fall through and let the model try; the
    // callback safety-net catches a pixel-limit failure.
    const px = await readImagePixels(imageUrl)
    if (px !== null && px >= SKIP_UPSCALE_PIXELS) {
      await orderRef.update({
        [`upscales.${key}.status`]: 'done',
        [`upscales.${key}.url`]: imageUrl,
        [`upscales.${key}.alreadyHighRes`]: true,
        [`upscales.${key}.completedAt`]: new Date(),
      }).catch(() => {})
      skipped++
      console.log(`Upscale designs: order ${orderRef.id} [${key}] is ${px}px (>= ${SKIP_UPSCALE_PIXELS}) — using original as print file`)
      continue
    }

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

  return { created, total: claimed.length, gaveUp, skipped, healed }
}
