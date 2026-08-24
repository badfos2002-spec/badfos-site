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
 */
import { __stub } from './stubs/storage-cleanup-admin'
import { adminDb, adminStorage } from '@/lib/firebase-admin'
import { POST } from '@/app/api/admin/storage-cleanup/route'
import {
  buildPlan,
  runStorageCleanup,
  scanReferences,
  CleanupAbort,
} from '@/lib/storage-cleanup-run'
import {
  formatBytes,
  ORPHAN_MIN_AGE_MS,
  ORPHAN_MIN_AGE_DAYS,
  planStorageCleanup,
  collectReferences,
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

async function plan(mode: 'orphans' | 'test-junk', now = NOW) {
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
