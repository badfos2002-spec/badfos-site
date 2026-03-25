'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const D = {
  cta_title: 'מוכן ליצור את החולצה הבאה שלך?',
  cta_subtitle: 'צרו עיצובים ייחודיים, הזמינו בקלות, וקבלו משלוח מהיר עד הבית',
  cta_buttonText: '⚡ התחל לעצב עכשיו',
  cta_footnote: 'עיצוב חינם • ללא התחייבות • תמיכה 24/7',
}

export default function NewFinalCTASection() {
  const [c, setC] = useState(D)

  useEffect(() => {
    import('@/lib/db').then(({ getDocument }) => {
      getDocument<Record<string, string>>('settings', 'homepage')
        .then((data) => { if (data) setC({ ...D, ...data }) })
        .catch(() => {})
    })
  }, [])

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden" dir="rtl">
      <div className="absolute top-20 right-20 w-48 h-48 bg-yellow-500/40 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-pink-500/30 rounded-full blur-2xl animate-bounce" style={{ animationDuration: '3s' }}></div>

      <div className="mx-auto max-w-[1536px] px-4 md:px-0 relative z-10">
        <div className="max-w-3xl mx-auto text-center" dir="rtl">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
            {c.cta_title}
          </h2>
          <p className="text-xl text-purple-100 mb-10 leading-relaxed">
            {c.cta_subtitle}
          </p>
          <Link href="/designer">
            <Button className="bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-bold px-6 sm:px-8 md:px-12 py-6 h-auto text-base sm:text-lg md:text-2xl rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-105 duration-200">
              {c.cta_buttonText}
            </Button>
          </Link>
          <p className="text-sm text-purple-200 mt-6">{c.cta_footnote}</p>
        </div>
      </div>
    </section>
  )
}
