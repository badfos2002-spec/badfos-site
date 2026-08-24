import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminSdkUnavailable } from '@/lib/firebase-admin'
import { runUpscaleForOrder } from '@/lib/upscale-order'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // --- Auth: Bearer <idToken> + admin identity check (matches lib/auth.ts isAdmin) ---
    const authHeader = request.headers.get('authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const idToken = authHeader.slice('Bearer '.length).trim()
    if (!idToken) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    let decoded
    try {
      decoded = await adminAuth.verifyIdToken(idToken)
    } catch {
      // A dead Admin SDK is not a bad token. verifyIdToken() on an undefined
      // adminAuth throws a TypeError, which landed here and answered 401 —
      // telling the logged-in owner to re-authenticate for a problem no login
      // can fix, and telling any monitoring that someone was poking at admin
      // auth. Fail closed either way; just say which failure it is.
      const unavailable = adminSdkUnavailable()
      if (unavailable) {
        console.error(
          '[ADMIN_SDK_UNAVAILABLE] retry-upscale: the admin token could not be verified because the Firebase ' +
          'Admin SDK is not initialised — this is an outage, not a rejected login. Reason:',
          unavailable
        )
        return NextResponse.json({ error: 'admin_sdk_unavailable' }, { status: 503 })
      }
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    if (decoded.email !== 'badfos2002@gmail.com' || decoded.email_verified !== true) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // --- Validate params ---
    const body = await request.json().catch(() => ({}))
    const orderId = body?.orderId
    if (!orderId || typeof orderId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(orderId)) {
      return NextResponse.json({ error: 'bad_params' }, { status: 400 })
    }

    const result = await runUpscaleForOrder(orderId, { retryStuckPending: true, force: true })

    if (result.notFound) {
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 })
    }
    if (result.wrongStatus) {
      return NextResponse.json({ error: 'order_not_paid', status: result.wrongStatus }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      created: result.created,
      total: result.total,
      gaveUp: result.gaveUp ?? 0,
      healed: result.healed ?? 0,
      skipped: result.skipped ?? 0,
    })
  } catch (err) {
    console.error('retry-upscale error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
