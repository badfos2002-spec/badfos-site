import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render, screen } from '@testing-library/react'
import { BUSINESS_ADDRESS, CONTACT_INFO } from '@/lib/constants'

// TICKET-014: the business moved to אליהו איתן 3, בית גירון, קומה 3, ראשון לציון.
// BUSINESS_ADDRESS in lib/constants.ts is the single source of truth.

const ROOT = join(__dirname, '..')
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

describe('BUSINESS_ADDRESS constant', () => {
  it('full address has street, building, floor and city', () => {
    for (const part of ['אליהו איתן 3', 'בית גירון', 'קומה 3', 'ראשון לציון']) {
      expect(BUSINESS_ADDRESS.full).toContain(part)
    }
  })
  it('CONTACT_INFO.address is the full address', () => {
    expect(CONTACT_INFO.address).toBe(BUSINESS_ADDRESS.full)
  })
  it('streetLine has no city', () => {
    expect(BUSINESS_ADDRESS.streetLine).not.toContain(BUSINESS_ADDRESS.city)
  })
})

describe('no stale old address anywhere in the source', () => {
  const OLD = ['דובנוב', '7520501', '31.9635', '34.8073']
  const SKIP = new Set(['node_modules', '.next'])
  function walk(dir: string, out: string[]) {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p, out)
      else if (/\.(ts|tsx)$/.test(name)) out.push(p)
    }
    return out
  }
  it('app/, components/, lib/ and docs/SYSTEM-BRIEFING.md are clean', () => {
    const files = [
      ...walk(join(ROOT, 'app'), []),
      ...walk(join(ROOT, 'components'), []),
      ...walk(join(ROOT, 'lib'), []),
      join(ROOT, 'docs', 'SYSTEM-BRIEFING.md'),
    ]
    const offenders = files
      .filter((f) => {
        const src = readFileSync(f, 'utf8')
        return OLD.some((s) => src.includes(s))
      })
      .map((f) => relative(ROOT, f))
    expect(offenders, `old address found in: ${offenders.join(', ')}`).toEqual([])
  })
})

describe('JSON-LD uses BUSINESS_ADDRESS', () => {
  for (const file of ['app/layout.tsx', 'app/contact/layout.tsx']) {
    it(`${file} imports and references BUSINESS_ADDRESS`, () => {
      const src = read(file)
      expect(src).toMatch(/import\s*\{[^}]*\bBUSINESS_ADDRESS\b[^}]*\}\s*from\s*'@\/lib\/constants'/)
      expect(src).toContain('BUSINESS_ADDRESS.streetLine')
      expect(src).toContain('BUSINESS_ADDRESS.postalCode')
      expect(src).toContain('BUSINESS_ADDRESS.city')
    })
  }
  it('root layout geo comes from BUSINESS_ADDRESS.lat/.lng', () => {
    const src = read('app/layout.tsx')
    expect(src).toContain('BUSINESS_ADDRESS.lat')
    expect(src).toContain('BUSINESS_ADDRESS.lng')
  })
})

describe('google-business API always returns our address', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
    vi.restoreAllMocks()
    delete process.env.GOOGLE_PLACES_API_KEY
  })

  async function loadRoute() {
    vi.resetModules()
    process.env.GOOGLE_PLACES_API_KEY = 'test'
    vi.spyOn(console, 'error').mockImplementation(() => {})
    return import('@/app/api/google-business/route')
  }

  it('failure fallback returns CONTACT_INFO.address', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })))
    const { GET } = await loadRoute()
    const res = await GET()
    const address = (await res.json()).address
    expect(address).toBe(CONTACT_INFO.address)
    expect(address).toContain('אליהו איתן 3')
  })

  it('success payload ignores Google formattedAddress', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ displayName: { text: 'בדפוס' }, formattedAddress: 'דובנוב 10, ראשון לציון', rating: 5 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    const { GET } = await loadRoute()
    const res = await GET()
    const body = await res.json()
    expect(body.name).toBe('בדפוס')
    expect(body.address).toBe(CONTACT_INFO.address)
    expect(body.address).toContain('אליהו איתן 3')
  })
})

vi.mock('@/lib/tracking', () => ({ trackWhatsAppClick: vi.fn() }))

describe('RishonLayout StatStrip shows the new address', () => {
  it('renders street as the value and building/floor/city as the label', async () => {
    if (!('IntersectionObserver' in globalThis)) {
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          observe() {}
          unobserve() {}
          disconnect() {}
          takeRecords() { return [] }
        },
      )
    }
    const { getSeoPage } = await import('@/lib/seo-pages')
    const { default: RishonLayout } = await import('@/components/seo/layouts/RishonLayout')
    const page = getSeoPage('הדפסת-חולצות-בראשון-לציון')!
    expect(page).toBeTruthy()
    render(<RishonLayout page={page} waUrl="https://wa.me/972559885954" />)
    expect(screen.getByText('אליהו איתן 3')).toBeInTheDocument()
    expect(screen.getByText('בית גירון, קומה 3 · ראשון לציון')).toBeInTheDocument()
  })
})
