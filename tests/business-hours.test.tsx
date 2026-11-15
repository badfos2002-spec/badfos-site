import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render, screen, cleanup } from '@testing-library/react'
import { BUSINESS_HOURS } from '@/lib/constants'
import { isOpenNow, hoursLines, openingHoursSpecification } from '@/lib/business-hours'

// TICKET-015: Sunday–Thursday closes at 21:00 (was 23:00). Friday 09:00–14:00
// and Saturday closed are unchanged. BUSINESS_HOURS is the single source of truth.

const ROOT = join(__dirname, '..')
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

describe('BUSINESS_HOURS constant', () => {
  it('Sunday–Thursday entry closes at 21:00', () => {
    const weekday = BUSINESS_HOURS.find((h) => (h.days as readonly number[]).includes(0))
    expect(weekday?.days).toEqual([0, 1, 2, 3, 4])
    expect(weekday?.open).toBe('09:00')
    expect(weekday?.close).toBe('21:00')
  })
  it('Friday is 09:00–14:00', () => {
    const friday = BUSINESS_HOURS.find((h) => (h.days as readonly number[]).includes(5))
    expect(friday?.open).toBe('09:00')
    expect(friday?.close).toBe('14:00')
  })
  it('has no Saturday entry (closed)', () => {
    expect(BUSINESS_HOURS.some((h) => (h.days as readonly number[]).includes(6))).toBe(false)
  })
})

describe('isOpenNow evaluates in Asia/Jerusalem', () => {
  // November 2026: Israel = UTC+2. 15.11.2026 is a Sunday, 20.11 Friday, 21.11 Saturday.
  const cases: [string, string, boolean][] = [
    ['Sunday 20:59 Israel', '2026-11-15T18:59:00Z', true],
    ['Sunday 21:00 Israel', '2026-11-15T19:00:00Z', false],
    ['Sunday 08:59 Israel', '2026-11-15T06:59:00Z', false],
    ['Sunday 09:00 Israel', '2026-11-15T07:00:00Z', true],
    ['Friday 13:59 Israel', '2026-11-20T11:59:00Z', true],
    ['Friday 14:00 Israel', '2026-11-20T12:00:00Z', false],
    ['Saturday 12:00 Israel', '2026-11-21T10:00:00Z', false],
    // July 2026: Israel = UTC+3 (IDT). 15.7.2026 is a Wednesday.
    ['July Wednesday 20:30 IDT', '2026-07-15T17:30:00Z', true],
    ['July Wednesday 21:30 IDT', '2026-07-15T18:30:00Z', false],
  ]
  for (const [label, iso, expected] of cases) {
    it(`${label} → ${expected}`, () => {
      expect(isOpenNow(new Date(iso))).toBe(expected)
    })
  }

  afterEach(() => {
    vi.useRealTimers()
  })
  it('defaults to the current time (fake system time, Thursday 20:30 Israel)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-19T18:30:00Z'))
    expect(isOpenNow()).toBe(true)
    vi.setSystemTime(new Date('2026-11-19T19:30:00Z'))
    expect(isOpenNow()).toBe(false)
  })
})

describe('hoursLines', () => {
  it('returns exactly the three display lines', () => {
    // hyphen-minus between the times: a European separator keeps 9:00-21:00 one LTR run in an RTL line
    expect(hoursLines()).toEqual(['ראשון–חמישי: 9:00-21:00', 'שישי: 9:00-14:00', 'שבת: סגור'])
  })
})

describe('openingHoursSpecification', () => {
  it('builds the JSON-LD array from the constant, Saturday closed preserved', () => {
    const spec = openingHoursSpecification()
    expect(spec).toHaveLength(3)
    expect(spec[0]).toEqual({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      opens: '09:00',
      closes: '21:00',
    })
    expect(spec[1]).toEqual({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Friday'],
      opens: '09:00',
      closes: '14:00',
    })
    expect(spec[2]).toEqual({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday'],
      opens: '00:00',
      closes: '00:00',
    })
  })
})

describe('no stale 23:00 closing time anywhere in the source', () => {
  const SKIP = new Set(['node_modules', '.next'])
  function walk(dir: string, out: string[]) {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p, out)
      else if (/\.(ts|tsx|md|mdx|js|json)$/.test(name)) out.push(p)
    }
    return out
  }
  it('app/, components/, lib/, docs/ are clean', () => {
    const files = ['app', 'components', 'lib', 'docs'].flatMap((d) => walk(join(ROOT, d), []))
    const offenders = files
      .filter((f) => readFileSync(f, 'utf8').includes('23:00'))
      .map((f) => relative(ROOT, f))
    expect(offenders, `23:00 found in: ${offenders.join(', ')}`).toEqual([])
  })
  it('root layout JSON-LD uses openingHoursSpecification() from @/lib/business-hours', () => {
    const src = read('app/layout.tsx')
    expect(src).toMatch(/import\s*\{[^}]*\bopeningHoursSpecification\b[^}]*\}\s*from\s*'@\/lib\/business-hours'/)
    expect(src).toContain('openingHoursSpecification: openingHoursSpecification()')
  })
  it('contact metadata description says 9:00-21:00', () => {
    expect(read('app/contact/layout.tsx')).toContain('שעות פעילות ראשון-חמישי 9:00-21:00')
  })
})

// Contact page scaffolding: Firebase-backed lib/db and lib/tracking are mocked;
// fetch is stubbed to reject (the Google Business call fails → our constant still shows).
vi.mock('@/lib/db', () => ({ createLead: vi.fn() }))
vi.mock('@/lib/tracking', () => ({
  sendLeadWebhook: vi.fn(),
  trackWhatsAppClick: vi.fn(),
  trackPhoneClick: vi.fn(),
  getGclid: vi.fn(() => ''),
}))

describe('contact page hours card', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  it('server render (before mount) shows the hours but no open/closed badge', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    const { renderToString } = await import('react-dom/server')
    const { default: ContactPage } = await import('@/app/contact/page')
    const html = renderToString(<ContactPage />)
    expect(html).toContain('ראשון–חמישי: 9:00-21:00')
    expect(html).not.toContain('פתוח עכשיו')
    expect(html).not.toMatch(/>סגור</)
  })
  it('after mount the badge says פתוח עכשיו inside opening hours (Sunday 12:00 Israel)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-15T10:00:00Z'))
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { default: ContactPage } = await import('@/app/contact/page')
    render(<ContactPage />)
    expect(await screen.findByText('פתוח עכשיו')).toBeInTheDocument()
  })
  it('always renders our hours, never 23:00', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { default: ContactPage } = await import('@/app/contact/page')
    const { container } = render(<ContactPage />)
    expect(screen.getByText('ראשון–חמישי: 9:00-21:00')).toBeInTheDocument()
    expect(screen.getByText('שישי: 9:00-14:00')).toBeInTheDocument()
    expect(screen.getByText('שבת: סגור')).toBeInTheDocument()
    expect(container.textContent).not.toContain('23:00')
    // badge is computed after mount from isOpenNow()
    expect(await screen.findByText(/^(פתוח עכשיו|סגור)$/)).toBeInTheDocument()
  })
})
