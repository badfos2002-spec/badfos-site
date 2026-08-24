import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedRedirect } from '@/lib/url-validation'
import { adminDb } from '@/lib/firebase-admin'

// Hebrew copy shown to the customer if a charge is attempted while paused
const ORDERS_PAUSED_MESSAGE = 'לא ניתן לבצע הזמנות כרגע — אנחנו חוזרים לפעילות בקרוב. העגלה שלכם נשמרת.'

/**
 * The owner's "pause orders" switch (settings/orders → { paused: true }).
 *
 * FAIL OPEN — only an explicit `paused: true` refuses the charge. A read that
 * throws (Firestore outage, a mis-rotated FIREBASE_ADMIN_* on Vercel) lets
 * checkout continue, and is logged with the PAUSE_FLAG_UNREADABLE marker below.
 *
 * This used to fail CLOSED, and that was the right call at the time: the shop
 * was deliberately closed, so an unreadable flag most likely still meant
 * "paused", and one blocked checkout was far cheaper than a charge nobody was
 * there to fulfil. The shop is open again, which inverts the cost — the same
 * behaviour turns any transient Firestore hiccup into a site-wide payment
 * outage whose only symptom is sales that never arrive. Losing every order to
 * protect against a flag we cannot read is now the more expensive mistake.
 *
 * The trade-off is that a broken flag is invisible in normal operation, which
 * is why the failure is logged loudly: grep Vercel logs for
 * PAUSE_FLAG_UNREADABLE. If the shop ever closes for a stretch again, flipping
 * this back to `return true` is defensible — make it a deliberate decision and
 * re-read the paragraph above first.
 *
 * A MISSING settings/orders document is not a failure and is not a pause: the
 * admin toggle (setOrdersPaused in lib/db.ts) always writes an explicit
 * boolean, so a pause is never expressed by the document's absence. No
 * document means the switch was never touched — i.e. the shop is open.
 */
async function areOrdersPaused(): Promise<boolean> {
  try {
    const snap = await adminDb.collection('settings').doc('orders').get()
    return snap.exists && snap.data()?.paused === true
  } catch (error) {
    console.error(
      '[PAUSE_FLAG_UNREADABLE] settings/orders could not be read — allowing the charge through (fail open). ' +
      'The pause switch is NOT being enforced right now; check FIREBASE_ADMIN_* on Vercel and Firestore health:',
      error
    )
    return false
  }
}

// Server-side price verification constants (mirrors lib/constants.ts)
const BASE_PRICES: Record<string, number> = { tshirt: 37, sweatshirt: 53, buff: 8, cap: 0, apron: 29 }
const FABRIC_SURCHARGES: Record<string, number> = { cotton: 0, 'dri-fit': 0, polo: 10, oversized: 10 }
const AREA_SURCHARGES: Record<string, number> = { front_full: 10, back: 10, chest_logo: 5, chest_logo_right: 5, center: 10 }
const SIZE_SURCHARGES: Record<string, number> = { '3XL': 12, '4XL': 12 }
const SHIPPING_COST = 35
const QUANTITY_DISCOUNT_THRESHOLD = 15
const QUANTITY_DISCOUNT_PERCENT = 5
// Express pickup surcharge — allowed only for small orders (mirrors EXPRESS_PICKUP in lib/constants.ts)
const EXPRESS_COST = 50
const EXPRESS_MAX_QUANTITY = 20

function calculateServerAmount(items: any[], couponDiscount: number = 0): { amount: number; totalQuantity: number } {
  let subtotal = 0
  let totalQuantity = 0

  for (const item of items) {
    if (item.fixedPrice) {
      for (const size of (item.sizes || [])) {
        const sizeSurcharge = SIZE_SURCHARGES[size.size] || 0
        subtotal += (item.fixedPrice + sizeSurcharge) * size.quantity
        totalQuantity += size.quantity
      }
    } else {
      const base = BASE_PRICES[item.productType] || 37
      const fabric = FABRIC_SURCHARGES[item.fabricType] || 0
      const areas = (item.designs || []).reduce((sum: number, d: any) => sum + (AREA_SURCHARGES[d.area] || 0), 0)
      const pricePerUnit = base + fabric + areas
      for (const size of (item.sizes || [])) {
        const sizeSurcharge = SIZE_SURCHARGES[size.size] || 0
        subtotal += (pricePerUnit + sizeSurcharge) * size.quantity
        totalQuantity += size.quantity
      }
    }
  }

  // Quantity discount
  let discount = 0
  if (totalQuantity >= QUANTITY_DISCOUNT_THRESHOLD) {
    discount = subtotal * (QUANTITY_DISCOUNT_PERCENT / 100)
  }

  return { amount: subtotal - discount - couponDiscount, totalQuantity }
}

function verifyAmount(items: any[], clientAmount: number, couponDiscount: number = 0, express: boolean = false): boolean {
  if (!items || items.length === 0) return true
  const { amount: serverAmount, totalQuantity } = calculateServerAmount(items, couponDiscount)
  // Express pickup surcharge is legitimate ONLY for small orders (≤20 units) —
  // never a silent ₪50 allowance on a big order
  const expressAllowance = express && totalQuantity <= EXPRESS_MAX_QUANTITY ? EXPRESS_COST : 0
  // Allow only shipping variance (₪0-35) + express (when eligible) + ₪2 rounding tolerance
  const min = serverAmount - 2 // rounding
  const max = serverAmount + SHIPPING_COST + expressAllowance + 2 // shipping + express + rounding
  if (clientAmount < min || clientAmount > max) {
    console.error(`Price mismatch: server=${serverAmount}, client=${clientAmount}, diff=${clientAmount - serverAmount}`)
    return false
  }
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Authoritative pause check — runs before anything else. The cart also
    // hides the checkout button, but a stale client bundle or a crafted
    // request must never be able to start a charge.
    if (await areOrdersPaused()) {
      return NextResponse.json({ error: ORDERS_PAUSED_MESSAGE, paused: true }, { status: 503 })
    }

    const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL
    if (!MAKE_WEBHOOK_URL) {
      console.error('MAKE_WEBHOOK_URL is not configured')
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { name, phone, email, amount, description, orderId, items, couponDiscount, express, gclid: rawGclid } = body
    const gclid = typeof rawGclid === 'string'
      ? rawGclid.trim().replace(/^gclid=/i, '')
      : undefined

    if (amount == null || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const verifiedAmount = Number(amount)
    if (isNaN(verifiedAmount) || verifiedAmount < 1) {
      return NextResponse.json({ error: 'Amount must be at least ₪1' }, { status: 400 })
    }
    if (verifiedAmount > 10000) {
      return NextResponse.json({ error: 'Amount exceeds maximum allowed (₪10,000)' }, { status: 400 })
    }

    // Server-side amount verification (if items provided)
    if (items && Array.isArray(items) && items.length > 0) {
      if (!verifyAmount(items, verifiedAmount, couponDiscount || 0, express === true)) {
        console.error('Amount mismatch: client sent', verifiedAmount, 'for items', JSON.stringify(items.map((i: any) => i.productType)))
        return NextResponse.json({ error: 'Amount verification failed' }, { status: 400 })
      }
    }

    // Validate email
    if (email != null && email !== '') {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }
    }

    // Validate phone
    if (phone != null && phone !== '') {
      if (typeof phone !== 'string' || !/^(?:0\d{1,2}[-\s]?\d{7,8}|\+?\d{10,15})$/.test(phone)) {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
      }
    }

    if (description != null && typeof description === 'string' && description.length > 500) {
      return NextResponse.json({ error: 'Description too long (max 500 characters)' }, { status: 400 })
    }

    // Retry logic — try up to 2 times if Make/Grow is down
    let responseText = ''
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, phone, email,
            amount: verifiedAmount,
            description, orderId,
            ...(gclid && { gclid }),
          }),
        })
        responseText = await res.text()
        if (res.ok) break
        if (attempt === 0) await new Promise(r => setTimeout(r, 1000)) // Wait 1s before retry
      } catch (err) {
        if (attempt === 1) throw err
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    let data: Record<string, unknown> | null = null
    try { data = JSON.parse(responseText) } catch {}

    let paymentUrl: string | null = null
    if (data) {
      paymentUrl = (data.url || data.URL || data.paymentUrl || data.link || data.payment_url) as string | null
    }
    if (!paymentUrl && responseText.trim().startsWith('http')) {
      paymentUrl = responseText.trim()
    }

    if (paymentUrl) {
      if (!isAuthorizedRedirect(paymentUrl)) {
        console.error('Blocked unauthorized payment redirect:', paymentUrl)
        return NextResponse.json({ error: 'Unauthorized payment URL' }, { status: 403 })
      }
      return NextResponse.json({ url: paymentUrl })
    }

    return NextResponse.json({ error: 'No payment URL returned' }, { status: 400 })
  } catch (error) {
    console.error('Payment create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
