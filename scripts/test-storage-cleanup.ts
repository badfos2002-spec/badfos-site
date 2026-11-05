/**
 * Tests for the admin storage cleanup tool (lib/storage-cleanup.ts,
 * lib/storage-cleanup-run.ts, app/api/admin/storage-cleanup).
 *
 * Run (with in-memory doubles swapped in for firebase-admin via tsconfig paths):
 *   npx tsx --tsconfig tsconfig.storage-cleanup-test.json scripts/test-storage-cleanup.ts
 *
 * The doubles replace the storage engine ONLY — the route handler, the auth
 * gate, the reference scan, the planner and the deleter are the real production
 * code, running unmodified. Nothing here touches production Storage.
 *
 * Covers:
 *   1. A referenced file is never selected, at any age.
 *   2. A recent unreferenced file (the open-cart case) is never selected,
 *      including the boundary to the millisecond.
 *   3. Paths outside designs/ cannot be selected even when seeded as orphans.
 *   4. Preview deletes nothing — full before/after state snapshot identical.
 *   5. A real deletion removes exactly the planned objects and reports accurate bytes.
 *   6. The endpoint rejects unauthenticated callers.
 *   7. A malformed or missing reference field never makes a file look unreferenced.
 *   + test-junk targeting, plan-token staleness, fail-closed scan errors.
 *   10–15. File-level modes: closed orders (30 days; abandoned carts 90),
 *      sketch debris, mark-then-delete, the per-run cap, the cron's Layer 1.
 *   16–22. Review round: per-status windows and timestamps, the object's own
 *      age, admin sketches that point at order files (and the sketch sweep),
 *      reference extraction that aborts on anything it cannot read, every
 *      scanned collection protecting, oversized orders, Layer 2.
 *   19, 23–30. Second review round: prose never aborts / whole values do;
 *      redaction of external error text in both writers; the never-scanned
 *      audit log; the cron's first-run gate; the REAL cron route (abort email,
 *      pressure alerts — `resend` is a local fake); exhausted vs oversized;
 *      admin order delete; download-design and retry-upscale on cleaned orders.
 *
 * No network: from Test 23 on, global fetch is replaced and refuses anything a
 * test did not explicitly fake.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { __stub } from './stubs/storage-cleanup-admin'
import { __sent } from './stubs/fake-resend'
import { Resend } from 'resend'
import { adminDb, adminStorage } from '@/lib/firebase-admin'
import { POST } from '@/app/api/admin/storage-cleanup/route'
import { Timestamp } from 'firebase-admin/firestore'
import {
  assertReferenceCoverage,
  buildPlan,
  cronDeletionArmed,
  describeCleanupAbort,
  firestoreConsoleUrl,
  runClosedOrderCleanup,
  runStoragePressureRelief,
  runStorageCleanup,
  scanReferences,
  CleanupAbort,
  NEVER_SCANNED_COLLECTIONS,
} from '@/lib/storage-cleanup-run'
import { isAdminSketch, planSketchSweep } from '@/lib/sketch-retention'
import { BACKUP_COLLECTIONS } from '@/lib/backup'
import { PIXEL_LIMIT_ERROR } from '@/lib/upscale'
import { runUpscaleForOrder, clearSweptFlagsIfFullyUpscaled } from '@/lib/upscale-order'
import { sweepOldSketches } from '@/lib/sketch-sweep'
import {
  formatBytes,
  ORPHAN_MIN_AGE_MS,
  ORPHAN_MIN_AGE_DAYS,
  planStorageCleanup,
  planClosedOrders,
  planSketchOrphans,
  collectReferences,
  contentAgeMs,
  docStorageRefs,
  storableErrorText,
  REFERENCE_COLLECTIONS,
  CleanupMode,
  ScannedDoc,
  StorageObject,
} from '@/lib/storage-cleanup'

let passed = 0
let failed = 0

function assert(cond: boolean, name: string, extra?: unknown) {
  if (cond) {
    passed++
    console.log(`  ✅ ${name}`)
  } else {
    failed++
    console.log(`  ❌ ${name}`, extra !== undefined ? JSON.stringify(extra) : '')
  }
}

const NOW = Date.parse('2026-08-24T12:00:00.000Z')
const BUCKET = 'badfos-28b67.firebasestorage.app'

/** A real-shaped Firebase download URL for an object path. */
function url(path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=abc-123`
}

function db() {
  return adminDb
}
function bucket() {
  return adminStorage.bucket()
}

async function plan(mode: CleanupMode, now = NOW) {
  return await buildPlan(db(), bucket(), mode, now)
}

function candidatePaths(p: { plan: { candidates: { path: string }[] } }): string[] {
  return p.plan.candidates.map((c) => c.path).sort()
}

/** Minimal valid documents so the reference scan has something normal to read. */
function seedBaseline() {
  __stub.addDocs('orders', {
    liveOrder: {
      paymentId: 'order-1787509272397',
      status: 'paid',
      items: [
        {
          designs: [
            { area: 'front_full', areaName: 'קידמי', imageUrl: url('designs/tshirt-1700000000000/live.png') },
          ],
        },
      ],
      upscales: {
        '0_front_full': {
          status: 'done',
          url: url('designs/liveOrder/0_front_full-upscaled.png'),
          sourceUrl: url('designs/liveOrder/0_front_full-src.png'),
        },
      },
    },
  })
  __stub.addDocs('shared_designs', {
    liveSketch: {
      previewUrl: url('designs/sketch-1700000000001/preview.jpg'),
      designs: [{ area: 'back', areaName: 'גב', imageBase64: url('designs/sketch-1700000000001/art.png') }],
    },
  })
  __stub.addDocs('shared_carts', {
    liveCart: {
      items: [
        { designs: [{ area: 'center', areaName: 'מרכז', imageBase64: url('designs/share-1700000000002/x.png') }] },
      ],
    },
  })
  // The field nobody anticipated: an admin-pasted Storage URL in a free-text field.
  __stub.addDocs('packages', {
    pkg1: { name: 'חבילה', image: url('designs/tote-1700000000003/pasted.png') },
  })
  __stub.addDocs('siteImages', {
    img1: { imageUrl: url('site-images/gallery/hero.png') },
  })
}

const DAY = 86_400_000

/**
 * The owner's first manual 'old-orders' run, as the admin route logs it. It
 * opens the nightly cron's first-run gate (cronDeletionArmed).
 */
function armCron() {
  __stub.addDocs('storage_cleanup_log', {
    firstManualRun: { by: 'badfos2002@gmail.com', action: 'delete-files', mode: 'old-orders', filesDeleted: 3, bytesFreed: 3000, errors: 0, sample: ['designs/x/a.png'] },
  })
}

/** Timestamp-shaped, as timestampMillis expects (toMillis). */
function ts(ms: number) {
  return { toMillis: () => ms }
}

/** Files the old-orders mode must select from seedClosedOrderWorld. */
const CLOSED_EXPECTED = [
  'designs/tshirt-222/a.png',
  'designs/tshirt-222/shown-in-old-share.png',
  'designs/order-222/pre.png',
  'designs/closedOld/0_front_full-up.png',
  'designs/tshirt-333/c.png',
  'designs/tshirt-778/abandoned-old.png',
  'designs/tshirt-666/original.png',
]

/**
 * A shop with open and closed orders, shares, a quote and a live sketch.
 * Every file is 60 days old unless noted, so age-of-file never decides.
 */
function seedClosedOrderWorld(now = NOW) {
  const img = (path: string) => ({ area: 'front_full', areaName: 'קידמי', imageUrl: url(path) })
  const old = (d: number) => ts(now - d * DAY)
  __stub.addDocs('orders', {
    // open statuses, all old — never touched
    openOld: {
      status: 'paid', paymentId: 'order-111', createdAt: old(60),
      items: [{ designs: [img('designs/tshirt-111/open.png')] }],
      upscales: { '0_front_full': { status: 'done', url: url('designs/openOld/0_front_full-up.png') } },
    },
    inProd: { status: 'in_production', createdAt: old(90), items: [{ designs: [img('designs/tshirt-112/prod.png')] }] },
    pend: { status: 'pending_payment', createdAt: old(90), items: [{ designs: [img('designs/tshirt-113/pend.png')] }] },
    newOne: { status: 'new', createdAt: old(90), items: [{ designs: [img('designs/tshirt-114/new.png')] }] },
    // closed + old
    closedOld: {
      status: 'completed', orderNumber: 1500, paymentId: 'order-222', createdAt: old(45), updatedAt: old(40),
      items: [{ designs: [
        img('designs/tshirt-222/a.png'),
        img('designs/tshirt-222/shared.png'),
        img('designs/tshirt-222/shown-in-old-share.png'),
        img('designs/sketch-1700000000001/art.png'),
      ] }],
      upscales: { '0_front_full': { status: 'done', sourceUrl: url('designs/tshirt-222/a.png'), url: url('designs/closedOld/0_front_full-up.png') } },
    },
    cancelledOld: {
      status: 'cancelled', createdAt: old(100),
      items: [{ designs: [img('designs/tshirt-333/c.png'), img('designs/tshirt-333/q.png'), img('designs/tshirt-333/young-share.png')] }],
    },
    // cart_abandoned waits 90 days, not 30 — the customer can still come back and pay
    abandoned: { status: 'cart_abandoned', createdAt: old(31), items: [{ designs: [img('designs/tshirt-777/abandoned.png')] }] },
    abandonedOld: { status: 'cart_abandoned', createdAt: old(91), items: [{ designs: [img('designs/tshirt-778/abandoned-old.png')] }] },
    // the old cron's leftover: stamped, original still in Storage
    cronMarked: {
      status: 'completed', createdAt: old(200), designsDeleted: true, designsDeletedReason: 'old-cron',
      items: [{ designs: [img('designs/tshirt-666/original.png')] }],
    },
    // closed but not old enough / unreadable
    youngOrder: { status: 'completed', createdAt: old(10), items: [{ designs: [img('designs/tshirt-222/shared.png')] }] },
    shippedRecent: { status: 'shipped', createdAt: old(45), updatedAt: old(5), items: [{ designs: [img('designs/tshirt-444/shipped-recently.png')] }] },
    badTs: { status: 'completed', createdAt: 1700000000, items: [{ designs: [img('designs/tshirt-555/bad-ts.png')] }] },
  })
  __stub.addDocs('shared_designs', {
    // live admin sketch (old, but sketches are never in the deletion set)
    liveSketch: {
      createdAt: old(40),
      previewUrl: url('designs/sketch-1700000000001/preview.jpg'),
      designs: [{ area: 'back', areaName: 'גב', imageBase64: url('designs/sketch-1700000000001/art.png') }],
    },
    // auto-created at checkout 45 days ago, before `source` existed
    checkoutShare: { createdAt: old(45), designs: [{ area: 'front_full', areaName: 'קידמי', imageBase64: url('designs/tshirt-222/shown-in-old-share.png') }] },
    youngShare: { source: 'checkout', createdAt: old(5), designs: [{ area: 'front_full', areaName: 'קידמי', imageBase64: url('designs/tshirt-333/young-share.png') }] },
  })
  __stub.addDocs('shared_carts', {
    oldCart: { createdAt: old(45), items: [{ designs: [{ area: 'a', areaName: 'a', imageBase64: url('designs/tshirt-333/c.png') }] }] },
  })
  __stub.addDocs('quotes', { q1: { createdAt: old(3), image: url('designs/tshirt-333/q.png') } })
  __stub.addDocs('siteImages', { img1: { imageUrl: url('site-images/gallery/hero.png') } })

  for (const path of [
    'designs/tshirt-111/open.png', 'designs/order-111/pre.png', 'designs/openOld/0_front_full-up.png',
    'designs/tshirt-112/prod.png', 'designs/tshirt-113/pend.png', 'designs/tshirt-114/new.png',
    'designs/tshirt-222/a.png', 'designs/tshirt-222/shared.png', 'designs/tshirt-222/neighbour.png',
    'designs/tshirt-222/shown-in-old-share.png', 'designs/order-222/pre.png', 'designs/closedOld/0_front_full-up.png',
    'designs/sketch-1700000000001/art.png', 'designs/sketch-1700000000001/preview.jpg',
    'designs/tshirt-333/c.png', 'designs/tshirt-333/q.png', 'designs/tshirt-333/young-share.png',
    'designs/tshirt-777/abandoned.png', 'designs/tshirt-666/original.png',
    'designs/tshirt-444/shipped-recently.png', 'designs/tshirt-555/bad-ts.png',
    'site-images/gallery/hero.png', 'backups/2026-08-01/orders.json', 'mockups/front.png',
  ]) __stub.addFile(path, 1000, 60, now)
  // the file's own age must pass its order's window too (90 days here)
  __stub.addFile('designs/tshirt-778/abandoned-old.png', 1000, 95, now)
}

async function main() {
  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 1: a referenced file is never selected, at ANY age')
  // ════════════════════════════════════════════════════════════════════
  __stub.reset()
  seedBaseline()
  for (const age of [1, 100, 5000]) {
    __stub.addFile(`designs/tshirt-1700000000000/live.png`, 1000, age, NOW)
    __stub.addFile(`designs/liveOrder/0_front_full-upscaled.png`, 2000, age, NOW)
    __stub.addFile(`designs/liveOrder/0_front_full-src.png`, 2000, age, NOW)
    __stub.addFile(`designs/sketch-1700000000001/preview.jpg`, 17_000, age, NOW)
    __stub.addFile(`designs/sketch-1700000000001/art.png`, 500_000, age, NOW)
    __stub.addFile(`designs/share-1700000000002/x.png`, 3000, age, NOW)
    __stub.addFile(`designs/tote-1700000000003/pasted.png`, 4000, age, NOW)
    __stub.addFile(`designs/order-1787509272397/precart.png`, 9000, age, NOW)

    const p = await plan('orphans')
    assert(
      p.plan.candidates.length === 0,
      `age ${age}d: 0 candidates out of ${p.plan.scanned} referenced files`,
      candidatePaths(p)
    )
    __stub.files = []
  }
  {
    // Same again at an absurd age, asserting the reason recorded is "referenced".
    __stub.addFile('designs/sketch-1700000000001/art.png', 500_000, 9999, NOW)
    const p = await plan('orphans')
    assert(p.plan.skipped.referenced === 1, 'skip reason recorded as "referenced"', p.plan.skipped)
    assert(
      p.scan.prefixesProtected >= 7,
      `reference scan protected ${p.scan.prefixesProtected} prefixes from ${p.scan.docsScanned} docs`
    )
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 2: the open-cart case — recent unreferenced files, and the boundary')
  // ════════════════════════════════════════════════════════════════════
  __stub.reset()
  seedBaseline()
  // An unreferenced pre-upload from ten minutes ago: somebody's open cart.
  __stub.files = []
  __stub.addFile('designs/order-1787599999999/opencart.png', 1_200_000, null, NOW)
  __stub.files[0].timeCreated = new Date(NOW - 10 * 60 * 1000).toISOString()
  // Left open overnight.
  __stub.addFile('designs/tshirt-1787500000000/overnight.png', 900_000, 1, NOW)
  // Three weeks in localStorage.
  __stub.addFile('designs/vest-1786000000000/threeweeks.png', 800_000, 21, NOW)
  // Just INSIDE the threshold — exactly 90 days to the millisecond.
  __stub.files.push({
    name: 'designs/buff-1780000000000/exactly90d.png',
    size: 700_000,
    timeCreated: new Date(NOW - ORPHAN_MIN_AGE_MS).toISOString(),
  })
  // Just OUTSIDE — 90 days and one second.
  __stub.files.push({
    name: 'designs/buff-1780000000001/past90d.png',
    size: 600_000,
    timeCreated: new Date(NOW - ORPHAN_MIN_AGE_MS - 1000).toISOString(),
  })

  {
    const p = await plan('orphans')
    const got = candidatePaths(p)
    assert(
      !got.includes('designs/order-1787599999999/opencart.png'),
      '10-minute-old open cart: NOT selected'
    )
    assert(!got.includes('designs/tshirt-1787500000000/overnight.png'), 'overnight cart: NOT selected')
    assert(!got.includes('designs/vest-1786000000000/threeweeks.png'), '21-day-old cart: NOT selected')
    assert(
      !got.includes('designs/buff-1780000000000/exactly90d.png'),
      `exactly ${ORPHAN_MIN_AGE_DAYS}d to the ms: NOT selected (boundary is strictly-greater)`
    )
    assert(
      got.includes('designs/buff-1780000000001/past90d.png'),
      `${ORPHAN_MIN_AGE_DAYS}d + 1s: selected`,
      got
    )
    assert(got.length === 1, `exactly 1 of 5 unreferenced files selected`, got)
    assert(p.plan.skipped['too-young'] === 4, '4 files skipped as too-young', p.plan.skipped)
  }

  // Millisecond precision on the boundary, through the pure planner.
  {
    const at = (offset: number) =>
      planStorageCleanup(
        [{ path: 'designs/x-1/a.png', sizeBytes: 1, createdMs: NOW - ORPHAN_MIN_AGE_MS - offset }],
        new Set<string>(),
        'orphans',
        NOW
      ).candidates.length
    assert(at(0) === 0, 'boundary: age == 90d exactly → kept')
    assert(at(1) === 1, 'boundary: age == 90d + 1ms → selected')
    assert(at(-1) === 0, 'boundary: age == 90d − 1ms → kept')
  }

  // A file with no usable creation time is never selected.
  {
    __stub.files = []
    __stub.addFile('designs/unknown-age-1/x.png', 5_000_000, null, NOW)
    const p = await plan('orphans')
    assert(p.plan.candidates.length === 0, 'no creation timestamp → never selected')
    assert(p.plan.skipped['unknown-age'] === 1, 'skip reason recorded as "unknown-age"', p.plan.skipped)
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 3: nothing outside designs/ can be selected, even seeded as an orphan')
  // ════════════════════════════════════════════════════════════════════
  __stub.reset()
  seedBaseline()
  __stub.files = []
  const outsiders = [
    'backups/backup-2020-01-01.json.gz',
    'mockups/tshirt/black-front.png',
    'site-images/gallery/hero.png',
    'designs-evil/x.png', // prefix look-alike
    'designs/../backups/evil.gz', // traversal
    'designs//double.png', // empty segment
    'designs/toplevel.png', // 2 segments — not the rules-allowed shape
    'designs/a/b/c/deep.png', // 4 segments
  ]
  // 200 days: comfortably past the threshold, and a date the bucket could
  // plausibly carry (a pre-2020 timestamp is treated as UNKNOWN age, not old).
  for (const name of outsiders) __stub.addFile(name, 10_000_000, 200, NOW)
  __stub.addFile('designs/legit-orphan-1/ok.png', 1234, 200, NOW)
  {
    const p = await plan('orphans')
    const got = candidatePaths(p)
    assert(got.length === 1 && got[0] === 'designs/legit-orphan-1/ok.png', 'only the well-formed designs/ orphan is selected', got)
    for (const name of outsiders) {
      assert(!got.includes(name), `not selectable: ${name}`)
    }
    // And a delete request naming them explicitly is refused too.
    const res = await runStorageCleanup(db(), bucket(), 'orphans', outsiders, p.planToken, NOW)
    assert(res.result.deleted === 0, 'explicit delete request for outsiders: 0 deleted')
    assert(res.result.rejected.length === outsiders.length, 'all outsiders rejected by the executor gates', res.result.rejected.length)
    assert(
      __stub.files.filter((f) => outsiders.includes(f.name)).length === outsiders.length,
      'every outsider object still present in the bucket'
    )
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 4: preview mutates nothing')
  // ════════════════════════════════════════════════════════════════════
  __stub.reset()
  seedBaseline()
  __stub.addFile('designs/old-orphan-1/a.png', 111_111, 200, NOW)
  __stub.addFile('designs/old-orphan-2/b.png', 222_222, 400, NOW)
  __stub.addFile('designs/tshirt-1700000000000/live.png', 333, 400, NOW)
  __stub.addFile('backups/keep.gz', 999, 999, NOW)
  {
    const filesBefore = __stub.snapshot()
    const docsBefore = __stub.docSnapshot()
    const bytesBefore = __stub.files.reduce((s, f) => s + f.size, 0)

    const p = await plan('orphans')
    const req = await httpPost({ action: 'preview', mode: 'orphans' })

    const filesAfter = __stub.snapshot()
    const docsAfter = __stub.docSnapshot()
    const bytesAfter = __stub.files.reduce((s, f) => s + f.size, 0)

    assert(JSON.stringify(filesBefore) === JSON.stringify(filesAfter), `bucket identical after preview (${filesAfter.length} objects)`)
    assert(JSON.stringify(docsBefore) === JSON.stringify(docsAfter), `documents identical after preview (${docsAfter.length} docs)`)
    assert(bytesBefore === bytesAfter, `total bytes identical after preview (${bytesBefore})`)
    assert(
      !__stub.events.some((e) => e.startsWith('deleteFile:') || e.startsWith('deleteDoc:') || e.startsWith('addDoc:') || e.startsWith('updateDoc:')),
      'no delete/write event recorded during preview'
    )
    assert(req.status === 200 && req.body.totalFiles === 2, `preview via HTTP: 2 candidates, ${formatBytes(req.body.totalBytes)}`, req.body.totalFiles)
    assert(p.plan.totalBytes === 333_333, `planned bytes = ${p.plan.totalBytes} (${formatBytes(p.plan.totalBytes)})`)
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 5: a real deletion removes exactly the plan, and reports accurate bytes')
  // ════════════════════════════════════════════════════════════════════
  {
    const before = __stub.snapshot()
    const p = await plan('orphans')
    const planned = candidatePaths(p)
    const plannedBytes = p.plan.totalBytes

    const httpRes = await httpPost({
      action: 'delete',
      mode: 'orphans',
      planToken: p.planToken,
      paths: planned,
      confirm: 'מחק לצמיתות',
    })

    const after = __stub.snapshot()
    const removed = before.filter((n) => !after.includes(n))
    const added = after.filter((n) => !before.includes(n))

    assert(httpRes.status === 200, 'HTTP 200 from the delete action')
    assert(httpRes.body.deleted === 2, `reported deleted = 2`, httpRes.body.deleted)
    assert(httpRes.body.bytesFreed === plannedBytes, `reported bytesFreed = ${httpRes.body.bytesFreed} = planned ${plannedBytes} (${formatBytes(httpRes.body.bytesFreed)})`)
    assert(httpRes.body.errors === 0, 'no errors')
    assert(JSON.stringify(removed.sort()) === JSON.stringify([...planned].sort()), 'exactly the planned objects were removed', { removed, planned })
    assert(added.length === 0, 'nothing was added to the bucket')
    assert(after.includes('designs/tshirt-1700000000000/live.png'), 'the referenced design survived')
    assert(after.includes('backups/keep.gz'), 'backups/ untouched')
    assert(httpRes.body.logged === true, 'audit entry written')

    const logRes = await httpPost({ action: 'log' })
    const entry = logRes.body.entries[0]
    assert(
      entry && entry.by === 'badfos2002@gmail.com' && entry.filesDeleted === 2 && entry.bytesFreed === plannedBytes,
      `audit log records who/what/how much: ${entry?.by}, ${entry?.filesDeleted} files, ${formatBytes(entry?.bytesFreed ?? 0)}`,
      entry
    )
  }

  // A stale plan token cannot authorise a delete.
  {
    __stub.reset()
    seedBaseline()
    __stub.addFile('designs/stale-1/a.png', 1000, 200, NOW)
    const p = await plan('orphans')
    __stub.addFile('designs/stale-2/b.png', 2000, 300, NOW) // world changed
    let aborted = false
    try {
      await runStorageCleanup(db(), bucket(), 'orphans', ['designs/stale-1/a.png'], p.planToken, NOW)
    } catch (e) {
      aborted = e instanceof CleanupAbort
    }
    assert(aborted, 'a plan token from a stale preview is refused')
    assert(__stub.snapshot().length === 2, 'nothing deleted on the refused call')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 6: the endpoint rejects unauthenticated callers')
  // ════════════════════════════════════════════════════════════════════
  __stub.reset()
  seedBaseline()
  __stub.addFile('designs/old-orphan-9/a.png', 5000, 500, NOW)
  {
    const noHeader = await rawPost({ action: 'preview', mode: 'orphans' }, undefined)
    assert(noHeader.status === 401, `no Authorization header → 401 (${noHeader.status})`)

    const wrongScheme = await rawPost({ action: 'preview', mode: 'orphans' }, 'Basic abc')
    assert(wrongScheme.status === 401, `non-Bearer scheme → 401 (${wrongScheme.status})`)

    const emptyToken = await rawPost({ action: 'preview', mode: 'orphans' }, 'Bearer ')
    assert(emptyToken.status === 401, `empty bearer token → 401 (${emptyToken.status})`)

    __stub.tokenThrows = true
    const badToken = await rawPost({ action: 'preview', mode: 'orphans' }, 'Bearer garbage')
    assert(badToken.status === 401, `unverifiable token → 401 (${badToken.status})`)
    __stub.tokenThrows = false

    __stub.token = { email: 'someone@else.com', email_verified: true }
    const wrongUser = await rawPost({ action: 'delete', mode: 'orphans', planToken: 'x', paths: ['designs/old-orphan-9/a.png'], confirm: 'מחק לצמיתות' }, 'Bearer ok')
    assert(wrongUser.status === 403, `non-admin identity → 403 (${wrongUser.status})`)

    __stub.token = { email: 'badfos2002@gmail.com', email_verified: false }
    const unverified = await rawPost({ action: 'preview', mode: 'orphans' }, 'Bearer ok')
    assert(unverified.status === 403, `unverified email → 403 (${unverified.status})`)

    __stub.token = { email: 'badfos2002@gmail.com', email_verified: true }
    assert(__stub.snapshot().length === 1, 'no rejected call deleted anything')

    // Confirmation phrase is mandatory even for the admin.
    const p = await plan('orphans')
    const noConfirm = await httpPost({ action: 'delete', mode: 'orphans', planToken: p.planToken, paths: candidatePaths(p) })
    assert(noConfirm.status === 400 && noConfirm.body.error === 'confirmation_required', `missing confirmation phrase → 400 confirmation_required (${noConfirm.status})`)
    const wrongConfirm = await httpPost({ action: 'delete', mode: 'orphans', planToken: p.planToken, paths: candidatePaths(p), confirm: 'yes' })
    assert(wrongConfirm.status === 400, 'wrong confirmation phrase → 400')
    assert(__stub.snapshot().length === 1, 'still nothing deleted')

    // There is no age knob to turn.
    const withAge = await httpPost({ action: 'preview', mode: 'orphans', minAgeDays: 0, maxAgeDays: 0, olderThan: 0 })
    assert(withAge.status === 200 && withAge.body.minAgeDays === ORPHAN_MIN_AGE_DAYS, `injected age params ignored — threshold stays ${withAge.body.minAgeDays}d`)
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 7: malformed / missing reference fields never orphan a live file')
  // ════════════════════════════════════════════════════════════════════
  __stub.reset()
  // Orders whose design fields are broken in every way we could think of.
  __stub.addDocs('orders', {
    nullUrl: { paymentId: 'order-1111111111111', items: [{ designs: [{ area: 'a', imageUrl: null }] }] },
    emptyUrl: { paymentId: 'order-2222222222222', items: [{ designs: [{ area: 'a', imageUrl: '' }] }] },
    numberUrl: { paymentId: 'order-3333333333333', items: [{ designs: [{ area: 'a', imageUrl: 12345 }] }] },
    missingItems: { paymentId: 'order-4444444444444' },
    noDesigns: { paymentId: 'order-5555555555555', items: [{}] },
    dataUrl: { paymentId: 'order-6666666666666', items: [{ designs: [{ area: 'a', imageUrl: 'data:image/png;base64,AAAA' }] }] },
  })
  __stub.files = []
  const brokenPrefixes = [
    'designs/nullUrl/x.png',
    'designs/order-1111111111111/x.png',
    'designs/emptyUrl/x.png',
    'designs/order-2222222222222/x.png',
    'designs/numberUrl/x.png',
    'designs/order-3333333333333/x.png',
    'designs/missingItems/x.png',
    'designs/order-4444444444444/x.png',
    'designs/noDesigns/x.png',
    'designs/order-5555555555555/x.png',
    'designs/dataUrl/x.png',
    'designs/order-6666666666666/x.png',
  ]
  for (const path of brokenPrefixes) __stub.addFile(path, 10_000, 9999, NOW)
  {
    const p = await plan('orphans')
    assert(
      p.plan.candidates.length === 0,
      `all ${brokenPrefixes.length} files behind broken/missing fields kept (identity-derived protection)`,
      candidatePaths(p)
    )
    assert(p.plan.skipped.referenced === brokenPrefixes.length, 'every one skipped as "referenced"', p.plan.skipped)
  }

  // A truncated Storage URL is a reference we cannot read → the run aborts.
  {
    __stub.addDocs('orders', {
      truncated: {
        items: [{ designs: [{ area: 'a', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/' }] }],
      },
    })
    let aborted: CleanupAbort | null = null
    try {
      await plan('orphans')
    } catch (e) {
      if (e instanceof CleanupAbort) aborted = e
    }
    assert(aborted !== null, 'unreadable Storage URL aborts the whole run (fail closed)')
    const res = await httpPost({ action: 'preview', mode: 'orphans' })
    assert(res.status === 409 && res.body.error === 'aborted', `HTTP surfaces the refusal as 409 aborted (${res.status})`)
    delete __stub.collections['orders']['truncated']
  }

  // A percent-encoding that cannot be decoded is equally fatal.
  {
    __stub.addDocs('orders', {
      badEncoding: { items: [{ designs: [{ imageUrl: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/designs%2Fbad%E0%A4%A.png` }] }] },
    })
    let aborted = false
    try {
      await plan('orphans')
    } catch (e) {
      aborted = e instanceof CleanupAbort
    }
    assert(aborted, 'undecodable percent-encoding aborts the run')
    delete __stub.collections['orders']['badEncoding']
  }

  // A collection that cannot be read is fatal too — a partial scan proves nothing.
  {
    __stub.failReads.add('shared_carts')
    let aborted = false
    try {
      await plan('orphans')
    } catch (e) {
      aborted = e instanceof CleanupAbort
    }
    assert(aborted, 'a failed collection read aborts the run')
    __stub.failReads.clear()
  }

  // A URL pointing outside designs/ is a normal reference, not a fault.
  {
    const scan = collectReferences([
      { collection: 'siteImages', id: 'i1', data: { imageUrl: url('site-images/gallery/a.png') } },
      { collection: 'settings', id: 'homepage', data: { why_videoUrl: 'https://youtube.com/embed/x' } },
    ])
    assert(scan.suspicious.length === 0, 'site-images/ URL and a YouTube URL raise no alarm')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 8: test-junk mode targets only the known probe patterns')
  // ════════════════════════════════════════════════════════════════════
  __stub.reset()
  seedBaseline()
  __stub.files = []
  __stub.addFile('designs/verify-probe/a.png', 1000, 1, NOW)
  __stub.addFile('designs/diag-abc/b.png', 2000, 1, NOW)
  __stub.addFile('designs/diag2-xyz/c.png', 3000, 1, NOW)
  __stub.addFile('designs/postdeploy-1/d.png', 4000, 1, NOW)
  __stub.addFile('designs/apron-1787508801389/e.png', 5000, 1, NOW)
  __stub.addFile('designs/baby-1787509537731/f.png', 6000, 1, NOW)
  __stub.addFile('designs/tshirt-1787512345678/g.png', 7000, 1, NOW) // ambiguous family
  __stub.addFile('designs/sweatshirt-1787512345679/h.png', 8000, 1, NOW) // ambiguous family
  __stub.addFile('designs/tshirt-1700000000000/live.png', 9000, 1, NOW) // referenced
  __stub.addFile('designs/tote-1799999999999/customer.png', 9999, 1, NOW) // ordinary customer
  {
    const p = await plan('test-junk')
    const got = candidatePaths(p)
    assert(!got.includes('designs/tote-1799999999999/customer.png'), 'an ordinary recent customer session is not test junk')
    assert(!got.includes('designs/tshirt-1700000000000/live.png'), 'a referenced file is excluded from test-junk mode too')
    assert(got.length === 8, `8 probe files matched`, got)
    const ambiguous = p.plan.candidates.filter((c) => c.ambiguous).map((c) => c.path)
    assert(ambiguous.length === 2, 'the 2 designer-timestamp families are flagged ambiguous (never pre-selected in the UI)', ambiguous)
    // The order-1787509272397 prefix from the owner's list is protected because a
    // live order carries it as paymentId — the reference scan wins over the pattern.
    __stub.addFile('designs/order-1787509272397/probe.png', 1234, 1, NOW)
    const p2 = await plan('test-junk')
    assert(
      !candidatePaths(p2).includes('designs/order-1787509272397/probe.png'),
      'a test pattern never overrides a live reference'
    )
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 9: reference-scan coverage guard + byte formatting')
  // ════════════════════════════════════════════════════════════════════
  {
    __stub.reset()
    seedBaseline()
    const scan = await scanReferences(db())
    assert(scan.docsScanned === 5, `scanned ${scan.docsScanned} seeded documents across all reference collections`)
    assert(scan.protectedPrefixes.has('designs/tote-1700000000003/'), 'a Storage URL pasted into packages.image protects its files')
    assert(scan.protectedPrefixes.has('designs/order-1787509272397/'), 'orders.paymentId protects the pre-upload prefix')
    assert(scan.protectedPrefixes.has('designs/share-1700000000002/'), 'shared_carts nested design URL protected')
    assert(formatBytes(0) === '0 B' && formatBytes(1536) === '1.50 KB' && formatBytes(5 * 1024 ** 3) === '5.00 GB', `formatBytes: ${formatBytes(1536)}, ${formatBytes(5 * 1024 ** 3)}`)
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 10: old-orders — only CLOSED orders older than 30 days, file level')
  // ════════════════════════════════════════════════════════════════════
  __stub.reset()
  // Real clock: the HTTP route below plans with Date.now().
  const T10 = Date.now()
  seedClosedOrderWorld(T10)
  {
    const before = __stub.snapshot()
    const p = await plan('old-orders', T10)
    const got = candidatePaths(p)
    assert(
      JSON.stringify(got) === JSON.stringify([...CLOSED_EXPECTED].sort()),
      `exactly the closed-order files are candidates (${got.length})`,
      got
    )
    // open statuses, old or not
    for (const kept of [
      'designs/tshirt-111/open.png',
      'designs/order-111/pre.png',
      'designs/openOld/0_front_full-up.png',
      'designs/tshirt-112/prod.png',
      'designs/tshirt-113/pend.png',
      'designs/tshirt-114/new.png',
    ]) {
      assert(!got.includes(kept), `open-status old order keeps ${kept}`)
    }
    assert(!got.includes('designs/tshirt-222/shared.png'), 'a file shared with a YOUNGER order is kept')
    assert(got.includes('designs/tshirt-222/a.png'), '…while its neighbour in the same session prefix goes (file level)')
    assert(!got.includes('designs/tshirt-222/neighbour.png'), 'a file the closed order never named is not "owned" by it')
    assert(!got.includes('designs/sketch-1700000000001/art.png'), 'a file a live admin sketch shows is kept')
    assert(!got.includes('designs/tshirt-333/q.png'), 'a file a quote names is kept')
    assert(!got.includes('designs/tshirt-333/young-share.png'), 'a file a <30d customer share shows is kept')
    assert(got.includes('designs/tshirt-222/shown-in-old-share.png'), 'an expired checkout share does NOT protect')
    assert(!got.includes('designs/tshirt-444/shipped-recently.png'), 'shipped 5 days ago (created 45d) is not 30 days closed')
    assert(!got.includes('designs/tshirt-777/abandoned.png'), 'cart_abandoned 31 days → KEPT (its window is 90 days)')
    assert(got.includes('designs/tshirt-778/abandoned-old.png'), 'cart_abandoned 91 days → deleted')
    assert(!got.includes('designs/tshirt-555/bad-ts.png'), 'unreadable createdAt → kept')
    assert(!got.includes('site-images/gallery/hero.png'), 'nothing outside designs/')
    const fl = p.fileLevel!
    const C0 = __stub.collections
    assert(
      fl.byGroup.completed?.owners === 2 && fl.byGroup.cancelled?.owners === 1 && fl.byGroup.cart_abandoned?.owners === 1,
      'preview groups: 2 completed (one already stamped by the old cron), 1 cancelled, 1 cart_abandoned',
      fl.byGroup
    )
    const stampKeys = fl.stamps.map((t) => `${t.collection}/${t.id}`).sort()
    assert(
      JSON.stringify(stampKeys) ===
        JSON.stringify(['orders/abandonedOld', 'orders/cancelledOld', 'orders/closedOld', 'shared_carts/oldCart', 'shared_designs/checkoutShare']),
      'stamps: the 3 unmarked eligible orders + the 2 expired shares that show a deleted file',
      stampKeys
    )
    assert(fl.sharesToStamp === 2 && fl.stamps.length === 5, 'sharesToStamp counts exactly the shares inside `stamps`')
    assert(C0.orders.abandoned.designsDeleted === undefined, 'the 31-day abandoned cart is not in the stamp list')
    assert(fl.alreadyStamped.includes('orders/cronMarked'), 'an order the old cron already marked is not re-written…')
    assert(got.includes('designs/tshirt-666/original.png'), '…but its surviving original IS cleaned now')
    assert(JSON.stringify(__stub.snapshot()) === JSON.stringify(before), 'preview deleted nothing')

    // HTTP preview carries the per-group counts
    const res = await httpPost({ action: 'preview', mode: 'old-orders' })
    assert(res.status === 200 && res.body.fileLevel?.ordersInBatch === 4, `HTTP preview: 4 orders in this run (${res.body?.fileLevel?.ordersInBatch})`)
    assert(res.body.groups?.[0]?.prefix?.startsWith('orders/'), 'HTTP preview groups are per order')
    assert(
      res.body.groups.every((g: { status?: string; label?: string }) => typeof g.status === 'string' && !(g.label || '').includes(' · ')),
      'each group carries its status separately (the panel renders it in Hebrew)',
      res.body.groups
    )

    // partial selection is refused
    const partial = await httpPost({
      action: 'delete',
      mode: 'old-orders',
      planToken: res.body.planToken,
      paths: got.slice(1),
      confirm: 'מחק לצמיתות',
    })
    assert(partial.status === 409, `partial selection refused (${partial.status})`)
    assert(JSON.stringify(__stub.snapshot()) === JSON.stringify(before), '…and deleted nothing')

    // the real delete
    __stub.events = []
    const del = await httpPost({
      action: 'delete',
      mode: 'old-orders',
      planToken: res.body.planToken,
      paths: got,
      confirm: 'מחק לצמיתות',
    })
    assert(del.status === 200 && del.body.deleted === got.length, `deleted ${del.body?.deleted}/${got.length}`)
    assert(del.body.stamped === 5, `stamped 5 documents (${del.body?.stamped})`)
    const left = __stub.snapshot()
    assert(got.every((g) => !left.includes(g)), 'every candidate is gone')
    assert(
      before.filter((b) => !got.includes(b)).every((b) => left.includes(b)),
      'every non-candidate is still there'
    )
    const C = __stub.collections
    assert(C.orders.closedOld.designsDeleted === true && C.orders.closedOld.designsDeletedReason === 'closed_order', 'closed order stamped designsDeleted (reason closed_order)')
    assert(C.shared_designs.checkoutShare.designsDeleted === true, 'expired checkout share stamped')
    assert(C.shared_carts.oldCart.designsDeleted === true, 'expired shared cart stamped')
    assert(C.shared_designs.youngShare.designsDeleted === undefined, 'young share not stamped')
    assert(C.orders.openOld.designsDeleted === undefined && C.orders.youngOrder.designsDeleted === undefined, 'open / young orders not stamped')
    assert(C.orders.cronMarked.designsDeletedReason === 'old-cron', 'already-marked order keeps its original stamp')
    const firstDelete = __stub.events.findIndex((e) => e.startsWith('deleteFile:'))
    const lastUpdate = __stub.events.map((e) => e.startsWith('updateDoc:')).lastIndexOf(true)
    assert(firstDelete > lastUpdate && lastUpdate >= 0, 'mark-then-delete: every stamp lands before the first file delete')
    const audit = Object.values(C.storage_cleanup_log || {})[0] as Record<string, unknown> | undefined
    assert(audit?.mode === 'old-orders' && audit?.docsStamped === 5, 'audit entry records mode + stamped docs')

    const again = await plan('old-orders', T10)
    assert(again.plan.candidates.length === 0 && again.fileLevel!.stamps.length === 0, 'second run: nothing left, nothing to stamp')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 11: old-orders — a failed mark keeps that order\'s files')
  // ════════════════════════════════════════════════════════════════════
  __stub.reset()
  seedClosedOrderWorld()
  {
    __stub.failUpdates.add('orders/cancelledOld')
    const p = await plan('old-orders')
    const { result } = await runStorageCleanup(db(), bucket(), 'old-orders', candidatePaths(p), p.planToken, NOW)
    const left = __stub.snapshot()
    assert(result.stampErrors === 1 && (result.heldBack ?? 0) >= 1, `1 stamp failed, ${result.heldBack} file(s) held back`)
    assert(left.includes('designs/tshirt-333/c.png'), "the unmarked order's file is still there")
    assert(!left.includes('designs/tshirt-222/a.png'), 'other orders proceeded')
    __stub.failUpdates.clear()
    const p2 = await plan('old-orders')
    assert(candidatePaths(p2).includes('designs/tshirt-333/c.png'), 'the next run picks the held-back file up again')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 12: old-orders — the per-run cap cuts at whole-order boundaries')
  // ════════════════════════════════════════════════════════════════════
  {
    const docs = [
      { collection: 'orders', id: 'o1', data: { status: 'completed', createdAt: ts(NOW - 100 * DAY), items: [{ designs: [{ imageUrl: url('designs/s1/a.png') }, { imageUrl: url('designs/s1/b.png') }] }] } },
      { collection: 'orders', id: 'o2', data: { status: 'completed', createdAt: ts(NOW - 90 * DAY), items: [{ designs: [{ imageUrl: url('designs/s2/a.png') }, { imageUrl: url('designs/s2/b.png') }] }] } },
      { collection: 'orders', id: 'o3', data: { status: 'completed', createdAt: ts(NOW - 80 * DAY), items: [{ designs: [{ imageUrl: url('designs/s3/a.png') }] }] } },
    ]
    const objects = ['designs/s1/a.png', 'designs/s1/b.png', 'designs/s2/a.png', 'designs/s2/b.png', 'designs/s3/a.png'].map((path) => ({ path, sizeBytes: 10, createdMs: NOW - 100 * DAY }))
    const p = planClosedOrders(docs, objects, NOW, 3)
    const got = p.candidates.map((c) => c.path).sort()
    assert(JSON.stringify(got) === JSON.stringify(['designs/s1/a.png', 'designs/s1/b.png']), 'cap 3: oldest order (2 files) in, the next 2-file order deferred whole', got)
    assert(p.remaining.owners === 2 && p.remaining.files === 3, `remaining: 2 orders / 3 files (${p.remaining.owners}/${p.remaining.files})`)
    assert(p.stamps.length === 1 && p.stamps[0].id === 'o1', 'only the order whose files go is stamped')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 13: sketch-orphans — unreferenced sketch files older than 2 days')
  // ════════════════════════════════════════════════════════════════════
  __stub.reset()
  seedBaseline()
  const T13 = Date.now()
  __stub.addFile('designs/sketch-1700000000001/art.png', 1000, 30, NOW) // live
  __stub.addFile('designs/sketch-1700000000001/preview.jpg', 1000, 30, NOW) // live
  __stub.addFile('designs/sketch-1700000000001/replaced.png', 5000, 10, NOW) // same prefix, no longer named
  __stub.addFile('designs/sketch-1799000000000/old.png', 7000, 3, T13)
  __stub.addFile('designs/sketch-1799000000000/young.png', 7000, 1, T13)
  __stub.addFile('designs/sketch-1799000000000/no-date.png', 7000, null, T13)
  __stub.addFile('designs/tshirt-1799999999999/x.png', 9000, 100, NOW) // not a sketch folder
  __stub.files.push({ name: 'designs/sketch-1799000000001/exact.png', size: 1, timeCreated: new Date(T13 - 2 * DAY).toISOString() })
  {
    const p = await plan('sketch-orphans', T13)
    const got = candidatePaths(p)
    assert(
      JSON.stringify(got) === JSON.stringify(['designs/sketch-1700000000001/replaced.png', 'designs/sketch-1799000000000/old.png']),
      'only the >2d unreferenced sketch files',
      got
    )
    assert(!got.includes('designs/sketch-1799000000000/young.png'), 'orphan sketch file <2d is kept')
    assert(!got.includes('designs/sketch-1799000000001/exact.png'), 'exactly 2 days old is kept (strictly older)')
    assert(!got.includes('designs/sketch-1799000000000/no-date.png'), 'unknown age is kept')
    assert(!got.includes('designs/tshirt-1799999999999/x.png'), 'non-sketch folders are out of scope for this mode')
    assert(p.fileLevel!.stamps.length === 0, 'nothing to stamp')
    // The route plans with its own Date.now(), a few ms later: the
    // millisecond-boundary file would tip over — keep it out of the HTTP leg.
    __stub.files = __stub.files.filter((f) => !f.name.endsWith('/exact.png'))
    const res = await httpPost({ action: 'preview', mode: 'sketch-orphans' })
    const del = await httpPost({ action: 'delete', mode: 'sketch-orphans', planToken: res.body.planToken, paths: got, confirm: 'מחק לצמיתות' })
    assert(del.status === 200 && del.body.deleted === 2, `deleted 2 (${del.body?.deleted})`)
    const left = __stub.snapshot()
    assert(left.includes('designs/sketch-1700000000001/art.png') && left.includes('designs/sketch-1700000000001/preview.jpg'), 'live sketch files untouched')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 14: isAdminSketch — checkout shares never count as sketches')
  // ════════════════════════════════════════════════════════════════════
  {
    assert(!isAdminSketch({ designs: [{ imageBase64: url('designs/tshirt-1/a.png') }] }), 'legacy checkout share (designer-session file) → not a sketch')
    assert(!isAdminSketch({ source: 'checkout', designs: [] }), "source:'checkout' → not a sketch")
    assert(!isAdminSketch({ designs: [{ imageBase64: url('designs/sketch-1/a.png') }, { imageBase64: url('designs/order-1/b.png') }] }), 'any non-sketch file → not a sketch')
    assert(isAdminSketch({ previewUrl: url('designs/sketch-1/preview.jpg'), designs: [{ imageBase64: url('designs/sketch-1/a.png') }] }), 'sketch-maker doc → sketch')
    assert(isAdminSketch({ phone: '050', designs: [{ imageBase64: 'data:image/png;base64,AAA' }] }), 'legacy base64 doc with a phone → sketch')
    assert(!isAdminSketch({ designs: [{ imageBase64: 'data:image/png;base64,AAA' }] }), 'bare base64 (CartItem share) → not a sketch')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 15: cron Layer 1 uses the same policy (runClosedOrderCleanup)')
  // ════════════════════════════════════════════════════════════════════
  __stub.reset()
  seedClosedOrderWorld()
  armCron()
  {
    const r = await runClosedOrderCleanup(db(), bucket(), NOW)
    const left = __stub.snapshot()
    assert(r.result.deleted === CLOSED_EXPECTED.length, `cron deleted ${r.result.deleted} (expected ${CLOSED_EXPECTED.length})`)
    assert(CLOSED_EXPECTED.every((p) => !left.includes(p)), 'cron removed exactly the closed-order originals…')
    assert(left.includes('designs/tshirt-111/open.png') && left.includes('designs/openOld/0_front_full-up.png'), '…and left an old PAID order (incl. its upscale folder) alone')
    assert(__stub.collections.orders.openOld.designsDeleted === undefined, 'old paid order not stamped')
    const r2 = await runClosedOrderCleanup(db(), bucket(), NOW)
    // the cron's lower nightly cap is honoured (whole orders, oldest first)
    __stub.reset()
    seedClosedOrderWorld()
    armCron()
    const r3 = await runClosedOrderCleanup(db(), bucket(), NOW, 4)
    assert(r3.result.deleted === 3 && r3.remaining.files === 4, `cap 4: three 1-file orders now, the 4-file order (${r3.remaining.files} files) waits whole for the next night`)
    assert(r2.result.deleted === 0 && r2.result.stamped === 0, 'second night: nothing to do (no stuck re-scan of marked orders)')
  }

  // ════════════════════════════════════════════════════════════════════
  // Fix round (review): pure-planner helpers for the cases below
  // ════════════════════════════════════════════════════════════════════
  const rts = (ms: number) => Timestamp.fromMillis(ms) // the REAL firebase-admin class
  const oldR = (d: number) => rts(NOW - d * DAY)
  const dimg = (u: string) => ({ area: 'front_full', areaName: 'קידמי', imageUrl: u })
  const sobj = (path: string, ageDays: number | null = 100): StorageObject => ({
    path,
    sizeBytes: 100,
    createdMs: ageDays === null ? null : NOW - ageDays * DAY,
  })
  const ord = (id: string, data: Record<string, unknown>): ScannedDoc => ({ collection: 'orders', id, data })
  const paths = (p: { candidates: { path: string }[] }) => p.candidates.map((c) => c.path).sort()

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 16: eligibility — status, per-status window, timestamps (real Timestamp class)')
  // ════════════════════════════════════════════════════════════════════
  {
    const mk = (id: string, status: unknown, extra: Record<string, unknown>) =>
      ord(id, { status, ...extra, items: [{ designs: [dimg(url(`designs/e-${id}/f.png`))] }] })
    const docs = [
      // cart_abandoned: 90 days, strict
      mk('ab31', 'cart_abandoned', { createdAt: oldR(31) }),
      mk('ab90', 'cart_abandoned', { createdAt: rts(NOW - 90 * DAY) }),
      mk('ab91', 'cart_abandoned', { createdAt: oldR(91) }),
      mk('abNudged', 'cart_abandoned', { createdAt: oldR(200), updatedAt: oldR(60) }),
      // the others: 30 days, strict
      mk('c30', 'completed', { createdAt: rts(NOW - 30 * DAY) }),
      mk('c31', 'completed', { createdAt: oldR(31) }),
      mk('date45', 'shipped', { createdAt: new Date(NOW - 45 * DAY) }),
      // status missing / unknown / wrong case
      mk('noStatus', undefined, { createdAt: oldR(100) }),
      mk('nullStatus', null, { createdAt: oldR(100) }),
      mk('wrongCase', 'Completed', { createdAt: oldR(100) }),
      mk('proto', 'constructor', { createdAt: oldR(100) }),
      // unreadable / odd timestamps → keep
      mk('iso', 'completed', { createdAt: new Date(NOW - 45 * DAY).toISOString() }),
      mk('millis', 'completed', { createdAt: NOW - 45 * DAY }),
      mk('seconds', 'completed', { createdAt: Math.floor((NOW - 45 * DAY) / 1000) }),
      mk('missing', 'completed', {}),
      mk('future', 'completed', { createdAt: rts(NOW + 5 * DAY) }),
      mk('nullUpd', 'shipped', { createdAt: oldR(60), updatedAt: null }),
      mk('isoUpd', 'shipped', { createdAt: oldR(60), updatedAt: new Date(NOW - 50 * DAY).toISOString() }),
      mk('compStr', 'shipped', { createdAt: oldR(60), completedAt: 'yesterday' }),
      // age = the LATEST of createdAt / updatedAt / completedAt
      mk('recentUpd', 'shipped', { createdAt: oldR(60), updatedAt: oldR(3) }),
      mk('compRecent', 'shipped', { createdAt: oldR(60), completedAt: oldR(2) }),
      mk('compOldUpdRecent', 'completed', { createdAt: oldR(90), completedAt: oldR(60), updatedAt: oldR(4) }),
      mk('allOld', 'completed', { createdAt: oldR(90), completedAt: oldR(60), updatedAt: oldR(40) }),
    ]
    const got = paths(planClosedOrders(docs, docs.map((d) => sobj(`designs/e-${d.id}/f.png`)), NOW, 2000))
    const want = ['ab91', 'c31', 'date45', 'allOld'].map((k) => `designs/e-${k}/f.png`).sort()
    assert(JSON.stringify(got) === JSON.stringify(want), 'exactly ab91, c31, date45, allOld are eligible', got)
    assert(!got.includes('designs/e-ab31/f.png'), 'cart_abandoned 31d → kept')
    assert(!got.includes('designs/e-ab90/f.png'), 'cart_abandoned exactly 90d → kept (strict boundary)')
    assert(got.includes('designs/e-ab91/f.png'), 'cart_abandoned 91d → deleted')
    assert(!got.includes('designs/e-abNudged/f.png'), 'abandoned 200d ago but touched 60d ago → kept')
    assert(!got.includes('designs/e-compOldUpdRecent/f.png'), 'completedAt 60d but updatedAt 4d → kept (latest of the three wins)')
    assert(contentAgeMs({ createdAt: oldR(90), completedAt: oldR(60), updatedAt: oldR(40) }, NOW) === 40 * DAY, 'contentAgeMs = max(createdAt, updatedAt, completedAt)')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 17: the object\'s OWN age — fresh / undated files under an eligible order stay')
  // ════════════════════════════════════════════════════════════════════
  {
    const docs = [
      ord('oldDone', { status: 'completed', paymentId: 'order-900', createdAt: oldR(100), items: [{ designs: [dimg(url('designs/tshirt-900/a.png')), dimg(url('designs/tshirt-900/fresh-named.png'))] }] }),
      // an order whose only files are fresh → must not even be stamped
      ord('onlyFresh', { status: 'cancelled', paymentId: 'order-901', createdAt: oldR(100), items: [] }),
      // two eligible owners with different windows share one file
      ord('abOld', { status: 'cart_abandoned', createdAt: oldR(120), items: [{ designs: [dimg(url('designs/tshirt-902/both.png'))] }] }),
      ord('doneToo', { status: 'completed', createdAt: oldR(120), items: [{ designs: [dimg(url('designs/tshirt-902/both.png')), dimg(url('designs/tshirt-902/both-old.png'))] }] }),
      ord('abOld2', { status: 'cart_abandoned', createdAt: oldR(120), items: [{ designs: [dimg(url('designs/tshirt-902/both-old.png'))] }] }),
    ]
    const objects = [
      sobj('designs/tshirt-900/a.png', 100),
      sobj('designs/tshirt-900/fresh-named.png', 5), // named by the order, uploaded 5 days ago
      sobj('designs/order-900/pre.png', 100),
      sobj('designs/order-900/fresh.png', 1), // open cart re-using the folder
      sobj('designs/order-900/exact30.png', 30),
      sobj('designs/order-900/no-date.png', null),
      sobj('designs/oldDone/up.png', 31),
      sobj('designs/order-901/new1.png', 2),
      sobj('designs/order-901/new2.png', null),
      sobj('designs/tshirt-902/both.png', 60), // > 30 but not > 90
      sobj('designs/tshirt-902/both-old.png', 95),
    ]
    const p = planClosedOrders(docs, objects, NOW, 2000)
    const got = paths(p)
    assert(
      JSON.stringify(got) ===
        JSON.stringify(['designs/oldDone/up.png', 'designs/order-900/pre.png', 'designs/tshirt-900/a.png', 'designs/tshirt-902/both-old.png']),
      'only files past their window go',
      got
    )
    assert(!got.includes('designs/order-900/fresh.png') && !got.includes('designs/tshirt-900/fresh-named.png'), 'a fresh file under an eligible order (folder or named) is kept')
    assert(!got.includes('designs/order-900/exact30.png'), 'a file exactly 30 days old is kept (strict)')
    assert(!got.includes('designs/order-900/no-date.png'), 'a file with no creation time is kept')
    assert(!got.includes('designs/tshirt-902/both.png'), 'shared by a 30-day and a 90-day owner, 60 days old → kept (strictest window)')
    assert(p.skipped['too-young'] === 5 && p.skipped['unknown-age'] === 2, 'counted as too-young / unknown-age', p.skipped)
    assert(!p.stamps.some((t) => t.id === 'onlyFresh'), 'an order whose files are all fresh is not stamped')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 18: admin sketch that points at an ORDER file (made before sketch-copy)')
  // ════════════════════════════════════════════════════════════════════
  {
    const f = 'designs/order-555/print.png'
    const closed = ord('closed', { status: 'completed', paymentId: 'order-555', createdAt: oldR(60), items: [{ designs: [dimg(url(f))] }] })
    const preCopy = {
      createdAt: oldR(40),
      label: 'דני - חולצות',
      phone: '0501234567',
      previewUrl: url('designs/sketch-1/preview.jpg'),
      designs: [{ area: 'front_full', areaName: 'קידמי', imageBase64: url(f) }],
    }
    assert(isAdminSketch(preCopy), 'label + phone + preview → an admin sketch, even though its artwork is an order file (listed in /admin/sketches)')
    for (const [name, extra] of [
      ['label only', { label: 'x' }],
      ['phone only', { phone: '050' }],
      ['previewUrl only', { previewUrl: url('designs/sketch-1/preview.jpg') }],
      ['previewMissing only', { previewMissing: true }],
    ] as [string, Record<string, unknown>][]) {
      assert(isAdminSketch({ designs: preCopy.designs, ...extra }), `${name} + order file → admin sketch`)
    }
    assert(!isAdminSketch({ source: 'checkout', ...preCopy }), "source:'checkout' wins over everything")
    assert(!isAdminSketch({ designs: preCopy.designs }), 'no sketch-maker field + order file → a cart share')
    assert(!isAdminSketch({ productType: 'tshirt' }) && !isAdminSketch(null), 'no designs at all / null → not a sketch')

    const p = planClosedOrders([closed, { collection: 'shared_designs', id: 'sk', data: preCopy }], [sobj(f), sobj('designs/sketch-1/preview.jpg')], NOW, 2000)
    assert(p.candidates.length === 0, 'the old admin sketch PROTECTS the order file it shows', paths(p))
    assert(p.stamps.length === 0, '…and neither the sketch nor the order is stamped', p.stamps)

    // the same document WITHOUT the sketch-maker fields is an expired cart share: no protection, stamped
    const share = { createdAt: oldR(40), designs: preCopy.designs }
    const p2 = planClosedOrders([closed, { collection: 'shared_designs', id: 'sh', data: share }], [sobj(f)], NOW, 2000)
    assert(paths(p2).join() === f && p2.stamps.some((t) => t.collection === 'shared_designs' && t.id === 'sh'), 'an expired cart share does not protect, and is stamped')

    // Layer 1b (sketch sweep) must never name the order file
    const sweepPre = planSketchSweep(preCopy, NOW)
    assert(sweepPre.action === 'keep' && sweepPre.reason === 'no-storage-files', 'sketch sweep: a sketch with only order files → kept, nothing to delete', sweepPre)
    const mixed = planSketchSweep({ ...preCopy, designs: [...preCopy.designs, { area: 'back', areaName: 'גב', imageBase64: url('designs/sketch-1/back.png') }] }, NOW)
    assert(
      mixed.action === 'sweep' && JSON.stringify(mixed.deletePaths) === JSON.stringify(['designs/sketch-1/back.png']),
      'sketch sweep: a mixed sketch loses only its own designs/sketch-* file',
      mixed
    )
    const cartShare = planSketchSweep({ createdAt: oldR(40), previewUrl: undefined, designs: preCopy.designs }, NOW)
    assert(cartShare.action === 'keep' && cartShare.reason === 'not-admin-sketch', 'sketch sweep: a cart share is not a sketch → kept', cartShare)
    const tagged = planSketchSweep({ source: 'checkout', createdAt: oldR(40), previewUrl: url('designs/sketch-1/preview.jpg'), designs: [{ imageBase64: url('designs/sketch-1/a.png') }] }, NOW)
    assert(tagged.action === 'keep' && tagged.reason === 'not-admin-sketch', "sketch sweep: source:'checkout' is never swept, whatever it names", tagged)

    // …and end to end through the real sweeper against the fake bucket
    __stub.reset()
    __stub.addDocs('shared_designs', {
      pre: preCopy,
      mixed: { ...preCopy, designs: [...preCopy.designs, { area: 'back', areaName: 'גב', imageBase64: url('designs/sketch-1/back.png') }] },
      cart: { createdAt: oldR(40), designs: [{ area: 'front_full', areaName: 'קידמי', imageBase64: url('designs/tshirt-556/paid.png') }] },
    })
    for (const path of [f, 'designs/sketch-1/preview.jpg', 'designs/sketch-1/back.png', 'designs/tshirt-556/paid.png']) __stub.addFile(path, 1000, 40, NOW)
    const sweep = await sweepOldSketches(db(), bucket(), true, NOW)
    const left = __stub.snapshot()
    assert(left.includes(f) && left.includes('designs/tshirt-556/paid.png'), 'sweepOldSketches: order print files survive', left)
    assert(JSON.stringify(left) === JSON.stringify([f, 'designs/sketch-1/preview.jpg', 'designs/tshirt-556/paid.png'].sort()), 'sweepOldSketches: only designs/sketch-1/back.png was deleted', left)
    assert(sweep.kept['not-admin-sketch'] === 1 && sweep.kept['no-storage-files'] === 1 && sweep.swept === 1, 'sweep summary: 1 cart share kept, 1 order-file sketch kept, 1 swept', sweep)
    assert(__stub.collections.shared_designs.pre.designsDeleted === undefined && __stub.collections.shared_designs.cart.designsDeleted === undefined, 'neither kept document is stamped')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 19: reading references — exact / whole value / prose (prose NEVER aborts)')
  // ════════════════════════════════════════════════════════════════════
  {
    const F = (n: string) => `designs/tshirt-enc/${n}`
    const dl = (path: string) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}`
    const cutAfter = (text: string, marker: string, extra = 0) => text.slice(0, text.indexOf(marker) + marker.length + extra)
    // EXACT forms — each must protect its file, and only that file
    const readable: Record<string, [string, string]> = {
      std: [F('std.png'), url(F('std.png'))],
      hebrew: [F('עיצוב סופי.png'), url(F('עיצוב סופי.png'))],
      spaces: [F('my logo final.png'), url(F('my logo final.png'))],
      noToken: [F('notoken.png'), dl(F('notoken.png'))],
      lowerHex: [F('lower.png'), `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/designs%2ftshirt-enc%2flower.png?alt=media&token=x`],
      bare: [F('bare.png'), F('bare.png')],
      bareHebrew: [F('לוגו חדש.png'), F('לוגו חדש.png')],
      padded: [F('padded.png'), `  \n${url(F('padded.png'))}\t `],
      paddedBare: [F('padded-bare.png'), ` ${F('padded-bare.png')} `],
    }
    const all = Object.values(readable).map(([path]) => path)
    const OTHER = 'designs/other-enc/x.png'
    const SECOND = 'designs/second-enc/y.png'
    const owned = [...all, OTHER, SECOND].sort()
    const closedAll = ord('closed', { status: 'completed', createdAt: oldR(60), items: [{ designs: owned.map((x) => dimg(url(x))) }] })
    const objects = owned.map((x) => sobj(x))
    const withField = (value: string): ScannedDoc => ({ collection: 'leads', id: 'lead7', data: { createdAt: oldR(2), message: value } })
    const same = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b)

    assert(same(paths(planClosedOrders([closedAll], objects, NOW, 2000)), owned), '[control] with nothing else in the shop, every file of the closed order is a candidate')

    for (const [name, [path, ref]] of Object.entries(readable)) {
      const p = planClosedOrders([closedAll, ord('paid', { status: 'paid', createdAt: oldR(2), items: [{ designs: [dimg(ref)] }] })], objects, NOW, 2000)
      assert(p.suspicious.length === 0 && same(paths(p), owned.filter((x) => x !== path)), `exact "${name}": protects that file and only that file`, paths(p))
    }

    // LOOSE forms — the whole session folder is protected (never a guessed file)
    const f = F('std.png')
    const T = 'designs/tshirt-enc/'
    const S2 = 'designs/second-enc/'
    const hebrewUrl = url(F('עיצוב.png'))
    const folderCases: [string, string, string[]][] = [
      // a whole value in another storage form
      ['whole: gs:// URI', `gs://${BUCKET}/${f}`, [T]],
      ['whole: storage.googleapis.com/<bucket>/<path>', `https://storage.googleapis.com/${BUCKET}/${f}`, [T]],
      ['whole: storage.googleapis.com JSON API', `https://storage.googleapis.com/download/storage/v1/b/${BUCKET}/o/${encodeURIComponent(f)}?alt=media`, [T]],
      ['whole: relative design-proxy link', `/api/design-proxy?url=${encodeURIComponent(url(f))}`, [T]],
      ['whole: absolute design-proxy link', `https://badfos.co.il/api/design-proxy?url=${encodeURIComponent(url(f))}`, [T]],
      ['whole: two URLs glued with a comma', `${url(f)},${url(SECOND)}`, [T, S2]],
      ['whole: bare path with 4 segments', 'designs/tshirt-enc/sub/std.png', [T]],
      ['whole: download URL with 4 segments', url('designs/tshirt-enc/sub/std.png'), [T]],
      ['whole: bare folder', 'designs/tshirt-enc', [T]],
      // prose
      ['prose: URL inside a sentence', `הנה הקובץ: ${url(f)} תודה`, [T]],
      ['prose: two URLs in one field', `${url(f)} ${url(SECOND)}`, [T, S2]],
      ['prose: http (not https)', url(f).replace('https://', 'http://'), [T]],
      ['prose: host without a scheme', url(f).replace('https://', ''), [T]],
      ['prose: unencoded space in the path', `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/designs%2Ftshirt-enc%2Fmy logo.png?alt=media`, [T]],
      ['prose: python-requests error quoting the URL', `404 Client Error: Not Found for url: ${url(f)}`, [T]],
      ['prose: httpx error, URL in quotes', `Client error '403 Forbidden' for url '${url(f)}'`, [T]],
      ['prose: Replicate 422 body, URL cut inside the file name', `Replicate prediction creation failed: 422 {"detail":"- input.image: ${cutAfter(url(F('a-very-long-file-name.png')), 'a-very-lo')}`, [T]],
      ['prose: URL cut inside a %XX of a Hebrew file name', `failed for url: ${cutAfter(hebrewUrl, '%D7%A2', 2)}`, [T]],
      ['prose: gs:// in a sentence', `הקובץ ב gs://${BUCKET}/${f} בבקשה`, [T]],
      ['prose: a redirect link wrapping our URL', `ראו https://www.google.com/url?q=${encodeURIComponent(url(f))}`, [T]],
      ['prose: own-site link with a designs/ path', `ראו https://badfos.co.il/api/x?path=${f}`, [T]],
      ['prose: a readable URL next to an unreadable one', `${url(f)} וגם https://firebasestorage.googleapis.com/v0/b/`, [T]],
      ['prose: bare path with 4 segments and a space', 'designs/tshirt-enc/sub dir/std.png', [T]],
      ['prose: one piece with a readable folder AND an unreadable fragment', `ראו ${dl(f)}?next=designs%2Ftrunc`, [T]],
    ]
    for (const [name, value, folders] of folderCases) {
      const p = planClosedOrders([closedAll, withField(value)], objects, NOW, 2000)
      const want = owned.filter((x) => !folders.some((folder) => x.startsWith(folder)))
      assert(p.suspicious.length === 0 && same(paths(p), want), `${name} → protects the whole folder, no abort`, { s: p.suspicious, c: paths(p) })
    }

    // A WHOLE value that points into designs/ and cannot be read → the run stops, naming the document
    const abortCases: [string, string][] = [
      ['download URL cut before the object path', 'https://firebasestorage.googleapis.com/v0/b/'],
      ['download URL cut right after /o/', `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/`],
      ['download URL cut inside "designs"', `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/des`],
      ['download URL cut inside the session', cutAfter(url(f), 'designs%2Ftshirt-e')],
      ['download URL with a broken %XX', `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/designs%2Fbad%E0%A4%A.png`],
      ['gs:// with the session not closed', `gs://${BUCKET}/designs/tshirt-e`],
      ['gs:// with traversal', `gs://${BUCKET}/designs/../backups/x.json`],
      ['bare "designs/"', 'designs/'],
      ['bare path with traversal', 'designs/../backups/x.json'],
      ['design-proxy link whose inner URL is cut', `/api/design-proxy?url=${encodeURIComponent(cutAfter(url(f), 'designs%2Ftshirt-e'))}`],
      ['glued URLs, the second one cut', `${url(f)},https://firebasestorage.googleapis.com/v0/b/`],
    ]
    for (const [name, value] of abortCases) {
      const p = planClosedOrders([closedAll, withField(value)], objects, NOW, 2000)
      assert(
        p.suspicious.length >= 1 && p.suspicious[0].collection === 'leads' && p.suspicious[0].docId === 'lead7' && p.candidates.length === 0 && p.stamps.length === 0,
        `whole value: ${name} → suspicious, and the plan is EMPTY`,
        { s: p.suspicious, c: paths(p) }
      )
      const so = planSketchOrphans([withField(value)], [sobj('designs/sketch-9/o.png', 10)], NOW, 2000)
      assert(so.suspicious.length >= 1 && so.candidates.length === 0, `whole value: ${name} → sketch-orphans plan is empty too`)
      // the very same text inside a sentence is prose: ignored or folder-protected, never an abort
      const prose = planClosedOrders([closedAll, withField(`הלקוח כתב: ${value} — תודה`)], objects, NOW, 2000)
      assert(prose.suspicious.length === 0, `prose: ${name} inside a sentence → no abort`, prose.suspicious)
    }

    // Not about our designs at all → ignored: nothing protected, nothing aborted
    const ignored: [string, string][] = [
      ['Pinterest link with "designs/" in its path, in a note', 'משהו בסגנון https://www.pinterest.com/ideas/t-shirt-designs/901234567/'],
      ['a third-party URL as the whole value', 'https://www.pinterest.com/user/t-shirt-designs/'],
      ['a third-party URL with a /designs/ folder', 'https://example.com/designs/a/b.png'],
      ['a third-party URL with an encoded designs%2F', 'https://www.canva.com/x?next=designs%2Ffoo%2Fbar'],
      ['a third-party URL whose query spells one of OUR folders', 'https://www.canva.com/x?next=designs%2Ftshirt-enc%2Fstd.png'],
      ['a third-party URL with our folder in its path', 'https://example.com/designs/tshirt-enc/std.png'],
      ['gs:// of some other bucket, in a sentence', 'הקבצים ב gs://my-bucket/logo.png'],
      ['"gs://foo" as the whole value', 'gs://foo'],
      ['the bucket name alone', BUCKET],
      ['site-images download URL inside HTML', `<img src="${url('site-images/gallery/a.png')}">`],
      ['site-images download URL as the whole value', url('site-images/gallery/a.png')],
      ['a /share/<id> link in a lead', 'היי, זה העיצוב שלי https://badfos.co.il/share/Ab12Cd34 אפשר 20 יחידות?'],
      ['a blob: URL', 'blob:https://badfos.co.il/1c9f8a2e-77aa-4c1d-9d2b-0f1e2d3c4b5a'],
      ['a data: URL with "designs/" inside the base64', 'data:image/png;base64,' + 'designs/AbC+/9k='.repeat(2000)],
      ['a cut-off download URL inside a sentence', 'ראו https://firebasestorage.googleapis.com/v0/b/'],
      ['a designs%2F fragment with no session, in a sentence', 'קוד: designs%2Ftshirt'],
      ['YouTube URL', 'https://youtube.com/embed/x'],
      ['Instagram link in a review', 'תראו https://www.instagram.com/p/Cxyz123/'],
      ['our designer URL', 'https://badfos.co.il/designer/tshirt?color=black'],
      ['Grow payment URL', 'https://sandbox.meshulam.co.il/purchase?b=5f3a'],
      ['free text', 'הלקוח ביקש designs חדשים / צבע אחר'],
      ['free text with "designs/"', 't-shirt designs/logos ideas'],
      ['relative static path', '/images/designs/abc/a.png'],
      ['our own error constants', 'source_file_deleted'],
    ]
    for (const [name, value] of ignored) {
      const p = planClosedOrders([closedAll, withField(value)], objects, NOW, 2000)
      assert(p.suspicious.length === 0 && same(paths(p), owned), `${name} → ignored`, { s: p.suspicious, c: paths(p).length })
    }

    // A loosely-read reference protects; it never makes a file the document's OWN
    {
      const noteOnly = ord('closedNote', { status: 'completed', createdAt: oldR(60), customer: { notes: `ראו ${url('designs/loose-1/a.png')} וגם gs://${BUCKET}/designs/loose-2/b.png` }, items: [] })
      const p = planClosedOrders([noteOnly], [sobj('designs/loose-1/a.png'), sobj('designs/loose-2/b.png')], NOW, 2000)
      assert(p.candidates.length === 0 && p.stamps.length === 0, 'a URL in a closed order\'s NOTE does not make that file deletable')
    }

    // nesting: Firestore allows 20 levels — all of it is read; deeper is an abort, not a silent stop
    const nest = (depth: number, leaf: unknown): unknown => (depth === 0 ? leaf : { n: [nest(depth - 1, leaf)] })
    {
      const deepOk = { collection: 'settings', id: 'deep', data: nest(10, { u: url(f) }) } // 21 levels
      const p = planClosedOrders([closedAll, deepOk], objects, NOW, 2000)
      assert(p.suspicious.length === 0 && !paths(p).includes(f), 'a reference 21 levels deep is read and protects')
      const tooDeep = { collection: 'settings', id: 'abyss', data: nest(40, { u: url(f) }) }
      const p2 = planClosedOrders([closedAll, tooDeep], objects, NOW, 2000)
      assert(p2.suspicious.length === 1 && p2.suspicious[0].docId === 'abyss' && p2.candidates.length === 0, 'nesting past the walk limit → suspicious (abort), not a silent stop', p2.suspicious)
      // SDK value objects are not walked into (a real Timestamp / a DocumentReference-like object)
      class FakeRef { path = 'orders/abc'; _firestore: unknown; constructor() { this._firestore = { self: this } } }
      const p3 = planClosedOrders([{ collection: 'orders', id: 'refs', data: { status: 'paid', createdAt: oldR(1), ref: new FakeRef() } }], [], NOW, 2000)
      assert(p3.suspicious.length === 0, 'a cyclic SDK object in a document does not abort the run')
    }

    // through the real IO path: the abort names the document AND links to it; nothing deleted, nothing stamped
    const seed = () => {
      __stub.reset()
      armCron()
      __stub.addDocs('orders', { closed: { status: 'completed', createdAt: ts(NOW - 60 * DAY), items: [{ designs: [dimg(url('designs/rf/a.png'))] }] } })
      __stub.addFile('designs/rf/a.png', 1, 60, NOW)
      __stub.addFile('designs/sketch-rf/o.png', 1, 10, NOW)
    }
    for (const [col, id, value] of [
      ['leads', 'lead7', 'https://firebasestorage.googleapis.com/v0/b/'],
      ['voiceOrders', 'vo1', `gs://${BUCKET}/designs/tshirt-e`],
      ['unmatched_payments', 'pay9', cutAfter(url('designs/rf/a.png'), 'designs%2Fr')],
    ] as [string, string, string][]) {
      const link = `https://console.firebase.google.com/project/badfos-28b67/firestore/data/~2F${col}~2F${id}`
      for (const mode of ['old-orders', 'sketch-orphans', 'orphans', 'test-junk'] as const) {
        seed()
        __stub.addDocs(col, { [id]: { note: value } })
        let e: unknown = null
        try { await buildPlan(db(), bucket(), mode, NOW) } catch (x) { e = x }
        assert(
          e instanceof CleanupAbort && e.message.includes(`${col}/${id}`) && e.message.includes(link) && __stub.files.length === 2,
          `${mode}: unreadable whole-value reference in ${col} → abort naming ${col}/${id} with its console link`,
          e instanceof Error ? e.message : e
        )
      }
      seed()
      __stub.addDocs(col, { [id]: { note: value } })
      let e: unknown = null
      try { await runClosedOrderCleanup(db(), bucket(), NOW, 500) } catch (x) { e = x }
      assert(e instanceof CleanupAbort && __stub.files.length === 2 && !__stub.events.some((x) => x.startsWith('updateDoc')), `cron: unreadable reference in ${col} → abort, 0 deleted, 0 stamped`)
      const described = e instanceof CleanupAbort ? describeCleanupAbort(e) : null
      assert(
        described !== null && same(described.documents.map((d) => d.path), [`${col}/${id}`]) && described.documents[0].url === link && !described.message.includes(value),
        `the abort description lists ${col}/${id} with its link — and never echoes the offending text`,
        described
      )
    }
    seed()
    __stub.addDocs('leads', { lead7: { note: 'https://firebasestorage.googleapis.com/v0/b/' } })
    const http = await httpPost({ action: 'preview', mode: 'old-orders' })
    assert(
      http.status === 409 && String(http.body.message).includes('leads/lead7') &&
        String(http.body.message).includes('https://console.firebase.google.com/project/badfos-28b67/firestore/data/~2Fleads~2Flead7'),
      'HTTP: the 409 message itself names the document and carries the console link',
      http.body
    )
    assert(firestoreConsoleUrl('coupons', 'SAVE10-ABCD').endsWith('/~2Fcoupons~2FSAVE10-ABCD') && firestoreConsoleUrl('orders', 'a b/c').endsWith('/~2Forders~2Fa~20b~2Fc'), 'console link encodes odd document ids')

    // realistic existing documents, one at a time, through the real scan (ported from QA round 2)
    const designUrl = url('designs/rf/a.png')
    const shapes: [string, string, Record<string, unknown>][] = [
      ['order imageUrl = legacy data: base64', 'orders', { status: 'paid', items: [{ designs: [dimg('data:image/png;base64,' + 'designs/AbC+/9k='.repeat(2000))] }] }],
      ['order imageUrl = blob: URL', 'orders', { status: 'paid', items: [{ designs: [dimg('blob:https://badfos.co.il/1c9f8a2e-77aa-4c1d-9d2b-0f1e2d3c4b5a')] }] }],
      ['upscales.error — our own constants', 'orders', { status: 'paid', upscales: { a: { status: 'gave_up', error: 'source_file_deleted' }, b: { status: 'failed', error: 'base64 source upload failed' }, c: { status: 'failed', error: 'prediction canceled' } } }],
      ['upscales.error — Replicate 422 body, no URL', 'orders', { status: 'paid', upscales: { a: { status: 'failed', error: 'Replicate prediction creation failed: 422 {"detail":"- input.image: Does not match format \'uri\'","status":422}' } } }],
      ['settings/homepage with site-images download URLs', 'settings', { heroImages: [url('site-images/gallery/hero-1.png')], nested: { a: [{ image: url('site-images/home/b.webp') }] } }],
      ['siteImages with a relative path + a bare storage path', 'siteImages', { imageUrl: '/images/hero.png', path: 'site-images/gallery/hero-1.png' }],
      ['a document holding the bucket name', 'settings', { storageBucket: BUCKET }],
      ['order paymentUrl (Grow) + landing URL', 'orders', { status: 'pending_payment', paymentUrl: 'https://sandbox.meshulam.co.il/purchase?b=5f3a', landing: 'https://badfos.co.il/designer/tshirt?gclid=abc' }],
      ['lead.message with a /share/cart/<id> link', 'leads', { message: 'https://badfos.co.il/share/cart/Zz99' }],
      ['customer.notes with a Pinterest link', 'orders', { status: 'paid', customer: { notes: 'משהו בסגנון https://www.pinterest.com/ideas/t-shirt-designs/901234567/' } }],
      ['lead.message mentioning gs://', 'leads', { message: 'הקבצים ב gs://my-bucket/logo.png' }],
    ]
    for (const [name, col, data] of shapes) {
      seed()
      __stub.addDocs(col, { shape: { createdAt: ts(NOW - 2 * DAY), ...data } })
      let e: unknown = null
      let got: string[] = []
      try { got = candidatePaths(await plan('old-orders')) } catch (x) { e = x }
      assert(e === null && same(got, ['designs/rf/a.png']), `scan runs, cleanup unaffected — ${name}`, e instanceof Error ? e.message : got)
    }
    // …and the ones that DO name the closed order's file keep it
    for (const [name, col, data] of [
      ['upscales.error echoing the input URL (python-requests)', 'orders', { status: 'paid', upscales: { a: { status: 'failed', error: `404 Client Error: Not Found for url: ${designUrl}`.slice(0, 300) } } }],
      ['lead.message = exactly one design download URL', 'leads', { message: designUrl }],
      ['lead.message: download URL inside a sentence', 'leads', { message: `זו התמונה ${designUrl} תודה` }],
      ['a stored relative design-proxy link', 'shared_designs', { source: 'checkout', designs: [{ imageBase64: `/api/design-proxy?url=${encodeURIComponent(designUrl)}` }] }],
      ['a stored absolute design-proxy link', 'orders', { status: 'paid', items: [{ designs: [dimg(`https://badfos.co.il/api/design-proxy?url=${encodeURIComponent(designUrl)}`)] }] }],
    ] as [string, string, Record<string, unknown>][]) {
      seed()
      __stub.addDocs(col, { shape: { createdAt: ts(NOW - 2 * DAY), ...data } })
      let e: unknown = null
      let got: string[] = ['?']
      try { got = candidatePaths(await plan('old-orders')) } catch (x) { e = x }
      assert(e === null && got.length === 0, `scan runs, the named file is protected — ${name}`, e instanceof Error ? e.message : got)
    }
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 20: every scanned collection protects (leads / manualSales / unmatched_payments / voiceOrders …)')
  // ════════════════════════════════════════════════════════════════════
  {
    for (const col of ['leads', 'manualSales', 'unmatched_payments', 'voiceOrders', 'quotes', 'packageOrders', 'usage']) {
      __stub.reset()
      __stub.addDocs('orders', { closed: { status: 'completed', createdAt: ts(NOW - 60 * DAY), items: [{ designs: [dimg(url('designs/pr/a.png')), dimg(url('designs/pr/b.png'))] }] } })
      __stub.addDocs(col, { ref1: { anything: { nested: [url('designs/pr/a.png')] } } })
      __stub.addFile('designs/pr/a.png', 1, 60, NOW)
      __stub.addFile('designs/pr/b.png', 1, 60, NOW)
      const got = candidatePaths(await plan('old-orders'))
      assert(JSON.stringify(got) === JSON.stringify(['designs/pr/b.png']), `a file named by a ${col} document is kept (its neighbour goes)`, got)
    }
    // a read failure of the new collections is fatal too
    for (const col of ['unmatched_payments', 'voiceOrders']) {
      __stub.reset()
      __stub.failReads.add(col)
      let e: unknown = null
      try { await plan('old-orders') } catch (x) { e = x }
      assert(e instanceof CleanupAbort, `a failed read of ${col} aborts the run`)
    }
    // paymentId twins: a young/open twin keeps the shared pre-upload folder
    const twins = [
      ord('oldClosed', { status: 'completed', paymentId: 'order-999', createdAt: oldR(90), items: [] }),
      ord('young', { status: 'paid', paymentId: 'order-999', createdAt: oldR(1), items: [] }),
    ]
    assert(planClosedOrders(twins, [sobj('designs/order-999/a.png')], NOW, 2000).candidates.length === 0, 'designs/<paymentId>/ shared with an open twin order is kept')
    const odd = [ord('odd', { status: 'completed', paymentId: '../backups', createdAt: oldR(90), items: [] }), ord('dot', { status: 'completed', paymentId: 'a.b', createdAt: oldR(90), items: [] })]
    assert(planClosedOrders(odd, [sobj('designs/a.b/x.png'), sobj('backups/x.json')], NOW, 2000).candidates.length === 0, 'a paymentId with / or . never becomes a folder')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 21: an order bigger than one run is skipped as "oversized" — the queue moves on')
  // ════════════════════════════════════════════════════════════════════
  {
    const many = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `designs/${prefix}/${String(i).padStart(3, '0')}.png`)
    const o = (id: string, files: string[], age: number) => ord(id, { status: 'completed', createdAt: oldR(age), items: [{ designs: files.map((x) => dimg(url(x))) }] })
    const big = many('big', 5)
    const small = many('small', 2)
    const shared = 'designs/shared-with-big/s.png'
    const docs = [o('big', [...big, shared], 200), o('small', [...small, shared], 100), o('tiny', many('tiny', 1), 50)]
    const objects = [...big, ...small, ...many('tiny', 1), shared].map((x) => sobj(x))
    const p = planClosedOrders(docs, objects, NOW, 3)
    assert(p.oversized.length === 1 && p.oversized[0].key === 'orders/big' && p.oversized[0].files === 6, 'the 6-file order (cap 3) is reported oversized', p.oversized)
    assert(JSON.stringify(paths(p)) === JSON.stringify([...small, 'designs/tiny/000.png'].sort()), 'the orders behind it ARE processed', paths(p))
    assert(!paths(p).includes(shared) && p.skipped.oversized === 6, 'a file co-owned with the oversized order stays (nobody is stamped for a half-cleaned owner)', p.skipped)
    assert(!p.stamps.some((t) => t.id === 'big'), 'the oversized order is not stamped')
    assert(p.candidates.length <= 3, 'the plan never exceeds the cap')

    // end to end: nothing aborts, the oversized order is untouched, the next one is cleaned
    __stub.reset()
    armCron()
    __stub.addDocs('orders', {
      big: { status: 'completed', createdAt: ts(NOW - 200 * DAY), items: [{ designs: big.map((x) => dimg(url(x))) }] },
      small: { status: 'completed', createdAt: ts(NOW - 100 * DAY), items: [{ designs: small.map((x) => dimg(url(x))) }] },
    })
    for (const x of [...big, ...small]) __stub.addFile(x, 1, 100, NOW)
    const r = await runClosedOrderCleanup(db(), bucket(), NOW, 3)
    assert(r.oversized.length === 1 && r.oversized[0].key === 'orders/big' && r.result.deleted === 2, 'cron result: 1 oversized order reported, the next order cleaned', r)
    assert(big.every((x) => __stub.snapshot().includes(x)) && __stub.collections.orders.big.designsDeleted === undefined, 'the oversized order keeps every file and is not stamped')
    const r2 = await runClosedOrderCleanup(db(), bucket(), NOW, 3)
    assert(r2.result.deleted === 0 && r2.oversized.length === 1, 'next night: still reported, still not blocking, nothing thrown')
    // the admin cap (2000) takes it
    const pb = await buildPlan(db(), bucket(), 'old-orders', NOW)
    assert(pb.plan.candidates.length === 5 && pb.fileLevel!.oversized.length === 0, 'with the admin cap the same order is an ordinary candidate')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 22: Layer 2 (storage pressure) — the same policy, never an open order')
  // ════════════════════════════════════════════════════════════════════
  {
    const MBs = 1024 * 1024
    const seedL2 = () => {
      __stub.reset()
      armCron()
      __stub.addDocs('orders', {
        // OPEN, ancient, with an upscale folder — exactly what the old Layer 2 prefix-deleted
        paidOld: { status: 'paid', paymentId: 'order-701', createdAt: ts(NOW - 300 * DAY), items: [{ designs: [dimg(url('designs/tshirt-701/print.png'))] }], upscales: { '0_front_full': { status: 'done', url: url('designs/paidOld/up.png') } } },
        prodOld: { status: 'in_production', createdAt: ts(NOW - 300 * DAY), items: [{ designs: [dimg(url('designs/tshirt-702/print.png'))] }] },
        newOld: { status: 'new', createdAt: ts(NOW - 300 * DAY), items: [{ designs: [dimg(url('designs/tshirt-703/print.png'))] }] },
        pendOld: { status: 'pending_payment', createdAt: ts(NOW - 300 * DAY), items: [{ designs: [dimg(url('designs/tshirt-704/print.png'))] }] },
        abandoned60: { status: 'cart_abandoned', createdAt: ts(NOW - 60 * DAY), items: [{ designs: [dimg(url('designs/tshirt-705/cart.png'))] }] },
        doneOld: { status: 'completed', createdAt: ts(NOW - 300 * DAY), items: [{ designs: [dimg(url('designs/tshirt-706/done.png'))] }] },
      })
      for (const x of ['designs/tshirt-701/print.png', 'designs/order-701/pre.png', 'designs/paidOld/up.png', 'designs/tshirt-702/print.png', 'designs/tshirt-703/print.png', 'designs/tshirt-704/print.png', 'designs/tshirt-705/cart.png', 'designs/tshirt-706/done.png']) {
        __stub.addFile(x, 100 * MBs, 300, NOW)
      }
    }
    seedL2()
    const calm = await runStoragePressureRelief(db(), bucket(), 800 * MBs, 4200 * MBs, 500, NOW)
    assert(calm.ran === false && __stub.files.length === 8 && !__stub.events.some((e) => e.startsWith('read:')), 'below the threshold: nothing runs, nothing is read')

    seedL2()
    const hot = await runStoragePressureRelief(db(), bucket(), 800 * MBs, 500 * MBs, 500, NOW)
    const left = __stub.snapshot()
    assert(hot.ran && hot.pass!.result.deleted === 1 && !left.includes('designs/tshirt-706/done.png'), 'above the threshold: the closed old order is cleaned')
    for (const x of ['designs/tshirt-701/print.png', 'designs/order-701/pre.png', 'designs/paidOld/up.png', 'designs/tshirt-702/print.png', 'designs/tshirt-703/print.png', 'designs/tshirt-704/print.png', 'designs/tshirt-705/cart.png']) {
      assert(left.includes(x), `over the threshold, ${x} (open order / young abandoned cart) is still there`)
    }
    const C = __stub.collections.orders
    assert(['paidOld', 'prodOld', 'newOld', 'pendOld', 'abandoned60'].every((k) => C[k].designsDeleted === undefined), 'no open order is stamped designsDeleted')
    assert(C.doneOld.designsDeleted === true && C.doneOld.designsDeletedReason === 'closed_order', "the cleaned order is stamped 'closed_order' (originals gone — not the legacy recoverable 'storage_limit')")
    assert(hot.usageBytes === 700 * MBs && hot.exhausted === true, 'still above the threshold with nothing left to delete safely → exhausted (the cron alerts the owner instead)', hot)
    const again = await runStoragePressureRelief(db(), bucket(), hot.usageBytes, 500 * MBs, 500, NOW)
    assert(again.pass!.result.deleted === 0 && again.exhausted === true && __stub.snapshot().length === 7, 'a second pressured night deletes nothing more')

    seedL2()
    const enough = await runStoragePressureRelief(db(), bucket(), 800 * MBs, 750 * MBs, 500, NOW)
    assert(enough.exhausted === false && enough.usageBytes === 700 * MBs, 'back under the threshold → not exhausted, no alert')
  }

  // ════════════════════════════════════════════════════════════════════
  // From here on the production code may reach for the network (Replicate,
  // download URLs). Nothing in this file is allowed to: every fetch goes
  // through `fetchImpl`, which refuses unless a test installs a fake.
  // ════════════════════════════════════════════════════════════════════
  const fetchCalls: string[] = []
  const noNetwork = async (u: string): Promise<Response> => {
    throw new Error(`test: unexpected network call to ${u}`)
  }
  let fetchImpl: (u: string) => Promise<Response> = noNetwork
  globalThis.fetch = (async (input: any) => {
    const u = String(input?.url ?? input)
    fetchCalls.push(u)
    return fetchImpl(u)
  }) as typeof fetch
  const sameList = (a: unknown[], b: unknown[]) => JSON.stringify(a) === JSON.stringify(b)
  const scanDoc = (data: unknown) => docStorageRefs({ collection: 'orders', id: 'o', data })

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 23: external error text is redacted before it is stored (both writers)')
  // ════════════════════════════════════════════════════════════════════
  {
    const srcPath = 'designs/tshirt-1787509272397/שלום עולם.png'
    const src = url(srcPath)
    const cutInSession = src.slice(0, src.indexOf('designs%2F') + 'designs%2Ftshirt-17'.length)
    const nasty: [string, string][] = [
      ['python-requests style', `404 Client Error: Not Found for url: ${src}`],
      ['httpx style, URL in quotes', `Client error '403 Forbidden' for url '${src}'`],
      ['Replicate 422 body quoting the image', `Replicate prediction creation failed: 422 {"detail":"- input.image: ${src}","status":422}`],
      ['URL cut inside the session', `failed ${cutInSession}`],
      ['URL cut inside the bucket name', `failed ${src.slice(0, 60)}`],
      ['the bucket name', `bucket ${BUCKET} unreachable`],
      ['a gs:// URI', `gs://${BUCKET}/${srcPath} gone`],
      ['an encoded path fragment', 'designs%2Ftshirt-1%2Fa.png missing'],
      ['a bare path', 'designs/tshirt-1/a.png missing'],
      ['a URL straddling the 300-character cut', 'x'.repeat(280) + ' ' + src],
      ['nothing but the URL', src],
      ['nothing but a cut-off URL', cutInSession],
    ]
    for (const [name, text] of nasty) {
      const stored = storableErrorText(text)
      const refs = scanDoc({ upscales: { a: { status: 'failed', error: stored } } })
      assert(
        stored.length <= 300 && !stored.includes('://') && !/firebasestorage|googleapis|designs/i.test(stored) &&
          refs.files.length === 0 && refs.folders.length === 0 && refs.suspicious.length === 0,
        `${name} → stored text carries no URL and reads as no reference`,
        stored
      )
    }
    assert(scanDoc({ error: cutInSession }).suspicious.length === 1, 'the case it exists for: stored RAW, an error that is nothing but a cut-off URL stops every run')
    const pixel = 'Prediction failed: total number of pixels 4000000 greater than the max size that fits in GPU memory on this hardware, 2096704. Resize input image and try again.'
    assert(storableErrorText(pixel) === pixel && PIXEL_LIMIT_ERROR.test(storableErrorText(`${pixel} (${src})`)), 'an ordinary message is stored unchanged, and the pixel-limit detection still matches')

    // writer 1 — lib/upscale-order.ts, with Replicate answering 422 and quoting the URL back
    __stub.reset()
    __stub.addDocs('orders', { paid1: { status: 'paid', createdAt: ts(Date.now() - DAY), items: [{ designs: [{ area: 'front_full', areaName: 'קידמי', imageUrl: src }] }] } })
    __stub.addFile(srcPath, 1000, 1)
    process.env.REPLICATE_API_TOKEN = 'test-token'
    fetchImpl = async (u) =>
      u.includes('api.replicate.com')
        ? new Response(JSON.stringify({ detail: `- input.image: could not fetch ${src}`, status: 422 }), { status: 422 })
        : new Response('', { status: 404 })
    await runUpscaleForOrder('paid1')
    const e1 = (__stub.collections.orders.paid1.upscales as any)?.['0_front_full']
    assert(
      e1?.status === 'failed' && typeof e1.error === 'string' && e1.error.includes('[url]') && !e1.error.includes('://') && !/firebasestorage/.test(e1.error),
      'upscale-order: the stored Replicate error has the URL redacted',
      e1
    )
    // writer 2 — /api/upscale-callback, with a failed prediction whose error quotes the URL
    ;(__stub.collections.orders.paid1.upscales as any)['0_front_full'] = { status: 'pending', predictionId: 'pred-1', sourceUrl: src }
    const { POST: upscaleCallback } = await import('@/app/api/upscale-callback/route')
    const cb = await upscaleCallback(
      new Request('https://badfos.co.il/api/upscale-callback?orderId=paid1&key=0_front_full', {
        method: 'POST',
        body: JSON.stringify({ id: 'pred-1', status: 'failed', error: `404 Client Error: Not Found for url: ${src}` }),
      }) as any
    )
    const e2 = (__stub.collections.orders.paid1.upscales as any)['0_front_full']
    assert(
      cb.status === 200 && e2.status === 'failed' && e2.error === '404 Client Error: Not Found for url: [url]',
      'upscale-callback: the stored prediction error has the URL redacted',
      e2
    )
    assert(scanDoc(__stub.collections.orders.paid1).suspicious.length === 0, 'the order both writers touched scans clean')
    fetchImpl = noNetwork
    delete process.env.REPLICATE_API_TOKEN
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 24: the audit log is never scanned — it cannot protect, and cannot abort')
  // ════════════════════════════════════════════════════════════════════
  {
    const thrown = (fn: () => void): unknown => { try { fn(); return null } catch (e) { return e } }
    assert(NEVER_SCANNED_COLLECTIONS.includes('storage_cleanup_log') && !(REFERENCE_COLLECTIONS as readonly string[]).includes('storage_cleanup_log'), 'storage_cleanup_log is on the never-scan list and not on the scan list')
    assert(!(BACKUP_COLLECTIONS as readonly string[]).includes('storage_cleanup_log'), '(today it is not in the backup list either)')
    assert(thrown(() => assertReferenceCoverage()) === null, 'the lists as they are pass the coverage check')
    assert(thrown(() => assertReferenceCoverage([...BACKUP_COLLECTIONS, 'storage_cleanup_log'])) === null, 'adding the audit log to the BACKUP list does not force it into the scan')
    assert(thrown(() => assertReferenceCoverage(BACKUP_COLLECTIONS, [...REFERENCE_COLLECTIONS, 'storage_cleanup_log'])) instanceof CleanupAbort, 'putting the audit log on the SCAN list is refused outright')
    assert(thrown(() => assertReferenceCoverage([...BACKUP_COLLECTIONS, 'brandNewCollection'])) instanceof CleanupAbort, 'any other backup collection that is not scanned still stops the run')

    __stub.reset()
    __stub.addDocs('orders', { closed: { status: 'completed', createdAt: ts(NOW - 60 * DAY), items: [{ designs: [{ area: 'a', areaName: 'a', imageUrl: url('designs/rf/a.png') }] }] } })
    __stub.addDocs('storage_cleanup_log', {
      run1: { by: 'x', action: 'delete-files', mode: 'orphans', filesDeleted: 2, errors: 0, sample: ['designs/rf/a.png', 'designs/logged-only/old.png', 'designs/', 'https://firebasestorage.googleapis.com/v0/b/'] },
    })
    __stub.addFile('designs/rf/a.png', 1, 60, NOW)
    __stub.addFile('designs/logged-only/new-sibling.png', 1, 100, NOW)
    assert(sameList(candidatePaths(await plan('old-orders')), ['designs/rf/a.png']), 'a path listed in the audit log is not protected by it (and its odd entries abort nothing)')
    assert(candidatePaths(await plan('orphans')).includes('designs/logged-only/new-sibling.png'), 'a folder named only in the audit log is not protected')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 25: first-run gate — the cron only PLANS until the owner\'s first manual run')
  // ════════════════════════════════════════════════════════════════════
  {
    const T25 = Date.now()
    const seedGate = () => { __stub.reset(); seedClosedOrderWorld(T25) }
    seedGate()
    const before = __stub.snapshot()
    assert((await cronDeletionArmed(db())) === false, 'no manual run in the log → not armed')
    const dry = await runClosedOrderCleanup(db(), bucket(), T25)
    assert(
      dry.dryRun === true && dry.planned.files === CLOSED_EXPECTED.length && dry.planned.stamps === 5 && dry.eligibleOrders > 0,
      `gate closed: the cron reports what it WOULD do (${dry.planned.files} files, ${dry.planned.stamps} stamps)`,
      dry
    )
    assert(
      dry.result.deleted === 0 && dry.result.stamped === 0 && sameList(__stub.snapshot(), before) &&
        !__stub.events.some((e) => e.startsWith('deleteFile:') || e.startsWith('updateDoc:')),
      'gate closed: zero deletions, zero stamps, bucket untouched'
    )
    const gatedRelief = await runStoragePressureRelief(db(), bucket(), 9e12, 1, 500, T25)
    assert(
      gatedRelief.ran && gatedRelief.gated && gatedRelief.alert === 'gated' && gatedRelief.exhausted === false && sameList(__stub.snapshot(), before),
      'gate closed: storage pressure does not open it — nothing deleted, never "exhausted", alert = gated',
      gatedRelief
    )
    const logView = await httpPost({ action: 'log' })
    assert(logView.status === 200 && logView.body.cronArmed === false, 'the panel is told the cron is not armed (it shows the one-line note)')

    for (const [name, entry] of [
      ['a deleted test document', { action: 'delete-docs', collection: 'shared_designs', docsDeleted: 2, errors: 0 }],
      ['an orphans run', { action: 'delete-files', mode: 'orphans', filesDeleted: 40, errors: 0 }],
      ['a sketch-orphans run', { action: 'delete-files', mode: 'sketch-orphans', filesDeleted: 9, errors: 0 }],
      ['an old-orders run that deleted nothing', { action: 'delete-files', mode: 'old-orders', filesDeleted: 0, errors: 3 }],
    ] as [string, Record<string, unknown>][]) {
      seedGate()
      __stub.addDocs('storage_cleanup_log', { e1: { by: 'badfos2002@gmail.com', sample: [], ...entry } })
      const r = await runClosedOrderCleanup(db(), bucket(), T25)
      assert(r.dryRun === true && r.result.deleted === 0 && sameList(__stub.snapshot(), before), `${name} in the log does NOT arm the cron`)
    }
    seedGate()
    armCron()
    __stub.failReads.add('storage_cleanup_log')
    const unreadable = await runClosedOrderCleanup(db(), bucket(), T25)
    assert(unreadable.dryRun === true && sameList(__stub.snapshot(), before), 'an audit log that cannot be read counts as "not yet"')
    __stub.failReads.clear()

    // the owner's first manual run, through the REAL admin route, is what opens the gate
    seedGate()
    const pv = await httpPost({ action: 'preview', mode: 'old-orders' })
    const del = await httpPost({ action: 'delete', mode: 'old-orders', planToken: pv.body.planToken, paths: pv.body.candidates.map((c: { path: string }) => c.path), confirm: 'מחק לצמיתות' })
    assert(del.status === 200 && del.body.deleted === CLOSED_EXPECTED.length && del.body.logged === true, 'manual old-orders run from the panel: deleted and logged')
    assert((await httpPost({ action: 'log' })).body.cronArmed === true && (await cronDeletionArmed(db())) === true, 'now the cron is armed (and the panel note goes away)')
    __stub.addDocs('orders', { later: { status: 'completed', createdAt: ts(T25 - 50 * DAY), items: [{ designs: [{ area: 'a', areaName: 'a', imageUrl: url('designs/tshirt-999/later.png') }] }] } })
    __stub.addFile('designs/tshirt-999/later.png', 1000, 60, T25)
    const armed = await runClosedOrderCleanup(db(), bucket(), T25)
    assert(
      armed.dryRun === false && armed.result.deleted === 1 && !__stub.snapshot().includes('designs/tshirt-999/later.png') && __stub.collections.orders.later.designsDeleted === true,
      'gate open: the next night the cron deletes and stamps for real',
      armed
    )
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 26: the REAL nightly cron route — gate, abort alert, pressure alerts (fake Resend, no network)')
  // ════════════════════════════════════════════════════════════════════
  {
    process.env.CRON_SECRET = 'test-cron-secret'
    process.env.RESEND_API_KEY = 'fake'
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = 'owner@example.invalid'
    assert((Resend as any).__fake === true, '[guard] `resend` is the local fake — no email leaves this machine')
    const { GET: cronRoute } = await import('@/app/api/cleanup-old-designs/route')
    const { NextRequest } = await import('next/server')
    const cron = async () => {
      const res = await cronRoute(new NextRequest('https://badfos.co.il/api/cleanup-old-designs', { headers: { authorization: 'Bearer test-cron-secret' } }))
      return { status: res.status, body: await res.json() }
    }
    const MBs = 1024 * 1024
    const BIG_OPEN = 'designs/tshirt-1770000000111/print.png'
    const OPEN_FILES = [
      BIG_OPEN, 'designs/order-1770000000111/pre.png', 'designs/openPaid200/0_front_full-upscaled.png',
      'designs/tshirt-1790000000001/new.png', 'designs/tshirt-1780000000778/ab40.png',
      'designs/sketch-1789000000001/art.png', 'designs/sketch-1789000000001/preview.jpg', 'designs/order-1788000000999/paid-unmatched.png',
      'site-images/gallery/hero-1.png', 'mockups/tshirt/black-front.png',
    ]
    const CLOSED_FILES = [
      'designs/closedOld/0_front_full-upscaled.png', 'designs/order-1780000000222/pre.png', 'designs/tshirt-1780000000222/a.png',
      'designs/tshirt-1780000000333/c.png', 'designs/tshirt-1780000000777/ab.png',
    ]
    /** A small realistic shop (after QA's round-2 seed). Clock = the real one: the route uses Date.now(). */
    const seedShop = (opts: { armed?: boolean; overThreshold?: boolean } = {}) => {
      const now = Date.now()
      __stub.reset()
      __sent.length = 0
      fetchCalls.length = 0
      const old = (d: number) => Timestamp.fromMillis(now - d * DAY)
      const im = (path: string) => ({ area: 'front_full', areaName: 'קידמי', imageUrl: url(path) })
      __stub.addDocs('orders', {
        closedOld: {
          status: 'completed', orderNumber: 1500, paymentId: 'order-1780000000222', createdAt: old(60), updatedAt: old(45),
          customer: { firstName: 'דנה', notes: 'בלי שקית בבקשה' },
          items: [{ designs: [im('designs/tshirt-1780000000222/a.png')] }],
          upscales: { '0_front_full': { status: 'done', sourceUrl: url('designs/tshirt-1780000000222/a.png'), url: url('designs/closedOld/0_front_full-upscaled.png') } },
        },
        cancelledOld: { status: 'cancelled', orderNumber: 1501, createdAt: old(100), items: [{ designs: [im('designs/tshirt-1780000000333/c.png')] }] },
        abandoned95: { status: 'cart_abandoned', createdAt: old(95), items: [{ designs: [im('designs/tshirt-1780000000777/ab.png')] }] },
        abandoned40: { status: 'cart_abandoned', createdAt: old(40), items: [{ designs: [im('designs/tshirt-1780000000778/ab40.png')] }] },
        openPaid200: {
          status: 'paid', orderNumber: 1400, paymentId: 'order-1770000000111', createdAt: old(200), updatedAt: old(200),
          items: [{ designs: [im(BIG_OPEN)] }],
          upscales: { '0_front_full': { status: 'done', url: url('designs/openPaid200/0_front_full-upscaled.png') } },
        },
        youngNew: { status: 'new', createdAt: old(2), items: [{ designs: [im('designs/tshirt-1790000000001/new.png')] }] },
      })
      __stub.addDocs('shared_designs', {
        liveSketch: { createdAt: old(10), label: 'רון', phone: '0501234567', previewUrl: url('designs/sketch-1789000000001/preview.jpg'), designs: [{ area: 'back', areaName: 'גב', imageBase64: url('designs/sketch-1789000000001/art.png') }] },
      })
      __stub.addDocs('leads', { lead1: { name: 'יוסי', message: 'ראיתי אצלכם https://badfos.co.il/share/abc123 ומשהו כמו https://www.pinterest.com/ideas/t-shirt-designs/9/', createdAt: old(3) } })
      __stub.addDocs('quotes', { youngQuote: { quoteNumber: 12, createdAt: old(3), items: [] }, oldQuote: { quoteNumber: 3, createdAt: old(45), items: [] } })
      __stub.addDocs('settings', { homepage: { heroImages: [url('site-images/gallery/hero-1.png')] } })
      __stub.addDocs('unmatched_payments', { tok_9f3a: { createdAt: new Date(now - 20 * DAY), paymentSum: 420, paymentId: 'order-1788000000999', transactionToken: 'tok_9f3a' } })
      const add = (path: string, days: number, size = 400_000) => __stub.addFile(path, size, days, now)
      add('designs/tshirt-1780000000222/a.png', 61); add('designs/order-1780000000222/pre.png', 61); add('designs/closedOld/0_front_full-upscaled.png', 59)
      add('designs/tshirt-1780000000333/c.png', 101); add('designs/tshirt-1780000000777/ab.png', 96); add('designs/tshirt-1780000000778/ab40.png', 41)
      add(BIG_OPEN, 201, opts.overThreshold ? 5000 * MBs : 400_000); add('designs/order-1770000000111/pre.png', 201); add('designs/openPaid200/0_front_full-upscaled.png', 199)
      add('designs/tshirt-1790000000001/new.png', 2)
      add('designs/sketch-1789000000001/art.png', 10); add('designs/sketch-1789000000001/preview.jpg', 10)
      add('designs/order-1788000000999/paid-unmatched.png', 20)
      add('site-images/gallery/hero-1.png', 300); add('mockups/tshirt/black-front.png', 300)
      if (opts.armed) armCron()
    }
    const designFiles = () => __stub.snapshot().filter((x) => x.startsWith('designs/'))
    const today = new Date().toISOString().slice(0, 10)

    // (i) gate closed, storage calm: plans, reports, deletes nothing, says nothing
    seedShop()
    let before = designFiles()
    let n = await cron()
    assert(n.status === 200 && n.body.success === true && n.body.aborted === false, 'gate closed: 200, not aborted', n.body)
    assert(
      n.body.orderDesigns?.dryRun === true && n.body.orderDesigns.planned.files === CLOSED_FILES.length && n.body.cleaned === 0 && sameList(designFiles(), before),
      `gate closed: Layer 1 is a dry run — would delete ${n.body.orderDesigns?.planned?.files}, deleted nothing`,
      n.body.orderDesigns
    )
    assert(Object.values(__stub.collections.orders).every((o) => o.designsDeleted === undefined) && __sent.length === 0, 'gate closed: no order stamped, no email')
    assert(n.body.storagePressure === null && typeof n.body.cutoffs?.closedOrders === 'string' && typeof n.body.cutoffs?.abandonedCarts === 'string' && n.body.cutoff === undefined, 'the response names both cut-offs (30 days / 90 days for abandoned carts)', n.body.cutoffs)
    assert(__stub.collections.quotes.oldQuote === undefined && __stub.files.some((x) => x.name.startsWith('backups/')), '(the rest of the cron — backup, expired quotes — ran as usual)')

    // (ii) gate closed AND over the threshold: still deletes nothing — and tells the owner to do the first run
    seedShop({ overThreshold: true })
    before = designFiles()
    n = await cron()
    assert(n.body.storagePressure?.gated === true && n.body.storagePressure.alert === 'gated' && n.body.storagePressure.exhausted === false && sameList(designFiles(), before), 'gated + over threshold: Layer 2 only planned too', n.body.storagePressure)
    assert(__sent.length === 1 && __sent[0].html.includes('ריצה ידנית ראשונה') && __sent[0].subject.includes('מעל הסף'), 'gated + over threshold: one email asking for the first manual run', __sent.map((m) => m.subject))

    // (iii) armed: the cron cleans; a second night over its own writes changes nothing and aborts nothing
    seedShop({ armed: true })
    n = await cron()
    assert(n.body.aborted === false && n.body.orderDesigns?.dryRun === false && n.body.orderDesigns.result.deleted === CLOSED_FILES.length && n.body.cleaned === 3, `armed: Layer 1 deleted ${n.body.orderDesigns?.result?.deleted} files of 3 orders`, n.body.orderDesigns)
    let left = __stub.snapshot()
    assert(CLOSED_FILES.every((x) => !left.includes(x)) && OPEN_FILES.every((x) => left.includes(x)), 'armed: exactly the closed orders\' files are gone; open order, young cart, live sketch, unmatched payment and non-designs files survive')
    const C = __stub.collections
    assert(C.orders.closedOld.designsDeletedReason === 'closed_order' && C.orders.abandoned95.designsDeleted === true && C.orders.openPaid200.designsDeleted === undefined && C.orders.abandoned40.designsDeleted === undefined, 'armed: stamps on the cleaned orders only')
    before = __stub.snapshot()
    const n2 = await cron()
    assert(n2.body.aborted === false && !('error' in n2.body.orderDesigns) && n2.body.orderDesigns.result.deleted === 0 && n2.body.errors === 0 && sameList(__stub.snapshot(), before), 'night 2 over night 1\'s own writes (stamps, backup, usage): no abort, nothing to do', n2.body)
    for (const mode of ['orphans', 'test-junk', 'old-orders', 'sketch-orphans'] as const) {
      const pv = await httpPost({ action: 'preview', mode })
      assert(pv.status === 200, `after two nights the admin preview "${mode}" still scans (nothing the tool wrote poisoned it)`, pv.body?.message)
    }

    // (iv) a whole-value reference nobody can read: the cron must not be silent about it
    const POISON = 'https://firebasestorage.googleapis.com/v0/b/'
    const LINK = 'https://console.firebase.google.com/project/badfos-28b67/firestore/data/~2Forders~2Fpoisoned'
    seedShop({ armed: true, overThreshold: true })
    __stub.addDocs('orders', { poisoned: { status: 'paid', createdAt: Timestamp.fromMillis(Date.now() - 20 * DAY), field: POISON } })
    before = designFiles()
    n = await cron()
    assert(n.status === 200 && n.body.aborted === true && String(n.body.abortReason).includes('orders/poisoned') && n.body.abortDocuments?.[0]?.url === LINK, 'aborted night: the JSON says aborted:true, why, and links to the document', { aborted: n.body.aborted, reason: n.body.abortReason })
    assert('error' in (n.body.orderDesigns || {}) && sameList(designFiles(), before), 'aborted night: nothing deleted')
    assert(n.body.storagePressure?.ran === false && n.body.storagePressure.blockedBy === 'scan-aborted', 'aborted night: the pressure pass is not run a second time over the same document — it is reported as blocked', n.body.storagePressure)
    assert(
      __sent.length === 1 && __sent[0].subject.includes('נעצר') && __sent[0].subject.includes('מעל הסף') &&
        __sent[0].html.includes(LINK) && __sent[0].html.includes('orders/poisoned') && __sent[0].html.includes('4200') && !__sent[0].html.includes(POISON),
      'aborted night: ONE email — names the document, links to it, says what to do, carries the pressure warning, never echoes the offending text',
      __sent.map((m) => m.subject)
    )
    const abortStamp = __stub.collections.settings.scan_abort_alert as Record<string, unknown>
    assert(abortStamp?.lastSentDate === today && Object.values(abortStamp).every((v) => typeof v !== 'string' || v === today), 'the de-dup document holds a date and nothing else (it is in a scanned collection)', abortStamp)
    assert(n.body.sketches?.mode === 'apply', 'aborted night: the sketch sweep (Layer 1b) still ran')
    n = await cron()
    assert(n.body.aborted === true && __sent.length === 1, 'same day, second run: still aborted, the email is not repeated')
    // …and with storage calm: the abort email goes out without the pressure line
    seedShop({ armed: true })
    __stub.addDocs('orders', { poisoned: { status: 'paid', createdAt: Timestamp.fromMillis(Date.now() - 20 * DAY), field: POISON } })
    n = await cron()
    assert(n.body.aborted === true && n.body.storagePressure === null && __sent.length === 1 && !__sent[0].subject.includes('מעל הסף') && __sent[0].html.includes(LINK), 'aborted night, storage calm: abort email without the pressure warning')
    // the same text in PROSE is not an abort at all
    seedShop({ armed: true })
    __stub.addDocs('orders', { noted: { status: 'paid', createdAt: Timestamp.fromMillis(Date.now() - 20 * DAY), customer: { notes: `ראו ${POISON} תודה` }, upscales: { a: { status: 'failed', error: `404 Client Error: Not Found for url: ${url('designs/tshirt-1790000000001/new.png')}` } } } })
    n = await cron()
    assert(n.body.aborted === false && n.body.orderDesigns.result.deleted === CLOSED_FILES.length && __sent.length === 0, 'the same text inside a note / an error message: the night runs normally')

    // (v) armed, over the threshold, and only open orders are left → "exhausted", the owner decides
    seedShop({ armed: true, overThreshold: true })
    n = await cron()
    left = __stub.snapshot()
    assert(n.body.orderDesigns.result.deleted === CLOSED_FILES.length && n.body.storagePressure?.ran === true && n.body.storagePressure.pass.result.deleted === 0 && n.body.storagePressure.exhausted === true, 'pressure: Layer 1 cleaned, Layer 2 found nothing more it may delete → exhausted', n.body.storagePressure)
    assert(OPEN_FILES.every((x) => left.includes(x)) && __stub.collections.orders.openPaid200.designsDeleted === undefined, 'pressure: the 5GB file of the OPEN 200-day order is still there, unstamped')
    assert(__sent.length === 1 && __sent[0].subject.includes('נדרשת החלטה') && __sent[0].html.includes('הזמנות פתוחות'), 'pressure, exhausted: one email — open/recent orders only, a decision is needed', __sent.map((m) => m.subject))
    assert(typeof (__stub.collections.settings.storage_alert as any)?.usageMB === 'number' && (__stub.collections.settings.storage_alert as any).lastSentDate === today, 'settings/storage_alert written (date + number only)')

    // (vi) armed, over the threshold, and what is left is a closed order too big for the nightly batch
    seedShop({ armed: true, overThreshold: true })
    const bigFiles = Array.from({ length: 501 }, (_, i) => `designs/tshirt-big/${i}.png`)
    __stub.addDocs('orders', { big: { status: 'completed', orderNumber: 1322, createdAt: Timestamp.fromMillis(Date.now() - 100 * DAY), items: [{ designs: bigFiles.map((x) => ({ area: 'a', areaName: 'a', imageUrl: url(x) })) }] } })
    for (const x of bigFiles) __stub.addFile(x, 1000, 100)
    n = await cron()
    assert(n.body.orderDesigns.oversized.length === 1 && n.body.orderDesigns.result.deleted === CLOSED_FILES.length && bigFiles.every((x) => __stub.snapshot().includes(x)), 'oversized: the 501-file order is skipped (cap 500) and reported; the others are cleaned', n.body.orderDesigns.oversized)
    assert(n.body.storagePressure.exhausted === false && n.body.storagePressure.alert === 'oversized', 'oversized: NOT "exhausted" — something can still be cleaned', n.body.storagePressure)
    assert(__sent.length === 1 && __sent[0].html.includes('2,000') && __sent[0].subject.includes('נדרשת פעולה'), 'oversized: the email says the admin panel (cap 2,000) can still clean them', __sent.map((m) => m.subject))
    assert(fetchCalls.length === 0, `the cron made no network call in any of these nights (${fetchCalls.length})`, fetchCalls.slice(0, 3))
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 27: storage pressure — "exhausted" only when NOTHING is left, not when oversized orders remain')
  // ════════════════════════════════════════════════════════════════════
  {
    const MBs = 1024 * 1024
    const files = Array.from({ length: 501 }, (_, i) => `designs/tshirt-big/${i}.png`)
    __stub.reset()
    armCron()
    __stub.addDocs('orders', { big: { status: 'completed', orderNumber: 1322, createdAt: Timestamp.fromMillis(NOW - 100 * DAY), items: [{ designs: files.map((x) => ({ area: 'a', areaName: 'a', imageUrl: url(x) })) }] } })
    for (const x of files) __stub.addFile(x, 10 * MBs, 100, NOW)
    const r = await runStoragePressureRelief(db(), bucket(), 5010 * MBs, 4200 * MBs, 500, NOW)
    assert(r.ran && r.exhausted === false && r.alert === 'oversized' && r.pass!.oversized.length === 1 && r.pass!.result.deleted === 0 && __stub.files.length === 501, 'a 501-file closed order with the nightly cap of 500: not exhausted, alert = oversized, nothing deleted', { exhausted: r.exhausted, alert: r.alert })
    const admin = await buildPlan(db(), bucket(), 'old-orders', NOW)
    assert(admin.plan.candidates.length === 501 && admin.fileLevel!.oversized.length === 0, '…and the admin panel (cap 2000) can take that order whole')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 28: deleting an order in the admin deletes the DOCUMENT only')
  // ════════════════════════════════════════════════════════════════════
  {
    const pageSource = readFileSync(join(process.cwd(), 'app/admin/orders/page.tsx'), 'utf8')
    assert(!pageSource.includes('deleteFile') && !pageSource.includes("from '@/lib/storage'"), '[source guard] app/admin/orders/page.tsx no longer imports or calls deleteFile (regression insurance — the handler is client code)')
    assert(/await deleteDocument\('orders', orderId\)/.test(pageSource), '[source guard] handleDelete still deletes the order document')

    // the production incident: an abandoned duplicate and its PAID sibling point at the same file
    const shared = 'designs/tshirt-900/print.png'
    const only = 'designs/tshirt-901/only.png'
    const seedSiblings = (onlyAgeDays: number) => {
      __stub.reset()
      __stub.addDocs('orders', {
        duplicate: { status: 'cart_abandoned', createdAt: ts(NOW - 5 * DAY), items: [{ designs: [{ area: 'a', areaName: 'a', imageUrl: url(shared) }] }] },
        paidSibling: { status: 'paid', createdAt: ts(NOW - 5 * DAY), items: [{ designs: [{ area: 'a', areaName: 'a', imageUrl: url(shared) }] }] },
        lonely: { status: 'cancelled', createdAt: ts(NOW - 200 * DAY), items: [{ designs: [{ area: 'a', areaName: 'a', imageUrl: url(only) }] }] },
      })
      __stub.addFile(shared, 1000, 5, NOW)
      __stub.addFile(only, 1000, onlyAgeDays, NOW)
    }
    seedSiblings(100)
    await db().collection('orders').doc('duplicate').delete() // what handleDelete does now
    await db().collection('orders').doc('lonely').delete()
    assert(__stub.snapshot().includes(shared) && __stub.snapshot().includes(only) && !__stub.events.some((e) => e.startsWith('deleteFile:')), 'deleting the duplicate (and another order) removes no file')
    for (const mode of ['old-orders', 'orphans', 'sketch-orphans', 'test-junk'] as const) {
      assert(!candidatePaths(await plan(mode)).includes(shared), `${mode}: the paid sibling's print file stays protected`)
    }
    assert(sameList(candidatePaths(await plan('orphans')), [only]), 'a file whose ONLY order was deleted is left to the planner — collected as an orphan once it is 90+ days old')
    seedSiblings(60)
    await db().collection('orders').doc('lonely').delete()
    assert(candidatePaths(await plan('orphans')).length === 0, '…and not a day sooner (60 days: kept)')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 29: download-design — a stamped order still serves every file that exists')
  // ════════════════════════════════════════════════════════════════════
  {
    const { GET: downloadDesign } = await import('@/app/api/admin/download-design/route')
    const fromBucket = async (u: string) => {
      const m = /\/o\/([^?]+)/.exec(u)
      const path = m ? decodeURIComponent(m[1]) : ''
      return __stub.files.some((x) => x.name === path)
        ? new Response('PNGDATA', { status: 200, headers: { 'content-type': 'image/png' } })
        : new Response('not found', { status: 404 })
    }
    const get = (orderId: string, area: string) =>
      downloadDesign(new Request(`https://badfos.co.il/api/admin/download-design?orderId=${orderId}&itemIdx=0&area=${area}&variant=source`, { headers: { authorization: 'Bearer valid-token' } }) as any)
    __stub.reset()
    const two = [
      { area: 'front_full', areaName: 'קידמי', imageUrl: url('designs/tshirt-d1/kept.png') },
      { area: 'back', areaName: 'גב', imageUrl: url('designs/tshirt-d1/gone.png') },
    ]
    __stub.addDocs('orders', {
      // partially cleaned: one file was shared with another order and stayed
      stamped: { status: 'completed', orderNumber: 1600, designsDeleted: true, designsDeletedReason: 'closed_order', customer: { firstName: 'דנה', lastName: 'כהן' }, items: [{ designs: two }] },
      plain: { status: 'paid', orderNumber: 1601, customer: { firstName: 'רון', lastName: 'לוי' }, items: [{ designs: two }] },
    })
    __stub.addFile('designs/tshirt-d1/kept.png', 7, 60)
    fetchImpl = fromBucket
    const kept = await get('stamped', 'front_full')
    assert(kept.status === 200 && (await kept.text()) === 'PNGDATA', 'stamped order, file still in Storage → 200 with the file (the stamp never blocks a download)')
    const gone = await get('stamped', 'back')
    assert(gone.status === 410 && (await gone.json()).error === 'file_swept', 'stamped order, object really missing → 410 file_swept')
    const plainGone = await get('plain', 'back')
    assert(plainGone.status === 502, 'unstamped order, object missing → the generic failure, as before')
    fetchImpl = async () => new Response('upstream hiccup', { status: 503 })
    const hiccup = await get('stamped', 'front_full')
    assert(hiccup.status === 502 && (await hiccup.json()).error === 'fetch_failed', 'stamped order, Storage answers 503 → "download failed", NOT "your files were deleted"')
    fetchImpl = noNetwork
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 30: retry-upscale — never sends a dead source to Replicate; a closed_order stamp stays')
  // ════════════════════════════════════════════════════════════════════
  {
    const { POST: retryUpscale } = await import('@/app/api/admin/retry-upscale/route')
    const retry = (orderId: string) =>
      retryUpscale(new Request('https://badfos.co.il/api/admin/retry-upscale', { method: 'POST', headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' }, body: JSON.stringify({ orderId }) }) as any)
    const design = (path: string) => ({ area: 'front_full', areaName: 'קידמי', imageUrl: url(path) })
    __stub.reset()
    __stub.addDocs('orders', {
      cleaned: {
        status: 'completed', designsDeleted: true, designsDeletedReason: 'closed_order',
        items: [{ designs: [design('designs/tshirt-r1/a.png')] }],
        upscales: { '0_front_full': { status: 'failed', sourceUrl: url('designs/tshirt-r1/a.png'), error: 'x', attempts: 1 } },
      },
      sourceGone: { status: 'paid', items: [{ designs: [design('designs/tshirt-r2/gone.png')] }] },
      // every upscale 'done' and present — yet the originals are gone for good
      cleanedDone: {
        status: 'completed', designsDeleted: true, designsDeletedReason: 'closed_order',
        items: [{ designs: [design('designs/tshirt-r3/a.png')] }],
        upscales: { '0_front_full': { status: 'done', url: url('designs/cleanedDone/0_front_full-upscaled.png') } },
      },
      legacySwept: {
        status: 'completed', designsDeleted: true, designsDeletedReason: 'storage_limit',
        items: [{ designs: [design('designs/tshirt-r4/a.png')] }],
        upscales: { '0_front_full': { status: 'done', url: url('designs/legacySwept/0_front_full-upscaled.png') } },
      },
    })
    __stub.addFile('designs/cleanedDone/0_front_full-upscaled.png', 5, 10)
    __stub.addFile('designs/legacySwept/0_front_full-upscaled.png', 5, 10)
    fetchCalls.length = 0
    process.env.REPLICATE_API_TOKEN = 'test-token'

    const r1 = await retry('cleaned')
    assert(r1.status === 409 && (await r1.json()).error === 'designs_deleted', 'order cleaned by the storage cleanup (closed_order) → refused: 409 designs_deleted')
    assert(!__stub.events.some((e) => e === 'updateDoc:orders/cleaned') && (__stub.collections.orders.cleaned.upscales as any)['0_front_full'].attempts === 1, '…and the order is not touched (no attempt burned)')

    const r2 = await retry('sourceGone')
    const b2 = await r2.json()
    const e2 = (__stub.collections.orders.sourceGone.upscales as any)?.['0_front_full']
    assert(r2.status === 200 && b2.created === 0 && b2.sourceMissing === 1 && e2?.status === 'gave_up' && e2.error === 'source_file_deleted', 'paid order whose source object is missing → nothing created, sourceMissing reported, honest gave_up', { b2, e2 })
    assert(fetchCalls.length === 0, `no request left for Replicate (or anywhere) in either case (${fetchCalls.length})`, fetchCalls)

    assert((await clearSweptFlagsIfFullyUpscaled('cleanedDone')) === false && __stub.collections.orders.cleanedDone.designsDeleted === true && __stub.collections.orders.cleanedDone.designsDeletedReason === 'closed_order', 'a closed_order stamp is NOT cleared, even with every upscale done and present')
    assert((await clearSweptFlagsIfFullyUpscaled('legacySwept')) === true && __stub.collections.orders.legacySwept.designsDeleted === undefined, '(the legacy storage_limit stamp is still cleared once regenerated — unchanged)')
    delete process.env.REPLICATE_API_TOKEN
  }

  console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed\n`)
  process.exit(failed === 0 ? 0 : 1)
}

// ── HTTP helpers: drive the REAL route handler ───────────────────────────

async function rawPost(body: unknown, authorization: string | undefined) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authorization !== undefined) headers.Authorization = authorization
  const req = new Request('https://badfos.co.il/api/admin/storage-cleanup', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const res = await POST(req as any)
  return { status: res.status, body: await res.json().catch(() => null) }
}

async function httpPost(body: unknown) {
  return await rawPost(body, 'Bearer valid-token')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
