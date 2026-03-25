import { NextRequest, NextResponse } from 'next/server'

const LEAD_WEBHOOK_URL = process.env.LEAD_WEBHOOK_URL

/**
 * Sends lead data to Zapier/Make webhook.
 * Configure LEAD_WEBHOOK_URL in Vercel environment variables.
 */
export async function POST(request: NextRequest) {
  if (!LEAD_WEBHOOK_URL) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 200 })
  }

  try {
    const body = await request.json()

    const payload = {
      name: body.name || '',
      phone: body.phone || '',
      email: body.email || '',
      message: body.message || '',
      source: body.source || '',
      ...(body.gclid ? { gclid: String(body.gclid).trim().replace(/^gclid=/i, '') } : {}),
      timestamp: new Date().toISOString(),
    }

    const response = await fetch(LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('Lead webhook failed:', response.status)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Lead webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
