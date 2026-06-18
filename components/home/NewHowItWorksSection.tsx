'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Button } from '@/components/ui/button'
import { Upload, Palette, Shirt, ArrowLeft } from 'lucide-react'
import Reveal from '@/components/common/Reveal'
import RevealText from '@/components/common/RevealText'

const D = {
  hiw_title: 'איך זה עובד?',
  hiw_subtitle: 'תהליך פשוט בשלושה שלבים',
  hiw_s1_title: 'העלה תמונה',
  hiw_s1_desc: 'העלה את העיצוב שלך או בחר מהגלריה',
  hiw_s2_title: 'בחר עיצוב',
  hiw_s2_desc: 'התאם אישית עם צבעים, טקסט וגרפיקה',
  hiw_s3_title: 'צפה בעיצוב שלך',
  hiw_s3_desc: 'ראה תצוגה מקדימה בזמן אמת',
  hiw_ctaText: 'בואו נתחיל!',
}

const ICONS = [Upload, Palette, Shirt]
const GRADIENTS = ['from-blue-500 to-purple-600', 'from-pink-500 to-rose-600', 'from-green-500 to-emerald-600']
const GLOWS = ['shadow-purple-500/40', 'shadow-rose-500/40', 'shadow-emerald-500/40']

export default function NewHowItWorksSection() {
  const [c, setC] = useState(D)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    import('@/lib/db').then(({ getDocument }) => {
      getDocument<Record<string, string>>('settings', 'homepage')
        .then((data) => { if (data) setC({ ...D, ...data }) })
        .catch(() => {})
    })
  }, [])

  const steps = [1, 2, 3].map((i, idx) => ({
    number: i,
    title: c[`hiw_s${i}_title` as keyof typeof c],
    description: c[`hiw_s${i}_desc` as keyof typeof c],
    icon: ICONS[idx],
    gradient: GRADIENTS[idx],
    glow: GLOWS[idx],
  }))

  // Choreographed bold entrance: icon pops in (back ease overshoot), text rises,
  // connectors draw (scaleX) right after each step appears. RTL-aware, reduced-motion safe.
  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.registerPlugin(ScrollTrigger)

      const buildTimeline = (selector: string) => {
        const scope = root.querySelector<HTMLElement>(selector)
        if (!scope) return
        if (scope.offsetParent === null) return // hidden layout (display:none) — skip

        const icons = scope.querySelectorAll<HTMLElement>('[data-hiw-icon]')
        const texts = scope.querySelectorAll<HTMLElement>('[data-hiw-text]')
        const connectors = scope.querySelectorAll<HTMLElement>('[data-hiw-connector]')
        if (!icons.length) return

        gsap.set(icons, { opacity: 0, scale: 0.6 })
        gsap.set(texts, { opacity: 0, y: 26 })
        gsap.set(connectors, { scaleX: 0, opacity: 0 })

        const tl = gsap.timeline({
          scrollTrigger: { trigger: scope, start: 'top 80%', once: true },
        })

        icons.forEach((icon, i) => {
          const label = `step-${i}`
          tl.add(label, i === 0 ? 0 : '-=0.15')
          tl.to(icon, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.7)' }, label)
          if (texts[i]) {
            tl.to(texts[i], { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }, label + '+=0.12')
          }
          if (connectors[i]) {
            tl.to(connectors[i], { scaleX: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }, label + '+=0.2')
          }
        })
      }

      buildTimeline('[data-hiw-desktop]')
      buildTimeline('[data-hiw-mobile]')
    },
    { scope: rootRef }
  )

  return (
    <section className="w-full bg-gradient-to-br from-white via-blue-50 to-purple-50 py-20 relative overflow-hidden" dir="rtl">
      <div className="absolute top-10 right-10 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full opacity-10 animate-bounce" style={{ animationDuration: '4s' }}></div>

      <div ref={rootRef} className="mx-auto max-w-[1536px] px-4 md:px-0 relative z-10">
        <div className="text-center mb-16">
          <RevealText
            text={c.hiw_title}
            as="h2"
            trigger="scroll"
            className="text-3xl lg:text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600"
          />
          <Reveal as="p" delay={0.15} y={16} duration={0.7} className="text-xl text-gray-600">
            {c.hiw_subtitle}
          </Reveal>
        </div>

        <div className="max-w-5xl mx-auto mb-12">
          {/* Desktop */}
          <div data-hiw-desktop className="hidden md:flex items-start justify-center gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-8 lg:gap-12">
                <div className="flex flex-col items-center">
                  <div
                    data-hiw-icon
                    className={`relative w-28 h-28 rounded-[1.75rem] bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-2xl ${step.glow} hover:-translate-y-2 hover:scale-105 transition-transform duration-300 cursor-pointer group`}
                  >
                    <span className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    <step.icon className="w-12 h-12 text-white group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                    <span className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-gray-900 text-base font-extrabold flex items-center justify-center shadow-lg ring-2 ring-yellow-400">
                      {step.number}
                    </span>
                  </div>
                  <div data-hiw-text className="mt-6 text-center w-48">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex items-center mt-12" data-hiw-connector style={{ transformOrigin: 'right center' }}>
                    <svg width="64" height="24" viewBox="0 0 64 24" fill="none" className="text-gray-300 rotate-180">
                      <line x1="0" y1="12" x2="52" y2="12" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="0.5 9" />
                      <path d="M48 5 L57 12 L48 19" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile */}
          <div data-hiw-mobile className="md:hidden flex flex-col items-center space-y-6">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="flex flex-col items-center">
                  <div
                    data-hiw-icon
                    className={`relative w-24 h-24 rounded-3xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-xl ${step.glow}`}
                  >
                    <step.icon className="w-12 h-12 text-white" />
                    <span className="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full bg-white text-gray-900 text-sm font-extrabold flex items-center justify-center shadow-lg ring-2 ring-yellow-400">
                      {step.number}
                    </span>
                  </div>
                  <div data-hiw-text className="mt-4 text-center max-w-[280px]">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div data-hiw-connector className="mt-4" style={{ transformOrigin: 'top center' }}>
                    <svg className="w-8 h-9 text-gray-300" fill="none" viewBox="0 0 32 48">
                      <path d="M16 0 L16 40 M8 32 L16 40 L24 32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Reveal className="text-center mt-20" delay={0.1} y={24} scale={0.92} duration={0.7}>
          <Link href="/designer">
            <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 hover:shadow-2xl text-white font-semibold px-8 py-4 rounded-2xl shadow-lg text-lg hover-lift inline-flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 mr-2" />
              {c.hiw_ctaText}
            </Button>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
