'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

const packageSlides = [
  { id: 1, title: 'עד 10 חולצות', image: '/assets/ddc5d7f82_10.png' },
  { id: 2, title: '11-20 חולצות', image: '/assets/0181cec14_11-20.png' },
  { id: 3, title: '21-50 חולצות', image: '/assets/056e4ce29_21-50.png' },
]

export default function NewPackagesSection() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % packageSlides.length)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  const slide = packageSlides[index]

  return (
    <section className="w-full bg-white py-16 md:py-20 relative overflow-hidden" dir="rtl">
      <div className="absolute -top-20 -left-20 w-48 h-48 md:w-96 md:h-96 bg-gradient-to-br from-blue-300 to-indigo-300 rounded-full opacity-40 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 -right-20 w-40 h-40 md:w-80 md:h-80 bg-gradient-to-tr from-cyan-200 to-blue-200 rounded-full opacity-30 blur-2xl pointer-events-none"></div>

      <div className="mx-auto max-w-[1536px] px-4 md:px-0 relative z-10">
        <div className="bg-white rounded-3xl shadow-xl py-10 px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* RIGHT - Carousel */}
            <div>
              <div className="relative w-full h-48 md:h-64 lg:h-80 rounded-2xl border border-yellow-200 shadow-md overflow-hidden">
                <Image
                  key={slide.id}
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className="object-cover animate-fadeIn"
                  priority
                />
                {/* Navigation dots */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20">
                  {packageSlides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIndex(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        i === index
                          ? 'bg-yellow-400 scale-110'
                          : 'bg-white/70'
                      }`}
                      aria-label={`עבור לחבילה ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* LEFT - Text Content */}
            <div className="text-center flex flex-col items-center" dir="rtl">
              <div className="inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full mb-6">
                <span className="text-xl">💰</span>
                <span className="text-xs font-bold">חיסכון חכם בכמויות</span>
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold text-[#1e293b] mb-4">
                חבילות ומבצעים
              </h2>

              <p className="text-base lg:text-lg text-[#64748b] mb-8">
                בחרו טווח כמות, סוג, צבע ומידות – והכול מוכן לקופה בהמשך
              </p>

              <div className="flex flex-wrap gap-3 mb-8 justify-center">
                <div className="bg-gray-100 px-4 py-2 rounded-full text-sm font-medium text-[#1e293b]">
                  חיסכון בכמות
                </div>
                <div className="bg-gray-100 px-4 py-2 rounded-full text-sm font-medium text-[#1e293b]">
                  דילים משתלמים
                </div>
                <div className="bg-gray-100 px-4 py-2 rounded-full text-sm font-medium text-[#1e293b]">
                  איכות פרימיום
                </div>
              </div>

              <Link href="/packages">
                <Button className="bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] hover:brightness-105 text-white font-semibold px-7 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-lg">
                  👕 לצפייה בכל החבילות
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
