/**
 * The destructive half of the sketch retention policy: given the decisions made
 * by lib/sketch-retention.ts, delete the uploaded originals from Storage and
 * mark the document, so /share/<id> switches to its captured still.
 *
 * `db` and `bucket` are PARAMETERS, not module imports, so this exact code —
 * boundary handling, ordering, error handling and all — can be run against
 * in-memory fakes and observed, rather than trusted. It permanently deletes
 * customer artwork; it does not get to be untested.
 *
 * Called from app/api/cleanup-old-designs (Layer 1b), which supplies adminDb
 * and the admin Storage bucket.
 */
import { Timestamp, Firestore } from 'firebase-admin/firestore'
import type { Bucket } from '@google-cloud/storage'
import {
  planSketchSweep,
  SKETCH_RETENTION_DAYS,
  SKETCH_RETENTION_MS,
  SketchKeepReason,
} from './sketch-retention'

/**
 * How many documents one run may look at, and how many it may actually sweep.
 * The cap keeps the first run after deploy (which meets the whole backlog at
 * once) inside the function's time budget — the rest drains the next night.
 */
const SKETCH_SCAN_LIMIT = 500
const MAX_SKETCH_SWEEPS = 200
/** Dry-run only: how many per-sketch plans to spell out in the response. */
const SKETCH_SAMPLE_LIMIT = 25

export interface SketchSweepSummary {
  mode: 'apply' | 'dry-run'
  retentionDays: number
  /** Documents the cutoff query returned and the policy looked at. */
  scanned: number
  /** Documents swept (in dry-run: that would be). */
  swept: number
  filesDeleted: number
  bytesFreed: number
  errors: number
  /** Why every non-swept document was left alone — the audit trail. */
  kept: Record<SketchKeepReason, number>
  /** Set when the run hit MAX_SKETCH_SWEEPS; the rest drains next night. */
  capped?: true
  /** Dry-run only: the concrete plan, capped at SKETCH_SAMPLE_LIMIT entries. */
  wouldDelete?: { id: string; ageDays: number; bytes: number; deletePaths: string[]; keepPreview: string }[]
}

/** Object size in bytes, or 0 if the file is already gone / unreadable. */
async function fileBytes(bucket: Bucket, path: string): Promise<number> {
  try {
    const [meta] = await bucket.file(path).getMetadata()
    return Number(meta?.size || 0)
  } catch {
    return 0
  }
}

/**
 * Sweep sketches older than the retention window.
 *
 * `apply === false` is a true dry run: same query, same per-document decision,
 * sizes read — and nothing written or deleted.
 *
 * ORDERING INSIDE A SWEEP is deliberate: the document is marked BEFORE its
 * files are deleted. If the write lands and a delete then fails we leak one
 * file (logged, and surfaced as `errors`). If the deletes landed first and the
 * write failed, /share/<id> would keep rendering the 3D stage with its textures
 * already gone — an empty garment, the exact outcome this whole mechanism
 * exists to prevent. A leaked file is recoverable; a link the customer already
 * holds is not.
 */
export async function sweepOldSketches(
  db: Firestore,
  bucket: Bucket,
  apply: boolean,
  now: number = Date.now()
): Promise<SketchSweepSummary> {
  const summary: SketchSweepSummary = {
    mode: apply ? 'apply' : 'dry-run',
    retentionDays: SKETCH_RETENTION_DAYS,
    scanned: 0,
    swept: 0,
    filesDeleted: 0,
    bytesFreed: 0,
    errors: 0,
    kept: {
      'already-swept': 0,
      'invalid-timestamp': 0,
      'within-retention': 0,
      'no-preview': 0,
      'no-storage-files': 0,
    },
  }
  if (!apply) summary.wouldDelete = []

  // The cutoff narrows the read; it is NOT the decision. planSketchSweep
  // re-checks the age itself, because Firestore's type ordering means
  // `createdAt < <ts>` also matches documents whose createdAt is null, false or
  // a bare number — every one of which must be kept, not treated as ancient.
  const snap = await db
    .collection('shared_designs')
    .where('createdAt', '<', Timestamp.fromMillis(now - SKETCH_RETENTION_MS))
    .orderBy('createdAt', 'asc')
    .limit(SKETCH_SCAN_LIMIT)
    .get()

  for (const doc of snap.docs) {
    summary.scanned++
    const plan = planSketchSweep(doc.data(), now)
    if (plan.action === 'keep') {
      summary.kept[plan.reason]++
      continue
    }
    if (summary.swept >= MAX_SKETCH_SWEEPS) {
      summary.capped = true
      break
    }

    if (!apply) {
      let bytes = 0
      for (const path of plan.deletePaths) bytes += await fileBytes(bucket, path)
      summary.swept++
      summary.filesDeleted += plan.deletePaths.length
      summary.bytesFreed += bytes
      if (summary.wouldDelete!.length < SKETCH_SAMPLE_LIMIT) {
        summary.wouldDelete!.push({
          id: doc.id,
          ageDays: Math.round((plan.ageMs / 86_400_000) * 10) / 10,
          bytes,
          deletePaths: plan.deletePaths,
          keepPreview: plan.previewPath,
        })
      }
      continue
    }

    try {
      await doc.ref.update({ designsDeleted: true, designsDeletedAt: Timestamp.now() })
    } catch (e) {
      console.error(`Sketch sweep: could not mark ${doc.id}, files left in place:`, e)
      summary.errors++
      continue
    }

    summary.swept++
    for (const path of plan.deletePaths) {
      const size = await fileBytes(bucket, path)
      try {
        await bucket.file(path).delete({ ignoreNotFound: true })
        summary.filesDeleted++
        summary.bytesFreed += size
      } catch (e) {
        console.error(`Sketch sweep: failed to delete ${path} (sketch ${doc.id}):`, e)
        summary.errors++
      }
    }
  }

  return summary
}
