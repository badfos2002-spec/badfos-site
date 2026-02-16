'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

const packageSlides = [
  {
    id: 1,
    title: 'עד 10 חולצות',
    image: '/images/packages/package-10.png',
  },
  {
    id: 2,
    title: '11-20 חולצות',
    image: '/images/packages/package-11-20.png',
  },
  {
    id: 3,
    title: '21-50 חולצות',
    image: '/images/packages/package-21-50.png',
  },
]

export default function NewPackagesSection() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const indexRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    function tick() {
      if (cancelled) return
      indexRef.current = (indexRef.current + 1) % packageSlides.length
      setCurrentIndex(indexRef.current)
      setTimeout(tick, 4000)
    }
    const id = setTimeout(tick, 4000)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [])

  return (
    <section className="w-full bg-white py-16 md:py-20 relative overflow-hidden" dir="rtl">
      {/* Dynamic color orbs */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-br from-blue-300 to-indigo-300 rounded-full opacity-40 blur-3xl"></div>
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-gradient-to-tr from-cyan-200 to-blue-200 rounded-full opacity-30 blur-2xl"></div>

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-8 relative z-10">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-xl py-10 px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* RIGHT - Carousel */}
            <div>
              <div className="relative w-full h-48 lg:h-80 rounded-2xl border border-yellow-200 shadow-md overflow-hidden">
                {packageSlides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className="absolute inset-0 transition-opacity duration-700"
                    style={{
                      opacity: index === currentIndex ? 1 : 0,
                      zIndex: index === currentIndex ? 10 : 1,
                    }}
                  >
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                ))}
                {/* Navigation dots */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                  {packageSlides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        index === currentIndex
                          ? 'bg-yellow-400 scale-110'
                          : 'bg-white/70'
                      }`}
                      aria-label={`עבור לחבילה ${index + 1}`}
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
