'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import HeroCarousel from './HeroCarousel'
import { getDocument } from '@/lib/db'

const D = {
  hero_badge: 'עיצובים אישיים ייחודיים',
  hero_title1: 'הפוך את הרעיונות שלך',
  hero_title2: 'לחולצות מדהימות',
  hero_subtitle: 'דיוק • איכות • מיתוג',
  hero_desc1: 'במקום אחד - העלה תמונה, בחר עיצוב, וקבל',
  hero_desc2: 'חולצה איכותית עם הדיזיין האישי שלך.',
  hero_ctaText: 'לעיצוב חולצה',
}

export default function NewHeroSection() {
  const [c, setC] = useState(D)

  useEffect(() => {
    getDocument<Record<string, string>>('settings', 'homepage')
      .then((data) => { if (data) setC({ ...D, ...data }) })
      .catch(() => {})
  }, [])

  return (
    <section className="w-full bg-[#fffdf5] min-h-[600px] pt-3 pb-20 relative overflow-hidden" dir="rtl">
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-radial from-[#fef08a]/60 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-gradient-radial from-[#fdba74]/40 to-transparent rounded-full blur-3xl"></div>

      <div className="mx-auto max-w-[1536px] px-4 md:px-0 relative z-10">
        <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-center mt-4 md:mt-6">

          {/* Text Content */}
          <div className="text-center w-full px-4 space-y-5 flex flex-col items-center hero-text-rounded">
            <div className="inline-flex items-center gap-2 px-5 py-1.5 bg-[#fef9c3] rounded-full text-[#854d0e] text-sm font-medium border border-[#fef08a]">
              {c.hero_badge}
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-[#1e293b] leading-tight">
              {c.hero_title1}
              <br />
              <span className="text-[#f59e0b]">{c.hero_title2}</span>
            </h1>

            <h2 className="text-2xl md:text-3xl font-medium text-[#f59e0b] tracking-wide">
              {c.hero_subtitle}
            </h2>

            <p className="text-lg md:text-[22px] text-gray-500 max-w-3xl mx-auto leading-relaxed">
              {c.hero_desc1}
              <br className="hidden sm:block" />
              {' '}{c.hero_desc2}
            </p>

            <div className="hidden md:block mt-6">
              <Link href="/designer">
                <Button className="bg-[#fbbf24] hover:bg-[#f59e0b] text-white text-xl font-bold py-6 px-12 rounded-full shadow-xl transition-all hover:scale-105 hover:shadow-2xl min-w-[280px] inline-flex items-center justify-center gap-2">
                  {c.hero_ctaText}
                  <Sparkles className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Carousel + Mobile Button */}
          <div className="relative w-full flex justify-center md:block md:w-[83%] md:mx-auto mb-10 md:mb-0 mt-2">
            <HeroCarousel />
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
