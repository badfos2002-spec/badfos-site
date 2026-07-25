import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

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

    // --- Resolve the design + url ---
    const design = order?.items?.[itemIdx]?.designs?.find((x: any) => x.area === area)
    let url: string | undefined
    if (variant === 'source') {
      url = design?.imageUrl
    } else {
      url = order?.upscales?.[`${itemIdx}_${area}`]?.url
    }
    if (!url) {
      return NextResponse.json({ error: 'file_missing' }, { status: 404 })
    }

    // --- Build the download filename (Hebrew) ---
    const areaLabel = design?.areaName || area
    const orderNo = order?.orderNumber ?? orderId
    const baseName =
      variant === 'upscale'
        ? `עיצוב-לדפוס-${areaLabel}-${orderNo}`
        : `עיצוב-${areaLabel}-${orderNo}`

    // --- Get the file bytes + contentType ---
    let buffer: Buffer
    let contentType: string
    if (url.startsWith('data:')) {
      const match = url.match(/^data:([^;]+);base64,(.*)$/)
      if (!match) {
        return NextResponse.json({ error: 'unsupported_url' }, { status: 400 })
      }
      buffer = Buffer.from(match[2], 'base64')
      contentType = match[1] || 'image/png'
    } else if (url.startsWith('https://firebasestorage.googleapis.com/')) {
      const r = await fetch(url)
      if (!r.ok) {
        return NextResponse.json({ error: 'fetch_failed' }, { status: 502 })
      }
      buffer = Buffer.from(await r.arrayBuffer())
      contentType = r.headers.get('content-type') || 'image/png'
    } else {
      return NextResponse.json({ error: 'unsupported_url' }, { status: 400 })
    }

    // --- Extension from contentType ---
    const ext =
      contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/webp' ? 'webp' : 'png'

    // --- Content-Disposition: ASCII fallback + RFC 5987 UTF-8 (Hebrew is non-ASCII) ---
    const fname = `${baseName}.${ext}`
    const asciiFallback = `design.${ext}`
    const disposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fname)}`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'private, no-store',
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    console.error('download-design error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
