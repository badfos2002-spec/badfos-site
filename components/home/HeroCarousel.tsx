'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const slides = [
  { id: 1, title: 'סווטשרט לבן', image: '/images/mockups/sweatshirt-white-front.png' },
  { id: 2, title: 'סווטשרט אדום', image: '/images/mockups/sweatshirt-red-front.png' },
  { id: 3, title: 'סווטשרט כחול', image: '/images/mockups/sweatshirt-blue-front.png' },
  { id: 4, title: 'סווטשרט אפור', image: '/images/mockups/sweatshirt-gray-front.png' },
]

export default function HeroCarousel() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const slide = slides[index]

  return (
    <div
      className="w-full md:w-fit md:mx-auto bg-white p-3 rounded-[2.5rem] relative"
      style={{ boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.08)' }}
    >
      <div className="relative w-[550px] h-[550px] mx-auto overflow-hidden rounded-[2rem]">
        <Image
          key={slide.id}
          src={slide.image}
          alt={slide.title}
          fill
          className="object-cover rounded-[1.5rem] animate-fadeIn"
          priority
        />
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`transition-all duration-300 rounded-full ${
              i === index
                ? 'bg-white w-2.5 h-2.5 scale-110 shadow-sm'
                : 'bg-white/50 w-2.5 h-2.5'
            }`}
            aria-label={`עבור לתמונה ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
