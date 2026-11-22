import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'

// TICKET-025B phase 1: HeroCarousel becomes slide-driven — a per-slide dwell
// instead of the fixed 5 s interval, an optional lead slide (the hero deal) at
// index 0 whose Storage graphic is a plain eager <img>, and onChange so the
// hero copy can follow the slide. With no props the output must stay
// byte-identical to production — the snapshot here records today's markup.

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
/** The dot the carousel marks as active (the only one with scale-110). */
const activeDot = () => dots().findIndex((b) => b.className.includes('scale-110'))
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

  it('markup is byte-identical to production', () => {
    const { container } = render(<HeroCarousel />)
    expect(container.innerHTML).toMatchInlineSnapshot(`"<div class="w-full md:w-fit md:mx-auto bg-white p-3 rounded-[2.5rem] relative" style="box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.08);"><div class="relative w-full md:w-[550px] aspect-square mx-auto overflow-hidden rounded-[2rem]"><div class="absolute inset-0"><img data-fill="true" data-priority="true" src="/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.webp" alt="בדפוס - הדפסת חולצות בעיצוב אישי" sizes="(max-width: 768px) 100vw, 550px" class="object-cover rounded-[1.5rem] absolute inset-0 transition-opacity duration-500 opacity-100"></div></div><div class="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 z-20"><button class="transition-all duration-300 rounded-full bg-white w-2.5 h-2.5 scale-110 shadow-sm" aria-label="עבור לתמונה 1"></button><button class="transition-all duration-300 rounded-full bg-white/50 w-2.5 h-2.5" aria-label="עבור לתמונה 2"></button><button class="transition-all duration-300 rounded-full bg-white/50 w-2.5 h-2.5" aria-label="עבור לתמונה 3"></button><button class="transition-all duration-300 rounded-full bg-white/50 w-2.5 h-2.5" aria-label="עבור לתמונה 4"></button><button class="transition-all duration-300 rounded-full bg-white/50 w-2.5 h-2.5" aria-label="עבור לתמונה 5"></button></div></div>"`)
  })
})

describe('HeroCarousel with a lead slide — the hero deal joins the rotation', () => {
  it('puts the deal first: a plain eager <img> linking to the deal, one dot per slide', () => {
    render(<HeroCarousel leadSlide={DEAL_SLIDE} />)
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
    render(<HeroCarousel leadSlide={DEAL_SLIDE} />)
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
    render(<HeroCarousel leadSlide={DEAL_SLIDE} onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()
    adv(5000)
    expect(onChange).not.toHaveBeenCalled()
    adv(3000) // the fade starts here; the copy crossfade runs with the image
    expect(onChange).toHaveBeenCalledWith(1)
    adv(500 + 5000 + 500)
    expect(onChange).toHaveBeenLastCalledWith(2)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('keeps the slides keyed: the previous <img> leaves the DOM instead of changing src', () => {
    render(<HeroCarousel leadSlide={DEAL_SLIDE} />)
    const dealImg = imgs()[0]
    adv(8000 + 500)
    expect(document.body.contains(dealImg)).toBe(false)
    expect(dealImg).toHaveAttribute('src', DEAL_SLIDE.image!) // its src was never mutated
    expect(imgs()[0]).not.toBe(dealImg)
    expect(imgs()[0]).toHaveAttribute('src', PRODUCT_1)
  })

  it('a dot click jumps to that slide and reports it', () => {
    const onChange = vi.fn()
    render(<HeroCarousel leadSlide={DEAL_SLIDE} onChange={onChange} />)
    act(() => { dots()[3].click() })
    expect(onChange).toHaveBeenCalledWith(3)
    adv(500)
    expect(activeDot()).toBe(3)
  })

  it('prefers-reduced-motion: no auto-advance, the hero rests on the deal slide', () => {
    reducedMotion = true
    const onChange = vi.fn()
    render(<HeroCarousel leadSlide={DEAL_SLIDE} onChange={onChange} />)
    adv(30000)
    expect(activeDot()).toBe(0)
    expect(imgs()[0]).toHaveAttribute('src', DEAL_SLIDE.image!)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('a deal with no image at all: the deal placeholder box, no <img> with an empty src', () => {
    render(<HeroCarousel leadSlide={{ ...DEAL_SLIDE, image: undefined }} />)
    expect(imgs()).toHaveLength(0)
    const placeholder = document.querySelector('.from-yellow-100')
    expect(placeholder).toBeTruthy()
    expect(placeholder!.querySelector('svg')).toBeTruthy() // the Tag icon
    expect(placeholder!.closest('a')).toHaveAttribute('href', '/deals/winter')
  })

  it('a parent re-render does not restart the dwell clock', () => {
    // Phase 2's hero re-renders on every slide change and on the 2 s settings
    // fetch; a fresh leadSlide object or onChange identity must not reset the timer.
    const { rerender } = render(<HeroCarousel leadSlide={DEAL_SLIDE} onChange={() => {}} />)
    adv(7000)
    act(() => { rerender(<HeroCarousel leadSlide={{ ...DEAL_SLIDE }} onChange={() => {}} />) })
    adv(1000 + 500)
    expect(activeDot()).toBe(1)
  })
})
