import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'

// TICKET-025B phase 1: HeroCarousel becomes slide-driven — a per-slide dwell
// instead of the fixed 5 s interval, an optional lead slide (the hero deal) at
// index 0 whose Storage graphic is a plain eager <img>, and onChange so the
// hero copy can follow the slide. With no props the output must stay
// byte-identical to production — the snapshot here records that markup; the
// dots' 44×44 tap area (TICKET-025 Addendum B) is the one sanctioned change.
//
// TICKET-029: one lead slide becomes `leadSlides: HeroSlide[]` — every live deal
// marked «בהירו» opens the rotation, consecutively and in the admin's sort order,
// then the 5 product photos. Each lead slide carries its own alt/link/image;
// only index 0 is the eager fetchPriority="high" LCP candidate, every later deal
// slide is a plain lazy <img>. Empty or missing → today's 5-photo hero, byte for byte.

// next/image and next/link are stubbed so jsdom renders a plain <img>/<a>
// without the App Router context Next 14 expects. The Next-only props land as
// data-* so the byte-identity snapshot records them (and so a slide rendered
// through next/image is told apart from the deal slide's plain <img>).
vi.mock('next/image', () => ({
  default: ({ fill, priority, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img data-fill={String(!!fill)} data-priority={String(!!priority)} {...(props as Record<string, string>)} />
  ),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import HeroCarousel, { type HeroSlide } from '@/components/home/HeroCarousel'

const PRODUCT_1 = '/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.webp'
const PRODUCT_2 = '/assets/64ab08d41_IMG_3252.webp'
const PRODUCT_ALT = 'בדפוס - הדפסת חולצות בעיצוב אישי'

/** The hero deal as the carousel sees it (NewHeroSection builds it in phase 2). */
const DEAL_SLIDE: HeroSlide = {
  id: 'deal-winter',
  image: 'https://firebasestorage.googleapis.com/v0/b/badfos-28b67.firebasestorage.app/o/site-images%2Fdeals%2F1-square.jpg',
  alt: 'מבצע חורף',
  link: '/deals/winter',
  dwellMs: 8000,
}

/** TICKET-029: a second deal marked «בהירו» — its own graphic, alt and link. */
const DEAL_SLIDE_B: HeroSlide = {
  id: 'deal-group',
  image: 'https://firebasestorage.googleapis.com/v0/b/badfos-28b67.firebasestorage.app/o/site-images%2Fdeals%2F2-square.jpg',
  alt: 'מבצע קבוצות',
  link: '/deals/group',
  dwellMs: 8000,
}

let reducedMotion = false

beforeEach(() => {
  reducedMotion = false
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
  })) as unknown as typeof window.matchMedia
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** Fake-timer step inside act() so React flushes the state updates it causes. */
const adv = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const dots = () => screen.getAllByRole('button')
/** The visible 10×10 dot inside its tap target (TICKET-025 Addendum B). */
const dotMark = (b: HTMLElement) => b.querySelector('span')!
/** The dot the carousel marks as active (the only one with scale-110). */
const activeDot = () => dots().findIndex((b) => dotMark(b).className.includes('scale-110'))
/** Tailwind's spacing scale: `w-11` → 11 × 0.25rem → 44 px, `w-2.5` → 10 px. */
const sizePx = (el: HTMLElement, axis: 'w' | 'h') => {
  const m = el.className.match(new RegExp(`(?:^| )${axis}-(\\d+(?:\\.\\d+)?)(?: |$)`))
  return m ? parseFloat(m[1]) * 4 : 0
}
const imgs = () => Array.from(document.querySelectorAll('img'))

describe('HeroCarousel without props — today’s 5-photo hero', () => {
  it('shows the first product photo with priority, its alt, and 5 dots', () => {
    render(<HeroCarousel />)
    expect(dots()).toHaveLength(5)
    expect(activeDot()).toBe(0)
    expect(dots()[0]).toHaveAttribute('aria-label', 'עבור לתמונה 1')
    expect(dots()[4]).toHaveAttribute('aria-label', 'עבור לתמונה 5')
    const img = imgs()
    expect(img).toHaveLength(1)
    expect(img[0]).toHaveAttribute('src', PRODUCT_1)
    expect(img[0]).toHaveAttribute('alt', PRODUCT_ALT)
    // next/image, fill, priority on slide 0 — unchanged from production
    expect(img[0]).toHaveAttribute('data-fill', 'true')
    expect(img[0]).toHaveAttribute('data-priority', 'true')
  })

  it('auto-advances on the 5000 ms product dwell', () => {
    render(<HeroCarousel />)
    adv(4999)
    expect(imgs()[0]).toHaveAttribute('src', PRODUCT_1)
    adv(1 + 500)
    expect(activeDot()).toBe(1)
    expect(imgs()).toHaveLength(1)
    expect(imgs()[0]).toHaveAttribute('src', PRODUCT_2)
  })

  // TICKET-025 Addendum B (user: «תסדר»): every dot is a real tap target.
  it('every dot is a ≥44×44 tap target holding the unchanged 10×10 dot', () => {
    render(<HeroCarousel />)
    for (const b of dots()) {
      expect(sizePx(b, 'w')).toBeGreaterThanOrEqual(44)
      expect(sizePx(b, 'h')).toBeGreaterThanOrEqual(44)
      expect(sizePx(dotMark(b), 'w')).toBe(10)
      expect(sizePx(dotMark(b), 'h')).toBe(10)
    }
    // same colours, opacity, active scale and aria-label pattern as production
    expect(dotMark(dots()[0]).className).toContain('bg-white w-2.5 h-2.5 scale-110 shadow-sm')
    expect(dotMark(dots()[1]).className).toContain('bg-white/50 w-2.5 h-2.5')
    expect(dots()[3]).toHaveAttribute('aria-label', 'עבור לתמונה 4')
    // the row stays horizontally centred and only the targets take the taps, so
    // the enlarged band does not swallow clicks meant for the slide's link
    const row = dots()[0].parentElement!
    expect(row.className).toContain('absolute bottom-[15px] left-0 right-0 flex justify-center')
    expect(row.className).toContain('pointer-events-none')
    expect(dots()[0].className).toContain('pointer-events-auto')
  })

  // The visible dot is unchanged — including where it sits. Production puts a
  // 10 px dot in a bottom-8 row, so its centre is 37 px above the card's bottom
  // edge; a 44 px target has to be offset by 15 px to keep that exact centre.
  it('the visible dot centre stays 37 px above the card bottom, as in production', () => {
    render(<HeroCarousel />)
    const row = dots()[0].parentElement!
    const offset = Number(row.className.match(/bottom-\[(\d+)px\]/)![1])
    expect(offset + sizePx(dots()[0], 'h') / 2).toBe(32 + 10 / 2)
  })

  it('markup is production’s, the dots’ tap area the only change (Addendum B)', () => {
    const { container } = render(<HeroCarousel />)
    expect(container.innerHTML).toMatchInlineSnapshot(`"<div class="w-full md:w-fit md:mx-auto bg-white p-3 rounded-[2.5rem] relative" style="box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.08);"><div class="relative w-full md:w-[550px] aspect-square mx-auto overflow-hidden rounded-[2rem]"><div class="absolute inset-0"><img data-fill="true" data-priority="true" src="/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.webp" alt="בדפוס - הדפסת חולצות בעיצוב אישי" sizes="(max-width: 768px) 100vw, 550px" class="object-cover rounded-[1.5rem] absolute inset-0 transition-opacity duration-500 opacity-100"></div></div><div class="absolute bottom-[15px] left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none"><button class="w-11 h-11 flex items-center justify-center pointer-events-auto" aria-label="עבור לתמונה 1"><span class="transition-all duration-300 rounded-full bg-white w-2.5 h-2.5 scale-110 shadow-sm"></span></button><button class="w-11 h-11 flex items-center justify-center pointer-events-auto" aria-label="עבור לתמונה 2"><span class="transition-all duration-300 rounded-full bg-white/50 w-2.5 h-2.5"></span></button><button class="w-11 h-11 flex items-center justify-center pointer-events-auto" aria-label="עבור לתמונה 3"><span class="transition-all duration-300 rounded-full bg-white/50 w-2.5 h-2.5"></span></button><button class="w-11 h-11 flex items-center justify-center pointer-events-auto" aria-label="עבור לתמונה 4"><span class="transition-all duration-300 rounded-full bg-white/50 w-2.5 h-2.5"></span></button><button class="w-11 h-11 flex items-center justify-center pointer-events-auto" aria-label="עבור לתמונה 5"><span class="transition-all duration-300 rounded-full bg-white/50 w-2.5 h-2.5"></span></button></div></div>"`)
  })
})

describe('HeroCarousel with a lead slide — the hero deal joins the rotation', () => {
  it('puts the deal first: a plain eager <img> linking to the deal, one dot per slide', () => {
    render(<HeroCarousel leadSlides={[DEAL_SLIDE]} />)
    expect(dots()).toHaveLength(6)
    expect(activeDot()).toBe(0)
    const img = imgs()
    expect(img).toHaveLength(1)
    expect(img[0]).toHaveAttribute('src', DEAL_SLIDE.image!)
    expect(img[0]).toHaveAttribute('alt', 'מבצע חורף')
    // a plain <img loading="eager" fetchPriority="high"> — NOT next/image
    expect(img[0]).toHaveAttribute('loading', 'eager')
    expect(img[0]).toHaveAttribute('fetchpriority', 'high')
    expect(img[0]).not.toHaveAttribute('data-fill')
    expect(img[0].closest('a')).toHaveAttribute('href', '/deals/winter')
    // the square box and the card are today’s
    expect(document.querySelector('.md\\:w-\\[550px\\].aspect-square')).toBeTruthy()
  })

  it('honours the per-slide dwell: 8000 ms for the deal, 5000 ms for the products', () => {
    render(<HeroCarousel leadSlides={[DEAL_SLIDE]} />)
    adv(5000) // a product dwell must NOT move the deal slide
    expect(activeDot()).toBe(0)
    expect(imgs()[0]).toHaveAttribute('src', DEAL_SLIDE.image!)
    adv(3000 + 500) // the deal's own 8000 ms + the 500 ms crossfade
    expect(activeDot()).toBe(1)
    expect(imgs()[0]).toHaveAttribute('src', PRODUCT_1)
    adv(5000 + 500) // from there the products keep their 5000 ms
    expect(activeDot()).toBe(2)
    expect(imgs()[0]).toHaveAttribute('src', PRODUCT_2)
  })

  it('reports the active slide through onChange — at the fade start, never on mount', () => {
    const onChange = vi.fn()
    render(<HeroCarousel leadSlides={[DEAL_SLIDE]} onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()
    adv(5000)
    expect(onChange).not.toHaveBeenCalled()
    adv(3000) // the fade starts here; the copy crossfade runs with the image
    expect(onChange).toHaveBeenCalledWith(1)
    // One step per state change: React re-runs the dwell effect between act()
    // calls, not inside a single advanceTimersByTime loop.
    adv(500) // the crossfade ends, the product dwell starts
    adv(5000)
    expect(onChange).toHaveBeenLastCalledWith(2)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('keeps the slides keyed: the previous <img> leaves the DOM instead of changing src', () => {
    render(<HeroCarousel leadSlides={[DEAL_SLIDE]} />)
    const dealImg = imgs()[0]
    adv(8000 + 500)
    expect(document.body.contains(dealImg)).toBe(false)
    expect(dealImg).toHaveAttribute('src', DEAL_SLIDE.image!) // its src was never mutated
    expect(imgs()[0]).not.toBe(dealImg)
    expect(imgs()[0]).toHaveAttribute('src', PRODUCT_1)
  })

  it('the dots row passes taps through — the band over the image stays the slide link’s', () => {
    const onChange = vi.fn()
    render(<HeroCarousel leadSlides={[DEAL_SLIDE]} onChange={onChange} />)
    const row = dots()[0].parentElement!
    // The 44 px targets lie over the slide's link band, so the row must not
    // take the taps that miss a dot (10 px before TICKET-025 Addendum B).
    expect(row.className).toContain('pointer-events-none')
    dots().forEach((b) => expect(b.className).toContain('pointer-events-auto'))
    // nothing inside the row can shadow the link — the link is outside it
    expect(row.querySelector('a')).toBeNull()
    expect(imgs()[0].closest('a')).toHaveAttribute('href', '/deals/winter')
    // a click on the row itself moves no slide and reports nothing. jsdom has
    // no hit-testing, so the actual pass-through is measured in the browser
    // pass with document.elementFromPoint over the band, outside a dot.
    act(() => { row.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(onChange).not.toHaveBeenCalled()
    expect(activeDot()).toBe(0)
  })

  it('a dot click jumps to that slide and reports it', () => {
    const onChange = vi.fn()
    render(<HeroCarousel leadSlides={[DEAL_SLIDE]} onChange={onChange} />)
    act(() => { dots()[3].click() })
    expect(onChange).toHaveBeenCalledWith(3)
    adv(500)
    expect(activeDot()).toBe(3)
  })

  it('prefers-reduced-motion: no auto-advance, the hero rests on the deal slide', () => {
    reducedMotion = true
    const onChange = vi.fn()
    render(<HeroCarousel leadSlides={[DEAL_SLIDE]} onChange={onChange} />)
    adv(30000)
    expect(activeDot()).toBe(0)
    expect(imgs()[0]).toHaveAttribute('src', DEAL_SLIDE.image!)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('a deal with no image at all: the deal placeholder box, no <img> with an empty src', () => {
    render(<HeroCarousel leadSlides={[{ ...DEAL_SLIDE, image: undefined }]} />)
    expect(imgs()).toHaveLength(0)
    const placeholder = document.querySelector('.from-yellow-100')
    expect(placeholder).toBeTruthy()
    expect(placeholder!.querySelector('svg')).toBeTruthy() // the Tag icon
    expect(placeholder!.closest('a')).toHaveAttribute('href', '/deals/winter')
  })

  it('a parent re-render does not restart the dwell clock', () => {
    // Phase 2's hero re-renders on every slide change and on the 2 s settings
    // fetch; a fresh leadSlide object or onChange identity must not reset the timer.
    const { rerender } = render(<HeroCarousel leadSlides={[DEAL_SLIDE]} onChange={() => {}} />)
    adv(7000)
    act(() => { rerender(<HeroCarousel leadSlides={[{ ...DEAL_SLIDE }]} onChange={() => {}} />) })
    adv(1000 + 500)
    expect(activeDot()).toBe(1)
  })
})

// TICKET-029 (user: «שים לב אם יש שני מבצעים אני רוצה שגם הם יופיעו ביחד
// בקרוסלת ההירו»): the deal slides open the rotation consecutively, in the
// admin's sort order, and only then come the 5 product photos.
describe('HeroCarousel with two lead slides — both deals join the rotation', () => {
  const BOTH = [DEAL_SLIDE, DEAL_SLIDE_B]

  it('both deals open the rotation in order, one dot per slide', () => {
    render(<HeroCarousel leadSlides={BOTH} />)
    expect(dots()).toHaveLength(7) // 2 deals + the 5 product photos
    expect(activeDot()).toBe(0)
    expect(dots()[6]).toHaveAttribute('aria-label', 'עבור לתמונה 7')
    const img = imgs()
    expect(img).toHaveLength(1)
    expect(img[0]).toHaveAttribute('src', DEAL_SLIDE.image!)
    expect(img[0]).toHaveAttribute('alt', 'מבצע חורף')
    expect(img[0].closest('a')).toHaveAttribute('href', '/deals/winter')
  })

  // The LCP rule: index 0 is the one candidate the browser must fetch first.
  // Every later deal slide is still a plain <img> (not next/image) but lazy and
  // without fetchPriority, so it never competes with the painted hero image.
  it('slide 0 is eager/high; slide 1 is a plain lazy <img> with no fetchPriority, its own alt and link', () => {
    render(<HeroCarousel leadSlides={BOTH} />)
    const first = imgs()[0]
    expect(first).toHaveAttribute('loading', 'eager')
    expect(first).toHaveAttribute('fetchpriority', 'high')
    expect(first).not.toHaveAttribute('data-fill') // a plain <img>, NOT next/image
    adv(8000)
    adv(500)
    const second = imgs()[0]
    expect(second).toHaveAttribute('src', DEAL_SLIDE_B.image!)
    expect(second).toHaveAttribute('alt', 'מבצע קבוצות')
    expect(second.closest('a')).toHaveAttribute('href', '/deals/group')
    expect(second).toHaveAttribute('loading', 'lazy')
    expect(second).not.toHaveAttribute('fetchpriority')
    expect(second).not.toHaveAttribute('data-fill') // still a plain <img>, NOT next/image
  })

  it('every deal rests its own 8000 ms, then the products keep their 5000 ms', () => {
    render(<HeroCarousel leadSlides={BOTH} />)
    adv(5000) // a product dwell must NOT move deal A
    expect(activeDot()).toBe(0)
    adv(3000 + 500) // deal A's own 8000 ms + the crossfade
    expect(activeDot()).toBe(1)
    expect(imgs()[0]).toHaveAttribute('src', DEAL_SLIDE_B.image!)
    adv(5000) // deal B rests 8000 ms too, not 5000
    expect(activeDot()).toBe(1)
    adv(3000 + 500)
    expect(activeDot()).toBe(2)
    expect(imgs()[0]).toHaveAttribute('src', PRODUCT_1)
    adv(5000 + 500) // from there the products keep their 5000 ms
    expect(activeDot()).toBe(3)
    expect(imgs()[0]).toHaveAttribute('src', PRODUCT_2)
  })

  it('onChange walks the slides 0 → 1 → 2 — one call per step, never on mount', () => {
    const onChange = vi.fn()
    render(<HeroCarousel leadSlides={BOTH} onChange={onChange} />)
    expect(activeDot()).toBe(0) // mount rests on deal A and reports nothing
    expect(onChange).not.toHaveBeenCalled()
    adv(5000) // a product dwell is not deal A's — nothing has moved yet
    expect(onChange).not.toHaveBeenCalled()
    adv(3000) // deal A's own 8000 ms: the fade to deal B starts here
    expect(onChange.mock.calls).toEqual([[1]])
    adv(500)
    expect(imgs()[0]).toHaveAttribute('src', DEAL_SLIDE_B.image!)
    adv(8000) // deal B's own 8000 ms → the first product photo
    expect(onChange.mock.calls).toEqual([[1], [2]])
    adv(500)
    expect(imgs()[0]).toHaveAttribute('src', PRODUCT_1)
  })

  it('a second deal with no image keeps its own placeholder box and its own link', () => {
    render(<HeroCarousel leadSlides={[DEAL_SLIDE, { ...DEAL_SLIDE_B, image: undefined }]} />)
    expect(imgs()[0]).toHaveAttribute('src', DEAL_SLIDE.image!)
    adv(8000)
    adv(500)
    expect(imgs()).toHaveLength(0)
    const placeholder = document.querySelector('.from-yellow-100')
    expect(placeholder).toBeTruthy()
    expect(placeholder!.querySelector('svg')).toBeTruthy() // the Tag icon
    expect(placeholder!.closest('a')).toHaveAttribute('href', '/deals/group')
  })

  it('prefers-reduced-motion: no auto-advance, the hero rests on the first deal', () => {
    reducedMotion = true
    const onChange = vi.fn()
    render(<HeroCarousel leadSlides={BOTH} onChange={onChange} />)
    adv(30000)
    expect(activeDot()).toBe(0)
    expect(imgs()[0]).toHaveAttribute('src', DEAL_SLIDE.image!)
    expect(onChange).not.toHaveBeenCalled()
  })

  // No hero deal at all reaches the carousel as an empty array, so it must be
  // the same component as today's — not merely «close enough».
  it('leadSlides={[]} renders exactly the same markup as no props at all', () => {
    const empty = render(<HeroCarousel leadSlides={[]} />).container.innerHTML
    cleanup()
    const none = render(<HeroCarousel />).container.innerHTML
    expect(empty).toBe(none)
    expect(dots()).toHaveLength(5)
  })
})
