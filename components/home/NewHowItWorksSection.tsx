import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Upload, Palette, Shirt, ArrowLeft } from 'lucide-react'

export default function NewHowItWorksSection() {
  const steps = [
    {
      number: 1,
      title: 'העלה תמונה',
      description: 'העלה את העיצוב שלך או בחר מהגלריה',
      icon: Upload,
    },
    {
      number: 2,
      title: 'בחר עיצוב',
      description: 'התאם אישית עם צבעים, טקסט וגרפיקה',
      icon: Palette,
    },
    {
      number: 3,
      title: 'צפה במוקאפ',
      description: 'ראה תצוגה מקדימה בזמן אמת',
      icon: Shirt,
    },
  ]

  return (
    <section className="w-full bg-gradient-to-br from-white via-blue-50 to-purple-50 py-20 relative overflow-hidden" dir="rtl">
      {/* Decorative Blob */}
      <div className="absolute top-10 right-10 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full opacity-10 animate-bounce" style={{ animationDuration: '4s' }}></div>

      <div className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 relative z-10">
        {/* Heading */}
        <div className="text-center mb-16" dir="rtl">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700">
              איך זה עובד?
            </span>
          </h2>
          <p className="text-xl text-gray-600">
            תהליך פשוט בשלושה שלבים
          </p>
        </div>

        {/* Steps Diagram - Triangular Layout */}
        <div className="max-w-4xl mx-auto mb-12">
          {/* Desktop: Triangular Cycle */}
          <div className="hidden md:block relative h-[550px]">
            {/* SVG Connection Lines */}
            <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
              {/* Line 1: Top to Bottom-Right */}
              <path
                d="M 50% 12% L 75% 88%"
                stroke="rgb(156, 163, 175)"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Line 2: Bottom-Right to Bottom-Left */}
              <path
                d="M 73% 90% L 27% 90%"
                stroke="rgb(156, 163, 175)"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Line 3: Bottom-Left to Top */}
              <path
                d="M 25% 88% L 50% 12%"
                stroke="rgb(156, 163, 175)"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Step 1 - Top Center (Blue to Purple) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
              <div className="flex flex-col items-center" dir="rtl">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-200 cursor-pointer group">
                  <Upload className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-200" />
                </div>
                <div className="mt-4 text-center w-48">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    1. העלה תמונה
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    העלה את העיצוב שלך או בחר מהגלריה
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 - Bottom Right (Pink to Rose) */}
            <div className="absolute bottom-2 right-8" style={{ zIndex: 10 }}>
              <div className="flex flex-col items-center" dir="rtl">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-200 cursor-pointer group">
                  <Palette className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-200" />
                </div>
                <div className="mt-4 text-center w-48">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    2. בחר עיצוב
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    התאם אישית עם צבעים, טקסט וגרפיקה
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 - Bottom Left (Green to Emerald) */}
            <div className="absolute bottom-2 left-8" style={{ zIndex: 10 }}>
              <div className="flex flex-col items-center" dir="rtl">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-200 cursor-pointer group">
                  <Shirt className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-200" />
                </div>
                <div className="mt-4 text-center w-48">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    3. צפה במוקאפ
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    ראה תצוגה מקדימה בזמן אמת
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: Vertical Stack */}
          <div className="md:hidden flex flex-col items-center space-y-12">
            {steps.map((step, index) => {
              const gradients = [
                'from-blue-500 to-purple-600',
                'from-pink-500 to-rose-600',
                'from-green-500 to-emerald-600',
              ]
              return (
                <div key={index} className="flex flex-col items-center">
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${gradients[index]} flex items-center justify-center shadow-xl animate-pulse`} style={{ animationDelay: `${index * 200}ms` }}>
                    <step.icon className="w-12 h-12 text-white" />
                  </div>
                  <div className="mt-4 text-center max-w-[280px]">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {step.number}. {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <svg className="w-8 h-8 text-gray-400 mt-4" fill="none" viewBox="0 0 32 48">
                      <path
                        d="M16 0 L16 40 M8 32 L16 40 L24 32"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-20">
          <Link href="/designer">
            <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 hover:shadow-2xl text-white font-semibold px-8 py-4 rounded-2xl shadow-lg text-lg hover-lift inline-flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 mr-2" />
              בואו נתחיל!
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
