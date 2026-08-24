/**
 * What every Admin-SDK consumer does when the SDK is NOT available.
 *
 * Run (in-memory double swapped in for firebase-admin via tsconfig paths):
 *   npx tsx --tsconfig tsconfig.admin-sdk-outage-test.json scripts/test-admin-sdk-outage.ts
 *
 * lib/firebase-admin.ts catches its own init error and exports adminDb /
 * adminAuth / adminStorage as `undefined`, so a mis-rotated FIREBASE_ADMIN_* on
 * Vercel does not fail at boot — every consumer throws at its first property
 * access instead, wherever that happens to be. This proves what each route
 * ACTUALLY answers in that state, and — just as important — that the healthy
 * path still behaves exactly as it did.
 *
 * Every route handler runs unmodified; only the SDK underneath is fake.
 */
import assert from 'node:assert'
import { format } from 'node:util'
import { __stub } from './stubs/admin-sdk-outage-admin'

process.env.TELEGRAM_WEBHOOK_SECRET = 'tg-secret'
process.env.TELEGRAM_ALLOWED_IDS = '4242'
process.env.TELEGRAM_BOT_TOKEN = 'stub-bot-token'
process.env.CRON_SECRET = 'cron-secret'
delete process.env.RESEND_API_KEY

import { NextRequest } from 'next/server'

/**
 * The cron routes read CRON_SECRET at MODULE scope, and static imports are
 * hoisted above the process.env assignments above — so every route module is
 * loaded dynamically, once, after the environment is set.
 */
async function loadRoutes() {
  return {
    nextNumber: (await import('@/app/api/order/next-number/route')).POST,
    telegram: (await import('@/app/api/telegram/webhook/route')).POST,
    costDigest: (await import('@/app/api/cost-digest/route')).GET,
    cleanup: (await import('@/app/api/cleanup-old-designs/route')).GET,
    orderSync: (await import('@/app/api/order-sync/route')).POST,
    verifyOrderSync: (await import('@/app/api/verify-order-sync/route')).POST,
    retryUpscale: (await import('@/app/api/admin/retry-upscale/route')).POST,
    downloadDesign: (await import('@/app/api/admin/download-design/route')).GET,
    systemStatus: (await import('@/app/api/admin/system-status/route')).GET,
    ORDER_NUMBER_UNAVAILABLE_MESSAGE: (await import('@/lib/db')).ORDER_NUMBER_UNAVAILABLE_MESSAGE,
  }
}

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

let errorLog: string[] = []
let telegramReplies: string[] = []
const realError = console.error
const realWarn = console.warn
const realLog = console.log
const realFetch = globalThis.fetch

globalThis.fetch = (async (url: any, init: any) => {
  const s = String(url)
  if (s.includes('api.telegram.org')) {
    telegramReplies.push(JSON.parse(String(init?.body ?? '{}')).text ?? '')
    return new Response('{"ok":true}', { status: 200 })
  }
  return new Response('{}', { status: 200 })
}) as typeof fetch

function quiet() {
  console.error = (...a: unknown[]) => { errorLog.push(format(...a)) }
  console.warn = (...a: unknown[]) => { errorLog.push(format(...a)) }
  console.log = () => {}
}
function loud() {
  console.error = realError
  console.warn = realWarn
  console.log = realLog
}

async function call(
  handler: (req: any) => Promise<Response>,
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
) {
  errorLog = []
  telegramReplies = []
  const method = init.method ?? 'GET'
  const req = new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    // GET/HEAD may not carry a body
    ...(init.body !== undefined && method !== 'GET' ? { body: JSON.stringify(init.body) } : {}),
  })
  const res = await handler(req as any)
  const text = await res.text()
  let body: any
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, body, text }
}

const marker = (s: string) => s.includes('[ADMIN_SDK_UNAVAILABLE]')
const record: string[] = []
function note(label: string, r: { status: number; text: string }) {
  record.push(`  ${label.padEnd(46)} → ${r.status} ${r.text.slice(0, 90)}`)
}

// ------------------------------------------------------------------ tests ---

async function main() {
  const {
    nextNumber, telegram, costDigest, cleanup, orderSync, verifyOrderSync,
    retryUpscale, downloadDesign, systemStatus, ORDER_NUMBER_UNAVAILABLE_MESSAGE,
  } = await loadRoutes()

  quiet()

  // ══════════════════════════════════════════════════════════════════════
  console.log('\n1️⃣  /api/order/next-number — the checkout blocker')
  // ══════════════════════════════════════════════════════════════════════

  __stub.reset('healthy')
  __stub.docs('counters')['orders'] = { current: 1042 }
  const numHealthy = await call(nextNumber, 'https://badfos.co.il/api/order/next-number', { method: 'POST' })
  loud()
  await ok('healthy → 200 with counter + 1 (semantics unchanged)', () => {
    assert.strictEqual(numHealthy.status, 200)
    assert.strictEqual(numHealthy.body.orderNumber, 1043)
    assert.strictEqual((__stub.docs('counters')['orders'] as any).current, 1043)
  })
  quiet()

  __stub.reset('healthy')
  const numFirst = await call(nextNumber, 'https://badfos.co.il/api/order/next-number', { method: 'POST' })
  loud()
  await ok('healthy + missing counter → 1001 (semantics unchanged)', () =>
    assert.strictEqual(numFirst.body.orderNumber, 1001))
  quiet()

  __stub.reset('unconfigured')
  const numDown = await call(nextNumber, 'https://badfos.co.il/api/order/next-number', { method: 'POST' })
  loud()
  note('next-number (SDK down)', numDown)
  await ok('SDK down → 503 admin_sdk_unavailable (was 500 failed_to_allocate)', () => {
    assert.strictEqual(numDown.status, 503)
    assert.strictEqual(numDown.body.error, 'admin_sdk_unavailable')
  })
  await ok('logged with the greppable ADMIN_SDK_UNAVAILABLE marker', () =>
    assert.ok(errorLog.some(marker), errorLog.join('\n')))
  await ok('the log says checkout is blocked, not just "failed"', () =>
    assert.ok(errorLog.some((l) => l.includes('CHECKOUT IS BLOCKED')), errorLog.join('\n')))
  await ok('the customer-facing message is Hebrew, not "Failed to allocate order number"', () => {
    assert.ok(/^[^\x00-\x7F]/.test(ORDER_NUMBER_UNAVAILABLE_MESSAGE), ORDER_NUMBER_UNAVAILABLE_MESSAGE)
    assert.ok(ORDER_NUMBER_UNAVAILABLE_MESSAGE.includes('העגלה שלכם נשמרת'))
  })
  await ok('no counter was touched — no order number was invented', () =>
    assert.deepStrictEqual(__stub.collections.counters ?? {}, {}))
  quiet()

  // ══════════════════════════════════════════════════════════════════════
  console.log('\n2️⃣  /api/telegram/webhook — a manual sale must never vanish')
  // ══════════════════════════════════════════════════════════════════════

  const saleUpdate = {
    message: {
      text: 'יוסי כהן 0501234567 150 ביט',
      from: { id: 4242, first_name: 'בעלים' },
      chat: { id: 99, type: 'private' },
    },
  }
  const tgUrl = 'https://badfos.co.il/api/telegram/webhook'
  const tgHeaders = { 'x-telegram-bot-api-secret-token': 'tg-secret' }

  __stub.reset('healthy')
  const tgHealthy = await call(telegram, tgUrl, { method: 'POST', headers: tgHeaders, body: saleUpdate })
  const healthyReplies = [...telegramReplies]
  loud()
  await ok('healthy → 200 and the sale IS stored', () => {
    assert.strictEqual(tgHealthy.status, 200)
    assert.strictEqual(Object.keys(__stub.docs('manualSales')).length, 1)
    const sale = Object.values(__stub.docs('manualSales'))[0] as any
    assert.strictEqual(sale.amount, 150)
    assert.strictEqual(sale.paymentType, 'ביט')
  })
  await ok('healthy → the owner gets the ✅ confirmation', () =>
    assert.ok(healthyReplies.some((r) => r.includes('✅ נרשם')), JSON.stringify(healthyReplies)))
  quiet()

  __stub.reset('unconfigured')
  const tgDown = await call(telegram, tgUrl, { method: 'POST', headers: tgHeaders, body: saleUpdate })
  const downReplies = [...telegramReplies]
  loud()
  note('telegram sale (SDK down)', tgDown)
  await ok('SDK down → still 200 (no Telegram retry storm → no double-record)', () =>
    assert.strictEqual(tgDown.status, 200))
  await ok('nothing was written', () =>
    assert.deepStrictEqual(__stub.collections.manualSales ?? {}, {}))
  await ok('the owner is TOLD the sale was not saved (was: total silence)', () => {
    assert.strictEqual(downReplies.length, 1, JSON.stringify(downReplies))
    assert.ok(downReplies[0].includes('העסקה לא נרשמה'), downReplies[0])
  })
  await ok('never answers ✅ נרשם for a sale it did not store', () =>
    assert.ok(!downReplies.some((r) => r.includes('✅ נרשם')), JSON.stringify(downReplies)))
  await ok('logged with the ADMIN_SDK_UNAVAILABLE marker', () =>
    assert.ok(errorLog.some(marker), errorLog.join('\n')))
  quiet()

  __stub.reset('unconfigured')
  const tgList = await call(telegram, tgUrl, {
    method: 'POST', headers: tgHeaders,
    body: { message: { text: 'רשימה', from: { id: 4242, first_name: 'בעלים' }, chat: { id: 99, type: 'private' } } },
  })
  const listReplies = [...telegramReplies]
  loud()
  await ok('SDK down + a read command → the owner is told, not left in silence', () => {
    assert.strictEqual(tgList.status, 200)
    assert.ok(listReplies[0]?.includes('מסד הנתונים לא זמין'), JSON.stringify(listReplies))
  })
  quiet()

  __stub.reset('unconfigured')
  const tgHelp = await call(telegram, tgUrl, {
    method: 'POST', headers: tgHeaders,
    body: { message: { text: 'עזרה', from: { id: 4242, first_name: 'בעלים' }, chat: { id: 99, type: 'private' } } },
  })
  const helpReplies = [...telegramReplies]
  loud()
  await ok('SDK down + a command that needs no DB (עזרה) still works', () => {
    assert.strictEqual(tgHelp.status, 200)
    assert.ok(helpReplies[0]?.includes('יומן העסקאות'), JSON.stringify(helpReplies))
  })
  quiet()

  // ══════════════════════════════════════════════════════════════════════
  console.log('\n3️⃣  /api/cost-digest — a cron must not look green while sending nothing')
  // ══════════════════════════════════════════════════════════════════════

  const digestUrl = 'https://badfos.co.il/api/cost-digest?secret=cron-secret'

  __stub.reset('healthy')
  const digestNoRecipients = await call(costDigest, digestUrl)
  loud()
  note('cost-digest (healthy, unconfigured recipients)', digestNoRecipients)
  await ok('healthy + no recipients configured → 200 skipped (deliberate, unchanged)', () => {
    assert.strictEqual(digestNoRecipients.status, 200)
    assert.strictEqual(digestNoRecipients.body.success, true)
    assert.strictEqual(digestNoRecipients.body.reason, 'no_recipients')
  })
  quiet()

  __stub.reset('unconfigured')
  const digestDown = await call(costDigest, digestUrl)
  loud()
  note('cost-digest (SDK down)', digestDown)
  await ok('SDK down → 503 (was 200 success:true — a green cron that sent nothing)', () => {
    assert.strictEqual(digestDown.status, 503)
    assert.strictEqual(digestDown.body.success, false)
    assert.strictEqual(digestDown.body.reason, 'settings_unavailable')
  })
  await ok('logged with the ADMIN_SDK_UNAVAILABLE marker', () =>
    assert.ok(errorLog.some(marker), errorLog.join('\n')))
  quiet()

  // ══════════════════════════════════════════════════════════════════════
  console.log('\n4️⃣  /api/cleanup-old-designs — no more unhandled TypeError')
  // ══════════════════════════════════════════════════════════════════════

  __stub.reset('healthy')
  const cleanupHealthy = await call(cleanup, 'https://badfos.co.il/api/cleanup-old-designs?secret=cron-secret&dryRun=1')
  loud()
  await ok('healthy → the guard lets the job through (dry run still plans)', () => {
    assert.strictEqual(cleanupHealthy.status, 200)
    assert.strictEqual(cleanupHealthy.body.mode, 'dry-run')
  })
  quiet()

  __stub.reset('unconfigured')
  let cleanupThrew: string | null = null
  let cleanupDown = { status: 0, body: {} as any, text: '' }
  try {
    cleanupDown = await call(cleanup, 'https://badfos.co.il/api/cleanup-old-designs?secret=cron-secret')
  } catch (e: any) {
    cleanupThrew = e.message
  }
  loud()
  note('cleanup-old-designs (SDK down)', cleanupDown)
  await ok('SDK down → 503 JSON, not an unhandled TypeError outside the try', () => {
    assert.strictEqual(cleanupThrew, null, `still throws: ${cleanupThrew}`)
    assert.strictEqual(cleanupDown.status, 503)
    assert.strictEqual(cleanupDown.body.error, 'admin_sdk_unavailable')
  })
  await ok('the log names the job and what did not happen', () =>
    assert.ok(errorLog.some((l) => marker(l) && l.includes('cleanup-old-designs')), errorLog.join('\n')))
  quiet()

  __stub.reset('unconfigured')
  const cleanupNoAuth = await call(cleanup, 'https://badfos.co.il/api/cleanup-old-designs')
  loud()
  await ok('the guard runs AFTER auth — an unauthenticated caller still gets 401', () =>
    assert.strictEqual(cleanupNoAuth.status, 401))
  quiet()

  // ══════════════════════════════════════════════════════════════════════
  console.log('\n5️⃣  /api/order-sync + /api/verify-order-sync — no internals in a public body')
  // ══════════════════════════════════════════════════════════════════════

  const syncBody = {
    orderId: 'order-1', phone: '0501234567',
    subtotal: 94, discount: 0, total: 94,
    items: [{ productType: 'tshirt', totalQuantity: 2 }],
  }

  __stub.reset('healthy')
  __stub.docs('orders')['order-1'] = {
    status: 'pending_payment',
    customer: { phone: '0501234567' },
    total: 94,
    items: [{ productType: 'tshirt', totalQuantity: 2 }],
  }
  const syncHealthy = await call(orderSync, 'https://badfos.co.il/api/order-sync', { method: 'POST', body: syncBody })
  loud()
  await ok('healthy → { synced: true } and the order really is updated', () => {
    assert.strictEqual(syncHealthy.status, 200)
    assert.strictEqual(syncHealthy.body.synced, true)
    assert.ok(__stub.events.includes('update:orders/order-1'), __stub.events.join(','))
  })
  quiet()

  __stub.reset('unconfigured')
  const syncDown = await call(orderSync, 'https://badfos.co.il/api/order-sync', { method: 'POST', body: syncBody })
  loud()
  note('order-sync (SDK down)', syncDown)
  await ok('SDK down → still 200 { synced: false } — checkout is never blocked', () => {
    assert.strictEqual(syncDown.status, 200)
    assert.strictEqual(syncDown.body.synced, false)
  })
  await ok('reason is a stable token, NOT the raw TypeError message', () => {
    assert.strictEqual(syncDown.body.reason, 'internal_error')
    assert.ok(!syncDown.text.includes('Cannot read properties'), syncDown.text)
    assert.ok(!syncDown.text.includes('undefined'), syncDown.text)
  })
  await ok('the detail is still in the server log', () =>
    assert.ok(errorLog.some((l) => l.includes('order-sync endpoint error')), errorLog.join('\n')))
  quiet()

  __stub.reset('healthy')
  __stub.docs('orders')['order-1'] = {
    status: 'pending_payment',
    customer: { phone: '0501234567' },
    total: 94,
    items: [{ productType: 'tshirt', totalQuantity: 2, designs: [] }],
  }
  const verifyHealthy = await call(verifyOrderSync, 'https://badfos.co.il/api/verify-order-sync', {
    method: 'POST',
    body: { orderId: 'order-1', phone: '0501234567', total: 94, items: [{ productType: 'tshirt', totalQuantity: 2, designs: [] }] },
  })
  loud()
  await ok('healthy + matching snapshot → { consistent: true } (unchanged)', () => {
    assert.strictEqual(verifyHealthy.status, 200)
    assert.strictEqual(verifyHealthy.body.consistent, true)
  })
  quiet()

  __stub.reset('unconfigured')
  const verifyDown = await call(verifyOrderSync, 'https://badfos.co.il/api/verify-order-sync', {
    method: 'POST',
    body: { orderId: 'order-1', phone: '0501234567', total: 94, items: [{ productType: 'tshirt' }] },
  })
  loud()
  note('verify-order-sync (SDK down)', verifyDown)
  await ok('SDK down → 200 { consistent: null }, success page never breaks', () => {
    assert.strictEqual(verifyDown.status, 200)
    assert.strictEqual(verifyDown.body.consistent, null)
  })
  await ok('reason is a stable token, NOT the raw TypeError message', () => {
    assert.strictEqual(verifyDown.body.reason, 'internal_error')
    assert.ok(!verifyDown.text.includes('Cannot read properties'), verifyDown.text)
  })
  quiet()

  // ══════════════════════════════════════════════════════════════════════
  console.log('\n6️⃣  admin routes — an outage is not a rejected login')
  // ══════════════════════════════════════════════════════════════════════

  const adminCases: [string, (req: any) => Promise<Response>, string, string][] = [
    ['retry-upscale', retryUpscale, 'https://badfos.co.il/api/admin/retry-upscale', 'POST'],
    ['download-design', downloadDesign,
      'https://badfos.co.il/api/admin/download-design?orderId=o1&itemIdx=0&area=front_full&variant=source', 'GET'],
    ['system-status', systemStatus, 'https://badfos.co.il/api/admin/system-status', 'GET'],
  ]

  for (const [name, handler, url, method] of adminCases) {
    __stub.reset('healthy')
    const badToken = await call(handler, url, {
      method, headers: { authorization: 'Bearer wrong-token' }, body: { orderId: 'o1' },
    })
    loud()
    await ok(`${name}: healthy + bad token → 401 (unchanged)`, () =>
      assert.strictEqual(badToken.status, 401))
    quiet()

    __stub.reset('healthy')
    __stub.tokenEmail = 'someone-else@example.com'
    const wrongUser = await call(handler, url, {
      method, headers: { authorization: 'Bearer good-token' }, body: { orderId: 'o1' },
    })
    loud()
    await ok(`${name}: healthy + non-admin identity → 403 (unchanged)`, () =>
      assert.strictEqual(wrongUser.status, 403))
    quiet()

    __stub.reset('healthy')
    const goodToken = await call(handler, url, {
      method, headers: { authorization: 'Bearer good-token' }, body: { orderId: 'o1' },
    })
    loud()
    await ok(`${name}: healthy + admin token → gets PAST auth (not 401/403/503)`, () =>
      assert.ok(![401, 403, 503].includes(goodToken.status), `got ${goodToken.status} ${goodToken.text}`))
    quiet()

    __stub.reset('unconfigured')
    const down = await call(handler, url, {
      method, headers: { authorization: 'Bearer good-token' }, body: { orderId: 'o1' },
    })
    loud()
    note(`${name} (SDK down)`, down)
    await ok(`${name}: SDK down → 503 admin_sdk_unavailable (was a misleading 401)`, () => {
      assert.strictEqual(down.status, 503)
      assert.strictEqual(down.body.error, 'admin_sdk_unavailable')
    })
    await ok(`${name}: logged with the ADMIN_SDK_UNAVAILABLE marker`, () =>
      assert.ok(errorLog.some(marker), errorLog.join('\n')))
    quiet()

    __stub.reset('unconfigured')
    const downNoHeader = await call(handler, url, { method, body: { orderId: 'o1' } })
    loud()
    await ok(`${name}: SDK down + no Authorization header → still 401, never opens up`, () =>
      assert.strictEqual(downNoHeader.status, 401))
    quiet()
  }

  loud()
  globalThis.fetch = realFetch

  console.log('\n──────────────────────────────────────────────')
  console.log('Actual responses with the Admin SDK unavailable:\n')
  for (const line of record) console.log(line)

  console.log('\n──────────────────────────────────────────────')
  console.log(process.exitCode ? `❌ FAILURES ABOVE (${passed} passed)` : `✅ all ${passed} checks passed`)
}

main()
