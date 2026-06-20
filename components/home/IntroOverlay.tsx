'use client'

import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

declare global {
  interface Window {
    __badfosIntroActive?: boolean
  }
}

function signalIntroDone() {
  if (typeof window === 'undefined') return
  window.__badfosIntroActive = false
  window.dispatchEvent(new CustomEvent('badfos:intro-done'))
}

const SESSION_KEY = 'badfos_intro_seen'

type Product = { src: string; tilt: number; angle: number }

// One image per product category (6 categories) — shown on clean white tiles
// (object-contain, never cropped). `angle` places each tile evenly around the
// logo (degrees, 0 = top, clockwise) at 0/60/120/180/240/300.
const PRODUCTS: readonly Product[] = [
  { src: '/assets/חולצה לבנה קדימה.webp', tilt: -8, angle: 0 },   // חולצות
  { src: '/assets/כובע רשת ירוק.png', tilt: 6, angle: 60 },       // כובעים
  { src: '/assets/סווטשרט חזית אדום.webp', tilt: -4, angle: 120 }, // סווטשרטים
  { src: '/assets/באף סגול.webp', tilt: 7, angle: 180 },           // באפים
  { src: '/assets/סינר שחור.webp', tilt: -6, angle: 240 },        // סינרים
  { src: '/assets/baby-blue.webp', tilt: 5, angle: 300 },          // תינוקות
] as const

export default function IntroOverlay() {
  // Decide on the client only — avoids SSR flash and hydration mismatch.
  const [show, setShow] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const doneRef = useRef(false)

  const dismiss = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    signalIntroDone()
    const el = overlayRef.current
    if (!el) return setShow(false)
    gsap.killTweensOf('*')
    gsap.to(el, {
      autoAlpha: 0,
      duration: 0.35,
      ease: 'power2.inOut',
      onComplete: () => setShow(false),
    })
  }, [])

  useGSAP(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const seen = sessionStorage.getItem(SESSION_KEY)
    sessionStorage.setItem(SESSION_KEY, '1') // never re-trigger this session
    if (seen || reduced) return
    // Decide the layout on the client BEFORE the timeline builds. Reading this in
    // JSX is safe because the JSX only renders once `show` is true (client-side).
    setIsMobile(window.matchMedia('(max-width: 639px)').matches)
    window.__badfosIntroActive = true
    setShow(true)
  }, [])

  useGSAP(
    () => {
      const el = overlayRef.current
      if (!show || !el) return

      // ── MOBILE timeline ───────────────────────────────────────────────
      if (isMobile) {
        const cards = gsap.utils.toArray<HTMLElement>('[data-intro-card-m]')

        // Mobile total lands ~3.0s; safety sits ~600ms past the end.
        const mTimer = setTimeout(() => {
          doneRef.current = true
          setShow(false)
          signalIntroDone()
        }, 3700)

        const mtl = gsap.timeline({
          defaults: { ease: 'power3.out' },
          onComplete: () => {
            clearTimeout(mTimer)
            doneRef.current = true
            setShow(false)
            signalIntroDone()
          },
        })
        tlRef.current = mtl

        // 1) Logo reveals FIRST: elastic scale-in + yellow glow bloom.
        mtl.fromTo(
          '[data-intro-logo-m]',
          { opacity: 0, scaleX: 0.2, scaleY: 0.2, rotation: -14, transformOrigin: '50% 50%' },
          { opacity: 1, scaleX: 1, scaleY: 1, rotation: 0, duration: 1, ease: 'elastic.out(1, 0.55)' }
        )
          .fromTo(
            '[data-intro-glow-m]',
            { opacity: 0, scaleX: 0.4, scaleY: 0.4 },
            { opacity: 1, scaleX: 1.15, scaleY: 1.15, duration: 0.6, ease: 'power2.out' },
            0.15
          )
          .to('[data-intro-glow-m]', { scaleX: 1, scaleY: 1, opacity: 0.85, duration: 0.5, ease: 'sine.inOut' }, '>-0.1')
          // 2) Cards cascade/flip in with stagger.
          .fromTo(
            cards,
            {
              transformPerspective: 800,
              opacity: 0,
              scaleX: 0.6,
              scaleY: 0.6,
              rotationY: -90,
              y: 30,
            },
            {
              opacity: 1,
              scaleX: 1,
              scaleY: 1,
              rotationY: 0,
              y: 0,
              rotationZ: (i: number) => PRODUCTS[i]?.tilt ?? 0,
              duration: 0.7,
              ease: 'back.out(1.6)',
              stagger: 0.09,
            },
            0.35
          )
          // 3) Tagline rises in.
          .fromTo(
            '[data-intro-tag-m]',
            { opacity: 0, y: 18, letterSpacing: '0.45em' },
            { opacity: 1, y: 0, letterSpacing: '0.02em', duration: 0.6, ease: 'expo.out' },
            '-=0.35'
          )
          // 4) Gentle float while held.
          .to(
            '[data-intro-grid-m]',
            { y: -6, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 },
            '>-0.05'
          )
          // 5) CLIMAX: cards retreat, logo grows with glow boost.
          .addLabel('climax')
          .to('[data-intro-tag-m]', { opacity: 0, y: -12, duration: 0.35, ease: 'power2.in' }, 'climax')
          .to(
            cards,
            { opacity: 0, scaleX: 0.6, scaleY: 0.6, duration: 0.5, ease: 'power3.in', stagger: 0.04 },
            'climax'
          )
          .to('[data-intro-logo-m]', { scaleX: 2.6, scaleY: 2.6, duration: 0.85, ease: 'expo.out' }, 'climax+=0.1')
          .to('[data-intro-glow-m]', { scaleX: 2.4, scaleY: 2.4, opacity: 1, duration: 0.85, ease: 'power3.out' }, 'climax+=0.1')
          // 6) EXIT: logo fades, clip-path curtain wipe reveals the site.
          .addLabel('exit')
          .to('[data-intro-logo-m]', { opacity: 0, scaleX: 2.9, scaleY: 2.9, duration: 0.45, ease: 'power2.in' }, 'exit')
          .to('[data-intro-glow-m]', { opacity: 0, scaleX: 3, scaleY: 3, duration: 0.45, ease: 'power2.in' }, 'exit')
          .to(
            el,
            { clipPath: 'inset(0 0 100% 0)', duration: 0.6, ease: 'power4.inOut' },
            'exit+=0.05'
          )

        return () => clearTimeout(mTimer)
      }

      // ── DESKTOP timeline (unchanged) ──────────────────────────────────
      const tiles = gsap.utils.toArray<HTMLElement>('[data-intro-tile]')

      // Responsive orbit radius: tighter ring on small screens, wider on desktop.
      const vw = window.innerWidth
      const radius = vw < 480 ? 82 : vw < 768 ? 140 : 168
      // Tiles start much further out so they can swirl INWARD into their slots.
      const startRadius = radius * 2.1
      tiles.forEach((t) => {
        const angle = Number(t.dataset.angle ?? 0)
        const rad = ((angle - 90) * Math.PI) / 180 // 0deg = top
        // Final resting offset (the clean ring — unchanged layout).
        t.dataset.ox = String(Math.cos(rad) * radius)
        t.dataset.oy = String(Math.sin(rad) * radius)
        // Start offset: same angle, larger radius + an angular swirl offset.
        const startRad = ((angle - 90 + 55) * Math.PI) / 180
        t.dataset.sx = String(Math.cos(startRad) * startRadius)
        t.dataset.sy = String(Math.sin(startRad) * startRadius)
      })

      // Total animation lands ~4.0s (logo grows as a climax, the tagline reveals
      // once the cards are gone, then a brief hold + clip reveal); safety timeout
      // sits ~600ms after the end (4600ms).
      const timer = setTimeout(() => {
        doneRef.current = true
        setShow(false)
        signalIntroDone()
      }, 4600)

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          clearTimeout(timer)
          doneRef.current = true
          setShow(false)
          signalIntroDone()
        },
      })
      tlRef.current = tl

      // 1) Logo: confident elastic scale-in with a slight rotation settle.
      tl.fromTo(
        '[data-intro-logo]',
        { opacity: 0, scaleX: 0.2, scaleY: 0.2, rotation: -18, transformOrigin: '50% 50%' },
        {
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          duration: 1.05,
          ease: 'elastic.out(1, 0.55)',
        }
      )
        // Brand-yellow glow pulse blooms behind the logo as it lands.
        .fromTo(
          '[data-intro-glow]',
          { opacity: 0, scaleX: 0.4, scaleY: 0.4 },
          { opacity: 1, scaleX: 1.15, scaleY: 1.15, duration: 0.6, ease: 'power2.out' },
          0.15
        )
        .to('[data-intro-glow]', { scaleX: 1, scaleY: 1, opacity: 0.85, duration: 0.5, ease: 'sine.inOut' }, '>-0.1')
        // 2) The whole ring spins into place while each tile swirls inward + 3D flips in.
        .fromTo(
          '[data-intro-ring]',
          { rotation: -40, transformOrigin: '50% 50%' },
          { rotation: 0, duration: 1.25, ease: 'power4.out' },
          0.35
        )
        .fromTo(
          tiles,
          {
            transformPerspective: 800,
            opacity: 0,
            scaleX: 0,
            scaleY: 0,
            rotationY: -90,
            rotationZ: () => gsap.utils.random(-25, 25),
            x: (i: number, t: HTMLElement) => Number(t.dataset.sx ?? 0),
            y: (i: number, t: HTMLElement) => Number(t.dataset.sy ?? 0),
          },
          {
            opacity: 1,
            scaleX: 1,
            scaleY: 1,
            rotationY: 0,
            rotationZ: (i: number) => PRODUCTS[i]?.tilt ?? 0,
            x: (i: number, t: HTMLElement) => Number(t.dataset.ox ?? 0),
            y: (i: number, t: HTMLElement) => Number(t.dataset.oy ?? 0),
            duration: 0.95,
            ease: 'back.out(1.4)',
            stagger: 0.1,
          },
          0.45
        )
        // 4) A brief, gentle continuous float while the composition is held.
        .to(
          '[data-intro-ring]',
          { rotation: 4, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 },
          '>-0.05'
        )
        // 5) CLIMAX: the products & tagline retreat while the LOGO grows dramatically,
        //    becoming the focal point, with a glow boost behind it.
        .addLabel('climax')
        .to(
          '[data-intro-ring]',
          { scaleX: 0.55, scaleY: 0.55, opacity: 0, duration: 0.6, ease: 'power3.in' },
          'climax'
        )
        .to(
          '[data-intro-logo]',
          { scaleX: 2.8, scaleY: 2.8, duration: 0.85, ease: 'expo.out' },
          'climax+=0.1'
        )
        .to(
          '[data-intro-glow]',
          { scaleX: 2.4, scaleY: 2.4, opacity: 1, duration: 0.85, ease: 'power3.out' },
          'climax+=0.1'
        )
        // Tagline reveals at the climax, once the product cards are gone (no overlap).
        .fromTo(
          '[data-intro-tag]',
          { opacity: 0, y: 18, letterSpacing: '0.45em' },
          { opacity: 1, y: 0, letterSpacing: '0.02em', duration: 0.6, ease: 'expo.out' },
          'climax+=0.55'
        )
        // 6) Hand-off: the grown logo fades as a clip/curtain reveals the site.
        .addLabel('exit', 'climax+=1.75')
        .to('[data-intro-logo]', { opacity: 0, scaleX: 3.1, scaleY: 3.1, duration: 0.45, ease: 'power2.in' }, 'exit')
        .to('[data-intro-glow]', { opacity: 0, scaleX: 3, scaleY: 3, duration: 0.45, ease: 'power2.in' }, 'exit')
        .to(
          el,
          {
            clipPath: 'inset(0 0 100% 0)',
            duration: 0.6,
            ease: 'power4.inOut',
          },
          'exit+=0.05'
        )

      return () => clearTimeout(timer)
    },
    { dependencies: [show, isMobile], scope: overlayRef }
  )

  if (!show) return null

  // ── MOBILE layout ───────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        ref={overlayRef}
        aria-hidden="true"
        onClick={dismiss}
        onWheel={dismiss}
        onTouchMove={dismiss}
        className="fixed inset-0 z-[120] flex cursor-pointer flex-col items-center justify-center gap-6 overflow-hidden bg-[#fffdf5] px-4"
      >
        {/* Soft brand glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#ffc32e]/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-[#fbbf24]/15 blur-3xl" />

        {/* Logo (centered over the grid, above the cards) */}
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div
              data-intro-glow-m
              className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffc32e]/45 blur-2xl"
              style={{ opacity: 0 }}
            />
            <div data-intro-logo-m className="relative z-[2] h-24 w-24">
              <Image src="/logo.png" alt="" fill priority sizes="112px" className="object-contain" />
            </div>
          </div>
        </div>

        {/* 2×3 product grid */}
        <div
          data-intro-grid-m
          className="relative z-10 grid w-full max-w-[22rem] grid-cols-2 gap-3"
          style={{ perspective: '900px' }}
        >
          {PRODUCTS.map((p, i) => (
            <div
              key={p.src}
              data-intro-card-m
              dir="ltr"
              className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-white p-2 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.38)] ring-2 ring-[#ffc32e]/70"
              style={{ willChange: 'transform', transformStyle: 'preserve-3d' }}
            >
              <Image
                src={p.src}
                alt=""
                fill
                priority={i < 2}
                sizes="42vw"
                className="object-contain p-1"
              />
            </div>
          ))}
        </div>

        {/* Tagline */}
        <p
          data-intro-tag-m
          dir="rtl"
          className="z-10 text-center text-xl font-extrabold text-gray-900"
        >
          עיצוב מוצרים{' '}
          <span className="bg-gradient-to-l from-[#fbbf24] to-[#ffc32e] bg-clip-text text-transparent">
            ברמה אחרת
          </span>
        </p>
      </div>
    )
  }

  // ── DESKTOP layout (unchanged) ──────────────────────────────────────
  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      onClick={dismiss}
      onWheel={dismiss}
      onTouchMove={dismiss}
      className="fixed inset-0 z-[120] flex cursor-pointer flex-col items-center justify-center gap-10 overflow-hidden bg-[#fffdf5]"
    >
      {/* Soft brand glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#ffc32e]/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-[#fbbf24]/15 blur-3xl" />

      {/* Orbit: centered logo with product tiles encircling it.
          NOTE: this container must NOT clip (no overflow-hidden) so the 3D flips render. */}
      <div className="relative z-10 h-[18rem] w-[18rem] sm:h-[24rem] sm:w-[24rem]" style={{ perspective: '1000px' }}>
        {/* Brand-yellow glow pulse behind the logo */}
        <div
          data-intro-glow
          className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffc32e]/45 blur-2xl sm:h-56 sm:w-56"
          style={{ opacity: 0 }}
        />

        {/* Logo (centered in the middle of the orbit) */}
        <div
          data-intro-logo
          className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 sm:h-28 sm:w-28 z-[2]"
        >
          <Image src="/logo.png" alt="" fill priority sizes="112px" className="object-contain" />
        </div>

        {/* Rotating ring container — holds the orbiting tiles (does NOT clip 3D). */}
        <div data-intro-ring className="absolute inset-0 z-[1]" style={{ transformStyle: 'preserve-3d' }}>
          {/* Real product tiles, positioned around the logo via GSAP x/y offsets */}
          {PRODUCTS.map((p, i) => (
            <div
              key={p.src}
              data-intro-tile
              data-angle={p.angle}
              dir="ltr"
              className="absolute left-1/2 top-1/2 -ml-[2.125rem] -mt-12 h-24 w-[4.25rem] overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.38)] ring-2 ring-[#ffc32e]/70 sm:-ml-[4.5rem] sm:-mt-[6rem] sm:h-48 sm:w-36 sm:p-3"
              style={{ willChange: 'transform' }}
            >
              <Image
                src={p.src}
                alt=""
                fill
                priority={i < 2}
                sizes="(max-width:640px) 104px, 144px"
                className="object-contain p-1"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tagline */}
      <p
        data-intro-tag
        dir="rtl"
        className="z-10 mt-2 text-center text-xl font-extrabold text-gray-900 sm:text-2xl"
      >
        עיצוב מוצרים{' '}
        <span className="bg-gradient-to-l from-[#fbbf24] to-[#ffc32e] bg-clip-text text-transparent">
          ברמה אחרת
        </span>
      </p>
    </div>
  )
}
