import { NextRequest, NextResponse } from 'next/server'

const LEAD_WEBHOOK_URL = process.env.LEAD_WEBHOOK_URL

// Simple in-memory per-IP rate limiter (resets on redeploy). This public
// endpoint forwards to the external lead pipeline, so it must be throttled
// against fake-lead / quota-exhaustion spam. Generous cap — a real visitor
// submits a handful of times at most.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 60_000 // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

/**
 * Sends lead data to Zapier/Make webhook.
 * Configure LEAD_WEBHOOK_URL in Vercel environment variables.
 */
export async function POST(request: NextRequest) {
  if (!LEAD_WEBHOOK_URL) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
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
