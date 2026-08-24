/**
 * The IO half of the storage cleanup tool: reads Firestore and the Storage
 * bucket, and performs the deletes the policy in lib/storage-cleanup.ts allows.
 *
 * `db` and `bucket` are PARAMETERS, not module imports, so this exact code —
 * gating, ordering, error handling and all — can be run against in-memory fakes
 * and observed rather than trusted. It permanently deletes customer artwork; it
 * does not get to be untested. (Same arrangement as lib/sketch-sweep.ts.)
 *
 * Called from app/api/admin/storage-cleanup, which supplies adminDb and the
 * admin Storage bucket.
 */
import { Timestamp, Firestore } from 'firebase-admin/firestore'
import type { Bucket } from '@google-cloud/storage'
import { createHash } from 'crypto'
import { BACKUP_COLLECTIONS } from './backup'
import {
  collectReferences,
  isDeletablePath,
  planStorageCleanup,
  sessionPrefixOf,
  CleanupMode,
  CleanupPlan,
  DELETABLE_PREFIX,
  REFERENCE_COLLECTIONS,
  ReferenceScan,
  ScannedDoc,
  StorageObject,
} from './storage-cleanup'

/**
 * Per-collection read cap. Hitting it means the reference scan is INCOMPLETE,
 * which aborts the run — a truncated scan cannot prove anything is unreferenced.
 */
const MAX_DOCS_PER_COLLECTION = 20_000

/** Hard ceiling on objects removed in one call, so a single click is bounded. */
export const MAX_DELETIONS_PER_RUN = 2_000

/** Firestore collection holding the audit trail. Admin SDK only; no rules change. */
export const CLEANUP_LOG_COLLECTION = 'storage_cleanup_log'

/** Collections whose documents the tool may delete (the stray test docs). */
export const DOC_DELETE_COLLECTIONS = ['shared_designs', 'shared_carts'] as const
export type DocDeleteCollection = (typeof DOC_DELETE_COLLECTIONS)[number]

export class CleanupAbort extends Error {
  constructor(
    message: string,
    readonly detail?: unknown
  ) {
    super(message)
    this.name = 'CleanupAbort'
  }
}

/**
 * Guard against silent drift: every collection the nightly backup knows about
 * must also be scanned for references. If someone adds a business collection to
 * BACKUP_COLLECTIONS and forgets this list, the run aborts instead of deleting
 * files that collection might reference.
 */
export function assertReferenceCoverage(): void {
  const scanned = new Set<string>(REFERENCE_COLLECTIONS)
  const missing = BACKUP_COLLECTIONS.filter((name) => !scanned.has(name))
  if (missing.length > 0) {
    throw new CleanupAbort(
      'רשימת האוספים לסריקה אינה מכסה את כל אוספי הגיבוי — הריצה נעצרה',
      { missing }
    )
  }
}

// ── Reference scan ───────────────────────────────────────────────────────

/**
 * Read every document of every reference collection and build the protected
 * prefix set.
 *
 * Aborts (rather than returning a partial answer) when a collection cannot be
 * read or is larger than the cap. Both mean "we do not know what is referenced",
 * and the only safe response to that is to delete nothing.
 */
export async function scanReferences(db: Firestore): Promise<ReferenceScan> {
  assertReferenceCoverage()

  const docs: ScannedDoc[] = []
  for (const name of REFERENCE_COLLECTIONS) {
    let snap
    try {
      snap = await db.collection(name).limit(MAX_DOCS_PER_COLLECTION).get()
    } catch (e) {
      throw new CleanupAbort(`קריאת האוסף "${name}" נכשלה — לא נמחק כלום`, {
        collection: name,
        error: e instanceof Error ? e.message : String(e),
      })
    }
    if (snap.docs.length >= MAX_DOCS_PER_COLLECTION) {
      throw new CleanupAbort(
        `האוסף "${name}" גדול ממכסת הסריקה — סריקה חלקית אינה יכולה להוכיח שקובץ אינו בשימוש`,
        { collection: name, cap: MAX_DOCS_PER_COLLECTION }
      )
    }
    for (const d of snap.docs) docs.push({ collection: name, id: d.id, data: d.data() })
  }

  const scan = collectReferences(docs)
  if (scan.suspicious.length > 0) {
    throw new CleanupAbort(
      'נמצאו הפניות לקבצים שלא ניתן לפענח — הריצה נעצרה כדי לא למחוק קובץ שבשימוש',
      { suspicious: scan.suspicious.slice(0, 20), total: scan.suspicious.length }
    )
  }
  return scan
}

// ── Object listing ───────────────────────────────────────────────────────

/**
 * List every object under `designs/`.
 *
 * The prefix here is a narrowing convenience only — it is NOT what keeps other
 * folders safe. Every path is re-checked by `isDeletablePath` on the way out,
 * and again by the planner and the executor, so an object outside `designs/`
 * cannot become a candidate even if the listing were to return one.
 */
export async function listDesignObjects(bucket: Bucket): Promise<StorageObject[]> {
  const [files] = await bucket.getFiles({ prefix: DELETABLE_PREFIX })
  const out: StorageObject[] = []
  for (const f of files) {
    const path = f.name
    if (!isDeletablePath(path)) continue
    const meta = f.metadata || {}
    const created = parseCreated(meta.timeCreated ?? meta.updated)
    out.push({
      path,
      sizeBytes: Number(meta.size || 0),
      createdMs: created,
    })
  }
  return out
}

/** ISO timestamp → ms, or null when Storage gave us nothing we can trust. */
function parseCreated(value: unknown): number | null {
  if (typeof value !== 'string' || value.length === 0) return null
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) return null
  // A creation date before the bucket could have existed is not a date.
  if (ms < Date.UTC(2020, 0, 1)) return null
  return ms
}

// ── Planning ─────────────────────────────────────────────────────────────

export interface PlanResult {
  plan: CleanupPlan
  scan: { docsScanned: number; prefixesProtected: number; byCollection: Record<string, number> }
  /** Pins this exact candidate set; a delete call must present it back. */
  planToken: string
  /**
   * The prefix set this plan was built from. Carried on the result so the
   * executor can re-check every path against it without a second full pass
   * over Firestore — the plan was built milliseconds earlier from exactly
   * this read, and a second read would double the cost of every click.
   * Never serialised into the HTTP response.
   */
  protectedPrefixes: ReadonlySet<string>
}

/**
 * A stable fingerprint of the candidate set. The delete call must echo it, and
 * the server re-plans and re-computes it before deleting — so a preview taken
 * against a different world (new uploads, a reference added since) cannot be
 * used to authorise a delete. Not a secret, and not an auth control: the token
 * proves freshness, `verifyIdToken` proves identity.
 */
export function planTokenFor(mode: CleanupMode, paths: string[]): string {
  const h = createHash('sha256')
  h.update(mode)
  h.update('\n')
  for (const p of [...paths].sort()) {
    h.update(p)
    h.update('\n')
  }
  return h.digest('hex').slice(0, 32)
}

export async function buildPlan(
  db: Firestore,
  bucket: Bucket,
  mode: CleanupMode,
  now: number = Date.now()
): Promise<PlanResult> {
  const scan = await scanReferences(db)
  const objects = await listDesignObjects(bucket)
  const plan = planStorageCleanup(objects, scan.protectedPrefixes, mode, now)
  return {
    plan,
    scan: {
      docsScanned: scan.docsScanned,
      prefixesProtected: scan.protectedPrefixes.size,
      byCollection: scan.byCollection,
    },
    planToken: planTokenFor(
      mode,
      plan.candidates.map((c) => c.path)
    ),
    protectedPrefixes: scan.protectedPrefixes,
  }
}

// ── Deletion ─────────────────────────────────────────────────────────────

export interface DeleteResult {
  mode: CleanupMode
  requested: number
  deleted: number
  bytesFreed: number
  errors: number
  /** Paths asked for that the fresh plan did not authorise. Never deleted. */
  rejected: string[]
}

/**
 * Delete the requested objects — and only those.
 *
 * Every path passes FOUR independent gates before `delete()` is called:
 *   1. it is in the freshly recomputed candidate set (not the caller's stale one),
 *   2. `planToken` proves the caller previewed exactly this candidate set,
 *   3. `isDeletablePath` — structurally inside `designs/`, no traversal,
 *   4. its prefix is not in the protected set that this very plan was built from.
 *
 * Anything that fails a gate lands in `rejected` and is left alone.
 */
export async function runStorageCleanup(
  db: Firestore,
  bucket: Bucket,
  mode: CleanupMode,
  requestedPaths: string[],
  planToken: string,
  now: number = Date.now()
): Promise<{ result: DeleteResult; plan: PlanResult }> {
  const fresh = await buildPlan(db, bucket, mode, now)

  if (fresh.planToken !== planToken) {
    throw new CleanupAbort(
      'התמונה השתנתה מאז התצוגה המקדימה — יש לרענן ולבדוק שוב לפני מחיקה',
      { expected: fresh.planToken }
    )
  }

  const allowed = new Set(fresh.plan.candidates.map((c) => c.path))
  const sizes = new Map(fresh.plan.candidates.map((c) => [c.path, c.sizeBytes]))
  const protectedPrefixes = fresh.protectedPrefixes

  const result: DeleteResult = {
    mode,
    requested: requestedPaths.length,
    deleted: 0,
    bytesFreed: 0,
    errors: 0,
    rejected: [],
  }

  const targets: string[] = []
  for (const path of requestedPaths) {
    const prefix = sessionPrefixOf(path)
    if (
      !allowed.has(path) || // gate 1
      !isDeletablePath(path) || // gate 3
      !prefix ||
      protectedPrefixes.has(prefix) // gate 4
    ) {
      result.rejected.push(path)
      continue
    }
    targets.push(path)
  }

  if (targets.length > MAX_DELETIONS_PER_RUN) {
    throw new CleanupAbort(
      `בקשה למחוק ${targets.length} קבצים בבת אחת — המקסימום לריצה הוא ${MAX_DELETIONS_PER_RUN}`,
      { max: MAX_DELETIONS_PER_RUN }
    )
  }

  for (const path of targets) {
    try {
      await bucket.file(path).delete({ ignoreNotFound: true })
      result.deleted++
      result.bytesFreed += sizes.get(path) || 0
    } catch (e) {
      console.error(`Storage cleanup: failed to delete ${path}:`, e)
      result.errors++
    }
  }

  return { result, plan: fresh }
}

// ── Firestore test-document deletion ─────────────────────────────────────

export interface DocPreview {
  id: string
  exists: boolean
  /** How many `designs/` prefixes this document currently protects. */
  storageRefs: number
  createdAt: string | null
  /** A short, non-sensitive shape hint so the owner recognises the document. */
  summary: string
}

export async function previewDocs(
  db: Firestore,
  collection: DocDeleteCollection,
  ids: string[]
): Promise<DocPreview[]> {
  const out: DocPreview[] = []
  for (const id of ids) {
    const snap = await db.collection(collection).doc(id).get()
    if (!snap.exists) {
      out.push({ id, exists: false, storageRefs: 0, createdAt: null, summary: '—' })
      continue
    }
    const data = snap.data()
    const refs = collectReferences([{ collection, id, data }])
    const created = (data as Record<string, unknown> | undefined)?.createdAt
    out.push({
      id,
      exists: true,
      // The document's own identity prefix is always counted by collectReferences;
      // subtract it so the number shown is "files this doc points at".
      storageRefs: Math.max(0, refs.protectedPrefixes.size - 1),
      createdAt: toIso(created),
      summary: summarise(data),
    })
  }
  return out
}

export async function deleteDocs(
  db: Firestore,
  collection: DocDeleteCollection,
  ids: string[]
): Promise<{ deleted: string[]; missing: string[]; errors: number }> {
  const deleted: string[] = []
  const missing: string[] = []
  let errors = 0
  for (const id of ids) {
    try {
      const ref = db.collection(collection).doc(id)
      const snap = await ref.get()
      if (!snap.exists) {
        missing.push(id)
        continue
      }
      await ref.delete()
      deleted.push(id)
    } catch (e) {
      console.error(`Storage cleanup: failed to delete ${collection}/${id}:`, e)
      errors++
    }
  }
  return { deleted, missing, errors }
}

function toIso(value: unknown): string | null {
  if (value && typeof value === 'object' && typeof (value as any).toDate === 'function') {
    try {
      return (value as any).toDate().toISOString()
    } catch {
      return null
    }
  }
  return null
}

function summarise(data: unknown): string {
  if (!data || typeof data !== 'object') return '—'
  const d = data as Record<string, unknown>
  const parts: string[] = []
  if (typeof d.productType === 'string') parts.push(d.productType)
  if (Array.isArray(d.designs)) parts.push(`${d.designs.length} עיצובים`)
  if (Array.isArray(d.items)) parts.push(`${d.items.length} פריטים`)
  if (d.designsDeleted === true) parts.push('נוקה')
  return parts.length > 0 ? parts.join(' · ') : '—'
}

// ── Audit log ────────────────────────────────────────────────────────────

export interface AuditEntry {
  by: string
  action: 'delete-files' | 'delete-docs'
  mode?: CleanupMode
  filesDeleted?: number
  bytesFreed?: number
  docsDeleted?: number
  collection?: string
  errors: number
  /** Capped: enough to audit, not enough to bloat the document. */
  sample: string[]
}

/**
 * Record what was deleted, how many bytes, by whom and when.
 * Best-effort: a logging failure must never make a completed deletion look
 * like it failed, so it is swallowed and reported separately.
 */
export async function writeAuditLog(db: Firestore, entry: AuditEntry): Promise<boolean> {
  try {
    await db.collection(CLEANUP_LOG_COLLECTION).add({
      ...entry,
      sample: entry.sample.slice(0, 200),
      at: Timestamp.now(),
    })
    return true
  } catch (e) {
    console.error('Storage cleanup: audit log write failed:', e)
    return false
  }
}

export interface AuditRow extends AuditEntry {
  id: string
  at: string | null
}

export async function readAuditLog(db: Firestore, limit = 20): Promise<AuditRow[]> {
  try {
    const snap = await db
      .collection(CLEANUP_LOG_COLLECTION)
      .orderBy('at', 'desc')
      .limit(limit)
      .get()
    return snap.docs.map((d) => {
      const data = d.data() as AuditEntry & { at?: unknown }
      return { ...data, id: d.id, at: toIso(data.at) }
    })
  } catch (e) {
    console.error('Storage cleanup: audit log read failed:', e)
    return []
  }
}
