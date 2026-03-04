import { NextRequest, NextResponse } from 'next/server'

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 Incoming request body:', JSON.stringify(body))

    const { name, phone, email, amount, description, orderId } = body

    console.log('📤 Parsed fields:', JSON.stringify({ name, phone, email, amount, description, orderId }))
    console.log('📤 Field types:', JSON.stringify({
      name: typeof name,
      amount: typeof amount,
      amountValue: amount,
    }))

    if (amount == null || !name) {
      console.error('❌ Missing fields - amount:', JSON.stringify(amount), 'name:', JSON.stringify(name))
      return NextResponse.json({ error: `Missing required fields: amount=${amount}, name=${name}` }, { status: 400 })
    }

    const res = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        email,
        amount,
        description,
        orderId,
      }),
    })

    console.log('📥 Make response status:', res.status)
    console.log('📥 Make response headers:', Object.fromEntries(res.headers.entries()))

    const responseText = await res.text()
    console.log('📥 Make response body (raw):', JSON.stringify(responseText))
    console.log('📥 Make response body (length):', responseText.length)

    // Try to parse as JSON first
    let data: Record<string, unknown> | null = null
    try {
      data = JSON.parse(responseText)
    } catch {
      console.log('⚠️ Not valid JSON, trying to extract URL from text...')
    }

    // Extract URL — check multiple possible field names and formats
    let paymentUrl: string | null = null

    if (data) {
      // Standard fields: url, URL, paymentUrl, link, payment_url
      paymentUrl = (data.url || data.URL || data.paymentUrl || data.link || data.payment_url) as string | null
      console.log('📥 Parsed JSON keys:', Object.keys(data))
      console.log('📥 Parsed JSON:', JSON.stringify(data))
    }

    // Fallback: if response is a plain URL string (no JSON wrapping)
    if (!paymentUrl && responseText.trim().startsWith('http')) {
      paymentUrl = responseText.trim()
      console.log('📥 Response is a plain URL')
    }

    // Fallback: extract URL from text using regex
    if (!paymentUrl) {
      const urlMatch = responseText.match(/https?:\/\/[^\s"'<>]+/)
      if (urlMatch) {
        paymentUrl = urlMatch[0]
        console.log('📥 Extracted URL via regex:', paymentUrl)
      }
    }

    if (paymentUrl) {
      console.log('✅ Payment URL:', paymentUrl)
      return NextResponse.json({ url: paymentUrl })
    }

    console.error('❌ No URL found in response:', responseText)
    return NextResponse.json(
      { error: 'No payment URL returned', raw: responseText },
      { status: 400 }
    )
  } catch (error) {
    console.error('❌ Payment create error:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}
