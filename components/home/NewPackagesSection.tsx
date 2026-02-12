import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NewPackagesSection() {
  return (
    <section className="w-full bg-white py-20 relative overflow-hidden">
      {/* Blue/Indigo color blobs */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-tr from-indigo-100 to-blue-100 rounded-full opacity-15 blur-3xl"></div>

      <div className="mx-auto max-w-[1600px] px-6 lg:px-8 relative z-10">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-xl py-10 px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* RIGHT - Text Content */}
            <div className="text-center lg:text-right flex flex-col items-center lg:items-end">
              <div className="inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full mb-6">
                <span className="text-xl">💰</span>
                <span className="text-sm font-bold">חיסכון חכם בכמויות</span>
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                חבילות ומבצעים
              </h2>

              <p className="text-lg text-gray-600 mb-8">
                בחרו טווח כמות, סוג, צבע ומידות – והכול מוכן לקופה בהמשך
              </p>

              <div className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-end">
                <div className="bg-gray-100 px-4 py-2 rounded-full text-sm font-medium">
                  חיסכון בכמות
                </div>
                <div className="bg-gray-100 px-4 py-2 rounded-full text-sm font-medium">
                  דילים משתלמים
                </div>
                <div className="bg-gray-100 px-4 py-2 rounded-full text-sm font-medium">
                  איכות פרימיום
                </div>
              </div>

              <Link href="/packages">
                <Button className="bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-semibold px-7 h-12 rounded-full shadow-lg">
                  👕 לצפייה בכל החבילות
                </Button>
              </Link>
            </div>

            {/* LEFT - Carousel */}
            <div>
              {/* Mobile: h-48, Tablet: h-60, Desktop: h-80 */}
              <div className="relative w-full h-48 md:h-60 lg:h-80 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl shadow-xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📦</div>
                    <p className="text-lg font-medium">קרוסלת חבילות</p>
                    <p className="text-sm text-gray-500 mt-2">192px / 240px / 320px</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
