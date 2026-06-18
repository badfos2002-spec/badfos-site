'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Button } from '@/components/ui/button'
import Reveal from '@/components/common/Reveal'
import RevealText from '@/components/common/RevealText'

const D = {
  cta_title: 'מוכן ליצור את החולצה הבאה שלך?',
  cta_subtitle: 'צרו עיצובים ייחודיים, הזמינו בקלות, וקבלו משלוח מהיר עד הבית',
  cta_buttonText: '⚡ התחל לעצב עכשיו',
  cta_footnote: 'עיצוב חינם • ללא התחייבות • תמיכה 24/7',
}

export default function NewFinalCTASection() {
  const [c, setC] = useState(D)
  const magneticRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    import('@/lib/db').then(({ getDocument }) => {
      getDocument<Record<string, string>>('settings', 'homepage')
        .then((data) => { if (data) setC({ ...D, ...data }) })
        .catch(() => {})
    })
  }, [])

  // Magnetic pull on the CTA button — desktop + pointer:fine only, disabled under reduced motion.
  useGSAP(
    () => {
      const el = magneticRef.current
      if (!el) return
      if (!window.matchMedia('(pointer: fine)').matches) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
      const sTo = gsap.quickTo(el, 'scale', { duration: 0.4, ease: 'power2.out' })

      const onMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect()
        const relX = e.clientX - (rect.left + rect.width / 2)
        const relY = e.clientY - (rect.top + rect.height / 2)
        xTo(relX * 0.45)
        yTo(relY * 0.45)
      }
      const onEnter = () => sTo(1.1)
      const onLeave = () => {
        xTo(0)
        yTo(0)
        sTo(1)
      }

      el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)

      return () => {
        el.removeEventListener('mousemove', onMove)
        el.removeEventListener('mouseenter', onEnter)
        el.removeEventListener('mouseleave', onLeave)
      }
    },
    { scope: magneticRef }
  )

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-gray-950 via-purple-900 to-indigo-950 text-white relative overflow-hidden" dir="rtl">
      {/* Animated decorative blobs */}
      <div className="absolute top-16 right-16 w-56 h-56 bg-yellow-500/40 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-16 left-16 w-72 h-72 bg-pink-500/30 rounded-full blur-3xl animate-bounce" style={{ animationDuration: '4s' }}></div>
      <div className="absolute top-1/3 left-1/4 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }}></div>
      {/* Glow ring behind content + grid texture */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-[radial-gradient(circle,rgba(255,195,46,0.10),transparent_65%)] pointer-events-none"></div>
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:34px_34px]"></div>

      <div className="mx-auto max-w-[1536px] px-4 md:px-0 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <RevealText
            as="h2"
            text={c.cta_title}
            className="text-3xl lg:text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight"
            y={30}
            stagger={0.07}
          />
          <Reveal as="div" className="contents" stagger={0.15} y={28} delay={0.15}>
            <p className="text-xl text-purple-100/90 mb-10 leading-relaxed">
              {c.cta_subtitle}
            </p>
            <div ref={magneticRef} className="inline-block will-change-transform">
              <Link href="/designer">
                <Button className="bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-extrabold px-7 sm:px-9 md:px-14 py-6 h-auto text-base sm:text-lg md:text-2xl rounded-full shadow-2xl shadow-yellow-500/30 hover:shadow-yellow-400/50 ring-2 ring-white/10 transition-shadow duration-300">
                  {c.cta_buttonText}
                </Button>
              </Link>
            </div>
            <p className="text-sm text-purple-200/80 mt-6">{c.cta_footnote}</p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
