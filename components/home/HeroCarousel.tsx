'use client'

import { useState, useEffect, useCallback } from 'react'

// Placeholder images - will be replaced with Firebase Storage images
const slides = [
  {
    id: 1,
    title: 'חולצה מעוצבת 1',
    image: '/placeholder1.jpg',
  },
  {
    id: 2,
    title: 'חולצה מעוצבת 2',
    image: '/placeholder2.jpg',
  },
  {
    id: 3,
    title: 'חולצה מעוצבת 3',
    image: '/placeholder3.jpg',
  },
  {
    id: 4,
    title: 'חולצה מעוצבת 4',
    image: '/placeholder4.jpg',
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
            <div className="w-full h-full bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 flex items-center justify-center">
              {/* Placeholder - replace with actual Image component when images are available */}
              <div className="text-center">
                <div className="text-6xl mb-4">👕</div>
                <p className="text-lg font-medium text-gray-700">
                  תמונה {index + 1}
                </p>
                <p className="text-sm text-gray-500 mt-2">{slide.title}</p>
              </div>
              {/* Uncomment when actual images are available:
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover rounded-[1.5rem]"
                priority={index === 0}
              />
              */}
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
