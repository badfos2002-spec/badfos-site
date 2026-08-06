'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Button } from '@/components/ui/button'
import { Sparkles, ShieldCheck, Truck, Star } from 'lucide-react'
import nextDynamic from 'next/dynamic'
import RevealText from '@/components/common/RevealText'

// The 3D product carousel can't be server-rendered (WebGL canvas) — load it
// client-side with a same-size transparent placeholder so the layout never shifts.
const Hero3DCarousel = nextDynamic(() => import('./Hero3DCarousel'), {
  ssr: false,
  loading: () => <div className="w-full mx-auto max-w-[640px] aspect-square" />,
})

const D = {
  hero_badge: 'עיצובים אישיים ייחודיים',
  hero_title1: 'הפכו את הרעיונות שלכם',
  hero_title2: 'לבגדים מדהימים',
  hero_subtitle: 'דיוק • איכות • מיתוג',
  hero_desc1: 'במקום אחד - העלה תמונה, בחר עיצוב, וקבל',
  hero_desc2: 'חולצה איכותית עם הדיזיין האישי שלך.',
  hero_ctaText: 'התחילו לעצב',
}

export default function NewHeroSection() {
  const [c, setC] = useState(D)
  const badgeRef = useRef<HTMLDivElement>(null)
  const subtitleRef = useRef<HTMLHeadingElement>(null)
  const descRef = useRef<HTMLParagraphElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Bold mount entrance. CRITICAL: only badge/subtitle/paragraph + carousel are touched here.
  // The CTA button and rating row are NEVER animated and never start hidden.
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

  return (
    <section className="w-full bg-[#fffdf5] min-h-[600px] pt-3 pb-20 relative overflow-hidden" dir="rtl">
      {/* Ambient brand halos */}
      <div className="absolute -top-32 -right-32 w-[250px] h-[250px] md:w-[500px] md:h-[500px] bg-gradient-radial from-[#fef08a]/60 to-transparent rounded-full blur-3xl pointer-events-none will-change-transform"></div>
      <div className="absolute -top-48 -left-48 w-[250px] h-[250px] md:w-[600px] md:h-[600px] bg-gradient-radial from-[#fdba74]/40 to-transparent rounded-full blur-3xl pointer-events-none will-change-transform"></div>

      <div className="mx-auto max-w-[1536px] px-4 md:px-0 relative z-10">
        <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-center mt-4 md:mt-6">

          {/* Text Content */}
          <div className="text-center w-full px-4 space-y-5 flex flex-col items-center hero-text-rounded min-h-[320px] md:min-h-[380px]">
            <div ref={badgeRef} className="inline-flex items-center gap-2 px-5 py-1.5 bg-[#fef9c3] rounded-full text-[#854d0e] text-sm font-medium border border-[#fde047] shadow-[0_2px_12px_-4px_rgba(245,158,11,0.4)]">
              {c.hero_badge}
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            <RevealText
              as="h1"
              trigger="mount"
              text={c.hero_title1}
              y={36}
              stagger={0.09}
              className="text-[1.9rem] sm:text-[2.1rem] md:text-5xl lg:text-[4rem] font-extrabold text-[#1e293b] leading-[1.1] tracking-tight"
            />
            <RevealText
              as="span"
              trigger="mount"
              text={c.hero_title2}
              y={36}
              stagger={0.09}
              delay={0.18}
              className="block -mt-3 text-[1.9rem] sm:text-[2.1rem] md:text-5xl lg:text-[4rem] font-extrabold text-[#f59e0b] leading-[1.1] tracking-tight drop-shadow-[0_2px_10px_rgba(245,158,11,0.25)]"
            />

            <h2 ref={subtitleRef} className="text-2xl md:text-3xl font-semibold text-[#f59e0b] tracking-wide">
              {c.hero_subtitle}
            </h2>

            <p ref={descRef} className="text-lg md:text-[22px] text-gray-500 max-w-3xl mx-auto leading-relaxed">
              {c.hero_desc1}
              <br className="hidden sm:block" />
              {' '}{c.hero_desc2}
            </p>

            {/* CTA — always visible, never JS-dependent */}
            <div className="hidden md:block mt-6">
              <Link href="/designer">
                <Button className="bg-[#fbbf24] hover:bg-[#f59e0b] text-white text-xl font-bold py-6 px-12 rounded-full shadow-xl transition-all hover:scale-105 hover:shadow-2xl min-w-[280px] inline-flex items-center justify-center gap-2">
                  {c.hero_ctaText}
                  <Sparkles className="w-5 h-5" />
                </Button>
              </Link>
            </div>

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
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-full border border-[#fde047]/70 shadow-sm">
                <Star className="w-4 h-4 text-[#f59e0b] fill-[#f59e0b]" />
                דירוג 5
              </span>
            </div>

            {/* Rating row — always visible, never JS-dependent */}
            <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500 mt-3">
              <div className="flex -space-x-1 rtl:space-x-reverse">
                {['#4285F4', '#34A853', '#E91E63', '#FF8F00'].map((bg, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: bg }}>
                    {['ג', 'ת', 'א', 'ר'][i]}
                  </div>
                ))}
              </div>
              <span>5 מתוך 5 | 30+ ביקורות מאומתות בגוגל</span>
            </div>
          </div>

          {/* Carousel + Mobile Button */}
          <div className="relative w-full flex justify-center md:block md:w-[83%] md:mx-auto mb-10 md:mb-0 mt-2">
            {/* Richer halo behind the carousel card */}
            <div className="absolute inset-0 -z-0 mx-auto my-auto w-[88%] h-[88%] bg-gradient-radial from-[#ffc32e]/35 via-[#fef08a]/20 to-transparent rounded-[2.5rem] blur-2xl pointer-events-none will-change-transform"></div>

            {/* Free-floating 3D ring — no card, no tilt (the ring IS the motion) */}
            <div ref={carouselRef} className="relative w-full will-change-transform">
              <Hero3DCarousel />
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-30 w-40 md:hidden">
              <Link href="/designer">
                <Button className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-white text-base font-bold h-10 rounded-full shadow-lg transition-transform hover:scale-105">
                  {c.hero_ctaText}
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
