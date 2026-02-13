import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import HeroCarousel from './HeroCarousel'

export default function NewHeroSection() {
  return (
    <section className="w-full bg-[#fffdf5] min-h-[600px] pt-3 pb-20 relative overflow-hidden" dir="rtl">
      {/* Dynamic floating blobs */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-radial from-[#fef08a]/60 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-gradient-radial from-[#fdba74]/40 to-transparent rounded-full blur-3xl"></div>

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-8 relative z-10">
        {/* Grid Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-center">

          {/* RIGHT Side - Text Content (order-2 on mobile, order-1 on desktop) */}
          <div className="order-2 lg:order-1 text-center" dir="rtl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#ffc32e]" />
              <span className="text-sm font-medium">עיצובים אישיים ייחודיים</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl lg:text-6xl font-bold text-[#1e293b] mb-6 leading-[1.1]">
              הפוך את הרעיונות שלך
              <br />
              לחולצות{' '}
              <span className="text-[#ffc32e]">מדהימות</span>
            </h1>

            {/* Subheading with bullets */}
            <h2 className="text-2xl lg:text-3xl font-medium text-[#f59e0b] mb-8">
              דיוק • איכות • זמינות
            </h2>

            {/* Description */}
            <p className="text-lg lg:text-[22px] text-[#64748b] mb-8 leading-relaxed">
              הפכנו חולצות של מיליוני בני אדם חינם ואנחנו רוצים
              <br />
              שתהיה השם הבא ברשימה שלנו
            </p>

            {/* CTA Button */}
            <Link href="/designer">
              <Button className="bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-semibold px-12 py-6 min-w-[280px] h-20 text-xl rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 inline-flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 mr-2" />
                עצבו את החולצה שלכם
              </Button>
            </Link>
          </div>

          {/* LEFT Side - Image Carousel (order-1 on mobile, order-2 on desktop) */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-start">
            <div className="w-full max-w-[83%]">
              <HeroCarousel />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
