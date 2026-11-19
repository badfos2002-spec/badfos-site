/**
 * POST /api/admin/deals — the only write path for the `deals` collection (TICKET-022).
 * Auth is the scheme of the other admin routes (storage-cleanup, download-design):
 * `Bearer <idToken>` verified with adminAuth, then the admin identity check.
 * Actions: list | save | delete | reorder.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { slugify, uniqueSlug, validateDealInput, toDeal } from '@/lib/deals'
import { DEALS_COLLECTION, getAllDeals } from '@/lib/deals-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // ── Auth: Bearer <idToken> + admin identity (matches storage-cleanup) ──
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

  const body = await request.json().catch(() => ({}))
  const action = typeof body?.action === 'string' ? body.action : ''

  try {
    const col = adminDb.collection(DEALS_COLLECTION)

    if (action === 'list') {
      return NextResponse.json({ deals: await getAllDeals() })
    }

    if (action === 'save') {
      const parsed = validateDealInput(body?.deal)
      if (!parsed.ok) return NextResponse.json({ error: 'invalid', errors: parsed.errors }, { status: 400 })
      const { id, ...input } = parsed.value

      const all = await getAllDeals()
      const existing = id ? all.find((d) => d.id === id) : undefined
      if (id && !existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

      const taken = all.filter((d) => d.id !== id).map((d) => d.slug)
      let slug = input.slug
      if (!slug) {
        slug = uniqueSlug(slugify(input.title), taken)
      } else if (taken.includes(slug)) {
        return NextResponse.json({ error: 'invalid', errors: { slug: 'הכתובת כבר בשימוש במבצע אחר' } }, { status: 400 })
      }

      const now = new Date().toISOString()
      const doc = { ...input, slug, createdAt: existing?.createdAt || now, updatedAt: now }
      const ref = id ? col.doc(id) : col.doc()
      // set (not merge): optional fields cleared in the form must disappear from the doc
      await ref.set(doc)
      // Only one deal may drive the home hero: turning it on here turns it off everywhere else.
      if (doc.hero?.enabled) {
        const others = all.filter((d) => d.id !== ref.id && d.hero?.enabled)
        if (others.length > 0) {
          const batch = adminDb.batch()
          others.forEach((d) => batch.update(col.doc(d.id), { hero: { ...d.hero, enabled: false }, updatedAt: now }))
          await batch.commit()
        }
      }
      return NextResponse.json({ deal: toDeal(ref.id, doc) })
    }

    if (action === 'delete') {
      const id = typeof body?.id === 'string' ? body.id : ''
      if (!id) return NextResponse.json({ error: 'bad_params' }, { status: 400 })
      await col.doc(id).delete()
      return NextResponse.json({ ok: true })
    }

    if (action === 'reorder') {
      const ids = body?.ids
      if (!Array.isArray(ids) || ids.some((x) => typeof x !== 'string')) {
        return NextResponse.json({ error: 'bad_params' }, { status: 400 })
      }
      const known = new Set((await getAllDeals()).map((d) => d.id))
      if (ids.some((x: string) => !known.has(x))) return NextResponse.json({ error: 'bad_params' }, { status: 400 })
      const batch = adminDb.batch()
      const now = new Date().toISOString()
      ids.forEach((dealId: string, i: number) => batch.update(col.doc(dealId), { sortOrder: i, updatedAt: now }))
      await batch.commit()
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'bad_action' }, { status: 400 })
  } catch (e) {
    console.error('[admin/deals]', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
