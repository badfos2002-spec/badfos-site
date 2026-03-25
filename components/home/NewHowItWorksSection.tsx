'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Upload, Palette, Shirt, ArrowLeft } from 'lucide-react'

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

export default function NewHowItWorksSection() {
  const [c, setC] = useState(D)

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
  }))

  return (
    <section className="w-full bg-gradient-to-br from-white via-blue-50 to-purple-50 py-20 relative overflow-hidden" dir="rtl">
      <div className="absolute top-10 right-10 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full opacity-10 animate-bounce" style={{ animationDuration: '4s' }}></div>

      <div className="mx-auto max-w-[1536px] px-4 md:px-0 relative z-10">
        <div className="text-center mb-16" dir="rtl">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700">
              {c.hiw_title}
            </span>
          </h2>
          <p className="text-xl text-gray-600">{c.hiw_subtitle}</p>
        </div>

        <div className="max-w-5xl mx-auto mb-12">
          {/* Desktop */}
          <div className="hidden md:flex items-center justify-center gap-10 lg:gap-14">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-10 lg:gap-14">
                <div className="flex flex-col items-center">
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-200 cursor-pointer group`}>
                    <step.icon className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-200" />
                  </div>
                  <div className="mt-4 text-center w-48">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{step.number}. {step.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex items-center -mt-14">
                    <svg width="60" height="24" viewBox="0 0 60 24" fill="none" className="text-gray-400 rotate-180">
                      <line x1="0" y1="12" x2="48" y2="12" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                      <path d="M44 6 L52 12 L44 18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile */}
          <div className="md:hidden flex flex-col items-center space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-xl`}>
                  <step.icon className="w-12 h-12 text-white" />
                </div>
                <div className="mt-4 text-center max-w-[280px]">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.number}. {step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <svg className="w-8 h-8 text-gray-400 mt-4" fill="none" viewBox="0 0 32 48">
                    <path d="M16 0 L16 40 M8 32 L16 40 L24 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-20">
          <Link href="/designer">
            <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 hover:shadow-2xl text-white font-semibold px-8 py-4 rounded-2xl shadow-lg text-lg hover-lift inline-flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 mr-2" />
              {c.hiw_ctaText}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
