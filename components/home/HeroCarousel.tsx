'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Tag } from 'lucide-react'

export interface HeroSlide {
  id: string
  /** Missing (a hero deal with no graphic at all) → the deal placeholder box. */
  image?: string
  alt: string
  link?: string
  /** How long this slide stays before the crossfade starts. */
  dwellMs: number
}

const PRODUCT_ALT = 'בדפוס - הדפסת חולצות בעיצוב אישי'
const PRODUCT_DWELL_MS = 5000

const PRODUCT_SLIDES: HeroSlide[] = [
  { id: '1', image: '/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.webp', alt: PRODUCT_ALT, dwellMs: PRODUCT_DWELL_MS },
  { id: '2', image: '/assets/64ab08d41_IMG_3252.webp', alt: PRODUCT_ALT, dwellMs: PRODUCT_DWELL_MS },
  { id: '3', image: '/assets/a189e74e3_IMG_0490.webp', alt: PRODUCT_ALT, dwellMs: PRODUCT_DWELL_MS },
  { id: '4', image: '/assets/c4660170b_IMG_6179.webp', alt: PRODUCT_ALT, dwellMs: PRODUCT_DWELL_MS },
  { id: '5', image: '/assets/fdd643e9f_D747B5AC-1217-4D1F-A7B1-61C6EDE52659.webp', alt: PRODUCT_ALT, dwellMs: PRODUCT_DWELL_MS },
]

type Props = {
  /** TICKET-025B: the hero deal joins the rotation as slide 0 with its own
      dwell (8000 ms), the 5 product photos follow. Its Storage graphic renders
      as a plain eager `<img>` like `DealPicture`, not through `next/image`.
      Without it this is today's 5-photo hero, unchanged. */
  leadSlide?: HeroSlide | null
  /** Fires with the new index when the active slide starts changing, so the
      hero copy can crossfade together with the image. */
  onChange?: (index: number) => void
}

export default function HeroCarousel({ leadSlide, onChange }: Props = {}) {
  const [current, setCurrent] = useState(0)
  const [next, setNext] = useState<number | null>(null)
  const [fading, setFading] = useState(false)

  const slides = leadSlide ? [leadSlide, ...PRODUCT_SLIDES] : PRODUCT_SLIDES

  // onChange lives in a ref so the auto-advance clock below restarts only when
  // the slide really changes — never because the parent re-rendered with a
  // fresh callback (the hero re-renders on every slide change).
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const goTo = useCallback((i: number) => {
    if (i === current || fading) return
    setNext(i)
    setFading(true)
    onChangeRef.current?.(i)
    setTimeout(() => {
      setCurrent(i)
      setNext(null)
      setFading(false)
    }, 500)
  }, [current, fading])

  const count = slides.length
  const dwellMs = slides[current].dwellMs
  useEffect(() => {
    // Respect prefers-reduced-motion — skip auto-advance for users who opt out of motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setTimeout(() => {
      goTo((current + 1) % count)
    }, dwellMs)
    return () => clearTimeout(id)
  }, [current, count, dwellMs, goTo])

  const slide = slides[current]
  const nextSlide = next !== null ? slides[next] : null
  /** Only the lead slide is a remote deal graphic; the products stay on next/image. */
  const isLead = (i: number) => Boolean(leadSlide) && i === 0

  return (
    <div
      className="w-full md:w-fit md:mx-auto bg-white p-3 rounded-[2.5rem] relative"
      style={{ boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.08)' }}
    >
      <div className="relative w-full md:w-[550px] aspect-square mx-auto overflow-hidden rounded-[2rem]">
        {/* Current slide — keyed by slide id so React never mutates the src of a
            mounted <img> (a src swap on the painted LCP element pushes the LCP
            timestamp to the slide-rotation time and tanks Core Web Vitals) */}
        <SlideImage
          key={slide.id}
          slide={slide}
          plain={isLead(current)}
          className={`transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
          priority={current === 0}
        />

        {/* Next slide (fades in on top) */}
        {nextSlide && (
          <SlideImage
            key={nextSlide.id}
            slide={nextSlide}
            plain={isLead(next!)}
            className={`transition-opacity duration-500 ${fading ? 'opacity-100' : 'opacity-0'}`}
            priority={false}
          />
        )}
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`transition-all duration-300 rounded-full ${
              i === current
                ? 'bg-white w-2.5 h-2.5 scale-110 shadow-sm'
                : 'bg-white/50 w-2.5 h-2.5'
            }`}
            aria-label={`עבור לתמונה ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

function SlideImage({ slide, plain, className, priority }: { slide: HeroSlide; plain: boolean; className: string; priority: boolean }) {
  const img = !slide.image ? (
    // A hero deal with no image at all — the same placeholder box the deal components use.
    <div className={`absolute inset-0 bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center ${className}`}>
      <Tag className="h-12 w-12 text-yellow-500/60" aria-hidden="true" />
    </div>
  ) : plain ? (
    // The deal's Storage graphic, like DealPicture: a plain eager <img>, so the
    // LCP candidate does not wait for next/image's optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.image}
      alt={slide.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={`object-cover rounded-[1.5rem] absolute inset-0 h-full w-full ${className}`}
    />
  ) : (
    <Image
      src={slide.image}
      alt={slide.alt}
      fill
      sizes="(max-width: 768px) 100vw, 550px"
      className={`object-cover rounded-[1.5rem] absolute inset-0 ${className}`}
      priority={priority}
    />
  )

  if (slide.link) {
    return <Link href={slide.link} className="block absolute inset-0 z-10">{img}</Link>
  }
  return <div className="absolute inset-0">{img}</div>
}
