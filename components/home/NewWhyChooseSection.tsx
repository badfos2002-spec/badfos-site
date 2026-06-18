'use client'

import { useState, useEffect, useRef } from 'react'
import { Award, Truck, ShieldCheck, Play, Sparkles } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Reveal from '@/components/common/Reveal'
import RevealText from '@/components/common/RevealText'
import useTilt from '@/components/common/useTilt'
import MouseImageTrail from '@/components/home/MouseImageTrail'

const D = {
  why_title: 'למה לבחור בנו?',
  why_subtitle: 'הכנסה לחשבון, עיצוב חולצה ותפוקה — כל זה מיידי ויעיל ביותר',
  why_videoUrl: 'https://www.youtube.com/embed/ZBnLtKpF3l8?start=64&autoplay=1&mute=1&loop=1&playlist=ZBnLtKpF3l8',
  why_b1_title: 'איכות הדפסה גבוהה',
  why_b1_desc: 'הדפסת DTF באיכות פרימיום על חולצות ומוצרי טקסטיל',
  why_b2_title: 'משלוח מהיר',
  why_b2_desc: 'משלוח עד הבית או איסוף עצמי מהסניף',
  why_b3_title: 'תשלום מאובטח',
  why_b3_desc: 'מערכת תשלום מאובטחת ושירות לקוחות 24/7',
}

const ICONS = [Award, Truck, ShieldCheck]

// Real customer photos — pop & follow the cursor over this section (desktop only).
const IMAGES = [
  '/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.webp',
  '/assets/64ab08d41_IMG_3252.webp',
  '/assets/a189e74e3_IMG_0490.webp',
  '/assets/c4660170b_IMG_6179.webp',
  '/assets/fdd643e9f_D747B5AC-1217-4D1F-A7B1-61C6EDE52659.webp',
]

/** YouTube facade — thumbnail loads immediately (it's the hook!), iframe on click only. */
function LazyYouTube({ videoUrl }: { videoUrl: string }) {
  const [loaded, setLoaded] = useState(false)
  const tiltRef = useTilt<HTMLDivElement>({ maxTilt: 8, scale: 1.03, perspective: 1100 })
  const parallaxRef = useRef<HTMLDivElement>(null)

  // Gentle scroll parallax on the card — desktop + motion-on only.
  useGSAP(
    () => {
      const el = parallaxRef.current
      if (!el) return
      const fine = window.matchMedia('(pointer: fine)').matches
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!fine || reduced) return

      gsap.registerPlugin(ScrollTrigger)
      gsap.fromTo(
        el,
        { y: 40 },
        {
          y: -40,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        }
      )
    },
    { scope: parallaxRef }
  )

  // Extract video ID for thumbnail
  const videoId = videoUrl.match(/embed\/([^?]+)/)?.[1] || 'ZBnLtKpF3l8'

  return (
    <div ref={parallaxRef} className="relative flex justify-center lg:justify-end">
      {/* Decorative rotated brand accents */}
      <div
        className="absolute w-full sm:w-[22rem] md:w-[26rem] h-[30rem] sm:h-[34rem] md:h-[38rem] rounded-[2.5rem] bg-gradient-to-br from-[#ffc32e]/35 to-[#f59e0b]/15"
        style={{ transform: 'rotate(35deg)' }}
        aria-hidden
      ></div>
      <div
        className="absolute hidden md:block w-80 h-80 rounded-full bg-[#ffc32e]/25 blur-3xl"
        style={{ transform: 'translate(20%, -20%)' }}
        aria-hidden
      ></div>

      <div
        ref={tiltRef}
        className="relative w-full sm:w-[22rem] md:w-[26rem] h-[30rem] sm:h-[34rem] md:h-[38rem] rounded-[2rem] shadow-[0_35px_80px_-20px_rgba(245,158,11,0.55)] overflow-hidden cursor-pointer group ring-2 ring-white/70 outline outline-4 outline-[#ffc32e]/30"
        onClick={() => setLoaded(true)}
      >
        {/* Glossy brand frame */}
        <div className="pointer-events-none absolute inset-0 z-20 rounded-[2rem] ring-1 ring-inset ring-black/10" aria-hidden></div>

        {loaded ? (
          <iframe
            src={videoUrl}
            title="למה לבחור בנו"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt="למה לבחור בנו — לחצו לצפייה בסרטון"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              fetchPriority="high"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/55 via-black/15 to-transparent group-hover:from-black/65 transition-colors">
              {/* Pulsing ring + play button */}
              <span className="absolute h-20 w-20 rounded-full bg-white/30 animate-ping" aria-hidden></span>
              <div className="relative w-20 h-20 bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-white/40 group-hover:scale-110 transition-transform">
                <Play className="w-9 h-9 text-white fill-white ml-1" />
              </div>
              <span className="sr-only">הפעל סרטון</span>
            </div>

            {/* Floating stat badge */}
            <div className="absolute bottom-5 right-5 z-30 flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-2.5 shadow-xl backdrop-blur ring-1 ring-black/5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffc32e] to-[#f59e0b] text-white shadow">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-sm font-extrabold text-[#1e293b]">
                +1,000 לקוחות מרוצים
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function NewWhyChooseSection() {
  const [c, setC] = useState(D)

  useEffect(() => {
    import('@/lib/db').then(({ getDocument }) => {
      getDocument<Record<string, string>>('settings', 'homepage')
        .then((data) => { if (data) setC({ ...D, ...data }) })
        .catch(() => {})
    })
  }, [])

  const benefits = [1, 2, 3].map((i) => ({
    icon: ICONS[i - 1],
    title: c[`why_b${i}_title` as keyof typeof c],
    description: c[`why_b${i}_desc` as keyof typeof c],
  }))

  return (
    <section
      className="relative w-full overflow-hidden bg-gradient-to-br from-[#fffaf0] via-white to-[#fff6e6] pt-10 pb-24"
      dir="rtl"
    >
      {/* Desktop-only mouse image trail — real customer photos pop & follow the cursor. Behind content. */}
      <MouseImageTrail images={IMAGES} className="absolute inset-0 z-0 overflow-hidden pointer-events-none" />

      {/* Brand glow backdrop */}
      <div className="pointer-events-none absolute -top-20 right-0 h-[28rem] w-[28rem] rounded-full bg-[#ffc32e]/15 blur-3xl" aria-hidden></div>
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[#f59e0b]/10 blur-3xl" aria-hidden></div>
      {/* Subtle dotted texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
        aria-hidden
      ></div>

      <div className="relative z-10 mx-auto max-w-[1536px] px-4 md:px-8">
        {/* Eyebrow pill */}
        <Reveal className="mb-10 flex justify-center lg:justify-end" y={16} duration={0.7}>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ffc32e]/40 bg-white/80 px-5 py-2 text-sm font-bold text-[#b45309] shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            הסיבות שבזכותן בוחרים בנו
          </span>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Video Section — lazy-loaded YouTube (saves ~900KB + 960ms CPU) */}
          <Reveal scale={0.92} y={24} duration={0.9}>
            <LazyYouTube videoUrl={c.why_videoUrl?.startsWith('https://www.youtube.com/') ? c.why_videoUrl : D.why_videoUrl} />
          </Reveal>

          {/* Text Section */}
          <div className="text-right space-y-10" dir="rtl">
            <div>
              <RevealText
                text={c.why_title}
                as="h2"
                trigger="scroll"
                className="text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight text-[#1e293b] mb-5 leading-[1.1]"
              />
              <Reveal as="p" delay={0.15} y={20} className="max-w-xl text-lg lg:text-xl text-[#475569] leading-relaxed">
                {c.why_subtitle}
              </Reveal>
            </div>

            <Reveal className="space-y-5" from="right" y={60} stagger={0.18} duration={0.8}>
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon
                return (
                  <div
                    key={index}
                    className="group relative flex items-start gap-5 rounded-3xl border border-black/5 bg-white/70 p-5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ffc32e]/50 hover:bg-white hover:shadow-[0_28px_55px_-22px_rgba(245,158,11,0.5)]"
                    dir="rtl"
                  >
                    {/* Accent edge */}
                    <span className="absolute inset-y-5 right-0 w-1.5 rounded-full bg-gradient-to-b from-[#ffc32e] to-[#f59e0b] opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden></span>

                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-[#ffc32e] to-[#f59e0b] shadow-lg ring-1 ring-[#ffc32e]/40 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <Icon className="w-8 h-8" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <h3 className="font-extrabold text-xl lg:text-2xl text-[#1e293b] mb-1.5">{benefit.title}</h3>
                      <p className="text-[#64748b] text-base leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                )
              })}
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
