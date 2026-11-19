import { describe, it, expect, vi, beforeEach } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createFakeDb, FIXTURE_DEALS } from './helpers/fake-deals-db'

// TICKET-023: /deals/<unknown-slug> answered HTTP 200 with the not-found page —
// a soft 404, which Google indexes. The page already called notFound(); what
// swallowed the status was `app/loading.tsx`, the ROOT segment's loading file.
// It wraps the children of the root segment — i.e. every page in the app — in an
// implicit <Suspense>. A dynamically rendered page is then outside the React
// shell: Next finishes the shell (root layout + spinner), flushes it and writes
// HTTP 200, and only afterwards does the page's notFound() throw arrive inside
// the boundary. Next sets 404 only in the catch around the SHELL render
// (next/dist/server/app-render/app-render.js: `if (isNotFoundError(err))
// res.statusCode = 404`), which a throw inside a Suspense boundary never
// reaches. Proof matrix in .tickets/EXEC-023-rootcause.md.

const h = vi.hoisted(() => ({
  fake: null as unknown as ReturnType<typeof import('./helpers/fake-deals-db').createFakeDb>,
}))

vi.mock('@/lib/firebase-admin', () => ({
  get adminDb() {
    return h.fake.db
  },
  adminAuth: {},
}))

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

import { generateMetadata as detailMetadata, revalidate } from '@/app/deals/[slug]/page'

beforeEach(() => {
  h.fake = createFakeDb(FIXTURE_DEALS)
})

const enc = (s: string) => encodeURIComponent(s)

// The not-found page (app/not-found.tsx) says «העמוד לא נמצא»; the tab title of
// a missing deal must say the same instead of inheriting the root layout's
// «בדפוס - הדפסת חולצות...», which read as a real page to a crawler.
const NOT_FOUND_TITLE = 'העמוד לא נמצא | בדפוס'

describe('/deals/[slug] generateMetadata — a deal that is not live', () => {
  const MISSING: [string, string][] = [
    ['unknown', 'nope'],
    ['expired', enc('נגמר')],
    ['inactive', enc('כבוי')],
  ]

  for (const [label, slug] of MISSING) {
    it(`${label}: a plain not-found title, nothing else, and it does not throw`, async () => {
      const md = await detailMetadata({ params: { slug } })
      expect(md.title).toBe(NOT_FOUND_TITLE)
      // "Plain" — a 404 must not carry a canonical, an og/twitter card or an image.
      expect(Object.keys(md)).toEqual(['title'])
    })

    it(`${label}: leaks no deal image and no deal text`, async () => {
      const md = await detailMetadata({ params: { slug } })
      expect(md.openGraph?.images).toBeUndefined()
      const serialized = JSON.stringify(md)
      expect(serialized).not.toContain('/images/deals/')
      expect(serialized).not.toContain('מבצע שנגמר')
      expect(serialized).not.toContain('מבצע כבוי')
    })
  }
})

// Spec item 1 says live deals stay exactly as they are. These assertions exist
// so the 404 branch cannot regress them.
describe('/deals/[slug] generateMetadata — a live deal is unchanged', () => {
  it('keeps the title, the canonical and the desktop og image', async () => {
    const md = await detailMetadata({ params: { slug: enc('מבצע-חורף') } })
    expect(md.title).toBe('מבצע חורף | מבצע בבדפוס')
    expect(md.description).toBe('סווטשרטים במחיר מיוחד לכל החורף')
    expect(md.alternates?.canonical).toBe(`/deals/${enc('מבצע-חורף')}`)
    const images = md.openGraph?.images as { url: string }[]
    expect(images[0].url).toBe('https://badfos.co.il/images/deals/d.jpg')
  })

  it('falls back to the mobile image', async () => {
    const md = await detailMetadata({ params: { slug: enc('כובעים') } })
    const images = md.openGraph?.images as { url: string }[]
    expect(images[0].url).toBe('https://badfos.co.il/images/deals/cap.jpg')
  })

  // TICKET-023 spec item 3: the fix must not cost the ISR cache. force-dynamic
  // was measured and buys nothing (it soft-404s just the same), so the route
  // keeps revalidate = 60 and never becomes a per-request Firestore read.
  it('still exports revalidate = 60 (no force-dynamic)', () => {
    expect(revalidate).toBe(60)
  })
})

// THE MECHANISM GUARD. A loading.tsx anywhere at or above /deals/[slug] puts the
// page back inside a Suspense boundary, the shell flushes with HTTP 200 before
// notFound() is seen, and the soft 404 of TICKET-023 returns — silently, because
// the not-found UI still renders and only the status code is wrong. If you need a
// loading fallback, put it on a leaf segment that never calls notFound().
describe('no loading.tsx above /deals/[slug] (guards the TICKET-023 soft 404)', () => {
  const SEGMENTS = [
    ['app', join('app')],
    ['app/deals', join('app', 'deals')],
    ['app/deals/[slug]', join('app', 'deals', '[slug]')],
  ] as const

  for (const [label, dir] of SEGMENTS) {
    it(`${label} has no loading.tsx`, () => {
      expect(existsSync(join(__dirname, '..', dir, 'loading.tsx'))).toBe(false)
    })
  }
})
