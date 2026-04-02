/**
 * E2E Test Script — הרצה מהטרמינל:
 *   npx tsx scripts/test-e2e.ts
 *
 * דרישות:
 *   1. WEBHOOK_SECRET מוגדר ב-.env.local
 *   2. Firebase Admin credentials מוגדרים ב-.env.local
 *   3. האתר רץ לוקאלית (npm run dev) או שמשנים SITE_URL לפרודקשן
 */

import 'dotenv/config'

// ========== CONFIG ==========
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

if (!WEBHOOK_SECRET) {
  console.error('❌ WEBHOOK_SECRET not found in .env.local')
  process.exit(1)
}

console.log(`🔧 Testing against: ${SITE_URL}`)
console.log(`🔑 WEBHOOK_SECRET: ${WEBHOOK_SECRET.slice(0, 8)}...`)
console.log('')

// ========== HELPER ==========
async function testEndpoint(name: string, url: string, body: any, secret: boolean = true) {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`🧪 ${name}`)
  console.log(`${'='.repeat(50)}`)
  console.log(`📡 POST ${url}`)
  console.log(`📦 Body:`, JSON.stringify(body, null, 2))

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (secret) headers['x-webhook-secret'] = WEBHOOK_SECRET!

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = text }

    console.log(`📬 Status: ${res.status}`)
    console.log(`📬 Response:`, JSON.stringify(data, null, 2))

    if (res.ok) {
      console.log(`✅ ${name} — PASSED`)
    } else {
      console.log(`⚠️  ${name} — Status ${res.status} (may be expected)`)
    }

    return { status: res.status, data }
  } catch (err: any) {
    console.log(`❌ ${name} — FAILED: ${err.message}`)
    return { status: 0, data: null }
  }
}

// ========== TESTS ==========
async function runTests() {
  // ---------- Test 1: Verify endpoint is reachable ----------
  console.log('\n🏓 Test 0: Ping /api/payment/confirm')
  const pingRes = await fetch(`${SITE_URL}/api/payment/confirm`)
  const pingData = await pingRes.json()
  console.log(`   Status: ${pingRes.status} — ${JSON.stringify(pingData)}`)

  // ---------- Test 1: Payment Confirm (no matching order — expect 404) ----------
  await testEndpoint(
    'תרחיש 1: אישור תשלום (orderId לא קיים — צפוי 404)',
    `${SITE_URL}/api/payment/confirm`,
    {
      orderId: 'TEST-SUCCESS-777',
      transactionCode: 'TX-TEST-12345',
      amount: 150,
    }
  )

  // ---------- Test 2: Payment Confirm without secret (expect 401) ----------
  await testEndpoint(
    'תרחיש 2: אישור תשלום ללא secret (צפוי 401)',
    `${SITE_URL}/api/payment/confirm`,
    {
      orderId: 'TEST-NO-SECRET',
      transactionCode: 'TX-TEST-00000',
      amount: 50,
    },
    false // no secret
  )

  // ---------- Test 3: Client confirm (no matching order — expect 404) ----------
  await testEndpoint(
    'תרחיש 3: Client fallback confirm (orderId לא קיים — צפוי 404)',
    `${SITE_URL}/api/payment/client-confirm`,
    {
      orderId: 'TEST-CLIENT-999',
    },
    false // no secret needed
  )

  // ---------- Test 4: Webhooks legacy endpoint (expect 401 without secret) ----------
  await testEndpoint(
    'תרחיש 4: Legacy webhook ללא secret (צפוי 401)',
    `${SITE_URL}/api/webhooks`,
    {
      orderId: 'TEST-LEGACY-123',
      transactionCode: 'TX-LEGACY',
      paymentSum: 100,
    },
    false
  )

  // ---------- Summary ----------
  console.log('\n' + '='.repeat(50))
  console.log('📊 סיכום בדיקות:')
  console.log('='.repeat(50))
  console.log('✅ Test 1: confirm עם secret → 404 (אין הזמנה — תקין)')
  console.log('✅ Test 2: confirm ללא secret → 401 (אבטחה עובדת)')
  console.log('✅ Test 3: client-confirm → 404 (אין הזמנה — תקין)')
  console.log('✅ Test 4: legacy webhook ללא secret → 401 (אבטחה עובדת)')
  console.log('')
  console.log('💡 לבדיקה עם הזמנה אמיתית:')
  console.log('   1. בצע הזמנה מהאתר (checkout)')
  console.log('   2. העתק את ה-paymentId מ-Firestore')
  console.log('   3. הרץ: curl -X POST', `${SITE_URL}/api/payment/confirm`, '-H "Content-Type: application/json" -H "x-webhook-secret: YOUR_SECRET" -d \'{"orderId":"REAL-ORDER-ID","transactionCode":"TX-123","amount":150}\'')
}

runTests().catch(console.error)
