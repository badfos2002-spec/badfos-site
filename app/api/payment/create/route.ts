import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, amount, description, orderId } = body

    if (amount == null || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Server-side amount validation: fetch order and verify total matches
    let verifiedAmount = Number(amount)
    if (orderId) {
      const snapshot = await adminDb
        .collection('orders')
        .where('paymentId', '==', orderId)
        .limit(1)
        .get()
      if (!snapshot.empty) {
        const order = snapshot.docs[0].data()
        const serverTotal = Number(order.total)
        if (Math.abs(serverTotal - verifiedAmount) > 1) {
          return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
        }
        verifiedAmount = serverTotal // Use server-side amount
      }
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
