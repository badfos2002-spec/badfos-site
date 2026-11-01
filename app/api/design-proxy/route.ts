import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Same-origin image proxy for the 3D designer preview.
 *
 * Firebase Storage download URLs serve WITHOUT CORS headers, so a WebGL
 * `THREE.TextureLoader` (which requests the image with crossOrigin="anonymous")
 * can't use them — the design silently fails to appear on the 3D garment.
 * Plain <img> tags are unaffected, which is why 2D thumbnails still work.
 *
 * Streaming the bytes back through our own origin removes the cross-origin
 * problem entirely (same-origin images need no CORS). Strictly limited to our
 * own Firebase Storage bucket so it can't be turned into an open proxy (SSRF).
 */
export async function GET(request: NextRequest) {
  try {
    const raw = new URL(request.url).searchParams.get('url') ?? ''
    if (!raw) return NextResponse.json({ error: 'missing_url' }, { status: 400 })

    let target: URL
    try {
      target = new URL(raw)
    } catch {
      return NextResponse.json({ error: 'bad_url' }, { status: 400 })
    }

    // --- Allowlist: only https Firebase Storage downloads from OUR bucket ---
    if (target.protocol !== 'https:' || target.hostname !== 'firebasestorage.googleapis.com') {
      return NextResponse.json({ error: 'forbidden_host' }, { status: 400 })
    }
    // path shape: /v0/b/<bucket>/o/<object>
    const bucket = target.pathname.split('/')[3] ?? ''
    const allowed = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    const bucketOk = allowed
      ? bucket === allowed
      : /^badfos-[a-z0-9]+\.(firebasestorage\.app|appspot\.com)$/.test(bucket)
    if (!bucketOk) {
      return NextResponse.json({ error: 'forbidden_bucket' }, { status: 400 })
    }

    const upstream = await fetch(target.toString())
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'fetch_failed' }, { status: 502 })
    }
    // Stream the body through (same pattern as admin/download-design) — no
    // buffering, so less memory and CPU per request. Content-Length is forwarded
    // only when undici did not transparently decompress the body.
    const contentType = upstream.headers.get('content-type') || 'image/png'
    const contentLength = upstream.headers.get('content-encoding')
      ? null
      : upstream.headers.get('content-length')
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      // Design object names are unique + token-scoped, so the bytes never change.
      'Cache-Control': 'public, max-age=31536000, immutable',
    }
    if (contentLength) headers['Content-Length'] = contentLength

    return new NextResponse(upstream.body, { status: 200, headers })
  } catch (err) {
    console.error('design-proxy error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
