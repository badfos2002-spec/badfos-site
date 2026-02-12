import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Upload, Palette, ShoppingBag } from 'lucide-react'

export default function NewHowItWorksSection() {
  const steps = [
    {
      number: 1,
      title: 'העלת תמונה',
      description: 'העלו את התמונה שלי, בחרו את סוג הבד והאורך את החולצה',
      icon: Upload,
      color: 'bg-accent-purple',
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      number: 2,
      title: 'בחר עיצוב',
      description: 'בחר מקום להדפסה, העלה קובץ למינימה שלך',
      icon: Palette,
      color: 'bg-accent-pink',
      gradient: 'from-pink-500 to-pink-600',
    },
    {
      number: 3,
      title: 'צפה במוקאפ',
      description: 'צפה איך זה נראה על החולצה. אם את רוצה להזמין',
      icon: ShoppingBag,
      color: 'bg-green-500',
      gradient: 'from-green-500 to-green-600',
    },
  ]

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="container-rtl">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-text-dark mb-4">
            איך זה עובד?
          </h2>
          <p className="text-lg text-text-gray max-w-2xl mx-auto">
            תהליך פשוט במיוחד שמאפשר עיצוב ליצירת חולצה המושלמת שלך
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
                  <div
                    className={`w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}
                  >
                    <step.icon className="w-12 h-12 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-text-dark mb-3">
                    {step.number}. {step.title}
                  </h3>
                  <p className="text-sm text-text-gray leading-relaxed">
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
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold px-8 py-5 h-auto text-base rounded-full shadow-lg"
            >
              בואו נתחיל! ⚡
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
