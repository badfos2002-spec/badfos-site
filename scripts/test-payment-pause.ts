/**
 * The orders-pause kill switch in app/api/payment/create — fail-OPEN behaviour.
 *
 * Run (in-memory double swapped in for firebase-admin via tsconfig paths):
 *   npx tsx --tsconfig tsconfig.payment-pause-test.json scripts/test-payment-pause.ts
 *
 * The double replaces the Firestore read ONLY — the real POST handler, the real
 * amount verification and the real redirect whitelist all run unmodified.
 * The outbound Make webhook is stubbed so no network call leaves the machine.
 *
 * Covers:
 *   1. paused: true            → 503 + the Hebrew copy, byte-identical to HEAD
 *   2. paused: false           → the charge proceeds all the way to a payment URL
 *   3. the read THROWS         → the charge proceeds, and PAUSE_FLAG_UNREADABLE is logged
 *   4. the document is MISSING → the charge proceeds (absence is not a pause)
 *   + ordering: the pause check runs before the webhook lookup and before
 *     amount verification, and amount verification itself still works.
 */
import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { format } from 'node:util'
import { __stub, type PauseFlagMode } from './stubs/payment-pause-admin'
import { POST } from '@/app/api/payment/create/route'

let passed = 0
function ok(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++
      console.log(`  ✅ ${name}`)
    })
    .catch((e: any) => {
      console.error(`  ❌ ${name}: ${e.message}`)
      process.exitCode = 1
    })
}

// ---------------------------------------------------------------- harness ---

const WEBHOOK = 'https://hook.make.com/stub-webhook'
const PAYMENT_URL = 'https://pay.grow.link/abc123'

let fetchCalls: string[] = []
let errorLog: string[] = []

const realFetch = globalThis.fetch
const realError = console.error

globalThis.fetch = (async (url: any) => {
  fetchCalls.push(String(url))
  return new Response(PAYMENT_URL, { status: 200 })
}) as typeof fetch

console.error = (...args: unknown[]) => {
  errorLog.push(format(...args))
}

/** One request against the real handler, with the flag in the given state. */
async function post(
  mode: PauseFlagMode,
  body: Record<string, unknown>,
  { webhook = true }: { webhook?: boolean } = {}
) {
  __stub.reset(mode)
  fetchCalls = []
  errorLog = []
  if (webhook) process.env.MAKE_WEBHOOK_URL = WEBHOOK
  else delete process.env.MAKE_WEBHOOK_URL

  const req = new Request('https://badfos.co.il/api/payment/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const res = await POST(req as any)
  return { status: res.status, body: await res.json() as Record<string, unknown> }
}

/** A well-formed order: 2 × tshirt, front_full print → 2 × ₪47 = ₪94. */
const ORDER = {
  name: 'בדיקה אוטומטית',
  phone: '0501234567',
  email: 'test@example.com',
  amount: 94,
  orderId: 'test-pause-1',
  items: [
    {
      productType: 'tshirt',
      fabricType: 'cotton',
      designs: [{ area: 'front_full' }],
      sizes: [{ size: 'M', quantity: 2 }],
    },
  ],
}

/** The Hebrew copy exactly as it is in the last commit, straight from git. */
const headSource = execFileSync('git', ['show', 'HEAD:app/api/payment/create/route.ts'], {
  cwd: new URL('..', import.meta.url).pathname,
  encoding: 'utf8',
})
const headMessage = /const ORDERS_PAUSED_MESSAGE = '([^']+)'/.exec(headSource)?.[1]

async function main() {
  console.log('\n1️⃣  paused: true → 503 + the same Hebrew copy as today')

  const paused = await post('paused', ORDER)
  await ok('status 503', () => assert.strictEqual(paused.status, 503))
  await ok('body carries paused: true', () => assert.strictEqual(paused.body.paused, true))
  await ok('the Hebrew message is byte-identical to HEAD', () => {
    assert.ok(headMessage, 'could not read ORDERS_PAUSED_MESSAGE out of HEAD')
    assert.ok(
      Buffer.from(String(paused.body.error), 'utf8').equals(Buffer.from(headMessage!, 'utf8')),
      `differs from HEAD: ${JSON.stringify(paused.body.error)}`
    )
  })
  await ok('no charge was started (webhook never called)', () =>
    assert.deepStrictEqual(fetchCalls, []))
  await ok('nothing was logged as a failure', () => assert.deepStrictEqual(errorLog, []))

  console.log('\n2️⃣  paused: false → the request proceeds normally')

  const open = await post('open', ORDER)
  await ok('status 200 with a payment URL', () => {
    assert.strictEqual(open.status, 200)
    assert.strictEqual(open.body.url, PAYMENT_URL)
  })
  await ok('the flag was actually read', () =>
    assert.deepStrictEqual(__stub.events, ['read:settings/orders']))
  await ok('the charge reached the Make webhook', () =>
    assert.deepStrictEqual(fetchCalls, [WEBHOOK]))
  await ok('nothing logged', () => assert.deepStrictEqual(errorLog, []))

  console.log('\n3️⃣  the read THROWS → the request proceeds, loudly logged')

  const broken = await post('throw', ORDER)
  await ok('status 200 with a payment URL (fail open)', () => {
    assert.strictEqual(broken.status, 200)
    assert.strictEqual(broken.body.url, PAYMENT_URL)
  })
  await ok('the charge reached the Make webhook', () =>
    assert.deepStrictEqual(fetchCalls, [WEBHOOK]))
  await ok('exactly one failure was logged', () => assert.strictEqual(errorLog.length, 1))
  await ok('it carries the greppable PAUSE_FLAG_UNREADABLE marker', () =>
    assert.ok(errorLog[0].includes('PAUSE_FLAG_UNREADABLE'), errorLog[0]))
  await ok('it includes the underlying error', () =>
    assert.ok(errorLog[0].includes('could not reach Firestore backend'), errorLog[0]))
  const failureLine = errorLog[0]

  console.log('\n3️⃣ b  FIREBASE_ADMIN_* broken (adminDb undefined) → same fail-open path')

  const unconfigured = await post('unconfigured', ORDER)
  await ok('status 200 with a payment URL (fail open)', () => {
    assert.strictEqual(unconfigured.status, 200)
    assert.strictEqual(unconfigured.body.url, PAYMENT_URL)
  })
  await ok('logged with the same PAUSE_FLAG_UNREADABLE marker', () => {
    assert.strictEqual(errorLog.length, 1)
    assert.ok(errorLog[0].includes('PAUSE_FLAG_UNREADABLE'), errorLog[0])
    assert.ok(errorLog[0].includes('TypeError'), errorLog[0])
  })
  const unconfiguredLine = errorLog[0]

  console.log('\n4️⃣  the document is MISSING → the request proceeds')

  const missing = await post('missing', ORDER)
  await ok('status 200 with a payment URL', () => {
    assert.strictEqual(missing.status, 200)
    assert.strictEqual(missing.body.url, PAYMENT_URL)
  })
  await ok('no failure logged — absence is a normal read, not an outage', () =>
    assert.deepStrictEqual(errorLog, []))

  console.log('\n5️⃣  ordering — the pause check still runs first')

  const noWebhook = await post('paused', ORDER, { webhook: false })
  await ok('paused + MAKE_WEBHOOK_URL unset → 503, not the 500 config error', () => {
    assert.strictEqual(noWebhook.status, 503)
    assert.strictEqual(noWebhook.body.error, headMessage)
  })

  const pausedBadAmount = await post('paused', { ...ORDER, amount: 500 })
  await ok('paused + wrong amount → 503, not the 400 amount error', () => {
    assert.strictEqual(pausedBadAmount.status, 503)
    assert.strictEqual(pausedBadAmount.body.error, headMessage)
  })

  const pausedNoName = await post('paused', { amount: 94 })
  await ok('paused + malformed body → 503, body never even parsed', () =>
    assert.strictEqual(pausedNoName.status, 503))

  console.log('\n6️⃣  amount verification is unaffected')

  const overcharge = await post('open', { ...ORDER, amount: 500 })
  await ok('open + inflated amount → 400 Amount verification failed', () => {
    assert.strictEqual(overcharge.status, 400)
    assert.strictEqual(overcharge.body.error, 'Amount verification failed')
    assert.deepStrictEqual(fetchCalls, [])
  })

  const undercharge = await post('open', { ...ORDER, amount: 1 })
  await ok('open + underpaid amount → 400', () =>
    assert.strictEqual(undercharge.status, 400))

  const brokenOvercharge = await post('throw', { ...ORDER, amount: 500 })
  await ok('unreadable flag does NOT weaken amount verification → 400', () => {
    assert.strictEqual(brokenOvercharge.status, 400)
    assert.strictEqual(brokenOvercharge.body.error, 'Amount verification failed')
  })

  const withShipping = await post('open', { ...ORDER, amount: 94 + 35 })
  await ok('open + legitimate shipping (₪35) still passes', () =>
    assert.strictEqual(withShipping.status, 200))

  console.error = realError
  globalThis.fetch = realFetch

  console.log('\n──────────────────────────────────────────────')
  console.log('Raw responses for the four flag states:\n')
  for (const [label, r] of [
    ['paused: true ', paused],
    ['paused: false', open],
    ['read throws  ', broken],
    ['doc missing  ', missing],
  ] as const) {
    console.log(`  ${label} → ${r.status} ${JSON.stringify(r.body)}`)
  }

  console.log('\n──────────────────────────────────────────────')
  console.log('The exact line a read failure writes to the Vercel log:\n')
  console.log(failureLine.split('\n')[0])
  console.log('\n...and with FIREBASE_ADMIN_* broken:\n')
  console.log(unconfiguredLine.split('\n')[0])
  console.log('\n──────────────────────────────────────────────')
  console.log(process.exitCode ? `❌ FAILURES ABOVE (${passed} passed)` : `✅ all ${passed} checks passed`)
}

main()
