// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// TICKET-032 — כפתור «📦 זיפ לדפוס» קורא ל-/api/admin/retry-upscale לפני
// שהוא אורז, ואז מחכה. כדי שיידע למה לחכות הוא צריך לדעת אילו מפתחות באמת
// נשלחו מחדש להגדלה: runUpscaleForOrder כבר מחשב את זה (claimed[].key),
// והמסלול מחזיר את זה כ-claimedKeys ליד המונים. שום דבר אחר במסלול לא משתנה.

const h = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  runUpscaleForOrder: vi.fn(),
  orderData: null as Record<string, unknown> | null,
}))

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: { verifyIdToken: h.verifyIdToken },
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: h.orderData !== null, data: () => h.orderData }),
      }),
    }),
  },
  adminSdkUnavailable: () => null,
}))

vi.mock('@/lib/upscale-order', () => ({
  runUpscaleForOrder: h.runUpscaleForOrder,
}))

import { POST } from '@/app/api/admin/retry-upscale/route'

const ADMIN = { email: 'badfos2002@gmail.com', email_verified: true }

function post(body: unknown, token: string | null = 'good') {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token !== null) headers.authorization = `Bearer ${token}`
  return POST(
    new NextRequest('https://badfos.co.il/api/admin/retry-upscale', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  h.orderData = { status: 'paid' }
  h.verifyIdToken.mockReset()
  h.verifyIdToken.mockImplementation(async (t: string) => {
    if (t === 'good') return ADMIN
    throw new Error('bad token')
  })
  h.runUpscaleForOrder.mockReset()
})

describe('POST /api/admin/retry-upscale — claimedKeys', () => {
  it('מחזיר את המפתחות שנשלחו מחדש להגדלה', async () => {
    h.runUpscaleForOrder.mockResolvedValue({
      created: 2,
      total: 2,
      gaveUp: 0,
      skipped: 0,
      healed: 0,
      claimedKeys: ['0_front_full', '1_back'],
    })
    const res = await post({ orderId: 'order1' })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      success: true,
      created: 2,
      total: 2,
      claimedKeys: ['0_front_full', '1_back'],
    })
  })

  it('לא נתבע כלום — רשימה ריקה, לא חסר ולא undefined', async () => {
    h.runUpscaleForOrder.mockResolvedValue({
      created: 0,
      total: 0,
      gaveUp: 0,
      skipped: 1,
      healed: 1,
      claimedKeys: [],
    })
    const data = await (await post({ orderId: 'order1' })).json()
    expect(data.claimedKeys).toEqual([])
  })

  it('המונים הקיימים נשארים כמו שהם', async () => {
    h.runUpscaleForOrder.mockResolvedValue({
      created: 1,
      total: 3,
      gaveUp: 2,
      skipped: 4,
      healed: 5,
      sourceMissing: 6,
      claimedKeys: ['0_back'],
    })
    expect(await (await post({ orderId: 'order1' })).json()).toEqual({
      success: true,
      created: 1,
      total: 3,
      gaveUp: 2,
      skipped: 4,
      healed: 5,
      sourceMissing: 6,
      claimedKeys: ['0_back'],
    })
  })

  it('מסלולי העצירה המוקדמת לא נגעו', async () => {
    h.runUpscaleForOrder.mockResolvedValue({ notFound: true, created: 0, total: 0, gaveUp: 0, skipped: 0, healed: 0, claimedKeys: [] })
    expect((await post({ orderId: 'order1' })).status).toBe(404)

    h.runUpscaleForOrder.mockResolvedValue({ wrongStatus: 'pending_payment', created: 0, total: 0, gaveUp: 0, skipped: 0, healed: 0, claimedKeys: [] })
    expect((await post({ orderId: 'order1' })).status).toBe(400)

    h.runUpscaleForOrder.mockResolvedValue({ designsCleaned: true, created: 0, total: 0, gaveUp: 0, skipped: 0, healed: 0, claimedKeys: [] })
    expect((await post({ orderId: 'order1' })).status).toBe(409)

    h.orderData = { status: 'paid', source: 'manual' }
    expect((await post({ orderId: 'order1' })).status).toBe(400)
  })
})
