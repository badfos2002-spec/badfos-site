import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limit store: IP → { count, resetAt }
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Limits per route (requests per 60 seconds)
const RATE_LIMITS: Record<string, number> = {
  '/api/send-email': 10,
  '/api/generate-design': 5,
  '/api/payment/create': 15,
  '/api/lead-webhook': 10,
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CSRF protection — reject cross-origin POST to non-webhook API routes
  if (request.method === 'POST' && pathname.startsWith('/api/') && !pathname.includes('/webhooks')) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    if (origin && host && !origin.includes(host) && !origin.includes('badfos.co.il')) {
      return NextResponse.json({ error: 'CSRF rejected' }, { status: 403 })
    }
  }

  // Redirect uppercase URLs to lowercase (Google Tag Assistant sends /Designer/Designer)
  if (pathname !== pathname.toLowerCase() && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.toLowerCase()
    return NextResponse.redirect(url, 301)
  }

  // Admin API rate limiting — extra strict since auth is client-side only
  // TODO: Implement Firebase Custom Claims + session cookie for server-side admin auth
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const ip = getClientIp(request)
    const adminKey = `admin:${ip}`
    const now = Date.now()
    const entry = rateLimitStore.get(adminKey)
    if (!entry || entry.resetAt < now) {
      rateLimitStore.set(adminKey, { count: 1, resetAt: now + 60_000 })
    } else if (entry.count > 60) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    } else {
      entry.count++
    }
  }

  const limit = RATE_LIMITS[pathname]

  if (!limit) return NextResponse.next()

  const ip = getClientIp(request)
  const key = `${ip}:${pathname}`
  const now = Date.now()
  const windowMs = 60_000 // 1 minute

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return NextResponse.next()
  }

  if (entry.count >= limit) {
    return NextResponse.json(
      { error: 'יותר מדי בקשות. נסה שוב בעוד דקה.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      }
    )
  }

  entry.count++
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/send-email', '/api/generate-design', '/((?!_next|favicon|icon|assets|logo).*)'],
}
