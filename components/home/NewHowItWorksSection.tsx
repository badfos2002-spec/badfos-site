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

        {/* Steps Diagram */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Arrow connector (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 left-full w-12 -translate-y-1/2 z-0">
                    <svg
                      className="w-full h-8 text-gray-300"
                      fill="none"
                      viewBox="0 0 48 32"
                    >
                      <path
                        d="M0 16 L40 16 M32 8 L40 16 L32 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}

                {/* Step Card */}
                <div className="text-center relative z-10">
                  {/* Icon Circle */}
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white border-2 border-yellow-200 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200 cursor-pointer group">
                    <step.icon className="w-12 h-12 text-[#ffc32e] group-hover:rotate-12 transition-transform duration-200" />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">
                    {step.number}. {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Mobile Arrow */}
                {index < steps.length - 1 && (
                  <div className="md:hidden flex justify-center my-6">
                    <svg
                      className="w-8 h-8 text-gray-300"
                      fill="none"
                      viewBox="0 0 32 48"
                    >
                      <path
                        d="M16 0 L16 40 M8 32 L16 40 L24 32"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
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
