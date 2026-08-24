/**
 * POST /api/admin/storage-cleanup — the admin storage cleanup tool.
 *
 * Server-side only: deleting Storage objects needs the Admin SDK, and the
 * reference scan reads collections that firestore.rules keeps away from the
 * browser. Auth is byte-for-byte the scheme used by the other admin routes
 * (download-design, retry-upscale, system-status): `Bearer <idToken>` verified
 * with `adminAuth.verifyIdToken`, then the admin identity check.
 *
 * PREVIEW IS THE DEFAULT AND DELETING IS A SEPARATE ACT.
 * `action: 'preview'` is read-only and is what the UI calls on load. Deleting
 * requires a *different* action, an explicit confirmation phrase, an explicit
 * list of paths, and a `planToken` proving those paths came from a preview of
 * the world as it is right now. There is no age parameter — the 90-day
 * threshold lives in lib/storage-cleanup.ts and nothing here can shorten it.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin'
import {
  buildPlan,
  deleteDocs,
  previewDocs,
  readAuditLog,
  runStorageCleanup,
  writeAuditLog,
  CleanupAbort,
  DOC_DELETE_COLLECTIONS,
  DocDeleteCollection,
} from '@/lib/storage-cleanup-run'
import { groupByPrefix, CleanupMode } from '@/lib/storage-cleanup'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

/** Typed by the owner before anything is deleted. Deliberately not a click. */
const CONFIRM_PHRASE = 'מחק לצמיתות'

const MODES: CleanupMode[] = ['orphans', 'test-junk']

/** Max document IDs accepted in one docs request. */
const MAX_DOC_IDS = 50

export async function POST(request: NextRequest) {
  // ── Auth: Bearer <idToken> + admin identity (matches download-design) ──
  const authHeader = request.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const idToken = authHeader.slice('Bearer '.length).trim()
  if (!idToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  let decoded
  try {
    decoded = await adminAuth.verifyIdToken(idToken)
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (decoded.email !== 'badfos2002@gmail.com' || decoded.email_verified !== true) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const actor = decoded.email

  const body = await request.json().catch(() => ({}))
  const action = typeof body?.action === 'string' ? body.action : ''

  try {
    const bucket = adminStorage.bucket()

    // ── Read-only: the plan ───────────────────────────────────────────
    if (action === 'preview') {
      const mode = parseMode(body?.mode)
      if (!mode) return NextResponse.json({ error: 'bad_params' }, { status: 400 })

      const { plan, scan, planToken } = await buildPlan(adminDb, bucket, mode)
      return NextResponse.json({
        ok: true,
        mode,
        planToken,
        scan,
        minAgeDays: plan.minAgeDays,
        scanned: plan.scanned,
        scannedBytes: plan.scannedBytes,
        skipped: plan.skipped,
        ageBuckets: plan.ageBuckets,
        totalFiles: plan.candidates.length,
        totalBytes: plan.totalBytes,
        groups: groupByPrefix(plan.candidates),
        candidates: plan.candidates,
      })
    }

    // ── Destructive: delete files ─────────────────────────────────────
    if (action === 'delete') {
      const mode = parseMode(body?.mode)
      const planToken = typeof body?.planToken === 'string' ? body.planToken : ''
      const paths = Array.isArray(body?.paths) ? body.paths : null
      if (!mode || !planToken || !paths || paths.length === 0) {
        return NextResponse.json({ error: 'bad_params' }, { status: 400 })
      }
      if (body?.confirm !== CONFIRM_PHRASE) {
        return NextResponse.json({ error: 'confirmation_required' }, { status: 400 })
      }
      if (!paths.every((p: unknown) => typeof p === 'string')) {
        return NextResponse.json({ error: 'bad_params' }, { status: 400 })
      }

      const { result } = await runStorageCleanup(adminDb, bucket, mode, paths, planToken)
      const logged = await writeAuditLog(adminDb, {
        by: actor,
        action: 'delete-files',
        mode,
        filesDeleted: result.deleted,
        bytesFreed: result.bytesFreed,
        errors: result.errors,
        sample: paths.slice(0, 200),
      })
      return NextResponse.json({ ok: true, ...result, logged })
    }

    // ── Read-only: which test documents are actually there ────────────
    if (action === 'docs-preview') {
      const collection = parseDocCollection(body?.collection)
      const ids = parseIds(body?.ids)
      if (!collection || !ids) return NextResponse.json({ error: 'bad_params' }, { status: 400 })
      return NextResponse.json({ ok: true, collection, docs: await previewDocs(adminDb, collection, ids) })
    }

    // ── Destructive: delete the stray test documents ──────────────────
    if (action === 'docs-delete') {
      const collection = parseDocCollection(body?.collection)
      const ids = parseIds(body?.ids)
      if (!collection || !ids) return NextResponse.json({ error: 'bad_params' }, { status: 400 })
      if (body?.confirm !== CONFIRM_PHRASE) {
        return NextResponse.json({ error: 'confirmation_required' }, { status: 400 })
      }
      const res = await deleteDocs(adminDb, collection, ids)
      const logged = await writeAuditLog(adminDb, {
        by: actor,
        action: 'delete-docs',
        collection,
        docsDeleted: res.deleted.length,
        errors: res.errors,
        sample: res.deleted,
      })
      return NextResponse.json({ ok: true, ...res, logged })
    }

    // ── Read-only: the audit trail ────────────────────────────────────
    if (action === 'log') {
      return NextResponse.json({ ok: true, entries: await readAuditLog(adminDb) })
    }

    return NextResponse.json({ error: 'bad_params' }, { status: 400 })
  } catch (err) {
    if (err instanceof CleanupAbort) {
      // A refusal, not a crash — the message is written for the owner to read.
      return NextResponse.json({ error: 'aborted', message: err.message, detail: err.detail }, { status: 409 })
    }
    console.error('storage-cleanup error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

function parseMode(value: unknown): CleanupMode | null {
  return typeof value === 'string' && (MODES as string[]).includes(value)
    ? (value as CleanupMode)
    : null
}

function parseDocCollection(value: unknown): DocDeleteCollection | null {
  return typeof value === 'string' && (DOC_DELETE_COLLECTIONS as readonly string[]).includes(value)
    ? (value as DocDeleteCollection)
    : null
}

function parseIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_DOC_IDS) return null
  const ids = value.filter((v): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(v))
  return ids.length === value.length ? ids : null
}
