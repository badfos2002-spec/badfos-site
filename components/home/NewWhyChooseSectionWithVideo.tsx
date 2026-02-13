'use client'

import { Award, Clock, Zap, Shield, Heart, Star } from 'lucide-react'

const benefits = [
  {
    icon: Award,
    title: 'איכות פרימיום',
    description: 'הדפסה ברמה הגבוהה ביותר עם טכנולוגיית DTF מתקדמת',
  },
  {
    icon: Clock,
    title: 'משלוח מהיר',
    description: '3-7 ימי עסקים לכל הארץ או איסוף עצמי חינם',
  },
  {
    icon: Zap,
    title: 'עיצוב קל ונוח',
    description: 'ממשק פשוט ואינטואיטיבי לעיצוב החולצה המושלמת',
  },
  {
    icon: Shield,
    title: 'תשלום מאובטח',
    description: 'סליקה מאובטחת ומהירה עם אפשרויות תשלום מגוונות',
  },
  {
    icon: Heart,
    title: 'שירות אישי',
    description: 'צוות תומך זמין לכל שאלה ובקשה',
  },
  {
    icon: Star,
    title: 'מחירים הוגנים',
    description: 'איכות גבוהה במחיר התחרותי ביותר',
  },
]

// Video URL - Replace with your actual YouTube video ID
const VIDEO_ID = 'dQw4w9WgXcQ' // Replace this with your video ID

export default function NewWhyChooseSectionWithVideo() {
  const videoUrl = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&showinfo=0&modestbranding=1&rel=0`

  return (
    <section
      className="w-full pt-4 pb-20 bg-gradient-to-b from-gray-50 via-white to-gray-50"
      dir="rtl"
    >
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-8">
        {/* Grid Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Video Player - Right Side (lg:order-1) */}
          <div className="lg:order-1 flex justify-center lg:justify-end">
            <div className="relative">
              {/* Decorative background blob */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-[#ffc32e]/30 via-[#ffd95c]/20 to-[#f59e0b]/30 rounded-3xl rotate-6 blur-2xl animate-pulse"
                style={{ zIndex: -1 }}
              />

              {/* Video container */}
              <div
                className="relative w-72 h-[32rem] md:w-96 md:h-[36rem] rounded-3xl overflow-hidden shadow-2xl rotate-6 bg-black"
                style={{ aspectRatio: '9/16' }}
              >
                <iframe
                  src={videoUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Why Choose Us Video"
                />
              </div>
            </div>
          </div>

          {/* Text Content - Left Side (lg:order-2) */}
          <div className="lg:order-2 text-right space-y-8">
            {/* Section Header */}
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold text-[#1e293b]">
                למה לבחור <span className="text-[#ffc32e]">בנו?</span>
              </h2>
              <p className="text-lg text-[#64748b] leading-relaxed">
                אנחנו מספקים את השירות הטוב ביותר בתחום ההדפסה על חולצות
              </p>
            </div>

            {/* Benefits List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon
                return (
                  <div
                    key={index}
                    className="flex items-start gap-4 group"
                  >
                    {/* Icon Box */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#ffc32e] to-[#f59e0b] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-200">
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Text */}
                    <div className="flex-1 space-y-1">
                      <h3 className="text-lg font-bold text-[#1e293b]">
                        {benefit.title}
                      </h3>
                      <p className="text-sm text-[#64748b] leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
