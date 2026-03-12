import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedRedirect } from '@/lib/url-validation'

export async function POST(request: NextRequest) {
  try {
    const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL
    if (!MAKE_WEBHOOK_URL) {
      console.error('MAKE_WEBHOOK_URL is not configured')
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { name, phone, email, amount, description, orderId } = body

    if (amount == null || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate amount
    const verifiedAmount = Number(amount)
    if (isNaN(verifiedAmount) || verifiedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }
    if (verifiedAmount > 50000) {
      return NextResponse.json({ error: 'Amount exceeds maximum allowed (50000)' }, { status: 400 })
    }

    // Validate email format if provided
    if (email != null && email !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (typeof email !== 'string' || !emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }
    }

    // Validate phone format if provided
    if (phone != null && phone !== '') {
      const phoneRegex = /^[\d\s\-+()]{7,20}$/
      if (typeof phone !== 'string' || !phoneRegex.test(phone)) {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
      }
    }

    // Validate description length
    if (description != null && typeof description === 'string' && description.length > 500) {
      return NextResponse.json({ error: 'Description too long (max 500 characters)' }, { status: 400 })
    }

    const res = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        email,
        amount: verifiedAmount,
        description,
        orderId,
      }),
    })

    const responseText = await res.text()

    // Try to parse as JSON first
    let data: Record<string, unknown> | null = null
    try {
      data = JSON.parse(responseText)
    } catch {
      // Not valid JSON
    }

    // Extract URL — check multiple possible field names and formats
    let paymentUrl: string | null = null

    if (data) {
      paymentUrl = (data.url || data.URL || data.paymentUrl || data.link || data.payment_url) as string | null
    }

    // Fallback: if response is a plain URL string
    if (!paymentUrl && responseText.trim().startsWith('http')) {
      paymentUrl = responseText.trim()
    }

    // Fallback: extract URL from text using regex
    if (!paymentUrl) {
      const urlMatch = responseText.match(/https?:\/\/[^\s"'<>]+/)
      if (urlMatch) {
        paymentUrl = urlMatch[0]
      }
    }

    if (paymentUrl) {
      if (!isAuthorizedRedirect(paymentUrl)) {
        console.error('Blocked unauthorized payment redirect:', paymentUrl)
        return NextResponse.json({ error: 'Unauthorized payment URL' }, { status: 403 })
      }
      return NextResponse.json({ url: paymentUrl })
    }

    return NextResponse.json(
      { error: 'No payment URL returned' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Payment create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
