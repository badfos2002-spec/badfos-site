'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Button } from '@/components/ui/button'
import Reveal from '@/components/common/Reveal'
import RevealText from '@/components/common/RevealText'
import { useTilt } from '@/components/common/useTilt'

const packageSlides = [
  { id: 1, title: 'עד 10 חולצות', image: '/assets/ddc5d7f82_10.webp' },
  { id: 2, title: '11-20 חולצות', image: '/assets/0181cec14_11-20.webp' },
  { id: 3, title: '21-50 חולצות', image: '/assets/056e4ce29_21-50.webp' },
]

const pills = ['חיסכון בכמות', 'דילים משתלמים', 'איכות פרימיום']

export default function NewPackagesSection() {
  const [index, setIndex] = useState(0)
  const imageRef = useRef<HTMLImageElement>(null)
  const tiltRef = useTilt<HTMLDivElement>({ maxTilt: 7, scale: 1.02, perspective: 1000 })

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % packageSlides.length)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  useGSAP(() => {
    const el = imageRef.current
    if (!el) return

    gsap.registerPlugin(ScrollTrigger)

    const mm = gsap.matchMedia()
    mm.add(
      '(min-width:1024px) and (prefers-reduced-motion: no-preference)',
      () => {
        gsap.fromTo(
          el,
          { yPercent: -3.5 },
          {
            yPercent: 3.5,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        )
      }
    )
  }, [])

  const slide = packageSlides[index]

  return (
    <section
      className="w-full bg-gradient-to-b from-[#fffdf5] via-[#fff8e6] to-white py-16 md:py-24 relative overflow-hidden"
      dir="rtl"
    >
      {/* Dramatic on-brand amber glow */}
      <div className="absolute -top-32 -right-24 w-72 h-72 md:w-[34rem] md:h-[34rem] bg-gradient-to-br from-[#ffc32e] to-amber-300 rounded-full opacity-40 blur-3xl pointer-events-none animate-[pulse_8s_ease-in-out_infinite]"></div>
      <div className="absolute -bottom-32 -left-24 w-64 h-64 md:w-[28rem] md:h-[28rem] bg-gradient-to-tr from-amber-200 to-yellow-100 rounded-full opacity-50 blur-3xl pointer-events-none animate-[pulse_9s_ease-in-out_infinite]"></div>
      <div className="absolute top-1/2 left-1/3 w-40 h-40 md:w-72 md:h-72 bg-gradient-to-br from-orange-200 to-amber-100 rounded-full opacity-25 blur-3xl pointer-events-none animate-[pulse_7s_ease-in-out_infinite]"></div>
      {/* subtle dotted pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#92400e 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      ></div>

      <div className="mx-auto max-w-[1536px] px-4 md:px-0 relative z-10">
        <div className="relative bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-[0_40px_90px_-30px_rgba(180,120,10,0.5)] ring-1 ring-amber-200/70 py-12 px-6 md:px-12 overflow-hidden">
          {/* top accent bar */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-[#ffc32e] to-transparent"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* RIGHT - Carousel */}
            <Reveal as="div" from="right" y={48} scale={0.94} duration={0.9}>
              <div className="relative">
                {/* decorative "best value" ribbon badge */}
                <div className="absolute -top-4 -right-3 md:-top-5 md:-right-5 z-30 pointer-events-none rotate-[8deg]">
                  <div className="relative bg-gradient-to-br from-[#ffc32e] to-amber-500 text-[#3b2600] font-extrabold text-xs md:text-sm px-4 py-2 rounded-2xl shadow-[0_12px_28px_-8px_rgba(217,150,20,0.8)] ring-2 ring-white/80">
                    <span className="flex items-center gap-1">🔥 ההצעה הכי שווה</span>
                  </div>
                </div>

                <div
                  ref={tiltRef}
                  className="relative w-full aspect-[4/3] rounded-[1.75rem] overflow-hidden bg-amber-50/60 ring-2 ring-[#ffc32e]/60 shadow-[0_40px_90px_-28px_rgba(255,180,30,0.7)] [will-change:transform]"
                >
                  <Image
                    key={slide.id}
                    ref={imageRef}
                    src={slide.image}
                    alt={slide.title}
                    fill
                    className="object-cover animate-fadeIn scale-[1.1]"
                    priority
                  />

                  {/* premium frame + glossy sheen */}
                  <div className="absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/40 pointer-events-none z-10"></div>
                  <div className="absolute inset-x-0 -top-1/4 h-1/2 bg-gradient-to-b from-white/40 to-transparent -skew-y-6 pointer-events-none z-10"></div>
                  <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none z-10"></div>

                  {/* slide title overlay */}
                  <div className="absolute bottom-12 right-0 left-0 px-5 z-20 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-[#3b2600] font-extrabold text-sm md:text-base px-3.5 py-1.5 rounded-full shadow-lg ring-1 ring-amber-200">
                      👕 {slide.title}
                    </span>
                  </div>

                  {/* Navigation dots */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2.5 z-20">
                    {packageSlides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          i === index
                            ? 'w-8 bg-[#ffc32e] shadow-[0_0_14px_rgba(255,195,46,0.95)]'
                            : 'w-2.5 bg-white/70 hover:bg-white'
                        }`}
                        aria-label={`עבור לחבילה ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* LEFT - Text Content */}
            <div className="text-center flex flex-col items-center">
              <Reveal as="div" delay={0.1} y={24} duration={0.7}>
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ffc32e] to-amber-300 px-5 py-2 rounded-full mb-6 ring-1 ring-amber-300/70 shadow-[0_8px_24px_-8px_rgba(217,150,20,0.7)]">
                  <span className="text-xl">💰</span>
                  <span className="text-xs font-extrabold tracking-wide text-[#3b2600]">חיסכון חכם בכמויות</span>
                </div>
              </Reveal>

              <RevealText
                text="חבילות ומבצעים"
                as="h2"
                trigger="scroll"
                className="text-4xl lg:text-6xl font-black text-[#1e293b] mb-5 tracking-tight"
              />

              {/* Bold savings stat */}
              <Reveal as="div" delay={0.12} y={22} duration={0.7} scale={0.95} className="mb-6">
                <div className="inline-flex items-end gap-2 bg-gradient-to-br from-[#fff7df] to-amber-50 px-6 py-3 rounded-2xl ring-1 ring-amber-200/80 shadow-sm">
                  <span className="text-5xl lg:text-6xl font-black leading-none bg-gradient-to-br from-[#f59e0b] to-[#d97706] bg-clip-text text-transparent">
                    5%
                  </span>
                  <span className="text-sm lg:text-base font-bold text-[#475569] pb-1.5 text-right leading-tight">
                    הנחה
                    <br />
                    על 15+ יח׳
                  </span>
                </div>
              </Reveal>

              <Reveal as="p" delay={0.15} y={20} duration={0.7} className="text-base lg:text-lg text-[#475569] mb-8 max-w-md">
                בחרו טווח כמות, סוג, צבע ומידות – והכול מוכן לקופה בהמשך
              </Reveal>

              <Reveal as="div" stagger={0.1} y={18} duration={0.6} className="flex flex-wrap gap-3 mb-9 justify-center">
                {pills.map((label) => (
                  <div
                    key={label}
                    className="bg-white/90 px-5 py-2.5 rounded-full text-sm font-bold text-[#3b2600] ring-1 ring-amber-300/70 shadow-[0_6px_18px_-8px_rgba(217,150,20,0.5)] transition-all duration-200 hover:ring-[#ffc32e] hover:shadow-[0_10px_24px_-8px_rgba(217,150,20,0.7)] hover:-translate-y-1"
                  >
                    {label}
                  </div>
                ))}
              </Reveal>

              <Reveal as="div" delay={0.25} y={20} duration={0.7} scale={0.96}>
                <Link href="/packages">
                  <Button className="group relative bg-gradient-to-r from-[#f59e0b] via-[#ffc32e] to-[#ffd95c] hover:brightness-105 text-[#3b2600] font-black px-10 h-14 rounded-full shadow-[0_18px_40px_-12px_rgba(217,150,20,0.85)] hover:shadow-[0_24px_50px_-12px_rgba(217,150,20,1)] hover:-translate-y-1 transition-all duration-300 text-lg overflow-hidden">
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/50 to-transparent"></span>
                    <span className="relative flex items-center gap-2">👕 לצפייה בכל החבילות</span>
                  </Button>
                </Link>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
