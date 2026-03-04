'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getAllDocuments } from '@/lib/db'
import type { SiteImage } from '@/lib/types'

const FALLBACK_SLIDES = [
  { id: '1', image: '/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.jpg' },
  { id: '2', image: '/assets/64ab08d41_IMG_3252.jpg' },
  { id: '3', image: '/assets/a189e74e3_IMG_0490.jpg' },
  { id: '4', image: '/assets/c4660170b_IMG_6179.jpg' },
  { id: '5', image: '/assets/fdd643e9f_D747B5AC-1217-4D1F-A7B1-61C6EDE52659.jpg' },
]

export default function HeroCarousel() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    getAllDocuments<SiteImage>('siteImages')
      .then(docs => {
        const carousel = docs
          .filter(d => d.category === 'hero_carousel' && d.isActive)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        if (carousel.length > 0) {
          setSlides(carousel.map(d => ({ id: d.id, image: d.imageUrl })))
        }
      })
      .catch(() => {/* keep fallback */})
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, 5000)
    return () => clearInterval(id)
  }, [slides.length])

  const slide = slides[index]
  if (!slide) return null

  return (
    <div
      className="w-full md:w-fit md:mx-auto bg-white p-3 rounded-[2.5rem] relative"
      style={{ boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.08)' }}
    >
      <div className="relative w-full md:w-[550px] aspect-square md:aspect-auto md:h-[550px] mx-auto overflow-hidden rounded-[2rem]">
        <Image
          key={slide.id}
          src={slide.image}
          alt=""
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
