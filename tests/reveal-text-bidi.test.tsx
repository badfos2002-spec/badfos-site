import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import RevealText from '@/components/common/RevealText'

// TICKET-028: RevealText renders every word as its own display:inline-block
// span (the GSAP lift needs an atomic box per word), and atomic inline boxes
// are ordered by the BASE DIRECTION of the heading — RTL in the hero — so
// «BLACK NOVEMBER SALE» laid out right-to-left and read «SALE NOVEMBER BLACK».
// The fix groups consecutive words into direction runs by their first strong
// character and wraps every LTR run in an inline <span dir="ltr">, where the
// dir attribute means direction:ltr + unicode-bidi:isolate: the word boxes
// inside are ordered LTR while the span itself sits in the surrounding RTL
// flow. RTL runs get NO wrapper — the word spans stay direct children of the
// tag, exactly as today, which is what keeps an all-Hebrew title's DOM
// byte-identical. Case (b) is that byte-identity proof: its inline snapshot
// was filled by a run against the pre-TICKET-028 implementation and must stay
// unchanged through the implementation commit.
//
// Cases (a)/(c)/(d) assert STRUCTURE — which word sits in which wrapper, in
// which order — and never the separator bytes, because the run-boundary space
// remedy (whether the run-final word keeps its separator) is a measured
// decision taken on the real route, and a test may not be edited after its
// commit. The separator bytes are pinned by (b) on the untouched all-RTL path
// and by the harness gap numbers.

const LATIN = 'BLACK NOVEMBER SALE'
const HEBREW = 'הפכו את הרעיונות שלכם'
const MIXED = 'מבצע BLACK FRIDAY לכל הקבוצה'
const NEUTRAL_FIRST = '₪1500 BLACK'
const ALL_NEUTRAL = '₪1500 20%'

/** The hero's situation: the title is an h1 inside a dir="rtl" section. */
const heading = (text: string) => {
  const { container } = render(
    <div dir="rtl">
      <RevealText as="h1" trigger="mount" text={text} />
    </div>
  )
  return container.querySelector('h1')!
}

/** Trailing separator stripped: these assertions are about words and order. */
const label = (el: Element) => (el.textContent || '').replace(/[\s\u00A0]+$/, '')
/** Every word span under `el`, in DOM (source) order. */
const words = (el: Element) => Array.from(el.querySelectorAll('[data-reveal-word]')).map(label)
/** Word spans that are direct children of `el` — i.e. not inside a run wrapper. */
const bareWords = (el: Element) =>
  Array.from(el.children)
    .filter((c) => c.hasAttribute('data-reveal-word'))
    .map(label)
const ltrRuns = (el: Element) => Array.from(el.querySelectorAll('[dir="ltr"]'))

beforeEach(() => {
  // Reduced motion, so the component returns before gsap.set() writes inline
  // styles into the word spans — otherwise (b)'s innerHTML would be poisoned.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
  })) as unknown as typeof window.matchMedia
})
afterEach(cleanup)

describe('RevealText direction runs inside an RTL heading', () => {
  it('(a) «BLACK NOVEMBER SALE»: one span[dir="ltr"] holds the three word spans in source order, and holds the whole h1', () => {
    const h1 = heading(LATIN)
    const runs = ltrRuns(h1)
    expect(runs).toHaveLength(1)
    expect(runs[0].tagName).toBe('SPAN')
    expect(words(runs[0])).toEqual(['BLACK', 'NOVEMBER', 'SALE'])
    // nothing else in the h1: the wrapper is its only child
    expect(h1.childNodes).toHaveLength(1)
    expect(h1.firstChild).toBe(runs[0])
    expect(bareWords(h1)).toEqual([])
  })

  it('(b) «הפכו את הרעיונות שלכם»: an all-RTL title gets no wrapper and its DOM stays byte-identical', () => {
    const h1 = heading(HEBREW)
    expect(h1.querySelector('[dir]')).toBeNull()
    expect(words(h1)).toEqual(['הפכו', 'את', 'הרעיונות', 'שלכם'])
    expect(h1.innerHTML).toMatchInlineSnapshot(`"<span data-reveal-word="true" style="display: inline-block; will-change: transform, opacity;">הפכו&nbsp;</span><span data-reveal-word="true" style="display: inline-block; will-change: transform, opacity;">את&nbsp;</span><span data-reveal-word="true" style="display: inline-block; will-change: transform, opacity;">הרעיונות&nbsp;</span><span data-reveal-word="true" style="display: inline-block; will-change: transform, opacity;">שלכם</span>"`)
  })

  it('(c) «מבצע BLACK FRIDAY לכל הקבוצה»: one LTR run holds exactly BLACK + FRIDAY, the Hebrew words stay bare, source order preserved', () => {
    const h1 = heading(MIXED)
    const runs = ltrRuns(h1)
    expect(runs).toHaveLength(1)
    expect(words(runs[0])).toEqual(['BLACK', 'FRIDAY'])
    expect(bareWords(h1)).toEqual(['מבצע', 'לכל', 'הקבוצה'])
    expect(words(h1)).toEqual(['מבצע', 'BLACK', 'FRIDAY', 'לכל', 'הקבוצה'])
  })

  it('(d) «₪1500 BLACK»: a word with no strong character joins the run after it when it is first', () => {
    const h1 = heading(NEUTRAL_FIRST)
    const runs = ltrRuns(h1)
    expect(runs).toHaveLength(1)
    expect(words(runs[0])).toEqual(['₪1500', 'BLACK'])
    expect(bareWords(h1)).toEqual([])
  })

  it('(e) every title keeps one [data-reveal-word] per word, so the GSAP targets are unchanged', () => {
    for (const text of [LATIN, HEBREW, MIXED, NEUTRAL_FIRST]) {
      const h1 = heading(text)
      expect(h1.querySelectorAll('[data-reveal-word]')).toHaveLength(text.split(' ').length)
    }
  })

  it('(f) «₪1500 20%»: with no strong character anywhere the whole title is RTL — no wrapper', () => {
    const h1 = heading(ALL_NEUTRAL)
    expect(h1.querySelector('[dir]')).toBeNull()
    expect(words(h1)).toEqual(['₪1500', '20%'])
  })
})
