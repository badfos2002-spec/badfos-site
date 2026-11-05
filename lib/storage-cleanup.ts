/**
 * Policy for the admin "ניקוי אחסון" tool — decides which Storage objects are
 * safe to delete. Pure: no SDK, no clock, no network. Every input is passed in
 * so each rule can be run against fakes and observed at the millisecond.
 *
 * WHY THIS EXISTS
 * The nightly cron (app/api/cleanup-old-designs) deletes `designs/<orderId>/`,
 * where `<orderId>` is the Firestore auto-ID of an order document. But customer
 * artwork is uploaded under SESSION prefixes minted on the client before any
 * order exists — `designs/tshirt-<ts>/`, `designs/order-<ts>/`, `designs/share-<ts>/`
 * and friends (lib/storage.ts uploadDesignFile, called from every designer and
 * from components/cart/CartPage.tsx). Those names never equal an order's
 * document ID, so the cron's prefix never matches them and they accumulate
 * forever. This module is what can finally name them.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THIS MODULE IS DESTRUCTIVE INPUT. It decides which customer artwork gets
 * permanently deleted, so every rule fails CLOSED: anything unrecognised,
 * unparseable, missing or merely suspicious is KEPT.
 *
 * THE TRAP IT IS BUILT AROUND
 * CartPage pre-uploads designs to Storage *before* the order document exists.
 * A file uploaded ten minutes ago with nothing pointing at it is not garbage —
 * it is somebody's open cart, and deleting it destroys an in-flight sale. Worse,
 * the cart lives in localStorage (hooks/useCart.ts, Zustand persist), which no
 * server-side scan can see: a customer can design today, close the tab, and
 * check out three weeks later against those same URLs. Age is therefore the
 * only protection for that case, and it is deliberately far longer than any
 * "abandoned cart" window in the codebase. See ORPHAN_MIN_AGE_DAYS.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { storagePathFromUrl, timestampMillis, isAdminSketch, SKETCH_SESSION_RE } from './sketch-retention'

/**
 * Orphans must be STRICTLY older than this to be selectable.
 *
 * WHY 90 DAYS (and why it is not configurable from the UI):
 *  - The realistic gap between "design uploaded" and "order created" is minutes
 *    (CartPage pre-uploads while the customer fills in the contact form). A cart
 *    left open overnight is hours. `PENDING_ORDER_STALE_MS` is 10 minutes and
 *    `markAbandonedOrders` uses 30 minutes — this is 4,320× the larger of them.
 *  - The cart is persisted in localStorage with no expiry, so a customer can
 *    return weeks later and check out against URLs no Firestore document has
 *    ever referenced. 90 days is the margin bought for that invisible case.
 *  - The nightly cron already deletes a *referenced* order's artwork at 30 days.
 *    Anything past 90 days that nothing references is dead by any measure the
 *    business uses.
 *  - Being early costs a sale; being late costs a few megabytes for a while.
 *
 * The API takes no age parameter — this constant is the only value in play, so
 * there is nothing for the UI (or a crafted request) to shorten.
 */
export const ORPHAN_MIN_AGE_DAYS = 90
export const ORPHAN_MIN_AGE_MS = ORPHAN_MIN_AGE_DAYS * 24 * 60 * 60 * 1000

/**
 * The ONLY prefix anything here may ever name. `backups/`, `mockups/` and
 * `site-images/` are unreachable by construction: `isDeletablePath` rejects
 * them, `sessionPrefixOf` rejects them, and both are re-checked in the planner
 * and again in the executor immediately before each delete.
 */
export const DELETABLE_PREFIX = 'designs/'

/** A Firebase download URL's percent-encoded object path (any prefix). */
const DOWNLOAD_URL_RE =
  /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/?#]+\/o\/([^?#]+)/

/**
 * Hosts (and the `gs://` scheme) that mean "a Storage object", in any URL
 * form. Used only on strings that are NOT a whole reference — see
 * `looseStorageRead`.
 */
const STORAGE_HOST_RE =
  /firebasestorage\.googleapis\.com|firebasestorage\.app|storage\.googleapis\.com|gs:\/\//i

/** Our own site: the only non-storage host whose links may carry a `designs/` path. */
const OWN_SITE_RE = /badfos\.co\.il/i

/**
 * Known-synthetic session prefixes from verification runs. Matched against the
 * SESSION SEGMENT only (the `<id>` in `designs/<id>/<file>`), always anchored —
 * never a substring, never a free-form glob from the caller.
 *
 * `ambiguous: true` marks families whose names are also minted by the live site
 * for real customers (a designer session is `tshirt-<Date.now()>`). Those are
 * listed in the preview but NEVER pre-selected, because a real customer's
 * yesterday-old design is indistinguishable from a probe by its path alone and
 * is too young for the age rule to protect. A human ticks those or they stay.
 */
export interface TestPattern {
  re: RegExp
  label: string
  ambiguous: boolean
}

export const TEST_PATTERNS: TestPattern[] = [
  { re: /^verify-probe$/, label: 'verify-probe', ambiguous: false },
  { re: /^diag-/, label: 'diag-*', ambiguous: false },
  { re: /^diag2-/, label: 'diag2-*', ambiguous: false },
  { re: /^postdeploy/, label: 'postdeploy*', ambiguous: false },
  { re: /^order-1787509272397$/, label: 'order-1787509272397', ambiguous: false },
  { re: /^apron-1787508801389$/, label: 'apron-1787508801389', ambiguous: false },
  { re: /^baby-1787509537731$/, label: 'baby-1787509537731', ambiguous: false },
  // 17875xxxxxxxx spans 2026-08-23 15:46 → 2026-08-24 19:33 — a live window on a
  // running shop. Ambiguous on purpose.
  { re: /^tshirt-17875\d{8}$/, label: 'tshirt-17875*', ambiguous: true },
  { re: /^sweatshirt-17875\d{8}$/, label: 'sweatshirt-17875*', ambiguous: true },
]

// ── Path helpers ─────────────────────────────────────────────────────────

/**
 * True only for an object name inside `designs/` with no traversal tricks.
 * This is the structural gate; nothing outside `designs/` can pass it.
 */
export function isDeletablePath(name: unknown): name is string {
  if (typeof name !== 'string') return false
  if (!name.startsWith(DELETABLE_PREFIX)) return false
  if (name.includes('..') || name.includes('//')) return false
  if (name.length <= DELETABLE_PREFIX.length) return false
  return true
}

/**
 * `designs/<session>/<file>` → `designs/<session>/`, else null.
 *
 * Exactly three segments, matching `match /designs/{orderId}/{fileName}` in
 * storage.rules — that is the only shape the site can ever create. An object
 * with more or fewer segments is unrecognised, and unrecognised means keep.
 */
export function sessionPrefixOf(name: unknown): string | null {
  if (!isDeletablePath(name)) return null
  const parts = name.split('/')
  if (parts.length !== 3) return null
  const [, session, file] = parts
  if (!session || !file) return null
  return `${DELETABLE_PREFIX}${session}/`
}

/** The session segment of a path (`designs/<session>/x.png` → `<session>`). */
export function sessionIdOf(name: unknown): string | null {
  const prefix = sessionPrefixOf(name)
  if (!prefix) return null
  return prefix.slice(DELETABLE_PREFIX.length, -1)
}

/**
 * The object path a Firebase download URL points at, for ANY prefix.
 *
 * Distinct from `storagePathFromUrl` (lib/sketch-retention.ts), which returns
 * null both for "not ours" and for "ours but outside designs/". Here the two
 * cases must be told apart: a `site-images/` URL is a perfectly good reference
 * we simply do not care about, while a *truncated* `designs/` URL means a
 * reference we failed to read — and that one has to stop the run.
 */
export function objectPathFromStorageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = DOWNLOAD_URL_RE.exec(value)
  if (!m) return null
  try {
    const path = decodeURIComponent(m[1])
    return path.length > 0 ? path : null
  } catch {
    return null // malformed percent-encoding
  }
}

/**
 * Undo the percent-encoding of `%`, `/` and `:` only, up to three layers deep
 * (a proxy link wraps an already-encoded download URL). Deliberately NOT
 * decodeURIComponent: text cut at 300 characters can end inside a `%XX`, and
 * that must not make the whole string unreadable.
 */
function looseDecode(value: string): string {
  let cur = value
  for (let i = 0; i < 3; i++) {
    const next = cur.replace(/%25/gi, '%').replace(/%2f/gi, '/').replace(/%3a/gi, ':')
    if (next === cur) break
    cur = next
  }
  return cur
}

/** `designs/<session>/` with something that proves `designs` starts a path segment. */
const LOOSE_SESSION_RE = /(?:^|[\/=?&:,])designs\/([^\/]*)(\/?)/gi

/** A Firebase download URL whose FIRST path segment is complete. */
const LOOSE_FIRST_SEGMENT_RE =
  /firebasestorage\.googleapis\.com\/v0\/b\/[^\/?#]+\/o\/([^\/?#&=]+)\//i

export type LooseRead =
  /** Not about our Storage at all (plain text, a third-party URL). */
  | { kind: 'none' }
  /** Names objects we never delete (site-images/, mockups/, backups/). */
  | { kind: 'outside' }
  /** Names these `designs/<session>/` folders. */
  | { kind: 'folders'; folders: string[] }
  /**
   * Points into `designs/` (or is a cut-off download URL) and not even the
   * folder can be told. `folders` = whatever else in the piece WAS readable.
   */
  | { kind: 'unreadable'; folders: string[] }

/**
 * Read ONE piece of text that is not an exact reference — a URL inside a
 * sentence, an error message that quotes a URL (possibly cut mid-way), a
 * `gs://` URI, a `storage.googleapis.com` URL, a design-proxy link.
 *
 * It never yields a FILE: where a URL ends inside free text is a guess
 * (trailing punctuation, a 300-character cut inside the file name), and a
 * wrong guess protects a file that does not exist while the real one is
 * deleted. What can be read reliably is the session folder — the segment
 * after `designs/` that is CLOSED by a slash — so the whole folder is
 * protected. Over-protecting costs a few megabytes; that is the trade.
 *
 * Third-party URLs are 'none' whatever their path says
 * (`https://www.pinterest.com/user/t-shirt-designs/` is not ours): a piece
 * counts only when it carries a Storage host, or an encoded `designs%2F`
 * outside any foreign URL, or is a link to our own site with `designs/` in it.
 * `forced` is for a value that itself starts with `designs/`.
 *
 * 'unreadable' = it points into `designs/` (or is a cut-off Firebase download
 * URL, the one form our own fields hold) and not even the folder can be told.
 * What that MEANS is the caller's call: a whole value stops the run, a piece
 * of prose is ignored (docStorageRefs).
 */
export function looseStorageRead(piece: string, forced = false): LooseRead {
  const text = looseDecode(piece)
  const hasHost = STORAGE_HOST_RE.test(text)
  const ownSite = OWN_SITE_RE.test(text)
  if (!hasHost && !ownSite && !forced && text.includes('://')) return { kind: 'none' }

  const folders: string[] = []
  let unreadable = false
  for (const m of text.matchAll(LOOSE_SESSION_RE)) {
    let session = ''
    try {
      session = decodeURIComponent(m[1])
    } catch {
      unreadable = true
      continue
    }
    if (m[2] !== '/' || !session || session.includes('..') || /[\/?#&=\s]/.test(session)) {
      unreadable = true
      continue
    }
    folders.push(`${DELETABLE_PREFIX}${session}/`)
  }

  // Without a host, a path marker counts only when it was percent-encoded
  // (nobody types `designs%2F` by hand) or sits in a link to our own site.
  const pathMarker = folders.length > 0 || unreadable
  const relevant = hasHost || forced || (pathMarker && (ownSite || /designs%(?:25)*2f/i.test(piece)))
  if (!relevant) return { kind: 'none' }

  if (unreadable) return { kind: 'unreadable', folders }
  if (folders.length > 0) return { kind: 'folders', folders }
  if (forced) return { kind: 'unreadable', folders }
  // No designs/ path at all. A Firebase download URL is the form our own
  // fields hold, so it must PROVE it names something else (a complete first
  // path segment that is not `designs`); a cut-off one stays unreadable.
  // Any other Storage mention (`gs://foo`, a bucket name) names nothing here.
  if (/firebasestorage\.googleapis\.com/i.test(text)) {
    const first = LOOSE_FIRST_SEGMENT_RE.exec(text)
    return first && first[1].toLowerCase() !== 'designs' ? { kind: 'outside' } : { kind: 'unreadable', folders }
  }
  return { kind: 'outside' }
}

/** Split text into pieces that can each hold at most one URL. */
function storagePieces(value: string): string[] {
  return value
    .split(/[\s"'`<>]+/)
    .flatMap((token) => token.split(/(?=https?:\/\/|gs:\/\/)/i))
    .filter((piece) => piece.length > 0)
}

/**
 * Make external text safe to STORE in a scanned document: every piece the
 * scan would treat as a Storage reference (or fail to read) becomes `[url]`,
 * and so does any other URL. Used on third-party error messages (Replicate
 * quotes the image URL it was given, sometimes cut mid-way) before they are
 * written to an order — otherwise our own error log could stop every cleanup.
 * Call it BEFORE truncating, so a cut never leaves half a URL behind.
 */
export function redactStorageRefs(text: string): string {
  return text.replace(/[^\s"'`<>]+/g, (token) =>
    token.includes('://') ||
    /designs(?:\/|%(?:25)*2f)/i.test(token) ||
    storagePieces(token).some((p) => looseStorageRead(p).kind !== 'none')
      ? '[url]'
      : token
  )
}

/** `redactStorageRefs`, then cut to length — what a writer should store. */
export function storableErrorText(text: string, max = 300): string {
  return redactStorageRefs(text).slice(0, max)
}

// ── Reference collection ─────────────────────────────────────────────────

/**
 * Every collection whose documents are scanned for references before anything
 * is deleted.
 *
 * Derived from `BACKUP_COLLECTIONS` (lib/backup.ts, itself documented as
 * verified against firestore.rules + lib/db.ts) plus the server-only
 * collections the backup skips. `assertReferenceCoverage` re-checks the
 * containment at run time so the two lists cannot drift apart silently.
 *
 * The scan does NOT rely on knowing which fields hold URLs: it walks every
 * value of every document (see `collectReferences`), so a field nobody
 * anticipated still protects its file.
 */
export const REFERENCE_COLLECTIONS = [
  'orders',
  'leads',
  'coupons',
  'reviews',
  'quotes',
  'packages',
  'packageOrders',
  'siteImages',
  'pricing',
  'discounts',
  'inventory',
  'settings',
  'adminSettings',
  'counters',
  'shared_designs',
  'shared_carts',
  // Server-only, written with the Admin SDK and therefore absent from
  // firestore.rules and from the backup registry.
  'usage',
  'manualSales',
  // Payments Grow confirmed but no order matched (lib/order-fallback.ts). Each
  // carries `paymentId` = the checkout's upload folder: the customer PAID, and
  // designs/<paymentId>/ may be the only copy of what they paid for.
  'unmatched_payments',
  // Voice orders from /admin/daily (lib/daily-orders.ts).
  'voiceOrders',
] as const

export interface ScannedDoc {
  collection: string
  id: string
  data: unknown
}

export interface SuspiciousRef {
  collection: string
  docId: string
  /** Truncated for the response — never echo a whole token-bearing URL. */
  hint: string
}

export interface ReferenceScan {
  /** `designs/<session>/` prefixes that must survive. */
  protectedPrefixes: Set<string>
  /**
   * Strings that claim to be Storage URLs but could not be resolved to a path.
   * A non-empty list ABORTS the run: an unreadable reference is a file we
   * cannot prove is unreferenced.
   */
  suspicious: SuspiciousRef[]
  docsScanned: number
  /** How many prefixes each collection contributed — the audit trail. */
  byCollection: Record<string, number>
}

/**
 * Firestore allows 20 levels of nesting; anything deeper than this is not a
 * document we understand. Hitting the cap is REPORTED (the run aborts), never
 * a silent stop — a subtree we did not read may hold a reference.
 */
const MAX_WALK_DEPTH = 32

/**
 * Walk any value, visiting every string inside it. Returns false when part of
 * the value was NOT visited (nesting past MAX_WALK_DEPTH).
 *
 * Only arrays and plain objects are walked. SDK value objects (Timestamp,
 * GeoPoint, DocumentReference, bytes) carry no free-form strings, and a
 * DocumentReference drags the whole Firestore client behind it — its `path`
 * is visited and nothing else.
 */
function walkStrings(value: unknown, visit: (s: string) => void, depth = 0): boolean {
  if (typeof value === 'string') {
    visit(value)
    return true
  }
  if (value === null || typeof value !== 'object') return true
  if (depth > MAX_WALK_DEPTH) return false
  let complete = true
  if (Array.isArray(value)) {
    for (const v of value) if (!walkStrings(v, visit, depth + 1)) complete = false
    return complete
  }
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) {
    const path = (value as { path?: unknown }).path
    if (typeof path === 'string') visit(path)
    return true
  }
  for (const v of Object.values(value as Record<string, unknown>)) {
    if (!walkStrings(v, visit, depth + 1)) complete = false
  }
  return complete
}

/**
 * Build the protected set from raw documents.
 *
 * Protection comes from three independent sources, so no single one has to be
 * right on its own:
 *
 *  1. Every string anywhere in the document that IS a download URL of a
 *     `designs/` object (the whole string — see docStorageRefs for what happens
 *     to a URL buried in other text: it stops the run). Field-name agnostic — `imageUrl`, `imageBase64` (which holds a URL, not
 *     base64), `previewUrl`, `upscales[k].url`, `upscales[k].sourceUrl` and
 *     anything added later are all caught without being enumerated.
 *  2. Every string that is itself a bare `designs/<session>/<file>` path.
 *  3. The document's own IDENTITY: `designs/<docId>/` and, when present,
 *     `designs/<paymentId>/`. This is what makes a MALFORMED field harmless —
 *     an order whose `imageUrl` is empty, null, a number or a truncated URL
 *     still protects its own two prefixes, because `orders.paymentId` IS the
 *     upload prefix (`order-<ts>`, components/cart/CartPage.tsx:181) and the
 *     document ID is the prefix used by re-checkout and by upscale outputs.
 */
export function collectReferences(docs: Iterable<ScannedDoc>): ReferenceScan {
  const protectedPrefixes = new Set<string>()
  const suspicious: SuspiciousRef[] = []
  const byCollection: Record<string, number> = {}
  let docsScanned = 0

  for (const doc of docs) {
    docsScanned++
    const before = protectedPrefixes.size
    const refs = docStorageRefs(doc)
    // (3) identity-derived protection, independent of any field parsing
    for (const candidate of refs.identityPrefixes) protectedPrefixes.add(candidate)
    for (const folder of refs.folders) protectedPrefixes.add(folder)
    // (1) + (2) every designs/ file the document names, widened to its prefix
    for (const file of refs.files) {
      const prefix = sessionPrefixOf(file)
      if (prefix) protectedPrefixes.add(prefix)
    }
    suspicious.push(...refs.suspicious)

    const added = protectedPrefixes.size - before
    if (added > 0) byCollection[doc.collection] = (byCollection[doc.collection] || 0) + added
  }

  return { protectedPrefixes, suspicious, docsScanned, byCollection }
}

export interface DocStorageRefs {
  /** Exact `designs/<session>/<file>` paths — only from WHOLE-string references. */
  files: string[]
  /** `designs/<docId>/` and `designs/<paymentId>/` — see collectReferences (3). */
  identityPrefixes: string[]
  /**
   * Whole folders the document names without naming a readable file: a bare
   * `designs/<session>` string, or a reference buried in other text (see
   * `looseStorageRead`). They PROTECT the folder; they never make its files
   * the document's own.
   */
  folders: string[]
  suspicious: SuspiciousRef[]
}

/** `designs/<session>` or `designs/<session>/` — a folder, not a file. */
const BARE_PREFIX_RE = /^designs\/([^/]+)\/?$/

/**
 * The forms in which a WHOLE value can be a Storage reference: a Firebase
 * download URL, a `storage.googleapis.com` URL, a `gs://` URI, a design-proxy
 * link, a bare `designs/…` path. Only a value that starts like one of these
 * (and has no whitespace) may ever stop a run.
 */
const WHOLE_REFERENCE_RE =
  /^(?:https:\/\/firebasestorage\.googleapis\.com\/|https:\/\/storage\.googleapis\.com\/|gs:\/\/|designs\/|(?:https?:\/\/(?:www\.)?badfos\.co\.il)?\/api\/design-proxy\?)/i

/**
 * Every Storage reference one document makes. The same three sources as
 * collectReferences (which is built on this), kept un-widened so the
 * file-level modes ('old-orders', 'sketch-orphans') can keep exactly the files
 * that are still in use and drop their neighbours.
 *
 * EXACT — a value that is, as a whole, a Firebase download URL
 * (`https://firebasestorage.googleapis.com/v0/b/…/o/…`) or a bare object path
 * (`designs/<session>/<file>`): the FILE. That is every reference the site
 * itself writes. A bare `designs/<session>` names the folder.
 *
 * WHOLE VALUE in another storage form (WHOLE_REFERENCE_RE: `gs://…`,
 * `storage.googleapis.com/…`, a design-proxy link, a download URL of an odd
 * shape, several URLs glued together): read loosely (`looseStorageRead`) —
 *   - names a `designs/<session>/` folder → the WHOLE folder is protected,
 *   - names something else (`gs://foo`, site-images/) → ignored,
 *   - points into designs/ but cannot be read → SUSPICIOUS: the run aborts,
 *     naming the document. A field that holds a reference and nothing else is
 *     a reference; one we cannot read is a file we cannot prove is unused.
 *
 * PROSE — anything else (a lead's message, an order note, an error text):
 * every embedded reference whose session folder can be read protects that
 * folder; everything else is IGNORED. Prose NEVER aborts: the forms that
 * write it are public, and a pasted link must not be a kill switch for the
 * cleanup.
 */
export function docStorageRefs(doc: ScannedDoc): DocStorageRefs {
  const files = new Set<string>()
  const folders = new Set<string>()
  const suspicious: SuspiciousRef[] = []
  const flag = (hint: string) =>
    suspicious.push({ collection: doc.collection, docId: doc.id, hint: hint.slice(0, 80) })

  const complete = walkStrings(doc.data, (raw) => {
    const s = raw.trim()
    // An inline image is megabytes of base64 and never a reference.
    if (!s || s.startsWith('data:')) return
    const bare = s.startsWith(DELETABLE_PREFIX)

    // (2) bare object path / folder — taken as written (file names have spaces)
    if (bare) {
      if (sessionPrefixOf(s)) {
        files.add(s)
        return
      }
      const folder = BARE_PREFIX_RE.exec(s)
      if (folder && !s.includes('..')) {
        folders.add(`${DELETABLE_PREFIX}${folder[1]}/`)
        return
      }
    }

    const whole = !/\s/.test(s) && WHOLE_REFERENCE_RE.test(s)

    // (1) download URL — the whole value, exactly one URL
    if (whole && !bare && s.split('://').length === 2) {
      const objectPath = objectPathFromStorageUrl(s)
      if (objectPath !== null) {
        if (!objectPath.startsWith(DELETABLE_PREFIX)) {
          // A resolvable path outside designs/ (site-images/, mockups/) is a
          // real reference we simply never delete from — nothing to protect.
          // Unless it is the BEGINNING of "designs/" (`…/o/des`): that is a
          // designs URL cut short, and it falls through to be judged below.
          if (!DELETABLE_PREFIX.startsWith(objectPath)) return
        } else {
          // Inside designs/: reuse the sweep's hardened parser for the final say.
          const safe = storagePathFromUrl(s)
          if (safe && sessionPrefixOf(safe)) {
            files.add(safe)
            return
          }
        }
      }
    }

    // Not an exact reference: read it loosely, piece by piece.
    storagePieces(s).forEach((piece, index) => {
      const read = looseStorageRead(piece, bare && index === 0)
      // What could be read protects, even next to something that could not.
      if (read.kind === 'folders' || read.kind === 'unreadable') for (const f of read.folders) folders.add(f)
      if (read.kind === 'unreadable' && whole) flag(piece)
    })
  })
  if (!complete) flag('מבנה מקונן עמוק מדי — המסמך לא נסרק עד הסוף')

  return {
    files: [...files],
    identityPrefixes: identityPrefixes(doc),
    folders: [...folders],
    suspicious,
  }
}

/** `designs/<docId>/` plus `designs/<paymentId>/` when the doc carries one. */
function identityPrefixes(doc: ScannedDoc): string[] {
  const out: string[] = []
  const push = (segment: unknown) => {
    if (typeof segment !== 'string') return
    const trimmed = segment.trim()
    if (!trimmed || trimmed.includes('/') || trimmed.includes('.')) return
    out.push(`${DELETABLE_PREFIX}${trimmed}/`)
  }
  push(doc.id)
  const data = doc.data
  if (data && typeof data === 'object') {
    push((data as Record<string, unknown>).paymentId)
  }
  return out
}

// ── Planning ─────────────────────────────────────────────────────────────

/**
 * - orphans / test-junk: prefix-level, see planStorageCleanup.
 * - old-orders / sketch-orphans: FILE-level, see planClosedOrders / planSketchOrphans.
 */
export type CleanupMode = 'orphans' | 'test-junk' | 'old-orders' | 'sketch-orphans'

/** Modes whose plan is file-level and capped per run (lib/storage-cleanup-run.ts). */
export const FILE_LEVEL_MODES: readonly CleanupMode[] = ['old-orders', 'sketch-orphans']

export interface StorageObject {
  path: string
  sizeBytes: number
  /** Object creation time in ms, or null when Storage gave us nothing usable. */
  createdMs: number | null
}

export type SkipReason =
  /** Not `designs/<session>/<file>` — the structural gate. */
  | 'outside-designs'
  /** A Firestore document points at this prefix. */
  | 'referenced'
  /** Younger than (or exactly at) ORPHAN_MIN_AGE_DAYS. */
  | 'too-young'
  /** No usable creation time — age cannot be proven, so it stays. */
  | 'unknown-age'
  /** test-junk mode: the session name matches no known probe pattern. */
  | 'not-test-junk'
  /** File-level modes: no eligible order owns it / not a sketch file. */
  | 'not-eligible'
  /** File-level modes: eligible, but past this run's cap — the next run takes it. */
  | 'deferred'
  /** old-orders: owned by an order too big for one run (see FileLevelPlan.oversized). */
  | 'oversized'

export interface CleanupCandidate {
  path: string
  sizeBytes: number
  ageDays: number | null
  /** Which TestPattern matched (test-junk mode only). */
  matched?: string
  /** True when the matched pattern is also minted for real customers. */
  ambiguous?: boolean
}

export interface AgeBuckets {
  under7d: number
  d7to30: number
  d30to90: number
  d90to180: number
  over180d: number
  unknown: number
}

export interface CleanupPlan {
  mode: CleanupMode
  minAgeDays: number
  scanned: number
  candidates: CleanupCandidate[]
  totalBytes: number
  skipped: Record<SkipReason, number>
  /** Age distribution over every object under `designs/`, candidate or not. */
  ageBuckets: AgeBuckets
  /** Bytes currently held under `designs/`, for the "what does this cost me" line. */
  scannedBytes: number
}

function bucketFor(ageDays: number | null, buckets: AgeBuckets): void {
  if (ageDays === null) buckets.unknown++
  else if (ageDays < 7) buckets.under7d++
  else if (ageDays < 30) buckets.d7to30++
  else if (ageDays < 90) buckets.d30to90++
  else if (ageDays < 180) buckets.d90to180++
  else buckets.over180d++
}

/**
 * Decide, for every listed object, whether it may be deleted.
 *
 * BOUNDARY (orphans): selected only when `ageMs > ORPHAN_MIN_AGE_MS` — STRICTLY
 * older than 90 days. An object exactly 90 days old to the millisecond is kept.
 *
 * Pure: `nowMs` is a parameter so the boundary can be tested at the millisecond.
 */
export function planStorageCleanup(
  objects: Iterable<StorageObject>,
  protectedPrefixes: ReadonlySet<string>,
  mode: CleanupMode,
  nowMs: number
): CleanupPlan {
  const plan: CleanupPlan = {
    mode,
    minAgeDays: mode === 'orphans' ? ORPHAN_MIN_AGE_DAYS : 0,
    scanned: 0,
    candidates: [],
    totalBytes: 0,
    skipped: {
      'outside-designs': 0,
      referenced: 0,
      'too-young': 0,
      'unknown-age': 0,
      'not-test-junk': 0,
      'not-eligible': 0,
      deferred: 0,
      oversized: 0,
    },
    ageBuckets: { under7d: 0, d7to30: 0, d30to90: 0, d90to180: 0, over180d: 0, unknown: 0 },
    scannedBytes: 0,
  }

  for (const obj of objects) {
    plan.scanned++

    // Gate 1 — structural. Nothing outside designs/<session>/<file> proceeds.
    const prefix = sessionPrefixOf(obj.path)
    const session = sessionIdOf(obj.path)
    if (!prefix || !session) {
      plan.skipped['outside-designs']++
      continue
    }

    const sizeBytes = Number.isFinite(obj.sizeBytes) && obj.sizeBytes > 0 ? obj.sizeBytes : 0
    plan.scannedBytes += sizeBytes

    const ageMs =
      obj.createdMs !== null && Number.isFinite(obj.createdMs) ? nowMs - obj.createdMs : null
    const ageDays = ageMs === null || ageMs < 0 ? null : Math.floor(ageMs / 86_400_000)
    bucketFor(ageDays, plan.ageBuckets)

    // Gate 2 — referenced by any document. Checked in both modes.
    if (protectedPrefixes.has(prefix)) {
      plan.skipped.referenced++
      continue
    }

    if (mode === 'orphans') {
      // Gate 3 — age. A file whose age we cannot prove is never selected.
      if (ageMs === null || ageMs < 0) {
        plan.skipped['unknown-age']++
        continue
      }
      if (ageMs <= ORPHAN_MIN_AGE_MS) {
        plan.skipped['too-young']++
        continue
      }
      plan.candidates.push({ path: obj.path, sizeBytes, ageDays })
      plan.totalBytes += sizeBytes
      continue
    }

    // test-junk: an anchored match on the session segment, nothing else.
    const hit = TEST_PATTERNS.find((p) => p.re.test(session))
    if (!hit) {
      plan.skipped['not-test-junk']++
      continue
    }
    plan.candidates.push({
      path: obj.path,
      sizeBytes,
      ageDays,
      matched: hit.label,
      ambiguous: hit.ambiguous,
    })
    plan.totalBytes += sizeBytes
  }

  plan.candidates.sort((a, b) => a.path.localeCompare(b.path))
  return plan
}

// ── Formatting ───────────────────────────────────────────────────────────

/** Bytes in human terms — the owner's question is "how much did this save me". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  const decimals = unit === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(decimals)} ${units[unit]}`
}

/** A readable sample of the plan, grouped by session prefix. */
export interface PrefixGroup {
  prefix: string
  files: number
  bytes: number
  oldestAgeDays: number | null
  matched?: string
  ambiguous?: boolean
  sample: string[]
}

export function groupByPrefix(candidates: CleanupCandidate[], sampleLimit = 3): PrefixGroup[] {
  const groups = new Map<string, PrefixGroup>()
  for (const c of candidates) {
    const prefix = sessionPrefixOf(c.path)
    if (!prefix) continue
    let g = groups.get(prefix)
    if (!g) {
      g = {
        prefix,
        files: 0,
        bytes: 0,
        oldestAgeDays: null,
        ...(c.matched ? { matched: c.matched, ambiguous: c.ambiguous } : {}),
        sample: [],
      }
      groups.set(prefix, g)
    }
    g.files++
    g.bytes += c.sizeBytes
    if (c.ageDays !== null && (g.oldestAgeDays === null || c.ageDays > g.oldestAgeDays)) {
      g.oldestAgeDays = c.ageDays
    }
    if (g.sample.length < sampleLimit) g.sample.push(c.path.slice(prefix.length))
  }
  return [...groups.values()].sort((a, b) => b.bytes - a.bytes)
}


// ── File-level modes: 'old-orders' and 'sketch-orphans' ──────────────────
//
// Both work on FILES, not prefixes: a designer session prefix
// (`designs/tshirt-<ts>/`) can hold artwork of an old closed order AND of a
// fresh one (same browser session, two checkouts), so protecting or deleting
// a whole prefix is wrong in both directions. A file goes only when nothing
// outside the deletion set names it — by exact path, or by an identity prefix
// (`designs/<docId>/`, `designs/<paymentId>/`), which stays prefix-level
// because it is the guard that survives a malformed field.
//
// KNOWN LIMITATION (documented, not fixed): superseded uploads. The designers
// upload on every pick, so a session folder (`designs/tshirt-<ts>/`) collects
// files the customer replaced before checkout. No document ever names them:
//   - 'old-orders' deletes only what an eligible order NAMES (or what sits
//     under its identity folders) — an unnamed sibling is nobody's;
//   - 'orphans' is prefix-level, and the order document (which stays in
//     Firestore for good, stamped or not) keeps protecting the whole folder.
// So those files are collected by neither mode. Closing the gap means letting
// a cleaned, closed order stop shielding its session folder — a wider
// deletion rule that needs its own decision.

/**
 * Owner decision (2026-11): only these statuses ever lose their artwork here,
 * each STRICTLY older than its own window (days).
 *
 * WHY cart_abandoned WAITS 90 DAYS, NOT 30: an abandoned order is not closed
 * from the customer's side. The cart lives in localStorage with no expiry,
 * CartPage passes its https design URLs straight into the next checkout
 * (re-using this very order document), and the payment webhook accepts
 * cart_abandoned → paid. Deleting at 30 days would hand a returning customer a
 * paid order with dead print files. Same reasoning, same number, as
 * ORPHAN_MIN_AGE_DAYS above.
 */
export const CLOSED_ORDER_MIN_AGE_DAYS = {
  completed: 30,
  shipped: 30,
  cancelled: 30,
  cart_abandoned: ORPHAN_MIN_AGE_DAYS,
} as const
export type ClosedOrderStatus = keyof typeof CLOSED_ORDER_MIN_AGE_DAYS

/** The window for a status in ms, or null when the status is not a closed one. */
export function closedOrderMinAgeMs(status: unknown): number | null {
  if (typeof status !== 'string' || !Object.prototype.hasOwnProperty.call(CLOSED_ORDER_MIN_AGE_DAYS, status)) {
    return null
  }
  return CLOSED_ORDER_MIN_AGE_DAYS[status as ClosedOrderStatus] * 86_400_000
}

/** A customer share older than this no longer shields files (owner decision). */
export const SHARE_PROTECT_DAYS = 30
export const SHARE_PROTECT_MS = SHARE_PROTECT_DAYS * 86_400_000
/** An unreferenced sketch file older than this is debris (owner decision). */
export const SKETCH_ORPHAN_MIN_AGE_DAYS = 2
export const SKETCH_ORPHAN_MIN_AGE_MS = SKETCH_ORPHAN_MIN_AGE_DAYS * 86_400_000

/** What survives: exact files plus whole folders (identity + bare-folder refs). */
export interface FileProtection {
  files: Set<string>
  prefixes: Set<string>
}

export function isFileProtected(path: string, protection: FileProtection): boolean {
  if (protection.files.has(path)) return true
  const prefix = sessionPrefixOf(path)
  return prefix === null || protection.prefixes.has(prefix)
}

function protect(protection: FileProtection, refs: DocStorageRefs): void {
  for (const f of refs.files) protection.files.add(f)
  for (const p of refs.identityPrefixes) protection.prefixes.add(p)
  for (const p of refs.folders) protection.prefixes.add(p)
}

/** `orders/abc` — how a stamp target / owner is named everywhere below. */
export type DocKey = string
export const docKey = (collection: string, id: string): DocKey => `${collection}/${id}`

/**
 * Age of a document's content, or null when it cannot be proven.
 *
 * Measured from the LATEST of createdAt, updatedAt and completedAt — every one
 * that is present. Orders carry no dedicated "closed at"; `updatedAt` is
 * written on every status change, so an order created 40 days ago and shipped
 * yesterday is one day closed, not forty. `createdAt` is required; any of the
 * three that is PRESENT but unreadable fails closed (null = keep), the same
 * posture as planSketchSweep.
 */
export function contentAgeMs(data: unknown, nowMs: number): number | null {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  let latest = timestampMillis(d.createdAt)
  if (latest === null) return null
  for (const field of ['updatedAt', 'completedAt']) {
    if (d[field] === undefined) continue
    const ms = timestampMillis(d[field])
    if (ms === null) return null
    latest = Math.max(latest, ms)
  }
  const age = nowMs - latest
  return age < 0 ? null : age
}

/** Closed status AND strictly older than that status's window. Unreadable → false. */
export function isEligibleClosedOrder(data: unknown, nowMs: number): boolean {
  const min = closedOrderMinAgeMs((data as { status?: unknown } | null)?.status)
  if (min === null) return false
  const age = contentAgeMs(data, nowMs)
  return age !== null && age > min
}

/**
 * A customer share link (not an admin sketch) older than 30 days: it no longer
 * protects the files it shows, and gets stamped `designsDeleted` when one of
 * them goes. shared_carts are customer-only (no admin path creates one).
 * An admin sketch is NEVER one of these, at any age — it protects whatever it
 * names, including an order's own files (sketches made before sketch-copy).
 */
export function isExpiredCustomerShare(collection: string, data: unknown, nowMs: number): boolean {
  if (collection === 'shared_designs') {
    if (isAdminSketch(data)) return false
  } else if (collection !== 'shared_carts') {
    return false
  }
  const age = contentAgeMs(data, nowMs)
  return age !== null && age > SHARE_PROTECT_MS
}

export interface StampTarget {
  collection: string
  id: string
}

export interface OwnerGroup {
  key: DocKey
  /** `#1234`, or the document id when the order has no number. */
  label: string
  status?: string
  files: number
  bytes: number
  ageDays: number | null
  sample: string[]
}

export interface FileLevelPlan extends CleanupPlan {
  /** Every file in `candidates` → the stamp targets that must be marked first. */
  fileOwners: Record<string, DocKey[]>
  /** Marked `designsDeleted: true` BEFORE their files are deleted. */
  stamps: StampTarget[]
  /** Already-marked targets are not re-written (keeps their reason/date). */
  alreadyStamped: DocKey[]
  protection: FileProtection
  /** This run, by order status (old-orders) or by one 'sketch' bucket. */
  byGroup: Record<string, { owners: number; files: number; bytes: number }>
  owners: OwnerGroup[]
  /** Eligible but beyond this run's cap — the owner re-runs. */
  remaining: { owners: number; files: number; bytes: number }
  /**
   * Orders holding more files than one run may delete. Skipped (and so are
   * their files) so they cannot block the queue; they need a human look.
   */
  oversized: OwnerGroup[]
  eligibleOrders: number
  /** How many of `stamps` are share links (the rest are orders). */
  sharesToStamp: number
  /**
   * References that could not be read. Non-empty ⇒ the plan is EMPTY: no
   * candidates, no stamps. The caller turns it into an abort that names the
   * documents (lib/storage-cleanup-run.ts).
   */
  suspicious: SuspiciousRef[]
}

function emptyFileLevelPlan(mode: CleanupMode, minAgeDays: number, protection: FileProtection): FileLevelPlan {
  const base = planStorageCleanup([], new Set(), mode, 0)
  return {
    ...base,
    minAgeDays,
    fileOwners: {},
    stamps: [],
    alreadyStamped: [],
    protection,
    byGroup: {},
    owners: [],
    remaining: { owners: 0, files: 0, bytes: 0 },
    oversized: [],
    eligibleOrders: 0,
    sharesToStamp: 0,
    suspicious: [],
  }
}

/** Age of the OBJECT itself in ms, or null when Storage gave us nothing provable. */
function objectAgeMs(obj: StorageObject, nowMs: number): number | null {
  if (obj.createdMs === null || !Number.isFinite(obj.createdMs)) return null
  const ms = nowMs - obj.createdMs
  return ms < 0 ? null : ms
}

function ageDaysOf(obj: StorageObject, nowMs: number): number | null {
  const ms = objectAgeMs(obj, nowMs)
  return ms === null ? null : Math.floor(ms / 86_400_000)
}

/** Shared bookkeeping: count every listed object into the scan totals. */
function tally(plan: FileLevelPlan, objects: readonly StorageObject[], nowMs: number): StorageObject[] {
  const inside: StorageObject[] = []
  for (const obj of objects) {
    plan.scanned++
    if (!sessionPrefixOf(obj.path)) {
      plan.skipped['outside-designs']++
      continue
    }
    const size = Number.isFinite(obj.sizeBytes) && obj.sizeBytes > 0 ? obj.sizeBytes : 0
    plan.scannedBytes += size
    bucketFor(ageDaysOf(obj, nowMs), plan.ageBuckets)
    inside.push({ ...obj, sizeBytes: size })
  }
  return inside
}

/**
 * 'old-orders': artwork of CLOSED orders past their window
 * (CLOSED_ORDER_MIN_AGE_DAYS — 30 days, 90 for cart_abandoned).
 *
 * Deletion set D = eligible orders + expired customer shares. Owned = every
 * designs/ file an eligible order names (items[].designs[].imageUrl,
 * upscales[].url/sourceUrl, anything else) + every listed object under its
 * identity prefixes (designs/<docId>/ = upscale outputs, designs/<paymentId>/
 * = the checkout pre-upload). Protected = every reference made by any document
 * OUTSIDE D. Candidates = owned − protected, and then only objects whose OWN
 * creation time is known and older than the window of every order that owns
 * them: a fresh upload into an old order's folder is somebody's open cart.
 *
 * `designsDeleted` does NOT affect eligibility: the old cron stamped orders
 * while their originals stayed, and a stamp that landed before a failed delete
 * must not strand the file. A fully-cleaned order simply owns nothing listed.
 *
 * The run is capped at `maxFiles`, cut at WHOLE-ORDER boundaries (oldest
 * first) so an order is never stamped while part of its batch is held back.
 * An order that alone exceeds the cap is reported in `oversized` and skipped —
 * together with every file it owns — so it cannot block the orders behind it.
 */
export function planClosedOrders(
  docs: readonly ScannedDoc[],
  objects: readonly StorageObject[],
  nowMs: number,
  maxFiles: number
): FileLevelPlan {
  const protection: FileProtection = { files: new Set(), prefixes: new Set() }
  const plan = emptyFileLevelPlan('old-orders', CLOSED_ORDER_MIN_AGE_DAYS.completed, protection)

  interface Eligible {
    key: DocKey
    id: string
    data: Record<string, unknown>
    refs: DocStorageRefs
    age: number
    minAgeMs: number
  }
  const orders: Eligible[] = []
  const shares: { key: DocKey; files: Set<string>; stamped: boolean }[] = []

  for (const doc of docs) {
    const refs = docStorageRefs(doc)
    plan.suspicious.push(...refs.suspicious)
    if (doc.collection === 'orders' && isEligibleClosedOrder(doc.data, nowMs)) {
      const data = doc.data as Record<string, unknown>
      orders.push({
        key: docKey('orders', doc.id),
        id: doc.id,
        data,
        refs,
        age: contentAgeMs(data, nowMs)!,
        minAgeMs: closedOrderMinAgeMs(data.status)!,
      })
      continue
    }
    if (isExpiredCustomerShare(doc.collection, doc.data, nowMs)) {
      shares.push({
        key: docKey(doc.collection, doc.id),
        files: new Set(refs.files),
        stamped: (doc.data as { designsDeleted?: unknown })?.designsDeleted === true,
      })
      continue
    }
    protect(protection, refs)
  }
  // One unreadable reference anywhere ⇒ nothing is proven unreferenced.
  if (plan.suspicious.length > 0) return plan
  plan.eligibleOrders = orders.length

  const listed = tally(plan, objects, nowMs)
  const byPrefix = new Map<string, StorageObject[]>()
  const byPath = new Map<string, StorageObject>()
  for (const obj of listed) {
    byPath.set(obj.path, obj)
    const prefix = sessionPrefixOf(obj.path)!
    const list = byPrefix.get(prefix)
    if (list) list.push(obj)
    else byPrefix.set(prefix, [obj])
  }

  // file → eligible orders that own it (unprotected files only)
  const claims = new Map<string, Eligible[]>()
  for (const o of orders) {
    const mine = new Set<string>()
    for (const f of o.refs.files) if (byPath.has(f)) mine.add(f)
    for (const p of o.refs.identityPrefixes) for (const obj of byPrefix.get(p) || []) mine.add(obj.path)
    for (const f of mine) {
      if (!isDeletablePath(f) || isFileProtected(f, protection)) continue
      const list = claims.get(f)
      if (list) list.push(o)
      else claims.set(f, [o])
    }
  }

  // The object's OWN age must be provable and past the strictest window among
  // its owners. Otherwise it stays, and counts for nobody.
  const settled = new Set<string>() // listed paths already counted in `skipped`
  const ownedBy = new Map<DocKey, string[]>()
  for (const [f, owners] of claims) {
    const age = objectAgeMs(byPath.get(f)!, nowMs)
    const required = Math.max(...owners.map((o) => o.minAgeMs))
    if (age === null || age <= required) {
      plan.skipped[age === null ? 'unknown-age' : 'too-young']++
      settled.add(f)
      claims.delete(f)
      continue
    }
    for (const o of owners) {
      const list = ownedBy.get(o.key)
      if (list) list.push(f)
      else ownedBy.set(o.key, [f])
    }
  }

  const describe = (o: Eligible, files: string[]): OwnerGroup => {
    const num = o.data.orderNumber
    return {
      key: o.key,
      label: typeof num === 'number' ? `#${num}` : o.id,
      status: String(o.data.status),
      files: files.length,
      bytes: files.reduce((n, f) => n + byPath.get(f)!.sizeBytes, 0),
      ageDays: Math.floor(o.age / 86_400_000),
      sample: [...files].sort().slice(0, 3),
    }
  }

  // An order too big for one run is set aside — and every file it owns with it,
  // so no other order gets stamped for a file whose co-owner was never cleaned.
  for (const o of orders) {
    const files = ownedBy.get(o.key) || []
    if (files.length <= maxFiles) continue
    plan.oversized.push(describe(o, files))
    ownedBy.delete(o.key)
    for (const f of files) {
      if (!claims.has(f)) continue
      claims.delete(f)
      settled.add(f)
      plan.skipped.oversized++
    }
  }

  for (const obj of listed) {
    if (claims.has(obj.path) || settled.has(obj.path)) continue
    if (isFileProtected(obj.path, protection)) plan.skipped.referenced++
    else plan.skipped['not-eligible']++
  }

  // Oldest first, whole orders, until the cap.
  orders.sort((a, b) => b.age - a.age || a.id.localeCompare(b.id))
  const batch = new Set<string>()
  let capped = false
  for (const o of orders) {
    const files = (ownedBy.get(o.key) || []).filter((f) => claims.has(f) && !batch.has(f))
    if (files.length === 0) continue
    const group = describe(o, files)
    if (capped || batch.size + files.length > maxFiles) {
      capped = true
      plan.remaining.owners++
      plan.remaining.files += files.length
      plan.remaining.bytes += group.bytes
      plan.skipped.deferred += files.length
      continue
    }
    for (const f of files) batch.add(f)
    plan.owners.push(group)
    const g = (plan.byGroup[group.status!] ||= { owners: 0, files: 0, bytes: 0 })
    g.owners++
    g.files += files.length
    g.bytes += group.bytes
  }

  // Stamp targets: every eligible order owning a batch file (even one held
  // back by the cap — its file is going now) and every expired share naming one.
  const stampKeys = new Set<DocKey>()
  const marked = new Map<DocKey, boolean>()
  for (const o of orders) marked.set(o.key, o.data.designsDeleted === true)
  for (const s of shares) marked.set(s.key, s.stamped)
  for (const f of batch) {
    const owners = claims.get(f)!.map((o) => o.key)
    for (const s of shares) if (s.files.has(f)) owners.push(s.key)
    plan.fileOwners[f] = owners
    for (const k of owners) stampKeys.add(k)
    const obj = byPath.get(f)!
    plan.candidates.push({ path: f, sizeBytes: obj.sizeBytes, ageDays: ageDaysOf(obj, nowMs) })
    plan.totalBytes += obj.sizeBytes
  }
  for (const k of [...stampKeys].sort()) {
    if (marked.get(k)) {
      plan.alreadyStamped.push(k)
      continue
    }
    const slash = k.indexOf('/')
    const collection = k.slice(0, slash)
    plan.stamps.push({ collection, id: k.slice(slash + 1) })
    if (collection !== 'orders') plan.sharesToStamp++
  }
  plan.candidates.sort((a, b) => a.path.localeCompare(b.path))
  return plan
}

/**
 * 'sketch-orphans': files under `designs/sketch-*` that NO document names
 * (exact path or folder) and that are strictly older than 2 days.
 *
 * This is the debris of a sketch deleted for good (its doc went first and a
 * file delete failed) and of sketch updates, which upload into a NEW
 * `designs/sketch-<ts>/` and leave the replaced files behind. File-level,
 * because an update carries untouched areas over from the old prefix — the
 * prefix is still half in use. Every collection protects, not only
 * shared_designs. Nothing is stamped: there is no owner left to tell.
 */
export function planSketchOrphans(
  docs: readonly ScannedDoc[],
  objects: readonly StorageObject[],
  nowMs: number,
  maxFiles: number
): FileLevelPlan {
  const protection: FileProtection = { files: new Set(), prefixes: new Set() }
  const plan = emptyFileLevelPlan('sketch-orphans', SKETCH_ORPHAN_MIN_AGE_DAYS, protection)
  for (const doc of docs) {
    const refs = docStorageRefs(doc)
    plan.suspicious.push(...refs.suspicious)
    protect(protection, refs)
  }
  if (plan.suspicious.length > 0) return plan
  const listed = tally(plan, objects, nowMs).sort((a, b) => a.path.localeCompare(b.path))

  const g = { owners: 0, files: 0, bytes: 0 }
  const prefixes = new Set<string>()
  const remainingPrefixes = new Set<string>()
  for (const obj of listed) {
    if (!SKETCH_SESSION_RE.test(obj.path) || !isDeletablePath(obj.path)) {
      plan.skipped['not-eligible']++
      continue
    }
    if (isFileProtected(obj.path, protection)) {
      plan.skipped.referenced++
      continue
    }
    const age = objectAgeMs(obj, nowMs)
    if (age === null) {
      plan.skipped['unknown-age']++
      continue
    }
    if (age <= SKETCH_ORPHAN_MIN_AGE_MS) {
      plan.skipped['too-young']++
      continue
    }
    if (plan.candidates.length >= maxFiles) {
      plan.skipped.deferred++
      plan.remaining.files++
      plan.remaining.bytes += obj.sizeBytes
      remainingPrefixes.add(sessionPrefixOf(obj.path)!)
      continue
    }
    plan.candidates.push({ path: obj.path, sizeBytes: obj.sizeBytes, ageDays: ageDaysOf(obj, nowMs) })
    plan.totalBytes += obj.sizeBytes
    plan.fileOwners[obj.path] = []
    prefixes.add(sessionPrefixOf(obj.path)!)
    g.files++
    g.bytes += obj.sizeBytes
  }
  g.owners = prefixes.size
  plan.remaining.owners = remainingPrefixes.size
  if (g.files > 0) plan.byGroup.sketch = g
  return plan
}
