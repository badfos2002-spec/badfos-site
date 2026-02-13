import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Upload, Palette, ShoppingBag } from 'lucide-react'

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
      icon: ShoppingBag,
    },
  ]

  return (
    <section className="w-full bg-gradient-to-br from-white via-blue-50 to-purple-50 py-20 relative overflow-hidden">
      {/* Floating bouncing circle */}
      <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full opacity-30 blur-2xl animate-bounce" style={{ animationDuration: '4s' }}></div>

      <div className="mx-auto max-w-[1600px] px-6 lg:px-8 relative z-10">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            איך זה עובד?
          </h2>
          <p className="text-xl text-gray-600">
            הכל פשוט, מהיר ויעיל
          </p>
        </div>

        {/* Steps Diagram - Triangular Layout */}
        <div className="max-w-5xl mx-auto mb-12">
          {/* Desktop: Triangular Cycle */}
          <div className="hidden md:block relative h-[550px]">
            {/* SVG Cycle Arrows */}
            <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
              {/* Arrow 1: Top to Bottom-Right */}
              <path
                d="M 50% 12% L 75% 88%"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="8,8"
                fill="none"
              />
              <polygon points="75%,88% 72%,82% 78%,82%" fill="#fbbf24" />

              {/* Arrow 2: Bottom-Right to Bottom-Left */}
              <path
                d="M 73% 90% L 27% 90%"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="8,8"
                fill="none"
              />
              <polygon points="27%,90% 33%,87% 33%,93%" fill="#fbbf24" />

              {/* Arrow 3: Bottom-Left to Top */}
              <path
                d="M 25% 88% L 50% 12%"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="8,8"
                fill="none"
              />
              <polygon points="50%,12% 47%,18% 53%,18%" fill="#fbbf24" />
            </svg>

            {/* Step 1 - Top Center */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-yellow-200 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200 cursor-pointer group">
                  <Upload className="w-12 h-12 text-[#ffc32e] group-hover:rotate-12 transition-transform duration-200" />
                </div>
                <div className="mt-4 text-center max-w-[200px]">
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
                    1. העלה תמונה
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    העלה את העיצוב שלך או בחר מהגלריה
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 - Bottom Right */}
            <div className="absolute bottom-2 right-8" style={{ zIndex: 10 }}>
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-yellow-200 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200 cursor-pointer group">
                  <Palette className="w-12 h-12 text-[#ffc32e] group-hover:rotate-12 transition-transform duration-200" />
                </div>
                <div className="mt-4 text-center max-w-[200px]">
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
                    2. בחר עיצוב
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    התאם אישית עם צבעים, טקסט וגרפיקה
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 - Bottom Left */}
            <div className="absolute bottom-2 left-8" style={{ zIndex: 10 }}>
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-yellow-200 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200 cursor-pointer group">
                  <ShoppingBag className="w-12 h-12 text-[#ffc32e] group-hover:rotate-12 transition-transform duration-200" />
                </div>
                <div className="mt-4 text-center max-w-[200px]">
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
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
          <div className="md:hidden flex flex-col items-center space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-yellow-200 flex items-center justify-center shadow-lg">
                  <step.icon className="w-12 h-12 text-[#ffc32e]" />
                </div>
                <div className="mt-4 text-center max-w-[280px]">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {step.number}. {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <svg className="w-8 h-8 text-yellow-400 mt-4" fill="none" viewBox="0 0 32 48">
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
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/designer">
            <Button className="bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-semibold px-8 h-12 rounded-full shadow-lg text-lg hover-lift">
              בואו נתחיל! 🚀
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
