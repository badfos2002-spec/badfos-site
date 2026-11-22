import { describe, it, expect } from 'vitest'
import {
  isDealLive,
  sortDeals,
  dealImage,
  dealWhatsAppLink,
  dealPhoneLink,
  slugify,
  uniqueSlug,
  ORDER_TARGETS,
  isOrderTarget,
  isAllowedDealImage,
  validateDealInput,
  toDeal,
  imageShapeWarning,
} from '@/lib/deals'
import type { Deal } from '@/lib/types'

// TICKET-022: deals are admin-managed; the pure rules live in lib/deals.ts.

function deal(over: Partial<Deal> = {}): Deal {
  return {
    id: 'd1',
    slug: 'מבצע-חורף',
    title: 'מבצע חורף',
    shortText: 'סווטשרטים במחיר מיוחד',
    isActive: true,
    sortOrder: 0,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...over,
  }
}

describe('isDealLive', () => {
  // 19.11.2026 12:00 Israel time (UTC+2)
  const now = new Date('2026-11-19T10:00:00.000Z')

  it('active with no end date is live', () => {
    expect(isDealLive(deal(), now)).toBe(true)
  })
  it('inactive is never live', () => {
    expect(isDealLive(deal({ isActive: false }), now)).toBe(false)
    expect(isDealLive(deal({ isActive: false, endsAt: '2027-01-01' }), now)).toBe(false)
  })
  it('ending today is still live at 23:59 Israel time', () => {
    const lateTonight = new Date('2026-11-19T21:59:00.000Z') // 23:59 in Israel
    expect(isDealLive(deal({ endsAt: '2026-11-19' }), lateTonight)).toBe(true)
  })
  it('ending today is over once Israel passes midnight (even if UTC is still the same day)', () => {
    const afterMidnightIL = new Date('2026-11-19T22:30:00.000Z') // 00:30 on the 20th in Israel
    expect(isDealLive(deal({ endsAt: '2026-11-19' }), afterMidnightIL)).toBe(false)
  })
  it('ended yesterday is not live', () => {
    expect(isDealLive(deal({ endsAt: '2026-11-18' }), now)).toBe(false)
  })
  it('future end date is live', () => {
    expect(isDealLive(deal({ endsAt: '2026-12-31' }), now)).toBe(true)
  })
})

describe('sortDeals', () => {
  it('sorts by sortOrder asc, then createdAt desc, without mutating', () => {
    const a = deal({ id: 'a', sortOrder: 2, createdAt: '2026-11-01T00:00:00.000Z' })
    const b = deal({ id: 'b', sortOrder: 1, createdAt: '2026-10-01T00:00:00.000Z' })
    const c = deal({ id: 'c', sortOrder: 1, createdAt: '2026-11-10T00:00:00.000Z' })
    const input = [a, b, c]
    expect(sortDeals(input).map((d) => d.id)).toEqual(['c', 'b', 'a'])
    expect(input.map((d) => d.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('dealImage fallback', () => {
  const M = 'https://x/m.jpg'
  const D = 'https://x/d.jpg'
  it.each([
    [{ imageMobile: M, imageDesktop: D }, M, D],
    [{ imageMobile: M }, M, M],
    [{ imageDesktop: D }, D, D],
    [{}, undefined, undefined],
  ])('%o → mobile %s / desktop %s', (imgs, mobile, desktop) => {
    expect(dealImage(deal(imgs), 'mobile')).toBe(mobile)
    expect(dealImage(deal(imgs), 'desktop')).toBe(desktop)
  })
})

// TICKET-025A: a third, square slot. Each box gets the image whose shape matches,
// and when that slot is empty the nearest one.
describe('dealImage with a square slot', () => {
  const S = 'https://x/s.jpg'
  const M = 'https://x/m.jpg'
  const D = 'https://x/d.jpg'

  it.each([
    [{ imageSquare: S }, S],
    [{ imageMobile: M }, M],
    [{ imageDesktop: D }, D],
    [{ imageSquare: S, imageMobile: M }, S],
    [{ imageSquare: S, imageDesktop: D }, S],
    [{ imageMobile: M, imageDesktop: D }, M],
    [{ imageSquare: S, imageMobile: M, imageDesktop: D }, S],
  ])('square chain square→mobile→desktop: %o → %s', (imgs, expected) => {
    expect(dealImage(deal(imgs), 'square')).toBe(expected)
  })

  it('no image at all → undefined for every variant', () => {
    expect(dealImage(deal(), 'square')).toBeUndefined()
    expect(dealImage(deal(), 'mobile')).toBeUndefined()
    expect(dealImage(deal(), 'desktop')).toBeUndefined()
  })

  it('mobile chain is mobile→square→desktop', () => {
    expect(dealImage(deal({ imageMobile: M, imageSquare: S, imageDesktop: D }), 'mobile')).toBe(M)
    expect(dealImage(deal({ imageSquare: S, imageDesktop: D }), 'mobile')).toBe(S)
    expect(dealImage(deal({ imageDesktop: D }), 'mobile')).toBe(D)
  })

  it('desktop chain is desktop→square→mobile', () => {
    expect(dealImage(deal({ imageMobile: M, imageSquare: S, imageDesktop: D }), 'desktop')).toBe(D)
    expect(dealImage(deal({ imageSquare: S, imageMobile: M }), 'desktop')).toBe(S)
    expect(dealImage(deal({ imageMobile: M }), 'desktop')).toBe(M)
  })
})

describe('toDeal', () => {
  it('keeps a non-empty imageSquare and drops an empty or non-string one', () => {
    const SQ = 'https://x/s.jpg'
    expect(toDeal('d1', { imageSquare: SQ }).imageSquare).toBe(SQ)
    expect(toDeal('d1', { imageSquare: '' })).not.toHaveProperty('imageSquare')
    expect(toDeal('d1', { imageSquare: 123 })).not.toHaveProperty('imageSquare')
    expect(toDeal('d1', {})).not.toHaveProperty('imageSquare')
  })
})

describe('imageShapeWarning', () => {
  it('square: null inside the threshold, landscape vs portrait wording outside it', () => {
    expect(imageShapeWarning('square', 1080, 1080)).toBeNull()
    expect(imageShapeWarning('square', 1040, 1000)).toBeNull() // ratio 1.04
    expect(imageShapeWarning('square', 1200, 800)).toBe('התמונה שהועלתה שוכבת ולא ריבועית — תיחתך מהמרכז')
    expect(imageShapeWarning('square', 800, 1200)).toBe('התמונה שהועלתה לאורך ולא ריבועית — תיחתך מהמרכז')
  })

  it('mobile: null for 4:5, a warning outside the threshold', () => {
    expect(imageShapeWarning('mobile', 1080, 1350)).toBeNull()
    expect(imageShapeWarning('mobile', 1000, 1250)).toBeNull()
    expect(imageShapeWarning('mobile', 1000, 1000)).toBe('התמונה שהועלתה אינה ביחס 4:5 — תיחתך מהמרכז')
    expect(imageShapeWarning('mobile', 1600, 1000)).toBe('התמונה שהועלתה אינה ביחס 4:5 — תיחתך מהמרכז')
  })

  it('desktop: null for 16:10, a warning outside the threshold', () => {
    expect(imageShapeWarning('desktop', 1600, 1000)).toBeNull()
    expect(imageShapeWarning('desktop', 1500, 1000)).toBeNull() // ratio 1.5
    expect(imageShapeWarning('desktop', 1000, 1000)).toBe('התמונה שהועלתה אינה רחבה (16:10) — תיחתך מהמרכז')
    expect(imageShapeWarning('desktop', 1000, 1350)).toBe('התמונה שהועלתה אינה רחבה (16:10) — תיחתך מהמרכז')
  })

  it('null for a size we could not measure', () => {
    expect(imageShapeWarning('square', 0, 0)).toBeNull()
    expect(imageShapeWarning('square', NaN, NaN)).toBeNull()
    expect(imageShapeWarning('mobile', -100, 200)).toBeNull()
  })
})

describe('contact links', () => {
  it('WhatsApp link goes to the business number with the encoded title and the deal URL', () => {
    const url = dealWhatsAppLink(deal({ title: 'מבצע חורף & 20%', slug: 'מבצע-חורף' }))
    expect(url.startsWith('https://wa.me/972559885954?text=')).toBe(true)
    const text = decodeURIComponent(url.split('?text=')[1])
    expect(text).toContain('היי, מתעניין/ת במבצע «מבצע חורף & 20%» שראיתי באתר')
    expect(text).toContain('https://badfos.co.il/deals/' + encodeURIComponent('מבצע-חורף'))
    // the raw "&" must not leak unencoded into the query string
    expect(url.split('?text=')[1]).not.toContain('&')
  })
  it('phone link is the international tel: URI', () => {
    expect(dealPhoneLink()).toBe('tel:+972559885954')
  })
})

describe('slugify', () => {
  it('keeps Hebrew, turns spaces into dashes', () => {
    expect(slugify('מבצע חורף  גדול')).toBe('מבצע-חורף-גדול')
  })
  it('strips unsafe characters and quotes', () => {
    expect(slugify('20% הנחה / "חגים"? #1')).toBe('20-הנחה-חגים-1')
    expect(slugify("  ג'ינס ״חדש״ ")).toBe('גינס-חדש')
  })
  it('lowercases latin and trims dashes', () => {
    expect(slugify('-Black Friday-')).toBe('black-friday')
  })
  it('falls back when nothing is left', () => {
    expect(slugify('???')).toBe('deal')
  })
  it('resolves collisions with -2, -3', () => {
    expect(uniqueSlug('מבצע', [])).toBe('מבצע')
    expect(uniqueSlug('מבצע', ['מבצע'])).toBe('מבצע-2')
    expect(uniqueSlug('מבצע', ['מבצע', 'מבצע-2'])).toBe('מבצע-3')
  })
})

describe('ORDER_TARGETS', () => {
  it('lists the designers and /packages with Hebrew labels', () => {
    expect(ORDER_TARGETS.map((t) => t.href)).toEqual([
      '/designer/tshirt',
      '/designer/sweatshirt',
      '/designer/cap',
      '/designer/tote',
      '/designer/apron',
      '/designer/buff',
      '/designer/baby',
      '/designer/vest',
      '/packages',
    ])
    ORDER_TARGETS.forEach((t) => expect(t.label).toMatch(/[֐-׿]/))
  })
  it('accepts only listed internal paths', () => {
    expect(isOrderTarget('/designer/tshirt')).toBe(true)
    expect(isOrderTarget('/packages')).toBe(true)
    expect(isOrderTarget('/designer/tshirt?x=1')).toBe(false)
    expect(isOrderTarget('https://evil.example/designer/tshirt')).toBe(false)
    expect(isOrderTarget('//evil.example')).toBe(false)
    expect(isOrderTarget('/admin')).toBe(false)
  })
})

describe('isAllowedDealImage', () => {
  it('allows Firebase Storage URLs under site-images/deals and site-relative paths', () => {
    expect(isAllowedDealImage('https://firebasestorage.googleapis.com/v0/b/badfos-28b67.firebasestorage.app/o/site-images%2Fdeals%2F1-a.jpg?alt=media&token=t')).toBe(true)
    expect(isAllowedDealImage('/images/deals/a.jpg')).toBe(true)
  })
  it('rejects other hosts, other folders, http and protocol-relative', () => {
    expect(isAllowedDealImage('https://firebasestorage.googleapis.com/v0/b/x/o/designs%2Fa.jpg')).toBe(false)
    expect(isAllowedDealImage('https://evil.example/site-images%2Fdeals%2Fa.jpg')).toBe(false)
    expect(isAllowedDealImage('http://firebasestorage.googleapis.com/v0/b/x/o/site-images%2Fdeals%2Fa.jpg')).toBe(false)
    expect(isAllowedDealImage('//evil.example/a.jpg')).toBe(false)
    expect(isAllowedDealImage('/\\evil.example/a.jpg')).toBe(false)
    expect(isAllowedDealImage('\\evil.example/a.jpg')).toBe(false)
  })
  it('only our bucket, only the /o/site-images%2Fdeals%2F object path', () => {
    expect(isAllowedDealImage('https://firebasestorage.googleapis.com/v0/b/other-bucket.appspot.com/o/site-images%2Fdeals%2Fa.jpg')).toBe(false)
    expect(isAllowedDealImage('https://firebasestorage.googleapis.com/v0/b/x.appspot.com/o/designs%2Fsite-images%2Fdeals%2Fa.jpg')).toBe(false)
    expect(isAllowedDealImage('https://firebasestorage.googleapis.com/v0/b/badfos-28b67.firebasestorage.app/o/site-images%2Fdeals%2F1-a.jpg?alt=media')).toBe(true)
  })
})

describe('validateDealInput', () => {
  const base = { title: 'מבצע', shortText: 'טקסט', slug: 'מבצע', isActive: true, sortOrder: 0 }

  it('trims strings and returns a clean value', () => {
    const r = validateDealInput({ ...base, title: '  מבצע  ', priceText: ' ₪35 ', endsAt: '2026-12-01' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.title).toBe('מבצע')
      expect(r.value.priceText).toBe('₪35')
      expect(r.value.endsAt).toBe('2026-12-01')
    }
  })
  it('rejects a missing or long title, long shortText, long priceText', () => {
    expect(validateDealInput({ ...base, title: ' ' }).ok).toBe(false)
    const r = validateDealInput({ ...base, title: 'א'.repeat(81), shortText: 'ב'.repeat(301), priceText: 'ג'.repeat(41) })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['priceText', 'shortText', 'title'])
  })
  it('rejects a bad order href and a bad coupon code', () => {
    const r1 = validateDealInput({ ...base, order: { href: 'https://evil.example' } })
    expect(r1.ok).toBe(false)
    if (!r1.ok) expect(r1.errors.order).toBeTruthy()
    const r2 = validateDealInput({ ...base, order: { href: '/designer/cap', couponCode: 'abc 1' } })
    expect(r2.ok).toBe(false)
    if (!r2.ok) expect(r2.errors.couponCode).toBeTruthy()
    const r3 = validateDealInput({ ...base, order: { href: '/designer/cap', couponCode: 'SAVE10-AB12', label: 'להזמנת כובע' } })
    expect(r3.ok).toBe(true)
  })
  it('accepts an allowed imageSquare, rejects a foreign one and drops an empty one', () => {
    const SQ = 'https://firebasestorage.googleapis.com/v0/b/badfos-28b67.firebasestorage.app/o/site-images%2Fdeals%2F1-square.jpg?alt=media'
    const r1 = validateDealInput({ ...base, imageSquare: ` ${SQ} ` })
    expect(r1.ok).toBe(true)
    if (r1.ok) expect(r1.value.imageSquare).toBe(SQ)

    const r2 = validateDealInput({ ...base, imageSquare: 'https://evil.example/a.jpg' })
    expect(r2.ok).toBe(false)
    if (!r2.ok) {
      expect(Object.keys(r2.errors)).toEqual(['imageSquare'])
      expect(r2.errors.imageSquare).toBe('כתובת תמונה לא מורשית')
    }

    const r3 = validateDealInput({ ...base, imageSquare: '   ' })
    expect(r3.ok).toBe(true)
    if (r3.ok) expect(r3.value).not.toHaveProperty('imageSquare')
  })

  it('rejects a bad image URL, an unsafe slug and a bad date', () => {
    const r = validateDealInput({ ...base, imageMobile: 'https://evil.example/a.jpg', slug: 'a/b', endsAt: '19.11.2026' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['endsAt', 'imageMobile', 'slug'])
  })
})
