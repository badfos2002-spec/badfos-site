/**
 * Retention policy for shared sketches (`shared_designs` + their Storage files).
 *
 * WHY THIS EXISTS
 * A sketch link is sent to one customer over WhatsApp and looked at within a
 * day or two, but its uploaded artwork sits in Storage forever — the bucket is
 * on the 5000MB Spark tier and sketches are the only thing in it nobody ever
 * comes back to. The heavy originals therefore expire; the LINK MUST NOT.
 *
 * WHAT MAKES THAT POSSIBLE
 * Every sketch created since 58f4681 also uploads `preview.jpg` — a ~17KB
 * snapshot of the finished 3D stage, so it already contains BOTH the garment
 * and the artwork on it. Dropping the originals and keeping that one file
 * turns the link from an interactive 3D view into a still image of the very
 * same sketch. The Firestore document is never deleted, so the link always
 * resolves.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THIS MODULE IS DESTRUCTIVE INPUT. Everything below decides which customer
 * artwork gets permanently deleted, so every rule is written to fail CLOSED:
 * anything unrecognised, unparseable, missing or merely suspicious returns
 * `keep`. A sketch is swept only when ALL of these hold:
 *
 *   1. it is not already swept,
 *   2. `createdAt` is a real Firestore Timestamp inside a sane date window —
 *      and so is `updatedAt` whenever the field is present at all (an edited
 *      sketch is fresh work: age is measured from max(createdAt, updatedAt),
 *      and an `updatedAt` we cannot read might be fresh, so it keeps),
 *   3. it is STRICTLY older than SKETCH_RETENTION_DAYS,
 *   4. it has a preview whose Storage path we can name — no preview means the
 *      link would be left with nothing to show, which is the one outcome this
 *      whole mechanism exists to prevent,
 *   5. at least one design file resolves to a path under `designs/`.
 *
 * Only the exact object paths named by the document are deleted — never a
 * prefix. `preview.jpg` lives under the SAME `designs/sketch-<ts>/` prefix as
 * the artwork it survives, so a prefix delete would take the preview with it.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Sketches strictly older than this are swept. See `planSketchSweep`.
 * The Hebrew copy on the swept share page says "ביומיים הראשונים" — change both
 * together (app/share/[id]/ShareClient.tsx, SweptSketchView).
 */
export const SKETCH_RETENTION_DAYS = 2
export const SKETCH_RETENTION_MS = SKETCH_RETENTION_DAYS * 24 * 60 * 60 * 1000

/** The only Storage prefix this policy may ever delete from. */
const DELETABLE_PREFIX = 'designs/'

/**
 * A Firebase download URL: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<url-encoded path>?alt=media&token=…
 * Capturing group 1 is the percent-encoded object path.
 */
const DOWNLOAD_URL_RE = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/?#]+\/o\/([^?#]+)/

/** Cheap host check, matching what generateMetadata already trusts as og:image. */
const PREVIEW_HOST_RE = /^https:\/\/firebasestorage\.googleapis\.com\//

/**
 * Date sanity window. A `createdAt` outside it is treated as MALFORMED, not as
 * old. This is the guard that matters most: a seconds-based epoch (1787494000)
 * read as milliseconds lands in 1970 and would look ancient enough to delete.
 */
const MIN_VALID_MS = Date.UTC(2020, 0, 1)
const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000

/**
 * Milliseconds out of a Firestore Timestamp, or null when the value is not one.
 *
 * Deliberately narrow: only Timestamp-shaped objects and Date are accepted.
 * Numbers and strings are REJECTED even though they look convertible, because
 * the unit of a bare number is a guess and guessing here deletes artwork.
 * Firestore's `where('createdAt','<',ts)` does return docs whose createdAt is
 * null/false/a number (those types sort before Timestamp), so this rejection
 * is load-bearing, not theoretical.
 */
export function timestampMillis(value: unknown): number | null {
  if (value === null || value === undefined) return null

  let ms: number
  if (value instanceof Date) {
    ms = value.getTime()
  } else if (typeof value === 'object') {
    const ts = value as { toMillis?: unknown; toDate?: unknown }
    if (typeof ts.toMillis === 'function') {
      ms = (ts.toMillis as () => unknown)() as number
    } else if (typeof ts.toDate === 'function') {
      const d = (ts.toDate as () => unknown)()
      if (!(d instanceof Date)) return null
      ms = d.getTime()
    } else {
      return null
    }
  } else {
    return null
  }

  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null
  if (ms < MIN_VALID_MS) return null
  return ms
}

/**
 * The Storage object path a Firebase download URL points at, or null.
 * Returns a path only when it is inside `designs/` and free of traversal, so a
 * hand-edited document can never aim a delete at backups/ or mockups/.
 */
export function storagePathFromUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = DOWNLOAD_URL_RE.exec(value)
  if (!m) return null

  let path: string
  try {
    path = decodeURIComponent(m[1])
  } catch {
    return null // malformed percent-encoding
  }

  if (!path.startsWith(DELETABLE_PREFIX)) return null
  if (path.includes('..') || path.includes('//')) return null
  if (path.length <= DELETABLE_PREFIX.length) return null
  return path
}

/** True for a preview URL safe to put in an <img src> / og:image. */
export function isSketchPreviewUrl(value: unknown): value is string {
  return typeof value === 'string' && PREVIEW_HOST_RE.test(value)
}

export type SketchKeepReason =
  /** Already swept on an earlier run. */
  | 'already-swept'
  /** No `createdAt`, or one that is not a Timestamp inside the sanity window —
   *  or an `updatedAt` that is present but not a readable, sane Timestamp. */
  | 'invalid-timestamp'
  /** Younger than (or exactly at) the retention boundary. */
  | 'within-retention'
  /** No usable preview — sweeping would leave the link with nothing to show. */
  | 'no-preview'
  /** Nothing addressable in Storage (legacy base64 sketches, or already empty). */
  | 'no-storage-files'

export type SketchSweepPlan =
  | { action: 'keep'; reason: SketchKeepReason; ageMs: number | null }
  | { action: 'sweep'; ageMs: number; deletePaths: string[]; previewPath: string }

/**
 * Decide what happens to one `shared_designs` document.
 *
 * BOUNDARY: swept only when `ageMs > SKETCH_RETENTION_MS` — STRICTLY older than
 * two days. A sketch exactly two days old to the millisecond is kept.
 *
 * Pure: no clock, no network, no SDK. `nowMs` is passed in so the boundary can
 * be tested at the millisecond.
 */
export function planSketchSweep(data: unknown, nowMs: number): SketchSweepPlan {
  const doc = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>

  if (doc.designsDeleted === true) return { action: 'keep', reason: 'already-swept', ageMs: null }

  const createdMs = timestampMillis(doc.createdAt)
  if (createdMs === null) return { action: 'keep', reason: 'invalid-timestamp', ageMs: null }
  // A document from the future is a broken clock, not an old sketch.
  if (createdMs > nowMs + MAX_CLOCK_SKEW_MS) {
    return { action: 'keep', reason: 'invalid-timestamp', ageMs: null }
  }

  // updateSharedDesign (lib/db.ts) rewrites the designs and sets `updatedAt`:
  // the artwork on the doc is as fresh as the update, so the retention clock
  // restarts there. Absent field = never edited = the createdAt clock, exactly
  // as before this field existed. PRESENT but unreadable (null, a bare number,
  // a string) fails CLOSED — unlike createdAt, where a malformed value can only
  // be old junk, a malformed updatedAt might be hiding yesterday's revision.
  let effectiveMs = createdMs
  if (doc.updatedAt !== undefined) {
    const updatedMs = timestampMillis(doc.updatedAt)
    if (updatedMs === null) return { action: 'keep', reason: 'invalid-timestamp', ageMs: null }
    if (updatedMs > nowMs + MAX_CLOCK_SKEW_MS) {
      return { action: 'keep', reason: 'invalid-timestamp', ageMs: null }
    }
    effectiveMs = Math.max(createdMs, updatedMs)
  }

  const ageMs = nowMs - effectiveMs
  if (ageMs <= SKETCH_RETENTION_MS) return { action: 'keep', reason: 'within-retention', ageMs }

  if (!isSketchPreviewUrl(doc.previewUrl)) return { action: 'keep', reason: 'no-preview', ageMs }
  const previewPath = storagePathFromUrl(doc.previewUrl)
  // A preview we cannot name is a preview we cannot protect from the delete list.
  if (!previewPath) return { action: 'keep', reason: 'no-preview', ageMs }

  const designs = Array.isArray(doc.designs) ? doc.designs : []
  const deletePaths: string[] = []
  for (const d of designs) {
    const url = d && typeof d === 'object' ? (d as { imageBase64?: unknown }).imageBase64 : null
    const path = storagePathFromUrl(url)
    if (!path) continue // base64 payloads, blob: URLs, foreign hosts — not ours to delete
    if (path === previewPath) continue // never the survivor
    if (!deletePaths.includes(path)) deletePaths.push(path)
  }

  if (deletePaths.length === 0) return { action: 'keep', reason: 'no-storage-files', ageMs }
  return { action: 'sweep', ageMs, deletePaths, previewPath }
}
