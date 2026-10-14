import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth, adminSdkUnavailable } from '@/lib/firebase-admin'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId') ?? ''
    const itemIdxParam = searchParams.get('itemIdx') ?? ''
    const area = searchParams.get('area') ?? ''
    const variant = searchParams.get('variant') ?? ''

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
          '[ADMIN_SDK_UNAVAILABLE] download-design: the admin token could not be verified because the Firebase ' +
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
    if (!orderId || !/^[A-Za-z0-9_-]+$/.test(orderId)) {
      return NextResponse.json({ error: 'bad_params' }, { status: 400 })
    }
    const itemIdx = Number(itemIdxParam)
    if (!Number.isInteger(itemIdx) || itemIdx < 0) {
      return NextResponse.json({ error: 'bad_params' }, { status: 400 })
    }
    if (!area || !/^[A-Za-z0-9_]+$/.test(area)) {
      return NextResponse.json({ error: 'bad_params' }, { status: 400 })
    }
    if (variant !== 'source' && variant !== 'upscale') {
      return NextResponse.json({ error: 'bad_params' }, { status: 400 })
    }

    // --- Fetch the order ---
    const snap = await adminDb.collection('orders').doc(orderId).get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 })
    }
    const order = snap.data()

    // Design files of 30+ day old orders are swept from Storage by the nightly
    // cleanup cron, which stamps designsDeleted on the order doc. When that
    // flag is set, a missing or unfetchable file has one real explanation —
    // answer 410 file_swept instead of a misleading generic failure.
    const designsSwept = order?.designsDeleted === true
    const sweptResponse = () => {
      const deletedAt = order?.designsDeletedAt?.toDate?.()?.toISOString?.()
      // Files deleted by the emergency storage sweep (designsDeletedReason
      // 'storage_limit' — the since-fixed bug that hit fresh orders) get their
      // own token: the admin UI answers with the truth and offers regeneration
      // via the retry-upscale button, instead of the "30-day policy" story.
      const error =
        order?.designsDeletedReason === 'storage_limit' ? 'file_swept_storage' : 'file_swept'
      return NextResponse.json(
        deletedAt ? { error, deletedAt } : { error },
        { status: 410 }
      )
    }

    // --- Resolve the design + url ---
    const design = order?.items?.[itemIdx]?.designs?.find((x: any) => x.area === area)
    let url: string | undefined
    if (variant === 'source') {
      url = design?.imageUrl
    } else {
      url = order?.upscales?.[`${itemIdx}_${area}`]?.url
    }
    if (!url) {
      if (designsSwept) return sweptResponse()
      return NextResponse.json({ error: 'file_missing' }, { status: 404 })
    }

    // --- Build the download filename (Hebrew) ---
    const areaLabel = design?.areaName || area
    const orderNo = order?.orderNumber ?? orderId
    const baseName =
      variant === 'upscale'
        ? `עיצוב-לדפוס-${areaLabel}-${orderNo}`
        : `עיצוב-${areaLabel}-${orderNo}`

    // --- Download headers for a given contentType (+ length when known) ---
    // Content-Disposition: ASCII fallback + RFC 5987 UTF-8 (Hebrew is non-ASCII)
    const headersFor = (contentType: string, contentLength?: string | null) => {
      const ext =
        contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/webp' ? 'webp' : 'png'
      const fname = `${baseName}.${ext}`
      const asciiFallback = `design.${ext}`
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fname)}`,
        'Cache-Control': 'private, no-store',
      }
      if (contentLength) headers['Content-Length'] = contentLength
      return headers
    }

    // --- Serve the file ---
    if (url.startsWith('data:')) {
      // Inline base64 lives in the Firestore doc (≤1MB) — buffering is fine here.
      const match = url.match(/^data:([^;]+);base64,(.*)$/)
      if (!match) {
        if (designsSwept) return sweptResponse()
        return NextResponse.json({ error: 'unsupported_url' }, { status: 400 })
      }
      const buffer = Buffer.from(match[2], 'base64')
      const contentType = match[1] || 'image/png'
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: headersFor(contentType, String(buffer.length)),
      })
    }

    if (url.startsWith('https://firebasestorage.googleapis.com/')) {
      const r = await fetch(url)
      if (!r.ok || !r.body) {
        if (designsSwept) return sweptResponse()
        return NextResponse.json({ error: 'fetch_failed' }, { status: 502 })
      }
      // Upscaled files are 4x of sources that can reach 30MB — hundreds of MB.
      // Buffering them (arrayBuffer) OOM-killed the function on Vercel: a
      // silent 502 with no log line (FUNCTION_INVOCATION_FAILED). Stream the
      // upstream body straight through instead — constant memory, and the
      // response starts immediately. Content-Length is forwarded only when the
      // body is not transparently decompressed (content-encoding present means
      // undici decompressed it and the upstream length no longer matches).
      const contentType = r.headers.get('content-type') || 'image/png'
      const contentLength = r.headers.get('content-encoding')
        ? null
        : r.headers.get('content-length')
      return new NextResponse(r.body, {
        status: 200,
        headers: headersFor(contentType, contentLength),
      })
    }

    if (designsSwept) return sweptResponse()
    return NextResponse.json({ error: 'unsupported_url' }, { status: 400 })
  } catch (err) {
    console.error('download-design error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
