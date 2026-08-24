import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedRedirect } from '@/lib/url-validation'
import { adminDb } from '@/lib/firebase-admin'
import { applyPricingOverrides, getLiveShippingCost, EXPRESS_PICKUP } from '@/lib/constants'
import { calculateItemPrice, applyQuantityDiscount } from '@/lib/pricing'

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

/**
 * Server-side price verification — runs THE SAME code the cart runs.
 *
 * History, so nobody reintroduces the bug: this file used to carry its own
 * hardcoded price table "mirroring" lib/constants.ts. It drifted — cap was 0
 * (falsy → fell back to 37 instead of the real 30), and tote/baby/vest were
 * missing entirely — so once verification started running on every request
 * (checkout reorder, a423003), every cap/tote/vest/baby cart was refused with
 * "Amount verification failed" and customers could not pay. A copied table
 * WILL rot; calculateItemPrice/applyQuantityDiscount from lib/pricing are the
 * exact functions the customer's cart used to display the total.
 *
 * Admin price overrides (settings/pricing, editable at /admin/pricing) are
 * loaded into the same module state the client hydrates via PricingLoader —
 * without this, any admin price change would break verification the same way.
 * FAIL OPEN to code defaults if the doc is unreadable: verification still
 * runs, only the override layer is skipped (grep: PRICING_OVERRIDES_UNREADABLE).
 */
async function loadPricingOverrides(): Promise<void> {
  try {
    const snap = await adminDb.collection('settings').doc('pricing').get()
    applyPricingOverrides(snap.exists ? (snap.data() as Record<string, unknown>) ?? {} : {})
  } catch (error) {
    applyPricingOverrides({})
    console.error(
      '[PRICING_OVERRIDES_UNREADABLE] settings/pricing could not be read — verifying against code-default prices. ' +
      'If the admin has overridden prices, legitimate carts may be refused until this recovers:',
      error
    )
  }
}

function verifyAmount(items: any[], clientAmount: number, couponDiscount: number = 0, express: boolean = false): boolean {
  if (!items || items.length === 0) return true

  let subtotal = 0
  let totalQuantity = 0
  for (const item of items) {
    // calculateItemPrice is the exact per-unit price the cart displayed,
    // including fixed-price packages, per-product area prices and weighted
    // size surcharges — all with admin overrides applied.
    const unit = calculateItemPrice({ ...item, designs: item.designs || [], sizes: item.sizes || [] })
    const qty = (item.sizes || []).reduce((sum: number, s: any) => sum + (Number(s?.quantity) || 0), 0)
    subtotal += unit * qty
    totalQuantity += qty
  }

  const discount = applyQuantityDiscount(totalQuantity, subtotal)
  const serverAmount = subtotal - discount - couponDiscount

  // Express pickup surcharge is legitimate ONLY for small orders —
  // never a silent ₪50 allowance on a big order
  const expressAllowance = express && totalQuantity <= EXPRESS_PICKUP.maxQuantity ? EXPRESS_PICKUP.cost : 0
  // Allow only shipping variance + express (when eligible) + ₪2 rounding tolerance
  const min = serverAmount - 2 // rounding
  const max = serverAmount + getLiveShippingCost('delivery') + expressAllowance + 2 // shipping + express + rounding
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

    // Server-side amount verification (if items provided) — against the same
    // prices the cart showed, admin overrides included
    if (items && Array.isArray(items) && items.length > 0) {
      await loadPricingOverrides()
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
