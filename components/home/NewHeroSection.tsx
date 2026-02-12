import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export default function NewHeroSection() {
  return (
    <section className="w-full bg-[#fffdf5] py-12 lg:py-20 relative overflow-hidden">
      {/* Abstract gradient blobs */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full opacity-30 blur-3xl"></div>
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-gradient-to-tr from-yellow-100 to-orange-100 rounded-full opacity-20 blur-3xl"></div>

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
            <p className="text-lg font-medium text-gray-900 mb-3">
              <span className="text-[#ffc32e]">דיוק • איכות • זמינות</span>
            </p>

            {/* Description */}
            <p className="text-base text-gray-600 mb-8 leading-relaxed">
              הפכנו חולצות של מיליוני בני אדם חינם ואנחנו רוצים
              <br />
              שתהיה השם הבא ברשימה שלנו
            </p>

            {/* CTA Button */}
            <Link href="/designer">
              <Button className="bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-semibold px-8 py-6 h-auto text-base rounded-full shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2">
                <span className="text-xl">👕</span>
                עצבו את החולצה שלכם
              </Button>
            </Link>
          </div>

          {/* LEFT Side - Image Carousel (order-1 on mobile, order-2 on desktop) */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-start">
            <div className="w-full max-w-[83%] relative">
              {/* Image Container with aspect ratios */}
              <div className="relative aspect-[4/5] lg:aspect-[4/4] w-full">
                {/* Placeholder - replace with actual carousel */}
                <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden">
                  <div className="text-center p-8">
                    <div className="text-8xl mb-4">👕</div>
                    <p className="text-gray-600 text-lg font-medium">קרוסלת תמונות</p>
                    <p className="text-sm text-gray-400 mt-2">
                      4:5 (mobile) / 1:1 (desktop)
                    </p>
                  </div>
                </div>
              </div>

              {/* Carousel Dots */}
              <div className="flex justify-center gap-2 mt-6">
                {[1, 2, 3, 4].map((dot) => (
                  <div
                    key={dot}
                    className={`h-2 rounded-full transition-all ${
                      dot === 1
                        ? 'bg-[rgb(251,191,36)] w-8'
                        : 'bg-gray-300 w-2'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
