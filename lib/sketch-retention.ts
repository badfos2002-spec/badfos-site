/**
 * Retention policy for shared sketches (`shared_designs` + their Storage files).
 *
 * WHY THIS EXISTS
 * A sketch link is sent to one customer over WhatsApp and looked at within a
 * day or two, but its uploaded artwork sits in Storage forever — the project
 * is on the Blaze plan, so every stored megabyte is billed, and sketches are
 * the only thing in the bucket nobody ever comes back to. The heavy originals therefore expire; the LINK MUST NOT.
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
 *   5. it is an ADMIN SKETCH (isAdminSketch) — a customer share made by the
 *      cart is never swept here; its files belong to an order,
 *   6. at least one design file resolves to a path under `designs/sketch-*`.
 *
 * Only the exact object paths named by the document are deleted — never a
 * prefix — and only inside the sketch maker's own `designs/sketch-*` folders.
 * A sketch made before /api/admin/sketch-copy existed points straight at an
 * ORDER's files (`designs/tshirt-<ts>/…`); those are the print masters of a
 * paid order and are never this policy's to delete. `preview.jpg` lives under the SAME `designs/sketch-<ts>/` prefix as
 * the artwork it survives, so a prefix delete would take the preview with it.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Sketches strictly older than this are swept. See `planSketchSweep`.
 * The Hebrew copy on the swept share page says "בחודש הראשון" — change both
 * together (app/share/[id]/ShareClient.tsx, SweptSketchView).
 */
export const SKETCH_RETENTION_DAYS = 30
export const SKETCH_RETENTION_MS = SKETCH_RETENTION_DAYS * 24 * 60 * 60 * 1000

/** The only Storage prefix this policy may ever delete from. */
const DELETABLE_PREFIX = 'designs/'

/** Every admin sketch stores its artwork under `designs/sketch-<ts>[-<id>]/`
 *  (app/admin/sketches sessionId, /api/admin/sketch-copy). Nothing else does. */
export const SKETCH_SESSION_RE = /^designs\/sketch-[^/]+\//

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
  /** Nothing of the sketch maker's own in Storage (legacy base64 sketches,
   *  sketches that only point at an order's files, or already empty). */
  | 'no-storage-files'
  /** A customer share made by the cart, not a sketch — never swept here. */
  | 'not-admin-sketch'

export type SketchSweepPlan =
  | { action: 'keep'; reason: SketchKeepReason; ageMs: number | null }
  | { action: 'sweep'; ageMs: number; deletePaths: string[]; previewPath: string }

/**
 * Decide what happens to one `shared_designs` document.
 *
 * BOUNDARY: swept only when `ageMs > SKETCH_RETENTION_MS` — STRICTLY older than
 * 30 days. A sketch exactly 30 days old to the millisecond is kept.
 *
 * Pure: no clock, no network, no SDK. `nowMs` is passed in so the boundary can
 * be tested at the millisecond.
 */
export function planSketchSweep(data: unknown, nowMs: number): SketchSweepPlan {
  const doc = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>

  if (doc.designsDeleted === true) return { action: 'keep', reason: 'already-swept', ageMs: null }
  if (!isAdminSketch(doc)) return { action: 'keep', reason: 'not-admin-sketch', ageMs: null }

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
    if (!SKETCH_SESSION_RE.test(path)) continue // an order's own file — never this policy's
    if (path === previewPath) continue // never the survivor
    if (!deletePaths.includes(path)) deletePaths.push(path)
  }

  if (deletePaths.length === 0) return { action: 'keep', reason: 'no-storage-files', ageMs }
  return { action: 'sweep', ageMs, deletePaths, previewPath }
}

/**
 * Was this `shared_designs` document made by the admin sketch maker — as
 * opposed to a customer share auto-created at checkout (components/cart/
 * CartPage.tsx) or from the cart's share button (components/cart/CartItem.tsx)?
 *
 * WHY IT MATTERS: a checkout share points at the SAME Storage files as the paid
 * order (`designs/tshirt-<ts>/…`, `designs/order-<ts>/…`). Listing it in
 * /admin/sketches, or sweeping it like a sketch, is how a paid order loses its
 * print files. And the other way round: an admin sketch that is mistaken for a
 * customer share stops protecting the files it shows.
 *
 * In this order:
 *   (a) `source: 'checkout'` — written by every cart share since the field
 *       exists — is never a sketch.
 *   (b) A field ONLY the sketch maker writes (previewUrl / previewMissing /
 *       phone / label) makes it a sketch, WHEREVER its artwork lives: sketches
 *       made before sketch-copy point straight at an order's files. The cart
 *       writes none of these four (CartPage sharedItems, CartItem handleShare).
 *   (c) Only then, for documents with neither: judged by where the artwork
 *       lives. Any design file outside `designs/sketch-*` means a cart share;
 *       all under it means a sketch; no Storage artwork at all (bare base64
 *       from the cart's share button) is not a sketch.
 */
export function isAdminSketch(data: unknown): boolean {
  const doc = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  if (doc.source === 'checkout') return false
  if (
    (typeof doc.previewUrl === 'string' && doc.previewUrl !== '') ||
    doc.previewMissing === true ||
    typeof doc.phone === 'string' ||
    typeof doc.label === 'string'
  ) {
    return true
  }
  let sawSketchFile = false
  for (const d of Array.isArray(doc.designs) ? doc.designs : []) {
    const url = d && typeof d === 'object' ? (d as { imageBase64?: unknown }).imageBase64 : null
    const path = storagePathFromUrl(url)
    if (!path) continue
    if (!SKETCH_SESSION_RE.test(path)) return false
    sawSketchFile = true
  }
  return sawSketchFile
}
