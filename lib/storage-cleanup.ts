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
import { storagePathFromUrl } from './sketch-retention'

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

/** Cheap "this string came from our bucket" test, used to spot broken refs. */
const STORAGE_HOST_RE = /^https:\/\/firebasestorage\.googleapis\.com\//

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

/** True when a string claims to come from our bucket, parseable or not. */
export function looksLikeStorageUrl(value: unknown): value is string {
  return typeof value === 'string' && STORAGE_HOST_RE.test(value)
}

// ── Reference collection ─────────────────────────────────────────────────

/**
 * Every collection whose documents are scanned for references before anything
 * is deleted.
 *
 * Derived from `BACKUP_COLLECTIONS` (lib/backup.ts, itself documented as
 * verified against firestore.rules + lib/db.ts) plus the two server-only
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

/** Walk any value, visiting every string inside it. Cycle-safe, depth-capped. */
function walkStrings(value: unknown, visit: (s: string) => void, depth = 0): void {
  if (depth > 12) return
  if (typeof value === 'string') {
    visit(value)
    return
  }
  if (Array.isArray(value)) {
    for (const v of value) walkStrings(v, visit, depth + 1)
    return
  }
  if (value && typeof value === 'object') {
    // Firestore Timestamps and similar carry no strings worth walking, but
    // walking them is harmless — plain enumeration only, no method calls.
    for (const v of Object.values(value as Record<string, unknown>)) {
      walkStrings(v, visit, depth + 1)
    }
  }
}

/**
 * Build the protected set from raw documents.
 *
 * Protection comes from three independent sources, so no single one has to be
 * right on its own:
 *
 *  1. Every string anywhere in the document that resolves to a `designs/` path.
 *     Field-name agnostic — `imageUrl`, `imageBase64` (which holds a URL, not
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

    // (3) identity-derived protection, independent of any field parsing
    for (const candidate of identityPrefixes(doc)) protectedPrefixes.add(candidate)

    walkStrings(doc.data, (s) => {
      // (2) bare object path
      const direct = sessionPrefixOf(s)
      if (direct) {
        protectedPrefixes.add(direct)
        return
      }
      // (1) download URL
      const objectPath = objectPathFromStorageUrl(s)
      if (objectPath === null) {
        // Claims to be ours but we cannot read it → fail closed.
        if (looksLikeStorageUrl(s)) {
          suspicious.push({ collection: doc.collection, docId: doc.id, hint: s.slice(0, 80) })
        }
        return
      }
      // A resolvable path outside designs/ (site-images/, mockups/) is a real
      // reference we simply never delete from — nothing to protect.
      if (!objectPath.startsWith(DELETABLE_PREFIX)) return
      // Inside designs/: reuse the sweep's hardened parser for the final say.
      const safe = storagePathFromUrl(s)
      const prefix = sessionPrefixOf(safe)
      if (prefix) {
        protectedPrefixes.add(prefix)
        return
      }
      // Inside designs/ but an unexpected shape — cannot name what to protect.
      suspicious.push({ collection: doc.collection, docId: doc.id, hint: objectPath.slice(0, 80) })
    })

    const added = protectedPrefixes.size - before
    if (added > 0) byCollection[doc.collection] = (byCollection[doc.collection] || 0) + added
  }

  return { protectedPrefixes, suspicious, docsScanned, byCollection }
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

export type CleanupMode = 'orphans' | 'test-junk'

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
