'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Slide {
  id: string
  image: string
  link?: string
}

const SLIDES: Slide[] = [
  { id: '1', image: '/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.webp' },
  { id: '2', image: '/assets/64ab08d41_IMG_3252.webp' },
  { id: '3', image: '/assets/a189e74e3_IMG_0490.webp' },
  { id: '4', image: '/assets/c4660170b_IMG_6179.webp' },
  { id: '5', image: '/assets/fdd643e9f_D747B5AC-1217-4D1F-A7B1-61C6EDE52659.webp' },
]

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [next, setNext] = useState<number | null>(null)
  const [fading, setFading] = useState(false)

  const goTo = useCallback((i: number) => {
    if (i === current || fading) return
    setNext(i)
    setFading(true)
    setTimeout(() => {
      setCurrent(i)
      setNext(null)
      setFading(false)
    }, 500)
  }, [current, fading])

  useEffect(() => {
    const id = setInterval(() => {
      goTo((current + 1) % SLIDES.length)
    }, 5000)
    return () => clearInterval(id)
  }, [current, goTo])

  const slide = SLIDES[current]
  const nextSlide = next !== null ? SLIDES[next] : null

  return (
    <div
      className="w-full md:w-fit md:mx-auto bg-white p-3 rounded-[2.5rem] relative"
      style={{ boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.08)' }}
    >
      <div className="relative w-full md:w-[550px] aspect-square mx-auto overflow-hidden rounded-[2rem]">
        {/* Current slide */}
        <SlideImage
          slide={slide}
          className={`transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
          priority={current === 0}
        />

        {/* Next slide (fades in on top) */}
        {nextSlide && (
          <SlideImage
            slide={nextSlide}
            className={`transition-opacity duration-500 ${fading ? 'opacity-100' : 'opacity-0'}`}
            priority={false}
          />
        )}
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 z-20">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`transition-all duration-300 rounded-full ${
              i === current
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

function SlideImage({ slide, className, priority }: { slide: Slide; className: string; priority: boolean }) {
  const img = (
    <Image
      src={slide.image}
      alt="בדפוס - הדפסת חולצות בעיצוב אישי"
      fill
      sizes="(max-width: 768px) 100vw, 550px"
      className={`object-cover rounded-[1.5rem] absolute inset-0 ${className}`}
      priority={priority}
    />
  )

  if (slide.link) {
    return <Link href={slide.link} className="block absolute inset-0 z-10">{img}</Link>
  }
  return <div className="absolute inset-0">{img}</div>
}
