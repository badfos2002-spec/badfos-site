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

// One transparent 3D render per product category (6 categories) — floating
// free on the cream background (object-contain, never cropped). `angle` places
// each one evenly around the logo (degrees, 0 = top, clockwise) at 0/60/120/180/240/300.
const PRODUCTS: readonly Product[] = [
  { src: '/renders/tshirt.png', tilt: -8, angle: 0 },      // חולצות
  { src: '/renders/cap-mesh.png', tilt: 6, angle: 60 },    // כובעים
  { src: '/renders/sweatshirt.png', tilt: -4, angle: 120 }, // סווטשרטים
  { src: '/renders/buff.png', tilt: 7, angle: 180 },        // באפים
  { src: '/renders/apron.png', tilt: -6, angle: 240 },      // סינרים
  { src: '/renders/baby.png', tilt: 5, angle: 300 },        // תינוקות
] as const

// Mobile scatter — the desktop composition's language, hand-placed for a tall
// portrait screen (designed at 390×844, scaled down on smaller phones).
// Offsets are px from screen center; order matches PRODUCTS. The products
// zigzag top→bottom around the centered logo with varied sizes and tilts.
type MobileSpot = { x: number; y: number; w: number; tilt: number }
const MOBILE_SPOTS: readonly MobileSpot[] = [
  { x: -74, y: -244, w: 148, tilt: -10 }, // tshirt — top-left (hero)
  { x: 96, y: -150, w: 104, tilt: 9 },    // cap — upper-right
  { x: 102, y: 62, w: 132, tilt: -6 },    // sweatshirt — mid-right
  { x: -114, y: -52, w: 106, tilt: 11 },  // buff — mid-left (small)
  { x: -92, y: 182, w: 126, tilt: -8 },   // apron — lower-left
  { x: 74, y: 292, w: 110, tilt: 7 },     // baby — bottom-right
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

        // Scale the hand-placed 390×844 composition down on smaller phones so
        // no product is clipped at an edge (never upscaled past design size).
        const k = Math.min(window.innerWidth / 390, window.innerHeight / 844, 1)
        // Start offsets: each product's final vector rotated +55° at ~1.9× the
        // distance, so it swirls inward into its slot (desktop's swirl language).
        const swirl = (55 * Math.PI) / 180
        const starts = MOBILE_SPOTS.map(({ x, y }) => ({
          x: (x * Math.cos(swirl) - y * Math.sin(swirl)) * 1.9 * k,
          y: (x * Math.sin(swirl) + y * Math.cos(swirl)) * 1.9 * k,
        }))

        // Mobile total lands ~3.55s; safety sits ~800ms past the end.
        const mTimer = setTimeout(() => {
          doneRef.current = true
          setShow(false)
          signalIntroDone()
        }, 4350)

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
          // 2) The whole scatter swirls into place while each product flies
          //    inward + 3D-flips into its hand-placed slot (staggered).
          .fromTo(
            '[data-intro-scatter-m]',
            { rotation: -35, transformOrigin: '50% 50%' },
            { rotation: 0, duration: 1.1, ease: 'power4.out' },
            0.3
          )
          .fromTo(
            cards,
            {
              transformPerspective: 800,
              opacity: 0,
              scaleX: 0,
              scaleY: 0,
              rotationY: -90,
              rotationZ: () => gsap.utils.random(-25, 25),
              xPercent: -50,
              yPercent: -50,
              x: (i: number) => starts[i]?.x ?? 0,
              y: (i: number) => starts[i]?.y ?? 0,
            },
            {
              opacity: 1,
              scaleX: 1,
              scaleY: 1,
              rotationY: 0,
              rotationZ: (i: number) => MOBILE_SPOTS[i]?.tilt ?? 0,
              x: (i: number) => (MOBILE_SPOTS[i]?.x ?? 0) * k,
              y: (i: number) => (MOBILE_SPOTS[i]?.y ?? 0) * k,
              duration: 0.8,
              ease: 'back.out(1.4)',
              stagger: 0.09,
            },
            0.4
          )
          // 4) Felt per-card bob while held (whole-container rotation read as static).
          .to(
            cards,
            { y: '-=7', duration: 0.4, ease: 'sine.inOut', yoyo: true, repeat: 1, stagger: 0.06 },
            '>-0.05'
          )
          // 5) CLIMAX (0.35s into the bob): scatter retreats, logo grows with glow
          //    boost. Opacity splits from scale so no half-faded ghosts linger, and
          //    the logo starts growing only once the cards are mostly gone.
          .addLabel('climax', '<+0.35')
          .to('[data-intro-scatter-m]', { opacity: 0, duration: 0.3, ease: 'power1.in' }, 'climax')
          .to(
            '[data-intro-scatter-m]',
            { scaleX: 0.55, scaleY: 0.55, duration: 0.5, ease: 'power3.in' },
            'climax'
          )
          .to('[data-intro-logo-m]', { scaleX: 2.6, scaleY: 2.6, duration: 0.75, ease: 'expo.out' }, 'climax+=0.2')
          .to('[data-intro-glow-m]', { scaleX: 2.4, scaleY: 2.4, opacity: 1, duration: 0.75, ease: 'power3.out' }, 'climax+=0.2')
          // Tagline: fade+rise only (animated letter-spacing reads badly in Hebrew),
          // revealed early enough for a ~0.7s full-opacity read before the wipe.
          .fromTo(
            '[data-intro-tag-m]',
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.35, ease: 'expo.out' },
            'climax+=0.25'
          )
          // 6) EXIT: logo fades, clip-path curtain wipe reveals the site.
          .addLabel('exit', 'climax+=1.1')
          .to('[data-intro-logo-m]', { opacity: 0, scaleX: 2.9, scaleY: 2.9, duration: 0.4, ease: 'power2.in' }, 'exit')
          .to('[data-intro-glow-m]', { opacity: 0, scaleX: 3, scaleY: 3, duration: 0.4, ease: 'power2.in' }, 'exit')
          .to(
            el,
            { clipPath: 'inset(0 0 100% 0)', duration: 0.45, ease: 'power4.inOut' },
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
        className="fixed inset-0 z-[10000] flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden bg-[#fffdf5] px-4"
      >
        {/* Soft brand glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#ffc32e]/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-[#fbbf24]/15 blur-3xl" />

        {/* Logo (centered, above the scattered products) */}
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div
              data-intro-glow-m
              className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffc32e]/45 blur-2xl"
              style={{ opacity: 0 }}
            />
            <div data-intro-logo-m className="relative z-[2] h-24 w-24">
              <Image src="/logo.png" alt="" fill priority sizes="336px" quality={95} className="object-contain" />
            </div>
          </div>
        </div>

        {/* Products scattered asymmetrically around the logo (desktop's
            scatter language, portrait values). GSAP owns position/centering;
            widths scale with the viewport below the 390px design width. */}
        <div
          data-intro-scatter-m
          className="absolute inset-0 z-10"
          style={{ perspective: '900px', transformStyle: 'preserve-3d' }}
        >
          {PRODUCTS.map((p, i) => {
            const s = MOBILE_SPOTS[i]
            return (
              <div
                key={p.src}
                data-intro-card-m
                dir="ltr"
                className="absolute left-1/2 top-1/2 aspect-[3/4]"
                style={{
                  width: `min(${s.w}px, ${((s.w / 390) * 100).toFixed(2)}vw)`,
                  willChange: 'transform',
                  opacity: 0,
                }}
              >
                <Image
                  src={p.src}
                  alt=""
                  fill
                  priority={i < 2}
                  sizes="42vw"
                  // Stronger shadow on the light renders (tshirt, baby) so they
                  // don't wash out against the cream background.
                  className={`object-contain p-1 ${
                    i === 0 || i === 5
                      ? 'drop-shadow-[0_12px_22px_rgba(0,0,0,0.32)]'
                      : 'drop-shadow-[0_10px_16px_rgba(0,0,0,0.22)]'
                  }`}
                />
              </div>
            )
          })}
        </div>

        {/* Tagline */}
        <p
          data-intro-tag-m
          dir="rtl"
          className="absolute left-1/2 top-[66%] z-40 -translate-x-1/2 text-center text-2xl font-black tracking-tight text-black"
          style={{ fontFamily: 'var(--font-secular)', textShadow: '0 2px 8px rgba(0,0,0,0.15)', opacity: 0 }}
        >
          עיצוב מוצרים<br />ברמה אחרת
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
      className="fixed inset-0 z-[10000] flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden bg-[#fffdf5]"
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
          <Image src="/logo.png" alt="" fill priority sizes="336px" quality={95} className="object-contain" />
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
              className="absolute left-1/2 top-1/2 -ml-[2.125rem] -mt-12 h-24 w-[4.25rem] sm:-ml-[4.5rem] sm:-mt-[6rem] sm:h-48 sm:w-36"
              style={{ willChange: 'transform' }}
            >
              <Image
                src={p.src}
                alt=""
                fill
                priority={i < 2}
                sizes="(max-width:640px) 104px, 144px"
                className="object-contain p-1 drop-shadow-[0_10px_16px_rgba(0,0,0,0.22)]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tagline */}
      <p
        data-intro-tag
        dir="rtl"
        className="z-10 -mt-5 text-center text-3xl font-black tracking-tight text-black sm:text-4xl"
        style={{ fontFamily: 'var(--font-secular)', textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
      >
        עיצוב מוצרים ברמה אחרת
      </p>
    </div>
  )
}
