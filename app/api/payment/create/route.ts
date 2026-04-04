import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedRedirect } from '@/lib/url-validation'

// Server-side price verification constants (mirrors lib/constants.ts)
const BASE_PRICES: Record<string, number> = { tshirt: 37, sweatshirt: 53, buff: 8, cap: 0, apron: 29 }
const FABRIC_SURCHARGES: Record<string, number> = { cotton: 0, 'dri-fit': 0, polo: 10, oversized: 10 }
const AREA_SURCHARGES: Record<string, number> = { front_full: 10, back: 10, chest_logo: 5, chest_logo_right: 5, center: 10 }
const SIZE_SURCHARGES: Record<string, number> = { '3XL': 12, '4XL': 12 }
const SHIPPING_COST = 35
const QUANTITY_DISCOUNT_THRESHOLD = 15
const QUANTITY_DISCOUNT_PERCENT = 5

function calculateServerAmount(items: any[], couponDiscount: number = 0): number {
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

  return subtotal - discount - couponDiscount
}

function verifyAmount(items: any[], clientAmount: number, couponDiscount: number = 0): boolean {
  if (!items || items.length === 0) return true
  const serverAmount = calculateServerAmount(items, couponDiscount)
  // Allow only shipping variance (₪0-35) + ₪2 rounding tolerance
  const min = serverAmount - 2 // rounding
  const max = serverAmount + SHIPPING_COST + 2 // shipping + rounding
  if (clientAmount < min || clientAmount > max) {
    console.error(`Price mismatch: server=${serverAmount}, client=${clientAmount}, diff=${clientAmount - serverAmount}`)
    return false
  }
  return true
}

export async function POST(request: NextRequest) {
  try {
    const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL
    if (!MAKE_WEBHOOK_URL) {
      console.error('MAKE_WEBHOOK_URL is not configured')
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { name, phone, email, amount, description, orderId, items, couponDiscount, gclid: rawGclid } = body
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
      if (!verifyAmount(items, verifiedAmount, couponDiscount || 0)) {
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
