import { describe, it, expect } from 'vitest'
import { getSeoPage } from '@/lib/seo-pages'
import { validateSeoPage } from '@/lib/seo-price-tokens'
import { LAYOUTS } from '@/components/seo/layouts'

// TICKET-031 §E — the 11 older product pages (the ones with `productType`) get the
// two DefaultLayout article blocks that the 5 group pages already have:
// "איך זה עובד" (steps ×3) and "לפני שמזמינים" (checklist ×5–6).

const PRODUCT_PAGES = [
  'הדפסה-על-כובעים',
  'הדפסה-על-סווטשרטים',
  'הדפסת-חולצות-שרוול-ארוך',
  'הדפסת-תיקי-בד',
  'תיקי-קנבס-ממותגים-לעסקים',
  'תיק-בד-מתנה-לגננת',
  'תיקי-בד-לחתונה',
  'הדפסה-על-סינרים',
  'באפים-מודפסים',
  'בגדי-גוף-מודפסים-לתינוקות',
  'וסטים-זוהרים-מודפסים',
] as const

/** The 5 group pages already carry both blocks and are NOT in this ticket's scope.
 *  Frozen as [slug, steps, JSON(steps) length, checklist items, JSON(checklist) length]
 *  so a careless edit there fails here. */
const GROUP_PAGES: [string, number, number, number, number][] = [
  ['חולצות-ליום-גיבוש', 3, 482, 7, 303],
  ['חולצות-לקבוצת-ספורט', 3, 458, 6, 264],
  ['חולצות-לבר-מצווה', 3, 493, 6, 271],
  ['חולצות-לתנועות-נוער', 3, 468, 6, 238],
  ['חולצות-למסיבת-רווקים', 3, 439, 6, 222],
]

// Delivery time and pickup are worded exactly as the rest of the registry words them.
const DELIVERY = 'זמן האספקה המשוער הוא עד 7 ימי עסקים מתחילת הייצור, שמתחיל אחרי אישור הסקיצה והתשלום'
const PICKUP = 'איסוף עצמי חינם מאליהו איתן 3 בראשון לציון'

/** steps[].title, steps[].text and checklist items are not <PriceText> fields
 *  (validateSeoPage), so they must stay free of prices and of "{{" — on top of
 *  the phrases business-facts forbids. */
const FORBIDDEN: [string, RegExp][] = [
  ['חשבונית', /חשבונית/],
  ['קבלה', /קבלה/],
  ['מהיום למחר', /מהיום למחר/],
  ['ימים ספורים', /ימים ספורים/],
  ['מספר כביסות', /\d+\s*כביסות/],
  ['כביסות + מספר', /כביסות\s*\d/],
  ['משלוח לכמה כתובות', /משלוח לכמה כתובות/],
  ['אין מינימום', /אין\s+(כמות\s+)?מינימום/],
  ['שעות פעילות', /\d{1,2}:\d{2}/],
  ['סכום בשקלים', /₪/],
  ['price token', /\{\{/],
]

/** Every string this ticket adds to a page — the only text the rules above cover. */
const newText = (slug: string): string[] => {
  const page = getSeoPage(slug)!
  return [...(page.steps ?? []).flatMap((s) => [s.title, s.text]), ...(page.checklist ?? [])]
}

describe.each(PRODUCT_PAGES)('%s', (slug) => {
  const page = () => getSeoPage(slug)!

  it('is rendered by DefaultLayout, which renders the two blocks', () => {
    expect(getSeoPage(slug)).toBeTruthy()
    expect(LAYOUTS[slug]).toBeUndefined()
  })

  it('has 3 steps with unique titles and texts', () => {
    const steps = page().steps ?? []
    expect(steps.length).toBeGreaterThanOrEqual(3)
    expect(steps.length).toBeLessThanOrEqual(3) // the timeline is 3 columns on desktop
    expect(new Set(steps.map((s) => s.title)).size).toBe(steps.length)
    expect(new Set(steps.map((s) => s.text)).size).toBe(steps.length)
    for (const step of steps) expect(step.text.length).toBeGreaterThan(40)
  })

  it('has 5–6 unique checklist items', () => {
    const items = page().checklist ?? []
    expect(items.length).toBeGreaterThanOrEqual(5)
    expect(items.length).toBeLessThanOrEqual(6)
    expect(new Set(items).size).toBe(items.length)
    for (const item of items) expect(item.length).toBeGreaterThan(10)
  })

  it('passes the build-time token contract', () => {
    expect(() => validateSeoPage(page(), true)).not.toThrow()
  })

  it('keeps the new text free of prices, tokens and forbidden phrases', () => {
    for (const text of newText(slug)) {
      for (const [what, re] of FORBIDDEN) expect(re.test(text), `${what} — "${text}"`).toBe(false)
    }
  })

  it('words delivery and pickup exactly as the registry does', () => {
    for (const text of newText(slug)) {
      if (text.includes('ימי עסקים')) expect(text).toContain(DELIVERY)
      if (text.includes('איסוף עצמי')) expect(text).toContain(PICKUP)
    }
  })
})

describe('הדפסה-על-סינרים says only what its own entry says', () => {
  const items = () => getSeoPage('הדפסה-על-סינרים')!.checklist ?? []

  // "פריט נפרד בהזמנה" is true of the cart and the registry does state it — on the
  // wedding tote page and on three group pages — but the apron entry never does,
  // and the rule for this ticket is that a page may only say what it already says.
  it('does not claim each design is a separate order item', () => {
    expect(items().filter((item) => item.includes('פריט נפרד'))).toEqual([])
  })

  // The quantity item quotes the entry's own benefit ("סט אחיד לכל צוות המטבח וההגשה
  // של המסעדה") instead of paraphrasing it.
  it('quotes the entry wording for a whole-team set', () => {
    expect(items().some((item) => item.includes('סט אחיד לכל צוות המטבח וההגשה'))).toBe(true)
  })
})

describe('the copy is written per product', () => {
  it('no two pages share more than one step title or more than one checklist item', () => {
    const shared = (a: string[], b: string[]) => a.filter((x) => b.includes(x))
    for (const [i, slug] of PRODUCT_PAGES.entries()) {
      for (const other of PRODUCT_PAGES.slice(i + 1)) {
        const [one, two] = [slug, other].map((s) => getSeoPage(s)!)
        const titles = shared(one.steps?.map((s) => s.title) ?? [], two.steps?.map((s) => s.title) ?? [])
        const items = shared(one.checklist ?? [], two.checklist ?? [])
        expect(titles.length, `${slug} / ${other}: ${titles.join(' · ')}`).toBeLessThanOrEqual(1)
        expect(items.length, `${slug} / ${other}: ${items.join(' · ')}`).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('the 5 group pages are out of scope', () => {
  it.each(GROUP_PAGES)('%s keeps its existing blocks', (slug, steps, stepsBytes, items, itemsBytes) => {
    const page = getSeoPage(slug)!
    expect(page.steps).toHaveLength(steps)
    expect(JSON.stringify(page.steps).length).toBe(stepsBytes)
    expect(page.checklist).toHaveLength(items)
    expect(JSON.stringify(page.checklist).length).toBe(itemsBytes)
  })
})
