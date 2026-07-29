import { adminDb, adminStorage } from '@/lib/firebase-admin'
import { createUpscalePrediction, SKIP_UPSCALE_PIXELS, PIXEL_LIMIT_ERROR } from '@/lib/upscale'
import { readImagePixels } from '@/lib/image-dims'
import { randomUUID } from 'crypto'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://badfos.co.il'

/** True for a Firebase Storage / any https URL that Replicate can fetch directly. */
function isHttpsUrl(s: string): boolean {
  return /^https:\/\//i.test(s)
}

/** True for an inline base64/data image URL that must be uploaded before upscaling. */
function isDataUrl(s: string): boolean {
  return /^data:image\//i.test(s)
}

/** Decode a data: URL into raw bytes + content type. null when malformed/empty. */
function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return null
  const header = dataUrl.slice(5, comma) // strip leading "data:"
  const body = dataUrl.slice(comma + 1)
  const isBase64 = /;base64/i.test(header)
  const contentType = header.split(';')[0] || 'image/png'
  try {
    const buffer = isBase64
      ? Buffer.from(body, 'base64')
      : Buffer.from(decodeURIComponent(body), 'utf8')
    return buffer.length ? { buffer, contentType } : null
  } catch {
    return null
  }
}

/**
 * Upload an inline base64 design to Firebase Storage next to the order's other
 * design files, returning a permanent, publicly-fetchable download URL (the same
 * token scheme /api/upscale-callback uses). Replicate cannot fetch data: blobs —
 * this is what lets base64 designs be upscaled at all. Runs OUTSIDE the claim
 * transaction (network I/O). Returns null if the data URL can't be decoded.
 */
async function uploadBase64Source(orderId: string, key: string, dataUrl: string): Promise<string | null> {
  const decoded = decodeDataUrl(dataUrl)
  if (!decoded) return null
  const bucket = adminStorage.bucket()
  const filePath = `designs/${orderId}/${key}-src.png`
  const downloadToken = randomUUID()
  await bucket.file(filePath).save(decoded.buffer, {
    metadata: {
      contentType: decoded.contentType,
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`
}

/**
 * Persist a freshly-uploaded https URL back onto the order's
 * items[itemIdx].designs[area].imageUrl so the admin "מקור" download, the
 * design_mockup email and every other consumer become real https too. Matches
 * the design by (itemIdx, area) inside a transaction — Firestore can't address
 * an array element by dot-path, and this never clobbers a concurrent rewrite.
 */
async function persistDesignImageUrl(
  orderRef: FirebaseFirestore.DocumentReference,
  itemIdx: number,
  area: string,
  httpsUrl: string
): Promise<void> {
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef)
    if (!snap.exists) return
    const data = snap.data()!
    const items = Array.isArray(data.items) ? data.items : []
    const item = items[itemIdx]
    if (!item || !Array.isArray(item.designs)) return
    let changed = false
    item.designs = item.designs.map((d: any) => {
      if (d && d.area === area && d.imageUrl !== httpsUrl) {
        changed = true
        return { ...d, imageUrl: httpsUrl }
      }
      return d
    })
    if (changed) tx.update(orderRef, { items, updatedAt: new Date() })
  })
}

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
  opts: { retryStuckPending?: boolean; force?: boolean } = {}
): Promise<UpscaleRunResult> {
  const orderRef = adminDb.collection('orders').doc(orderId)

  // Atomically claim the designs that still need upscaling — prevents
  // duplicate predictions when several triggers fire at once.
  const claimed: { key: string; itemIdx: number; area: string; imageUrl: string }[] = []
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
        if (!area) return

        const key = `${itemIdx}_${area}`
        const rawExisting = upscales[key]
        let existing = rawExisting
        if (opts.force && rawExisting && rawExisting.status !== 'done') {
          const ms = upscaleEntryMillis(rawExisting.createdAt)
          const freshPending = rawExisting.status === 'pending' && ms !== null && (Date.now() - ms) < STUCK_PENDING_MS
          if (!freshPending) existing = undefined   // re-attempt failed / gave_up / stuck-pending as a fresh design
        }

        // A base64/data: design is claimed too — it's uploaded to Storage in the
        // prediction loop below (Replicate can't fetch data: blobs). Only a truly
        // missing/unusable source (empty / blob: / malformed) has nothing to do.
        const usable = isHttpsUrl(imageUrl) || isDataUrl(imageUrl)
        if (!usable) {
          // Record a graceful gave_up once so the admin falls back to the
          // original and the nightly heal scan stops rescanning this design.
          if (!existing || (existing.status !== 'done' && existing.status !== 'gave_up')) {
            updates[`upscales.${key}`] = {
              status: 'gave_up',
              error: 'no_source_image',
              sourceUrl: imageUrl || '',
              createdAt: new Date(),
              attempts: typeof existing?.attempts === 'number' ? existing.attempts : 0,
            }
            gaveUp++
          }
          return
        }

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

        claimed.push({ key, itemIdx, area, imageUrl })
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
  for (const { key, itemIdx, area, imageUrl } of claimed) {
    let sourceUrl = imageUrl

    // base64/data: design → materialize it in Storage first (Replicate can't
    // fetch data: blobs), then make that https URL the design's real image
    // everywhere. This is what makes upscale work for EVERY product type/color
    // and every checkout path, not only designs that were https at checkout.
    if (isDataUrl(sourceUrl)) {
      let uploadedUrl: string | null = null
      try {
        uploadedUrl = await uploadBase64Source(orderRef.id, key, sourceUrl)
      } catch (err) {
        console.error(`Upscale designs: base64 upload failed for ${orderRef.id} [${key}]:`, err)
        uploadedUrl = null
      }
      if (!uploadedUrl) {
        // Couldn't produce a source image — leave it retryable (attempts already
        // counted); the admin still has the original design to work from.
        await orderRef.update({
          [`upscales.${key}.status`]: 'failed',
          [`upscales.${key}.error`]: 'base64 source upload failed',
        }).catch(() => {})
        continue
      }
      sourceUrl = uploadedUrl
      // (a) real https on the order itself (admin "מקור" / design email / share)
      await persistDesignImageUrl(orderRef, itemIdx, area, uploadedUrl).catch((e) =>
        console.error(`Upscale designs: failed to persist https imageUrl for ${orderRef.id} [${key}]:`, e))
      // (b) the upscale entry's sourceUrl becomes the https URL
      await orderRef.update({ [`upscales.${key}.sourceUrl`]: uploadedUrl }).catch(() => {})
    }

    // Pre-check: images already at/above the model's usable size can't be
    // upscaled (the model rejects them) and don't need to be — they're already
    // print-ready. Use the original as the print file, skip the prediction.
    // Unknown dimensions (null) → fall through and let the model try; the
    // callback safety-net catches a pixel-limit failure.
    const px = await readImagePixels(sourceUrl)
    if (px !== null && px >= SKIP_UPSCALE_PIXELS) {
      await orderRef.update({
        [`upscales.${key}.status`]: 'done',
        [`upscales.${key}.url`]: sourceUrl,
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
      const { id } = await createUpscalePrediction(sourceUrl, callbackUrl)
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
