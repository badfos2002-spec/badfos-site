/**
 * Tests for the emergency-sweep recovery in lib/upscale-order.ts +
 * app/api/upscale-callback (flag clearing).
 *
 * Run (in-memory doubles swapped in via tsconfig paths):
 *   npx tsx --tsconfig tsconfig.upscale-test.json scripts/test-upscale-recovery.ts
 *
 * The doubles replace firebase-admin, Replicate and image-dims ONLY — the
 * claim transaction, the prediction loop, the fallback resolver, the flag
 * clearing and the callback route are the real production code, unmodified.
 *
 * Covers:
 *   1. storage_limit-swept order + live session source → force retry
 *      regenerates, and the completion webhook clears designsDeleted (E2E).
 *   2. Source file deleted, no live fallback → gave_up('source_file_deleted'),
 *      NO prediction is created on a dead URL, flags stay.
 *   3. Fallback to a still-inline data: previous source (re-materialized).
 *   4. Fallback to a live https session previous source.
 *   5. The normal upscale flow is unchanged (done entries not re-claimed
 *      without the swept flag; fresh/base64 designs behave as before).
 *   6. Sync path (alreadyHighRes) clears the flags without any webhook.
 *   7. clearSweptFlagsIfFullyUpscaled refuses partial/unverified completion.
 *   8. 30-day sweeps (no storage_limit reason) are NOT re-claimed by force.
 */
import { __store } from './stubs/upscale-admin'
import { __replicate } from './stubs/upscale-replicate'
import { __dims } from './stubs/upscale-image-dims'
import { runUpscaleForOrder, clearSweptFlagsIfFullyUpscaled } from '@/lib/upscale-order'
import { POST as upscaleCallback } from '@/app/api/upscale-callback/route'

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

/** A real-shaped Firebase download URL for an object path in the fake bucket. */
function url(path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${__store.bucketName}/o/${encodeURIComponent(path)}?alt=media&token=t-1`
}

function resetAll() {
  __store.reset()
  __replicate.reset()
  __dims.pixels = null
}

const DATA_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAA='

/** A paid order swept by the emergency storage cleanup. */
function sweptOrder(opts: {
  imageUrl: string
  area?: string
  entry?: Record<string, unknown>
  reason?: string | null
}) {
  const area = opts.area ?? 'front_full'
  return {
    status: 'paid',
    orderNumber: 1491,
    designsDeleted: true,
    designsDeletedAt: new Date('2026-10-13T03:00:00Z'),
    ...(opts.reason === null ? {} : { designsDeletedReason: opts.reason ?? 'storage_limit' }),
    items: [{ designs: [{ area, areaName: 'קידמי', imageUrl: opts.imageUrl }] }],
    upscales: opts.entry === undefined ? {} : { [`0_${area}`]: opts.entry },
  }
}

async function callCallback(orderId: string, key: string, body: unknown) {
  const req = new Request(
    `https://badfos.co.il/api/upscale-callback?orderId=${orderId}&key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await upscaleCallback(req as any)
  return { status: res.status, body: await res.json().catch(() => null) }
}

async function main() {
  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 1: swept order, live session source — retry regenerates, webhook clears the flags (E2E)')
  // ════════════════════════════════════════════════════════════════════
  resetAll()
  const liveSrc = url('designs/order-1710000000000/front.png')
  __store.storageFiles.add('designs/order-1710000000000/front.png')
  __store.orders['ord1'] = sweptOrder({
    imageUrl: liveSrc,
    entry: {
      status: 'done',
      url: url('designs/ord1/0_front_full-upscaled.png'), // deleted by the sweep
      sourceUrl: liveSrc,
      attempts: 1,
      completedAt: new Date('2026-10-10T00:00:00Z'),
    },
  })
  {
    const r = await runUpscaleForOrder('ord1', { retryStuckPending: true, force: true })
    assert(r.created === 1, `force retry re-claims the swept 'done' entry (created=${r.created})`, r)
    assert(
      __replicate.calls.length === 1 && __replicate.calls[0] === liveSrc,
      'prediction created from the LIVE session source',
      __replicate.calls
    )
    const entry = __store.orders['ord1'].upscales['0_front_full']
    assert(entry.status === 'pending' && typeof entry.predictionId === 'string', 'entry back to pending with a predictionId')
    assert(__store.orders['ord1'].designsDeleted === true, 'flags NOT cleared while the prediction is still pending')

    // Completion webhook (pixel-limit safety net: completes without network)
    const res = await callCallback('ord1', '0_front_full', {
      id: entry.predictionId,
      status: 'failed',
      error: 'input image exceeds the maximum allowed pixels',
    })
    assert(res.status === 200 && res.body?.alreadyHighRes === true, `webhook completed the area (${res.status})`, res.body)
    const after = __store.orders['ord1']
    assert(after.upscales['0_front_full'].status === 'done', 'area is done after the webhook')
    assert(after.designsDeleted === undefined, 'designsDeleted cleared after ALL areas completed')
    assert(after.designsDeletedAt === undefined, 'designsDeletedAt cleared')
    assert(after.designsDeletedReason === undefined, 'designsDeletedReason cleared')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 2: source file deleted, no live fallback → gave_up, no dead-URL prediction, flags stay')
  // ════════════════════════════════════════════════════════════════════
  resetAll()
  const deadSrc = url('designs/ord2/0_back-src.png') // NOT in storageFiles
  __store.orders['ord2'] = sweptOrder({
    area: 'back',
    imageUrl: deadSrc,
    entry: { status: 'done', url: url('designs/ord2/0_back-upscaled.png'), sourceUrl: deadSrc, attempts: 1 },
  })
  {
    const r = await runUpscaleForOrder('ord2', { retryStuckPending: true, force: true })
    assert(__replicate.calls.length === 0, 'NO prediction created on a dead source URL', __replicate.calls)
    assert(r.created === 0 && r.gaveUp === 1, `reported gave_up (created=${r.created}, gaveUp=${r.gaveUp})`)
    const entry = __store.orders['ord2'].upscales['0_back']
    assert(entry.status === 'gave_up' && entry.error === 'source_file_deleted', 'entry marked gave_up: source_file_deleted', entry)
    assert(__store.orders['ord2'].designsDeleted === true, 'designsDeleted stays — the truth: files are gone')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 3: fallback to a still-inline data: previous source (re-materialized)')
  // ════════════════════════════════════════════════════════════════════
  resetAll()
  const deadSrc3 = url('designs/ord3/0_front_full-src.png')
  __store.orders['ord3'] = sweptOrder({
    imageUrl: deadSrc3,
    entry: { status: 'done', url: url('designs/ord3/0_front_full-upscaled.png'), sourceUrl: DATA_PNG, attempts: 1 },
  })
  {
    const r = await runUpscaleForOrder('ord3', { retryStuckPending: true, force: true })
    assert(r.created === 1, `prediction created from the re-materialized source (created=${r.created})`, r)
    assert(
      __store.saved.some((s) => s.path === 'designs/ord3/0_front_full-src.png'),
      'inline data: source re-uploaded to Storage',
      __store.saved.map((s) => s.path)
    )
    assert(
      __replicate.calls.length === 1 && __replicate.calls[0].includes(encodeURIComponent('designs/ord3/0_front_full-src.png')),
      'Replicate got the fresh https URL, not the dead one',
      __replicate.calls
    )
    const design = __store.orders['ord3'].items[0].designs[0]
    assert(design.imageUrl.startsWith('https://') && design.imageUrl.includes('0_front_full-src.png'), 'design imageUrl healed to the live https source')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 4: fallback to a live https session previous source')
  // ════════════════════════════════════════════════════════════════════
  resetAll()
  const sessionSrc = url('designs/tshirt-1700000000555/orig.png')
  __store.storageFiles.add('designs/tshirt-1700000000555/orig.png')
  const deadSrc4 = url('designs/ord4/0_front_full-src.png')
  __store.orders['ord4'] = sweptOrder({
    imageUrl: deadSrc4,
    entry: { status: 'done', url: url('designs/ord4/0_front_full-upscaled.png'), sourceUrl: sessionSrc, attempts: 1 },
  })
  {
    const r = await runUpscaleForOrder('ord4', { retryStuckPending: true, force: true })
    assert(r.created === 1 && __replicate.calls[0] === sessionSrc, 'prediction created from the surviving session upload', __replicate.calls)
    assert(__store.orders['ord4'].items[0].designs[0].imageUrl === sessionSrc, 'design imageUrl healed to the session URL')
    assert(__store.orders['ord4'].upscales['0_front_full'].sourceUrl === sessionSrc, 'entry sourceUrl healed too')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 5: the normal upscale flow is unchanged')
  // ════════════════════════════════════════════════════════════════════
  resetAll()
  // (a) a healthy order with a done entry — force never re-claims it
  const live5 = url('designs/order-1700000000005/a.png')
  __store.storageFiles.add('designs/order-1700000000005/a.png')
  __store.orders['ord5'] = {
    status: 'paid',
    items: [{ designs: [{ area: 'front_full', areaName: 'קידמי', imageUrl: live5 }] }],
    upscales: { '0_front_full': { status: 'done', url: live5, alreadyHighRes: true, attempts: 1 } },
  }
  {
    const r = await runUpscaleForOrder('ord5', { retryStuckPending: true, force: true })
    assert(r.created === 0 && r.total === 0, 'healthy done entry NOT re-claimed by force', r)
    assert(__replicate.calls.length === 0, 'no prediction for a healthy done design')
  }
  // (b) a fresh https design with no entry — claimed and predicted as before
  __store.orders['ord6'] = {
    status: 'paid',
    items: [{ designs: [{ area: 'back', areaName: 'גב', imageUrl: live5 }] }],
  }
  {
    const r = await runUpscaleForOrder('ord6', {})
    assert(r.created === 1 && __replicate.calls[__replicate.calls.length - 1] === live5, 'fresh design claimed + predicted as before', r)
  }
  // (c) a base64 design — materialized then predicted, as before
  __store.orders['ord7'] = {
    status: 'paid',
    items: [{ designs: [{ area: 'front_full', areaName: 'קידמי', imageUrl: DATA_PNG }] }],
  }
  {
    const r = await runUpscaleForOrder('ord7', {})
    assert(
      r.created === 1 && __store.saved.some((s) => s.path === 'designs/ord7/0_front_full-src.png'),
      'base64 design materialized + predicted as before',
      r
    )
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 6: all areas complete synchronously (alreadyHighRes) → flags cleared without a webhook')
  // ════════════════════════════════════════════════════════════════════
  resetAll()
  const live6 = url('designs/order-1700000000006/big.png')
  __store.storageFiles.add('designs/order-1700000000006/big.png')
  __store.orders['ord8'] = sweptOrder({
    imageUrl: live6,
    entry: { status: 'done', url: url('designs/ord8/0_front_full-upscaled.png'), sourceUrl: live6, attempts: 1 },
  })
  __dims.pixels = 5_000_000 // above the model limit — original IS the print file
  {
    const r = await runUpscaleForOrder('ord8', { retryStuckPending: true, force: true })
    assert(r.skipped === 1 && r.created === 0, 'design marked done synchronously (already high-res)', r)
    const after = __store.orders['ord8']
    assert(after.upscales['0_front_full'].status === 'done' && after.upscales['0_front_full'].url === live6, 'print file is the live original')
    assert(after.designsDeleted === undefined && after.designsDeletedReason === undefined, 'flags cleared at the end of the run')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 7: clearSweptFlagsIfFullyUpscaled refuses partial / unverified completion')
  // ════════════════════════════════════════════════════════════════════
  resetAll()
  const live7 = url('designs/order-1700000000007/x.png')
  __store.storageFiles.add('designs/order-1700000000007/x.png')
  __store.orders['ord9'] = {
    status: 'paid',
    designsDeleted: true,
    designsDeletedAt: new Date(),
    designsDeletedReason: 'storage_limit',
    items: [{
      designs: [
        { area: 'front_full', areaName: 'קידמי', imageUrl: live7 },
        { area: 'back', areaName: 'גב', imageUrl: live7 },
      ],
    }],
    upscales: {
      '0_front_full': { status: 'done', url: live7 },
      '0_back': { status: 'gave_up', error: 'source_file_deleted' },
    },
  }
  {
    const cleared = await clearSweptFlagsIfFullyUpscaled('ord9')
    assert(cleared === false && __store.orders['ord9'].designsDeleted === true, 'one area gave_up → flags stay')

    // done but pointing at a swept-prefix file that does NOT exist → refuse
    __store.orders['ord9'].upscales['0_back'] = { status: 'done', url: url('designs/ord9/0_back-upscaled.png') }
    const cleared2 = await clearSweptFlagsIfFullyUpscaled('ord9')
    assert(cleared2 === false && __store.orders['ord9'].designsDeleted === true, 'done entry whose regenerated file is missing → flags stay')

    // the file exists again → clear
    __store.storageFiles.add('designs/ord9/0_back-upscaled.png')
    const cleared3 = await clearSweptFlagsIfFullyUpscaled('ord9')
    assert(cleared3 === true && __store.orders['ord9'].designsDeleted === undefined, 'every area verifiably done → flags cleared')
  }

  // ════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Test 8: a 30-day sweep (no storage_limit reason) is NOT re-claimed by force')
  // ════════════════════════════════════════════════════════════════════
  resetAll()
  __store.orders['ord10'] = sweptOrder({
    imageUrl: url('designs/order-1700000000010/y.png'),
    entry: { status: 'done', url: url('designs/ord10/0_front_full-upscaled.png'), attempts: 1 },
    reason: null, // regular 30-day policy — no designsDeletedReason
  })
  {
    const r = await runUpscaleForOrder('ord10', { retryStuckPending: true, force: true })
    assert(r.created === 0 && r.total === 0, '30-day swept done entry left alone', r)
    assert(__store.orders['ord10'].designsDeleted === true, 'flags untouched')
  }

  console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed\n`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
