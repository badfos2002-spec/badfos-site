import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import HeroCarousel from './HeroCarousel'

export default function NewHeroSection() {
  return (
    <section className="w-full bg-[#fffdf5] py-12 lg:py-20 relative overflow-hidden">
      {/* Dynamic floating blobs */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-radial from-[#fef08a]/60 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-gradient-radial from-[#fdba74]/40 to-transparent rounded-full blur-3xl"></div>

      <div className="mx-auto max-w-[1600px] px-6 lg:px-8 relative z-10">
        {/* Grid Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* RIGHT Side - Text Content (order-2 on mobile, order-1 on desktop) */}
          <div className="order-2 lg:order-1 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6">
              <span className="text-xl">✨</span>
              <span className="text-sm font-medium">עיצובים אישיים ייחודיים</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl lg:text-6xl font-bold font-display text-gray-900 mb-4 leading-tight">
              הפוך את הרעיונות שלך
              <br />
              לחולצות{' '}
              <span className="text-[#ffc32e]">מדהימות</span>
            </h1>

            {/* Subheading with bullets */}
            <h2 className="text-2xl lg:text-3xl font-medium text-gray-900 mb-3">
              <span className="text-[#ffc32e]">דיוק • איכות • זמינות</span>
            </h2>

            {/* Description */}
            <p className="text-lg lg:text-[22px] text-gray-600 mb-8 leading-relaxed">
              הפכנו חולצות של מיליוני בני אדם חינם ואנחנו רוצים
              <br />
              שתהיה השם הבא ברשימה שלנו
            </p>

            {/* CTA Button */}
            <Link href="/designer">
              <Button className="bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-semibold px-8 py-6 h-auto text-xl rounded-full shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-200 inline-flex items-center gap-2">
                <span className="text-xl">👕</span>
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
