import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * TEMPORARY admin maintenance endpoint (same auth as /api/upscale-designs:
 * x-webhook-secret). Used for one-off order fixes requested by the owner;
 * remove after use.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.WEBHOOK_SECRET || request.headers.get('x-webhook-secret') !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json().catch(() => null)

    // List recent orders (id, name, items, upscale statuses) to locate one.
    if (body?.action === 'find') {
      const snap = await adminDb.collection('orders').orderBy('createdAt', 'desc').limit(12).get()
      const orders = snap.docs.map(d => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const o = d.data() as any
        return {
          id: d.id,
          orderNumber: o.orderNumber,
          name: `${o.customer?.firstName ?? ''} ${o.customer?.lastName ?? ''}`.trim(),
          status: o.status,
          createdAt: o.createdAt?.toDate?.()?.toISOString?.() ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: (o.items ?? []).map((it: any) => ({
            productType: it.productType,
            fabricType: it.fabricType,
            color: it.color,
            sizes: it.sizes,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            designs: (it.designs ?? []).map((dd: any) => dd.area),
          })),
          upscales: Object.fromEntries(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.entries(o.upscales ?? {}).map(([k, v]: [string, any]) => [k, { status: v?.status, error: v?.error, attempts: v?.attempts }])
          ),
        }
      })
      return NextResponse.json({ orders })
    }

    // Rename one size label on one item (display-only fix, e.g. L → M).
    if (body?.action === 'set-size') {
      const { orderId, itemIdx, from, to } = body
      if (typeof orderId !== 'string' || !Number.isInteger(itemIdx) || typeof from !== 'string' || typeof to !== 'string') {
        return NextResponse.json({ error: 'bad params' }, { status: 400 })
      }
      const ref = adminDb.collection('orders').doc(orderId)
      const snap = await ref.get()
      if (!snap.exists) return NextResponse.json({ error: 'not found' }, { status: 404 })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const order = snap.data() as any
      const items = order.items ?? []
      if (!items[itemIdx]) return NextResponse.json({ error: 'no item' }, { status: 400 })
      let changed = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items[itemIdx].sizes = (items[itemIdx].sizes ?? []).map((s: any) => {
        if (s.size === from) { changed++; return { ...s, size: to } }
        return s
      })
      if (!changed) return NextResponse.json({ error: `no size "${from}" on item ${itemIdx}`, sizes: items[itemIdx].sizes }, { status: 400 })
      await ref.update({ items })
      return NextResponse.json({ ok: true, changed })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (err) {
    console.error('order-fix error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
