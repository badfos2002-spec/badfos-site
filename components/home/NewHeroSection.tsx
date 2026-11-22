'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import GoogleRatingBadge from '@/components/common/GoogleRatingBadge'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Button } from '@/components/ui/button'
import { Sparkles, ShieldCheck, Truck, Tag, MessageCircle } from 'lucide-react'
import HeroCarousel, { type HeroSlide } from './HeroCarousel'
import RevealText from '@/components/common/RevealText'
import { useTilt } from '@/components/common/useTilt'
import { ProductRiver } from './ProductRiver'
import { HOME_CAROUSEL_ITEMS } from '@/lib/home-carousel'
import { dealHeroCopy, dealImage, dealPath, dealWhatsAppLink } from '@/lib/deals'
import { trackWhatsAppClick } from '@/lib/tracking'
import type { Deal } from '@/lib/types'

const D = {
  hero_badge: 'עיצובים אישיים ייחודיים',
  hero_title1: 'הפכו את הרעיונות שלכם',
  hero_title2: 'לבגדים מדהימים',
  hero_subtitle: 'דיוק • איכות • מיתוג',
  hero_desc1: 'חולצות, קפוצ׳ונים, כובעים, סינרים, תיקים ועוד —',
  hero_desc2: 'הדפסה אישית על הכל, עם שירות שהלקוחות ממליצים עליו בגוגל.',
  hero_ctaText: 'התחילו לעצב',
}

/** The deal slide rests longer than a product photo (TICKET-025 §B item 6). */
const DEAL_DWELL_MS = 8000

/** A copy cell: one grid cell holding both copy blocks, sized like today's flex
    item (content width, centred) so the swap cannot move anything. TICKET-027:
    the height is reserved per block, so `items-center` splits the leftover of
    the shorter block half above / half below it — never between its lines. */
const COPY_SLOT = 'grid justify-items-center items-center'

/** One copy block inside a cell: today's no-deal rhythm, pixel for pixel —
    16 px between lines on mobile, 20 px on desktop. */
const COPY_BLOCK = 'flex flex-col items-center gap-4 md:gap-5'

/** `heroDeals` (TICKET-029): every live deal marked «בהירו» opens the carousel,
    each with its own copy; without any of them the hero is unchanged. */
export default function NewHeroSection({ heroDeals }: { heroDeals?: Deal[] } = {}) {
  const [c, setC] = useState(D)
  /** One entry per hero deal, in the order the server read them (sortDeals). */
  const dealStates = (heroDeals ?? []).map((deal) => ({
    deal,
    copy: dealHeroCopy(deal),
    path: dealPath(deal.slug),
    waHref: dealWhatsAppLink(deal),
    image: dealImage(deal, 'square'),
  }))
  const hasDeals = dealStates.length > 0
  const badgeRef = useRef<HTMLDivElement>(null)
  const subtitleRef = useRef<HTMLHeadingElement>(null)
  const descRef = useRef<HTMLParagraphElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  // TICKET-029: the deals open the carousel consecutively and the copy follows
  // the active slide — deal k owns it while `slide === k`, the default copy once
  // the deal slides are past. SSR renders index 0 — the first deal's state — so
  // there is no hydration mismatch.
  const [slide, setSlide] = useState(0)
  const defaultActive = slide >= dealStates.length
  const leadSlides: HeroSlide[] = dealStates.map(({ deal, copy, path, image }) => ({
    id: `deal-${deal.id}`,
    image,
    alt: copy.title,
    link: path,
    dwellMs: DEAL_DWELL_MS,
  }))

  // 3D tilt on the carousel card (desktop + non-reduced-motion only; no-op otherwise).
  const tiltRef = useTilt<HTMLDivElement>({ maxTilt: 7, scale: 1.02, perspective: 900 })

  // Bold mount entrance. CRITICAL: only badge/subtitle/paragraph + carousel are touched here.
  // The CTA button and rating row are NEVER animated and never start hidden.
  // With hero deals the three refs land on the FIRST deal's own badge / price /
  // text and on no other deal's: SSR renders slide 0, so deal 0's state is the
  // one painted at mount, and the entrance must animate exactly the elements the
  // visitor sees — never an invisible sizer. The h1s stay out of the array:
  // RevealText owns the titles.
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const fadeUp = [badgeRef.current, subtitleRef.current, descRef.current].filter(Boolean)
    if (fadeUp.length) {
      gsap.from(fadeUp, {
        opacity: 0,
        y: 22,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.1,
        delay: 0.15,
      })
    }

    // Carousel: confident entrance — ends fully visible (gsap.from), quick so it never risks LCP.
    if (carouselRef.current) {
      gsap.from(carouselRef.current, {
        opacity: 0,
        scale: 0.92,
        duration: 0.85,
        ease: 'power3.out',
      })
    }
  }, [])

  // Dynamic import — Firebase SDK not bundled with hero, loaded on demand
  useEffect(() => {
    const timer = setTimeout(() => {
      import('@/lib/db').then(({ getDocument }) => {
        getDocument<Record<string, string>>('settings', 'homepage')
          .then((data) => { if (data) setC({ ...D, ...data }) })
          .catch(() => {})
      })
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Today's copy. Shared by the no-deal hero (where these are the only copy and
  // carry the refs) and by the deal hero, where the same elements sit in a copy
  // slot as the product-slide state.
  const defaultBadge = (ref?: React.Ref<HTMLDivElement>) => (
    <div ref={ref} className="order-1 md:order-none inline-flex items-center gap-2 px-5 py-1.5 bg-[#fef9c3] rounded-full text-[#854d0e] text-sm font-medium border border-[#fde047] shadow-[0_2px_12px_-4px_rgba(245,158,11,0.4)]">
      {c.hero_badge}
      <Sparkles className="w-3.5 h-3.5" />
    </div>
  )
  const defaultTitle1 = () => (
    <RevealText
      as="h1"
      trigger="mount"
      text={c.hero_title1}
      y={36}
      stagger={0.09}
      className="order-2 md:order-none text-[1.9rem] sm:text-[2.1rem] md:text-5xl lg:text-[4rem] font-extrabold text-[#1e293b] leading-[1.1] tracking-tight"
    />
  )
  // `extra` is empty for the no-deal hero, so its className stays byte-identical
  // to production; the deal hero adds the md:mt-0 its copy block needs.
  const defaultTitle2 = (extra = '') => (
    <RevealText
      as="span"
      trigger="mount"
      text={c.hero_title2}
      y={36}
      stagger={0.09}
      delay={0.18}
      className={`order-3 md:order-none block -mt-3 text-[1.9rem] sm:text-[2.1rem] md:text-5xl lg:text-[4rem] font-extrabold text-[#f59e0b] leading-[1.1] tracking-tight drop-shadow-[0_2px_10px_rgba(245,158,11,0.25)] ${extra}`.trimEnd()}
    />
  )
  const defaultSubtitle = (ref?: React.Ref<HTMLHeadingElement>) => (
    <h2 ref={ref} className="order-4 md:order-none text-2xl md:text-3xl font-semibold text-[#f59e0b] tracking-wide">
      {c.hero_subtitle}
    </h2>
  )
  const defaultDesc = (ref?: React.Ref<HTMLParagraphElement>) => (
    <p ref={ref} className="order-6 md:order-none text-lg md:text-[22px] text-gray-500 max-w-3xl mx-auto leading-relaxed px-4 md:px-0">
      {c.hero_desc1}
      <br className="hidden sm:block" />
      {' '}{c.hero_desc2}
    </p>
  )
  const designerCta = () => (
    <Link href="/designer">
      <Button className="bg-[#fbbf24] hover:bg-[#f59e0b] text-white text-xl font-bold py-6 px-12 rounded-full shadow-xl transition-all hover:scale-105 hover:shadow-2xl min-w-[280px] inline-flex items-center justify-center gap-2">
        {c.hero_ctaText}
        <Sparkles className="w-5 h-5" />
      </Button>
    </Link>
  )

  return (
    <section className="w-full bg-[#fffdf5] min-h-[600px] pt-3 pb-20 relative overflow-hidden" dir="rtl">
      {/* Ambient brand halos */}
      <div className="absolute -top-32 -right-32 w-[250px] h-[250px] md:w-[500px] md:h-[500px] bg-gradient-radial from-[#fef08a]/60 to-transparent rounded-full blur-3xl pointer-events-none will-change-transform"></div>
      <div className="absolute -top-48 -left-48 w-[250px] h-[250px] md:w-[600px] md:h-[600px] bg-gradient-radial from-[#fdba74]/40 to-transparent rounded-full blur-3xl pointer-events-none will-change-transform"></div>

      <div className="mx-auto max-w-[1536px] px-4 md:px-0 relative z-10">
        {/* Mobile: the text wrapper is display:contents, so its children join this
            flex column as siblings of the carousel and order-* classes arrange them:
            badge+title+subtitle → carousel (+CTA) → desc → rating. md: restores the
            exact production grid (wrapper back to flex, all orders reset). */}
        <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-center mt-4 md:mt-6">

          {/* Text Content */}
          <div className="text-center w-full px-4 md:space-y-5 contents md:flex md:flex-col md:items-center hero-text-rounded min-h-[320px] md:min-h-[380px]">
            {hasDeals ? (
              <>
                {/* TICKET-027: two cells, not one per copy element. Each holds
                    every state as a whole block, so the cell is as tall as the
                    tallest block and the shorter ones are centred — the leftover
                    sits above and below the block, never between its lines.
                    TICKET-029: one block per hero deal, in deals order, and the
                    default state LAST — the order is load-bearing, the tests
                    read the blocks positionally.
                    The order-* classes of the shared elements are untouched:
                    inside a block they sort ascending and change nothing, while
                    the cells carry the mobile ladder (above the carousel, below
                    it). md:order-none is load-bearing — order-* is not
                    mobile-scoped, so without it the «below» cell would sort
                    after the desktop CTA row, the chips and the rating. */}
                <div data-testid="hero-copy-above" className={`order-1 md:order-none ${COPY_SLOT}`}>
                  {dealStates.map(({ deal, copy }, k) => (
                    <CopyState key={deal.id} active={slide === k} className={COPY_BLOCK}>
                      {/* The three GSAP refs land on deal 0 only — the state SSR
                          paints at mount. A later deal's block is an invisible
                          sizer there, and the entrance must never animate one. */}
                      <div ref={k === 0 ? badgeRef : undefined} data-testid="hero-deal-badge" className="order-1 md:order-none inline-flex items-center gap-2 px-5 py-1.5 bg-[#ffc32e] rounded-full text-[#3b2600] text-sm font-extrabold border border-[#fbbf24] shadow-[0_2px_12px_-4px_rgba(245,158,11,0.4)]">
                        מבצע
                        <Tag className="w-3.5 h-3.5" />
                      </div>
                      <RevealText
                        as="h1"
                        trigger="mount"
                        text={copy.title}
                        y={36}
                        stagger={0.09}
                        className="order-2 md:order-none text-[1.9rem] sm:text-[2.1rem] md:text-5xl lg:text-[4rem] font-extrabold text-[#1e293b] leading-[1.1] tracking-tight"
                      />
                      {deal.priceText && (
                        <h2 ref={k === 0 ? subtitleRef : undefined} className="order-4 md:order-none text-2xl md:text-3xl font-semibold text-[#f59e0b] tracking-wide">
                          {deal.priceText}
                        </h2>
                      )}
                    </CopyState>
                  ))}
                  <CopyState active={defaultActive} className={COPY_BLOCK}>
                    {defaultBadge()}
                    {defaultTitle1()}
                    {/* In production the wrapper's md:space-y-5 outranks the
                        span's -mt-3 (0,3,0 vs 0,1,0) so the desktop gap is the
                        full 20 px. Inside a block the -mt-3 comes back to life,
                        so it is cancelled on the element itself — the one place
                        nothing outranks it. */}
                    {defaultTitle2('md:mt-0')}
                    {defaultSubtitle()}
                  </CopyState>
                </div>

                <div data-testid="hero-copy-below" className={`order-6 md:order-none ${COPY_SLOT}`}>
                  {dealStates.map(({ deal, copy }, k) => (
                    <CopyState key={deal.id} active={slide === k} className={COPY_BLOCK}>
                      <p ref={k === 0 ? descRef : undefined} className="order-6 md:order-none text-lg md:text-[22px] text-gray-500 max-w-3xl mx-auto leading-relaxed px-4 md:px-0">
                        {copy.text}
                      </p>
                    </CopyState>
                  ))}
                  <CopyState active={defaultActive} className={COPY_BLOCK}>{defaultDesc()}</CopyState>
                </div>

                {/* Desktop CTA — every state in one cell, so the trust chips and
                    the rating row below them never move. */}
                <div className={`hidden md:grid mt-6 justify-items-center items-center`}>
                  {dealStates.map(({ deal, copy, path, waHref }, k) => (
                    <CopyState key={deal.id} active={slide === k}>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link href={path} className="bg-[#fbbf24] hover:bg-[#f59e0b] text-white text-xl font-bold py-3.5 px-12 rounded-full shadow-xl transition-all hover:scale-105 hover:shadow-2xl min-w-[280px] inline-flex items-center justify-center gap-2">
                          {copy.ctaLabel}
                        </Link>
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackWhatsAppClick('hero_deal')}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5b] text-white text-lg font-bold py-3.5 px-8 shadow-lg"
                        >
                          <MessageCircle className="w-5 h-5" aria-hidden="true" />
                          וואטסאפ
                        </a>
                      </div>
                    </CopyState>
                  ))}
                  <CopyState active={defaultActive}>{designerCta()}</CopyState>
                </div>
              </>
            ) : (
            <>
            {defaultBadge(badgeRef)}

            {defaultTitle1()}
            {defaultTitle2()}

            {defaultSubtitle(subtitleRef)}

            {defaultDesc(descRef)}


            {/* CTA — always visible, never JS-dependent */}
            <div className="hidden md:block mt-6">
              {designerCta()}
            </div>
            </>
            )}

            {/* Trust chips — premium, on-brand, always visible */}
            <div className="hidden md:flex items-center justify-center gap-2.5 mt-4 text-[13px] font-medium text-[#854d0e]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-full border border-[#fde047]/70 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-[#f59e0b]" />
                איכות מובטחת
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-full border border-[#fde047]/70 shadow-sm">
                <Truck className="w-4 h-4 text-[#f59e0b]" />
                משלוח מהיר
              </span>
            </div>

            {/* Rating row — always visible, never JS-dependent */}
            <div className="order-7 md:order-none flex items-center gap-2 text-sm sm:text-base text-gray-500 mt-3">
              <div className="flex -space-x-1 rtl:space-x-reverse">
                {['#4285F4', '#34A853', '#E91E63', '#FF8F00'].map((bg, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: bg }}>
                    {['ג', 'ת', 'א', 'ר'][i]}
                  </div>
                ))}
              </div>
              <GoogleRatingBadge />
            </div>
          </div>

          {/* Carousel + Mobile Button */}
          <div className={hasDeals ? "order-5 md:order-none relative w-full flex justify-center md:block md:w-[83%] md:mx-auto mt-2" : "order-5 md:order-none relative w-full flex justify-center md:block md:w-[83%] md:mx-auto mb-10 md:mb-0 mt-2"}>
            {/* Richer halo behind the carousel card */}
            <div className="absolute inset-0 -z-0 mx-auto my-auto w-[88%] h-[88%] bg-gradient-radial from-[#ffc32e]/35 via-[#fef08a]/20 to-transparent rounded-[2.5rem] blur-2xl pointer-events-none will-change-transform"></div>

            <div ref={carouselRef} className="relative w-full will-change-transform">
              <div ref={tiltRef} className="w-full will-change-transform">
                {hasDeals ? (
                  <HeroCarousel leadSlides={leadSlides} onChange={setSlide} />
                ) : (
                <HeroCarousel />
                )}
              </div>
            </div>

            {!hasDeals && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-30 w-40 md:hidden">
              <Link href="/designer">
                <Button className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-white text-base font-bold h-10 rounded-full shadow-lg transition-transform hover:scale-105">
                  {c.hero_ctaText}
                </Button>
              </Link>
            </div>
            )}
          </div>

          {/* Mobile, hero deals: the actions sit directly under the image on every
              slide — the active deal's pair, or the designer button on a product
              slide (desktop keeps its CTA row). */}
          {hasDeals && (
            <div data-testid="hero-deal-mobile-actions" className="order-5 md:hidden grid w-full px-1">
              {dealStates.map(({ deal, copy, path, waHref }, k) => (
                <CopyState key={deal.id} active={slide === k}>
                  <div className="flex flex-wrap gap-3">
                    <Link href={path} className="inline-flex min-h-[48px] flex-1 basis-0 whitespace-nowrap items-center justify-center rounded-full bg-[#fbbf24] hover:bg-[#f59e0b] px-3 text-center text-base font-bold leading-tight text-white shadow-lg">
                      {copy.ctaLabel}
                    </Link>
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackWhatsAppClick('hero_deal')}
                      className="inline-flex min-h-[48px] flex-1 basis-0 whitespace-nowrap items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5b] px-3 text-base font-bold text-white shadow-lg"
                    >
                      <MessageCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                      וואטסאפ
                    </a>
                  </div>
                </CopyState>
              ))}
              <CopyState active={defaultActive}>
                <div className="flex">
                  <Link href="/designer" className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#fbbf24] hover:bg-[#f59e0b] px-3 text-base font-bold text-white shadow-lg">
                    {c.hero_ctaText}
                    <Sparkles className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  </Link>
                </div>
              </CopyState>
            </div>
          )}

        </div>
      </div>

      {/* The river — two full-bleed product rows flowing below the hero copy */}
      <ProductRiver items={HOME_CAROUSEL_ITEMS} className="relative z-10 mt-10 md:mt-14" />
    </section>
  )
}

/**
 * One copy state inside a slot. All the states share the same grid cell, so the
 * cell keeps the height of the tallest one and a slide change moves nothing.
 * The inactive one is an invisible aria-hidden sizer: `visibility` is part of
 * the transition, so it stays painted while it fades out — in step with the
 * carousel's 500 ms slide fade — and is unfocusable once hidden. All the states
 * stay mounted, so the RevealText entrance plays once on mount and never again.
 * The duration must be a theme value: tailwindcss-animate overrides
 * duration/delay and drops arbitrary ones, so `duration-[400ms]` would compile
 * to nothing and the swap would be instant.
 */
function CopyState({ active, className = '', children }: { active: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div
      aria-hidden={!active || undefined}
      className={`col-start-1 row-start-1 transition-[opacity,visibility] duration-500 ${active ? 'opacity-100 visible' : 'opacity-0 invisible'} ${className}`.trimEnd()}
    >
      {children}
    </div>
  )
}
