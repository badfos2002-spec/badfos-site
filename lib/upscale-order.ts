import { adminDb, adminStorage } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { createUpscalePrediction, SKIP_UPSCALE_PIXELS, PIXEL_LIMIT_ERROR } from '@/lib/upscale'
import { readImagePixels } from '@/lib/image-dims'
import { recordUsage } from '@/lib/usage-tracking'
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

/** Decoded object path of a firebasestorage.googleapis.com download URL, else null. */
function storagePathFromUrl(url: string): string | null {
  const m = url.match(/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/)
  if (!m) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return null
  }
}

/**
 * Does the Storage object behind this path still exist? On any verification
 * error → true: "could not verify" must leave the normal upscale flow
 * unchanged (if the file really is gone the prediction fails on its own,
 * exactly as before this check existed).
 */
async function storageFileExists(path: string): Promise<boolean> {
  try {
    const [exists] = await adminStorage.bucket().file(path).exists()
    return exists === true
  } catch {
    return true
  }
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
  const claimed: { key: string; itemIdx: number; area: string; imageUrl: string; prevSourceUrl?: string }[] = []
  let notFound = false
  let wrongStatus: string | null = null
  let gaveUp = 0
  let healed = 0
  let hadSweptFlag = false

  // True when a 'done' entry's print file lived under designs/<orderId>/ —
  // the exact prefix the storage sweeps delete — or when its url is unknown.
  const sweptPrefix = `designs/${orderId}/`
  const doneFileSwept = (u: unknown): boolean => {
    if (typeof u !== 'string' || !u) return true
    if (u.startsWith('data:')) return false
    const path = storagePathFromUrl(u)
    return path !== null && path.startsWith(sweptPrefix)
  }

  await adminDb.runTransaction(async (tx) => {
    claimed.length = 0
    notFound = false
    wrongStatus = null
    gaveUp = 0
    healed = 0
    hadSweptFlag = false

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

    // Emergency-sweep recovery: an order whose designs/<orderId>/ files were
    // deleted by the storage-limit sweep still carries 'done' upscale entries
    // pointing at files that no longer exist. With force (the admin's retry
    // button) those entries are re-attempted from the live sources below.
    hadSweptFlag = order.designsDeleted === true
    const sweptForRecovery = hadSweptFlag && order.designsDeletedReason === 'storage_limit'

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
        } else if (opts.force && sweptForRecovery && rawExisting?.status === 'done' && doneFileSwept(rawExisting.url)) {
          // The finished print file was deleted by the emergency storage sweep —
          // re-attempt as a fresh design so it gets regenerated from a live source.
          existing = undefined
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

        claimed.push({
          key,
          itemIdx,
          area,
          imageUrl,
          prevSourceUrl: typeof rawExisting?.sourceUrl === 'string' ? rawExisting.sourceUrl : undefined,
        })
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
  for (const { key, itemIdx, area, imageUrl, prevSourceUrl } of claimed) {
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

    // Sweep healing: a source under designs/<orderId>/ (e.g. a materialized
    // <key>-src.png) may have been deleted by the storage cleanup. Sending a
    // dead URL to Replicate burns an attempt on a guaranteed failure — verify
    // it still exists first, and fall back to a live source when there is one.
    if (isHttpsUrl(sourceUrl)) {
      const path = storagePathFromUrl(sourceUrl)
      if (path && path.startsWith(`designs/${orderRef.id}/`) && !(await storageFileExists(path))) {
        const fallback = await resolveLiveFallbackSource(orderRef, key, itemIdx, area, prevSourceUrl)
        if (!fallback) {
          // The source file is gone and nothing live replaces it — permanent,
          // honest gave_up: no retry can bring the file back.
          await orderRef.update({
            [`upscales.${key}.status`]: 'gave_up',
            [`upscales.${key}.error`]: 'source_file_deleted',
          }).catch(() => {})
          gaveUp++
          console.error(`Upscale designs: order ${orderRef.id} [${key}] source ${path} was deleted and no live fallback exists — gave up`)
          continue
        }
        sourceUrl = fallback
        console.log(`Upscale designs: order ${orderRef.id} [${key}] source was deleted — recovered from live fallback`)
      }
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
      await recordUsage('replicate_upscale')
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

  // An order marked designsDeleted whose areas all completed synchronously
  // (alreadyHighRes/healed — no webhook will ever fire) gets its sweep flags
  // cleared here; runs with pending predictions are cleared by the completion
  // webhook (/api/upscale-callback) instead. Never throws.
  if (hadSweptFlag) {
    await clearSweptFlagsIfFullyUpscaled(orderRef.id)
  }

  return { created, total: claimed.length, gaveUp, skipped, healed }
}

/**
 * A claimed design whose stored source file was deleted by the storage sweep:
 * find a live replacement. The only candidate we have is the design's previous
 * upscale sourceUrl — it may still point at the original pre-checkout upload
 * under a session prefix (designs/order-123.../ etc., which the sweeps never
 * touch) as https, or still be an inline data: image (re-materialized like
 * any base64 design). The recovered URL is persisted back onto the order so
 * the admin "מקור" download and the upscale entry become truthful again.
 * Returns the live https URL, or null when nothing survives.
 */
async function resolveLiveFallbackSource(
  orderRef: FirebaseFirestore.DocumentReference,
  key: string,
  itemIdx: number,
  area: string,
  prevSourceUrl: string | undefined
): Promise<string | null> {
  if (!prevSourceUrl) return null

  if (isDataUrl(prevSourceUrl)) {
    // Still inline — re-materialize it exactly like a base64 design at claim.
    let uploadedUrl: string | null = null
    try {
      uploadedUrl = await uploadBase64Source(orderRef.id, key, prevSourceUrl)
    } catch (err) {
      console.error(`Upscale designs: fallback base64 upload failed for ${orderRef.id} [${key}]:`, err)
      return null
    }
    if (!uploadedUrl) return null
    await persistDesignImageUrl(orderRef, itemIdx, area, uploadedUrl).catch(() => {})
    await orderRef.update({ [`upscales.${key}.sourceUrl`]: uploadedUrl }).catch(() => {})
    return uploadedUrl
  }

  if (isHttpsUrl(prevSourceUrl)) {
    const path = storagePathFromUrl(prevSourceUrl)
    // Only trust a candidate OUTSIDE the swept prefix that demonstrably exists.
    if (path && !path.startsWith(`designs/${orderRef.id}/`) && (await storageFileExists(path))) {
      await persistDesignImageUrl(orderRef, itemIdx, area, prevSourceUrl).catch(() => {})
      await orderRef.update({ [`upscales.${key}.sourceUrl`]: prevSourceUrl }).catch(() => {})
      return prevSourceUrl
    }
  }
  return null
}

/**
 * After print files were regenerated: when EVERY design area of the order has
 * a done upscale whose file verifiably exists, remove the designsDeleted mark
 * so the admin downloads stop answering "file swept" and work again. Called at
 * the end of a runUpscaleForOrder pass on a swept order and from the upscale
 * completion webhook. Returns true when the flags were cleared. Never throws.
 */
export async function clearSweptFlagsIfFullyUpscaled(orderId: string): Promise<boolean> {
  try {
    const orderRef = adminDb.collection('orders').doc(orderId)
    const snap = await orderRef.get()
    if (!snap.exists) return false
    const order = snap.data()!
    if (order.designsDeleted !== true) return false

    const upscales = order.upscales || {}
    const items = Array.isArray(order.items) ? order.items : []
    const sweptPrefix = `designs/${orderId}/`

    for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
      const designs = Array.isArray(items[itemIdx]?.designs) ? items[itemIdx].designs : []
      for (const design of designs) {
        const area = typeof design?.area === 'string' ? design.area : ''
        if (!area) continue
        const entry = upscales[`${itemIdx}_${area}`]
        if (!entry || entry.status !== 'done' || typeof entry.url !== 'string' || !entry.url) {
          return false
        }
        // A done entry pointing under the swept prefix counts only when the
        // file exists again — i.e. it was actually regenerated after the sweep.
        if (isHttpsUrl(entry.url)) {
          const path = storagePathFromUrl(entry.url)
          if (path && path.startsWith(sweptPrefix) && !(await storageFileExists(path))) {
            return false
          }
        }
      }
    }

    await orderRef.update({
      designsDeleted: FieldValue.delete(),
      designsDeletedAt: FieldValue.delete(),
      designsDeletedReason: FieldValue.delete(),
      updatedAt: new Date(),
    })
    console.log(`Upscale designs: order ${orderId} fully regenerated — designsDeleted cleared`)
    return true
  } catch (e) {
    console.error(`Upscale designs: clearing designsDeleted failed for ${orderId}:`, e)
    return false
  }
}
