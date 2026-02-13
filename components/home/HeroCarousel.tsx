'use client'

import { useState, useEffect, useCallback } from 'react'

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
  const [isPaused, setIsPaused] = useState(false)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length)
  }, [])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      nextSlide()
    }, 5000) // 5 seconds

    return () => clearInterval(interval)
  }, [isPaused, nextSlide])

  return (
    <div
      className="w-full bg-white p-2 pb-10 rounded-[2.5rem] relative"
      style={{
        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.08)',
      }}
      onPointerDown={() => setIsPaused(true)}
      onPointerUp={() => setIsPaused(false)}
      onPointerLeave={() => setIsPaused(false)}
    >
      {/* Carousel Container */}
      <div className="relative aspect-[4/5] lg:aspect-[4/4] w-full overflow-hidden rounded-[1.5rem]">
        {/* Images */}
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <span className="text-white text-2xl font-medium">תמונה</span>
            </div>
          </div>
        ))}
      </div>

      {/* Indicators (Dots) */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
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
