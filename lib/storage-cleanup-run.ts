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
  isFileProtected,
  planClosedOrders,
  planSketchOrphans,
  planStorageCleanup,
  FILE_LEVEL_MODES,
  FileLevelPlan,
  sessionPrefixOf,
  CleanupMode,
  CleanupPlan,
  DELETABLE_PREFIX,
  REFERENCE_COLLECTIONS,
  ReferenceScan,
  ScannedDoc,
  StorageObject,
  SuspiciousRef,
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

/**
 * Collections that are NEVER scanned for references — not protecting, not
 * aborting. The audit log holds the paths this tool already deleted: scanned,
 * every logged path would "protect" its file forever. Listed explicitly so
 * that adding the log to BACKUP_COLLECTIONS one day cannot drag it into the
 * scan through assertReferenceCoverage.
 */
export const NEVER_SCANNED_COLLECTIONS: readonly string[] = [CLEANUP_LOG_COLLECTION]

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
 * must also be scanned for references (except NEVER_SCANNED_COLLECTIONS, which
 * must never be). If someone adds a business collection to
 * BACKUP_COLLECTIONS and forgets this list, the run aborts instead of deleting
 * files that collection might reference.
 */
export function assertReferenceCoverage(
  backupCollections: readonly string[] = BACKUP_COLLECTIONS,
  scannedCollections: readonly string[] = REFERENCE_COLLECTIONS
): void {
  const scanned = new Set<string>(scannedCollections)
  const forbidden = NEVER_SCANNED_COLLECTIONS.filter((name) => scanned.has(name))
  if (forbidden.length > 0) {
    throw new CleanupAbort(
      'אוסף שאסור לסרוק נכנס לרשימת הסריקה (יומן המחיקות היה הופך כל נתיב שנמחק ל"מוגן") — הריצה נעצרה',
      { forbidden }
    )
  }
  const missing = backupCollections.filter(
    (name) => !scanned.has(name) && !NEVER_SCANNED_COLLECTIONS.includes(name)
  )
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
  const scan = collectReferences(await readReferenceDocs(db))
  abortOnSuspicious(scan.suspicious)
  return scan
}

/** Firestore console page of one document — so the owner can open it and fix the field. */
export function firestoreConsoleUrl(collection: string, docId: string): string {
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'badfos-28b67'
  const seg = (v: string) => encodeURIComponent(v).replace(/%/g, '~')
  return `https://console.firebase.google.com/project/${project}/firestore/data/~2F${seg(collection)}~2F${seg(docId)}`
}

/**
 * A reference we could not read is a file we cannot prove is unreferenced:
 * the run stops and deletes nothing. The MESSAGE names the documents and
 * links straight to them in the Firebase console (the panel shows only the
 * message), so the owner can open the document and fix the field.
 */
function abortOnSuspicious(suspicious: SuspiciousRef[]): void {
  if (suspicious.length === 0) return
  const seen = new Set<string>()
  const documents: { path: string; url: string }[] = []
  for (const s of suspicious) {
    const path = `${s.collection}/${s.docId}`
    if (seen.has(path)) continue
    seen.add(path)
    documents.push({ path, url: firestoreConsoleUrl(s.collection, s.docId) })
  }
  const shown = documents.slice(0, 5)
  const more = documents.length > shown.length ? ` ועוד ${documents.length - shown.length}` : ''
  throw new CleanupAbort(
    `נמצאו הפניות לקבצים שלא ניתן לפענח במסמכים: ${shown.map((d) => d.path).join(', ')}${more}. ` +
      'הריצה נעצרה ולא נמחק כלום — יש לתקן או להסיר את השדה הבעייתי במסמך ולסרוק שוב. ' +
      `קישור ישיר למסמך: ${shown.map((d) => d.url).join(' , ')}`,
    { suspicious: suspicious.slice(0, 20), total: suspicious.length, documents: documents.slice(0, 20) }
  )
}

/**
 * Every document of every reference collection, raw. Same abort rules as
 * scanReferences (which is built on it): an unreadable or over-cap collection
 * means "we do not know what is referenced", and nothing gets deleted.
 */
export async function readReferenceDocs(db: Firestore): Promise<ScannedDoc[]> {
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
  return docs
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
  /** File-level modes only: owners, stamps and the file-level protection. */
  fileLevel?: FileLevelPlan
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
  if (FILE_LEVEL_MODES.includes(mode)) return buildFileLevelPlan(db, bucket, mode, now)
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

async function buildFileLevelPlan(
  db: Firestore,
  bucket: Bucket,
  mode: CleanupMode,
  now: number,
  maxFiles: number = MAX_DELETIONS_PER_RUN
): Promise<PlanResult> {
  const docs = await readReferenceDocs(db)
  const objects = await listDesignObjects(bucket)
  const plan =
    mode === 'old-orders'
      ? planClosedOrders(docs, objects, now, maxFiles)
      : planSketchOrphans(docs, objects, now, maxFiles)
  // The planner returns an EMPTY plan when it met an unreadable reference.
  abortOnSuspicious(plan.suspicious)
  return {
    plan,
    scan: {
      docsScanned: docs.length,
      prefixesProtected: plan.protection.prefixes.size,
      byCollection: {},
    },
    // The stamp list is part of what the owner approved — pin it too.
    planToken: planTokenFor(mode, [
      ...plan.candidates.map((c) => c.path),
      ...plan.stamps.map((t) => `stamp:${t.collection}/${t.id}`),
    ]),
    protectedPrefixes: plan.protection.prefixes,
    fileLevel: plan,
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
  /** File-level modes: documents marked designsDeleted:true in this call. */
  stamped?: number
  /** File-level modes: marks that failed — their files were left in place. */
  stampErrors?: number
  /** File-level modes: files kept because an owner's mark failed. */
  heldBack?: number
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

  if (fresh.fileLevel) {
    // All-or-nothing: the stamps were computed for exactly this file set, so a
    // partial selection could mark an order whose files were held back.
    const want = new Set(fresh.plan.candidates.map((c) => c.path))
    const asked = new Set(requestedPaths)
    if (asked.size !== want.size || [...want].some((p) => !asked.has(p))) {
      throw new CleanupAbort('במצב הזה מוחקים את כל הסבב שבתצוגה המקדימה או כלום — יש לסרוק מחדש', {
        expected: want.size,
        got: asked.size,
      })
    }
    return { result: await executeFileLevelPlan(db, bucket, fresh.fileLevel), plan: fresh }
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

/**
 * Execute a file-level plan: MARK, then DELETE — the same ordering as
 * lib/sketch-sweep.ts. If a mark lands and a delete fails we leak one file,
 * which the next run picks up (eligibility ignores designsDeleted). If files
 * went first and the mark failed, a share link would render broken images
 * and the admin would see download buttons for files that no longer exist.
 *
 * A file is deleted only when EVERY owner it has in the plan was marked (or
 * already was). Every path is re-checked against isDeletablePath and the
 * file-level protection immediately before its delete.
 */
export async function executeFileLevelPlan(
  db: Firestore,
  bucket: Bucket,
  plan: FileLevelPlan
): Promise<DeleteResult> {
  const result: DeleteResult = {
    mode: plan.mode,
    requested: plan.candidates.length,
    deleted: 0,
    bytesFreed: 0,
    errors: 0,
    rejected: [],
    stamped: 0,
    stampErrors: 0,
    heldBack: 0,
  }
  if (plan.candidates.length > MAX_DELETIONS_PER_RUN) {
    throw new CleanupAbort(
      `בקשה למחוק ${plan.candidates.length} קבצים בבת אחת — המקסימום לריצה הוא ${MAX_DELETIONS_PER_RUN}`,
      { max: MAX_DELETIONS_PER_RUN }
    )
  }

  const failed = new Set<string>()
  for (const t of plan.stamps) {
    try {
      const patch: Record<string, unknown> = { designsDeleted: true, designsDeletedAt: Timestamp.now() }
      if (t.collection === 'orders') patch.designsDeletedReason = 'closed_order'
      await db.collection(t.collection).doc(t.id).update(patch)
      result.stamped!++
    } catch (e) {
      console.error(`Storage cleanup: could not mark ${t.collection}/${t.id}, its files stay:`, e)
      failed.add(`${t.collection}/${t.id}`)
      result.stampErrors!++
    }
  }

  for (const c of plan.candidates) {
    const owners = plan.fileOwners[c.path] || []
    if (owners.some((k) => failed.has(k))) {
      result.heldBack!++
      continue
    }
    if (!isDeletablePath(c.path) || isFileProtected(c.path, plan.protection)) {
      result.rejected.push(c.path)
      continue
    }
    try {
      await bucket.file(c.path).delete({ ignoreNotFound: true })
      result.deleted++
      result.bytesFreed += c.sizeBytes
    } catch (e) {
      console.error(`Storage cleanup: failed to delete ${c.path}:`, e)
      result.errors++
    }
  }
  return result
}

/**
 * FIRST-RUN GATE. The nightly cron may delete under the closed-order policy
 * only after the owner has run it once BY HAND from /admin/costs — looked at
 * the preview, typed the phrase, deleted. The proof is the audit entry that
 * run wrote: only the admin route writes to this log, the cron never does.
 * A log that cannot be read counts as "not yet".
 */
export async function cronDeletionArmed(db: Firestore): Promise<boolean> {
  try {
    const snap = await db
      .collection(CLEANUP_LOG_COLLECTION)
      .where('mode', '==', 'old-orders')
      .limit(20)
      .get()
    // Re-checked here, not trusted to the query.
    return snap.docs.some((d) => {
      const entry = d.data() as Partial<AuditEntry>
      return entry.action === 'delete-files' && entry.mode === 'old-orders' && (entry.filesDeleted || 0) > 0
    })
  } catch (e) {
    console.error('Storage cleanup: could not read the audit log — cron deletion stays off:', e)
    return false
  }
}

export interface ClosedOrderCleanupRun {
  /**
   * True while the first-run gate is closed (cronDeletionArmed): the run only
   * PLANNED — nothing was stamped, nothing was deleted. `planned` says what a
   * real run would have done.
   */
  dryRun: boolean
  planned: { files: number; bytes: number; stamps: number }
  eligibleOrders: number
  ordersInBatch: number
  sharesToStamp: number
  remaining: FileLevelPlan['remaining']
  /** Orders with more files than one run may take — skipped, need a human look. */
  oversized: { key: string; label: string; files: number; bytes: number }[]
  result: DeleteResult
}

/**
 * The nightly cron's Layer 1 (app/api/cleanup-old-designs): the same planner
 * and executor as the admin 'old-orders' mode, one capped batch per night.
 * No token — the cron plans and executes in the same call. `maxFiles` is
 * lower for the cron (it shares its 300s budget with the backup, the sketch
 * sweep and the pressure layer); the admin tool keeps the full 2000.
 *
 * Behind the first-run gate: until the owner's first manual run it plans and
 * reports, and deletes nothing.
 */
export async function runClosedOrderCleanup(
  db: Firestore,
  bucket: Bucket,
  now: number = Date.now(),
  maxFiles: number = MAX_DELETIONS_PER_RUN
): Promise<ClosedOrderCleanupRun> {
  const armed = await cronDeletionArmed(db)
  const { fileLevel } = await buildFileLevelPlan(db, bucket, 'old-orders', now, Math.min(maxFiles, MAX_DELETIONS_PER_RUN))
  const plan = fileLevel!
  const result: DeleteResult = armed
    ? await executeFileLevelPlan(db, bucket, plan)
    : {
        mode: plan.mode,
        requested: plan.candidates.length,
        deleted: 0,
        bytesFreed: 0,
        errors: 0,
        rejected: [],
        stamped: 0,
        stampErrors: 0,
        heldBack: 0,
      }
  return {
    dryRun: !armed,
    planned: { files: plan.candidates.length, bytes: plan.totalBytes, stamps: plan.stamps.length },
    eligibleOrders: plan.eligibleOrders,
    ordersInBatch: plan.owners.length,
    sharesToStamp: plan.sharesToStamp,
    remaining: plan.remaining,
    oversized: plan.oversized.map((o) => ({ key: o.key, label: o.label, files: o.files, bytes: o.bytes })),
    result,
  }
}

/**
 * What the owner needs to know about a refused run: the message and, when a
 * reference was unreadable, the documents with their console links. No hints —
 * a hint can be most of a token-bearing URL, and this ends up in an email and
 * in the cron's JSON.
 */
export function describeCleanupAbort(e: CleanupAbort): {
  message: string
  documents: { path: string; url: string }[]
} {
  const documents = (e.detail as { documents?: { path: string; url: string }[] } | undefined)?.documents
  return { message: e.message, documents: Array.isArray(documents) ? documents : [] }
}

/**
 * The cron's Layer 2 (storage pressure). When usage is above the threshold it
 * runs ONE MORE pass of the very same closed-order policy — a fresh scan, a
 * fresh plan — and nothing else. It never widens what may be deleted: an open
 * order (paid / new / in_production / pending_payment) keeps its files however
 * full the bucket is, and an order is stamped only together with its files.
 * Behind the same first-run gate as Layer 1.
 *
 * `alert` says whether the owner must act, and why — still above the
 * threshold and the cron will not bring it down on its own:
 *   'gated'     — the first-run gate is closed, the pass only planned;
 *   'oversized' — only closed orders too big for a nightly batch are left
 *                 (the admin panel, cap 2000, can still clean them);
 *   'exhausted' — the policy has nothing left it may delete at all.
 * `exhausted` is true only for the last one.
 */
export async function runStoragePressureRelief(
  db: Firestore,
  bucket: Bucket,
  usageBytes: number,
  thresholdBytes: number,
  maxFiles: number,
  now: number = Date.now()
): Promise<{
  ran: boolean
  gated: boolean
  usageBytes: number
  exhausted: boolean
  alert: 'gated' | 'oversized' | 'exhausted' | null
  pass?: ClosedOrderCleanupRun
}> {
  if (!(usageBytes > thresholdBytes)) {
    return { ran: false, gated: false, usageBytes, exhausted: false, alert: null }
  }
  const pass = await runClosedOrderCleanup(db, bucket, now, maxFiles)
  if (pass.dryRun) return { ran: true, gated: true, usageBytes, exhausted: false, alert: 'gated', pass }
  const after = usageBytes - pass.result.bytesFreed
  // A failed delete or mark, or a batch still waiting, is next night's work.
  const nothingMoreTonight =
    after > thresholdBytes &&
    pass.remaining.files === 0 &&
    pass.result.errors === 0 &&
    !pass.result.stampErrors
  const oversized = pass.oversized.length > 0
  return {
    ran: true,
    gated: false,
    usageBytes: after,
    exhausted: nothingMoreTonight && !oversized,
    alert: !nothingMoreTonight ? null : oversized ? 'oversized' : 'exhausted',
    pass,
  }
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
  /** File-level modes: orders/shares marked designsDeleted in this call. */
  docsStamped?: number
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
