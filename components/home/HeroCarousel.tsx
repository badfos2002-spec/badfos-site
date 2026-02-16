'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

// Product mockup images
const slides = [
  {
    id: 1,
    title: 'סווטשרט לבן',
    image: '/images/mockups/sweatshirt-white-front.png',
  },
  {
    id: 2,
    title: 'סווטשרט אדום',
    image: '/images/mockups/sweatshirt-red-front.png',
  },
  {
    id: 3,
    title: 'סווטשרט כחול',
    image: '/images/mockups/sweatshirt-blue-front.png',
  },
  {
    id: 4,
    title: 'סווטשרט אפור',
    image: '/images/mockups/sweatshirt-gray-front.png',
  },
]

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const indexRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    function tick() {
      if (cancelled) return
      indexRef.current = (indexRef.current + 1) % slides.length
      setCurrentIndex(indexRef.current)
      setTimeout(tick, 5000)
    }
    const id = setTimeout(tick, 5000)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [])

  return (
    <div
      className="w-full md:w-fit md:mx-auto bg-white p-3 rounded-[2.5rem] relative"
      style={{
        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Carousel Container */}
      <div className="relative w-[550px] h-[550px] mx-auto overflow-hidden rounded-[2rem]">
        {/* Images */}
        {slides.map((slide, index) => (
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
              className="object-cover rounded-[1.5rem]"
              priority
            />
          </div>
        ))}
      </div>

      {/* Indicators (Dots) */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5" style={{ zIndex: 20 }}>
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex
                ? 'bg-white w-2.5 h-2.5 scale-110 shadow-sm'
                : 'bg-white/50 w-2.5 h-2.5'
            }`}
            aria-label={`עבור לתמונה ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
