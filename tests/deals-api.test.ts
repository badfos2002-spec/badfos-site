// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createFakeDb, FIXTURE_DEALS } from './helpers/fake-deals-db'

// TICKET-022: deals are written ONLY through POST /api/admin/deals (Admin SDK,
// same Bearer + admin-identity check as storage-cleanup) and read publicly via
// GET /api/deals. No Firestore rule exposes the collection to the browser.

const h = vi.hoisted(() => ({
  fake: null as unknown as ReturnType<typeof import('./helpers/fake-deals-db').createFakeDb>,
  verifyIdToken: vi.fn(),
}))

vi.mock('@/lib/firebase-admin', () => ({
  get adminDb() {
    return h.fake.db
  },
  adminAuth: { verifyIdToken: h.verifyIdToken },
}))

import { POST } from '@/app/api/admin/deals/route'
import { GET } from '@/app/api/deals/route'
import { getHeroDeal } from '@/lib/deals-server'

const ADMIN = { email: 'badfos2002@gmail.com', email_verified: true }

function post(body: unknown, token: string | null = 'good') {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token !== null) headers.authorization = `Bearer ${token}`
  return POST(new NextRequest('https://badfos.co.il/api/admin/deals', { method: 'POST', headers, body: JSON.stringify(body) }))
}

const validDeal = {
  title: 'מבצע חדש',
  slug: 'מבצע-חדש',
  shortText: 'טקסט קצר',
  priceText: '₪35 לחולצה',
  isActive: true,
  sortOrder: 5,
}

beforeEach(() => {
  h.fake = createFakeDb(FIXTURE_DEALS)
  h.verifyIdToken.mockReset()
  h.verifyIdToken.mockImplementation(async (t: string) => {
    if (t === 'good') return ADMIN
    if (t === 'other') return { email: 'someone@example.com', email_verified: true }
    if (t === 'unverified') return { email: ADMIN.email, email_verified: false }
    throw new Error('bad token')
  })
})

describe('POST /api/admin/deals — auth', () => {
  it('401 without a Bearer token', async () => {
    expect((await post({ action: 'list' }, null)).status).toBe(401)
  })
  it('401 with an invalid token', async () => {
    expect((await post({ action: 'list' }, 'garbage')).status).toBe(401)
  })
  it('403 for a non-admin or unverified email', async () => {
    expect((await post({ action: 'list' }, 'other')).status).toBe(403)
    expect((await post({ action: 'list' }, 'unverified')).status).toBe(403)
  })
  it('400 for an unknown action', async () => {
    expect((await post({ action: 'nuke' })).status).toBe(400)
  })
})

describe('POST /api/admin/deals — list', () => {
  it('returns every deal including inactive and expired, sorted', async () => {
    const res = await post({ action: 'list' })
    expect(res.status).toBe(200)
    const { deals } = await res.json()
    expect(deals.map((d: { id: string }) => d.id)).toEqual(['live2', 'live1', 'expired', 'inactive'])
  })
})

describe('POST /api/admin/deals — save', () => {
  it('creates a new deal with trimmed fields and timestamps', async () => {
    const res = await post({ action: 'save', deal: { ...validDeal, title: '  מבצע חדש  ' } })
    expect(res.status).toBe(200)
    const { deal } = await res.json()
    expect(deal.id).toBeTruthy()
    expect(deal.title).toBe('מבצע חדש')
    expect(deal.createdAt).toBeTruthy()
    expect(h.fake.store.get(deal.id)?.title).toBe('מבצע חדש')
  })
  it('updates an existing deal and keeps createdAt', async () => {
    const res = await post({ action: 'save', deal: { ...validDeal, id: 'live2', slug: 'כובעים', title: 'כובעים!' } })
    expect(res.status).toBe(200)
    const stored = h.fake.store.get('live2')!
    expect(stored.title).toBe('כובעים!')
    expect(stored.createdAt).toBe('2026-11-05T10:00:00.000Z')
  })
  it('rejects an order href outside ORDER_TARGETS', async () => {
    const res = await post({ action: 'save', deal: { ...validDeal, order: { href: 'https://evil.example/pay' } } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.errors.order).toBeTruthy()
    expect(h.fake.writes).toHaveLength(0)
  })
  it('rejects a title over 80 characters', async () => {
    const res = await post({ action: 'save', deal: { ...validDeal, title: 'א'.repeat(81) } })
    expect(res.status).toBe(400)
    expect((await res.json()).errors.title).toBeTruthy()
  })
  it('rejects a slug already used by another deal', async () => {
    const res = await post({ action: 'save', deal: { ...validDeal, slug: 'מבצע-חורף' } })
    expect(res.status).toBe(400)
    expect((await res.json()).errors.slug).toBeTruthy()
    expect(h.fake.writes).toHaveLength(0)
  })
  it('auto-generates a unique slug from the title when none is given', async () => {
    const res = await post({ action: 'save', deal: { ...validDeal, slug: '', title: 'מבצע חורף' } })
    expect(res.status).toBe(200)
    expect((await res.json()).deal.slug).toBe('מבצע-חורף-2')
  })
  it('404 when updating an id that does not exist', async () => {
    const res = await post({ action: 'save', deal: { ...validDeal, id: 'nope' } })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/admin/deals — delete / reorder', () => {
  it('deletes by id', async () => {
    const res = await post({ action: 'delete', id: 'expired' })
    expect(res.status).toBe(200)
    expect(h.fake.store.has('expired')).toBe(false)
  })
  it('reorder sets sortOrder by position', async () => {
    const res = await post({ action: 'reorder', ids: ['inactive', 'live1', 'live2', 'expired'] })
    expect(res.status).toBe(200)
    expect(h.fake.store.get('inactive')?.sortOrder).toBe(0)
    expect(h.fake.store.get('live1')?.sortOrder).toBe(1)
    expect(h.fake.store.get('live2')?.sortOrder).toBe(2)
    expect(h.fake.store.get('expired')?.sortOrder).toBe(3)
  })
  it('reorder rejects unknown ids or a non-array', async () => {
    expect((await post({ action: 'reorder', ids: ['live1', 'ghost'] })).status).toBe(400)
    expect((await post({ action: 'reorder', ids: 'live1' })).status).toBe(400)
  })
})

describe('GET /api/deals (public)', () => {
  it('returns only live deals, sorted, with the cache header and no extra fields', async () => {
    const res = await GET(new Request('https://badfos.co.il/api/deals'))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('s-maxage=60, stale-while-revalidate=300')
    const { deals } = await res.json()
    expect(deals.map((d: { id: string }) => d.id)).toEqual(['live2', 'live1'])
    expect(deals[1]).not.toHaveProperty('secretAdminNote')
    expect(deals[1].order).toEqual({ href: '/designer/sweatshirt', label: 'להזמנת סווטשרט', couponCode: 'WINTER20' })
  })
})

describe('hero deal (Addendum A)', () => {
  it('getHeroDeal returns the first LIVE deal with hero.enabled (inactive ones skipped)', async () => {
    const d = await getHeroDeal()
    expect(d?.id).toBe('live2')
    expect(d?.hero).toEqual({ enabled: true, title: 'כובעים בהירו', text: 'טקסט הירו', ctaLabel: 'לכובעים' })
  })
  it('getHeroDeal returns null when no live deal is in the hero', async () => {
    h.fake = createFakeDb({ live1: FIXTURE_DEALS.live1, inactive: FIXTURE_DEALS.inactive })
    expect(await getHeroDeal()).toBeNull()
  })
  it('saving a deal with hero.enabled turns the hero off on every other deal', async () => {
    const res = await post({ action: 'save', deal: { ...validDeal, id: 'live1', slug: 'מבצע-חורף', hero: { enabled: true, title: 'חורף בהירו' } } })
    expect(res.status).toBe(200)
    expect((h.fake.store.get('live1')?.hero as { enabled: boolean }).enabled).toBe(true)
    expect((h.fake.store.get('live2')?.hero as { enabled: boolean }).enabled).toBe(false)
    expect((h.fake.store.get('inactive')?.hero as { enabled: boolean }).enabled).toBe(false)
    expect((await getHeroDeal())?.id).toBe('live1')
  })
  it('saving a deal without the hero leaves the current hero deal alone', async () => {
    await post({ action: 'save', deal: { ...validDeal, id: 'live1', slug: 'מבצע-חורף' } })
    expect((h.fake.store.get('live2')?.hero as { enabled: boolean }).enabled).toBe(true)
  })
  it('rejects hero overrides over the limits', async () => {
    const res = await post({ action: 'save', deal: { ...validDeal, hero: { enabled: true, title: 'א'.repeat(61), text: 'ב'.repeat(161) } } })
    expect(res.status).toBe(400)
    const { errors } = await res.json()
    expect(errors.heroTitle).toBeTruthy()
    expect(errors.heroText).toBeTruthy()
  })
  it('GET /api/deals?hero=1 returns the single hero deal', async () => {
    const res = await GET(new Request('https://badfos.co.il/api/deals?hero=1'))
    const body = await res.json()
    expect(body.deal.id).toBe('live2')
    expect(body.deals).toBeUndefined()
  })
})
