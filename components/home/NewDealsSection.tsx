'use client'

import { useState, useEffect } from 'react'
import { Tag, ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'

interface DealSettings {
  isActive: boolean
  title: string
  subtitle: string
  tagText: string
  ctaText: string
  showBenefits: boolean
}

const defaults: DealSettings = {
  isActive: true,
  title: 'מבצע מיוחד',
  subtitle: 'חסכו על ההזמנה הבאה שלכם',
  tagText: 'מבצע',
  ctaText: 'לפרטים נוספים',
  showBenefits: true,
}

const BENEFITS = [
  'הדפסה איכותית שנשמרת לאורך זמן',
  'משלוח מהיר עד הבית',
  'גרפיקאי חינם בהזמנות גדולות',
  'ייעוץ אישי ללא עלות',
]

export default function NewDealsSection() {
  const [settings, setSettings] = useState<DealSettings | null>(null)

  useEffect(() => {
    import('@/lib/firebase').then(({ db }) => {
      if (!db) { setSettings(defaults); return }
      import('firebase/firestore').then(({ doc, getDoc }) => {
        getDoc(doc(db, 'settings', 'deals'))
          .then((snap) => {
            const data = snap.exists() ? { ...defaults, ...snap.data() } : defaults
            setSettings(data as DealSettings)
          })
          .catch(() => setSettings(defaults))
      })
    }).catch(() => setSettings(defaults))
  }, [])

  if (!settings || !settings.isActive) return null

  return (
    <section className="py-20 bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500" dir="rtl">
      <div className="mx-auto max-w-[1536px] px-4 md:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="text-white">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Tag className="w-4 h-4" />
              <span className="text-sm font-bold">{settings.tagText}</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-4 leading-tight">
              {settings.title}
            </h2>
            <p className="text-xl text-white/90 mb-8">
              {settings.subtitle}
            </p>

            {settings.showBenefits && (
              <ul className="space-y-3 mb-10">
                {BENEFITS.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/90">{benefit}</span>
                  </li>
                ))}
              </ul>
            )}

            <Link href="/packages">
              <button className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                {settings.ctaText}
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
            </Link>
          </div>

          {/* Promo Card */}
          <div className="flex justify-center">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
              <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500 mb-2">
                5%
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-2">הנחה</p>
              <p className="text-gray-600 mb-6">בהזמנה של 15 חולצות ומעלה</p>
              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 text-sm">הדפסה + גרפיקה</span>
                  <span className="font-bold text-green-600">✓ כלול</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 text-sm">משלוח מהיר</span>
                  <span className="font-bold text-green-600">✓ זמין</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">ייעוץ אישי</span>
                  <span className="font-bold text-green-600">✓ חינם</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
