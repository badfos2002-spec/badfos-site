import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export default function NewHeroSection() {
  return (
    <section className="bg-background-cream min-h-[600px] relative overflow-hidden">
      <div className="container-rtl py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Right Side - Content */}
          <div className="order-2 lg:order-1 text-center lg:text-right">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6">
              <span className="text-2xl">⚡</span>
              <span className="text-sm font-medium">משלוח מהיר וחינם</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl lg:text-6xl font-bold text-text-dark mb-4 leading-tight">
              הפוך את הרעיונות שלך
              <br />
              לחולצות{' '}
              <span className="text-primary">מדהימות</span>
            </h1>

            {/* Subheading */}
            <div className="text-lg text-text-gray mb-8 space-y-2">
              <p className="flex items-center justify-center lg:justify-start gap-2">
                <span className="text-primary">✓</span> דיוק • איכות • זמינות
              </p>
              <p className="text-base">
                הפכנו חולצות של מיליוני בני אדם חינם ואנחנו רוצים
                <br className="hidden lg:block" />
                שתהיה השם הבא ברשימה שלנו
              </p>
            </div>

            {/* CTA Button */}
            <Link href="/designer">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold px-8 py-6 h-auto text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                👕 עצבו את החולצה שלכם
              </Button>
            </Link>
          </div>

          {/* Left Side - Image */}
          <div className="order-1 lg:order-2">
            <div className="relative">
              {/* Placeholder for t-shirt image */}
              <div className="bg-white rounded-2xl shadow-2xl p-8 aspect-square max-w-md mx-auto">
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">👕</div>
                    <p className="text-gray-500">תמונת מוצר</p>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {[1, 2, 3, 4].map((dot) => (
          <div
            key={dot}
            className={`w-2 h-2 rounded-full ${
              dot === 1 ? 'bg-primary' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
