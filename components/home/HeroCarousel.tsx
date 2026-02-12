'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Placeholder images - will be replaced with Firebase Storage images
const slides = [
  {
    id: 1,
    title: 'הדפסת חולצות באיכות מקצועית',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&h=600&fit=crop',
  },
  {
    id: 2,
    title: 'עיצובים אישיים שמדברים בשבילך',
    image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200&h=600&fit=crop',
  },
  {
    id: 3,
    title: 'טכנולוגיית DTF המתקדמת ביותר',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&h=600&fit=crop',
  },
  {
    id: 4,
    title: 'משלוח מהיר לכל הארץ',
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1200&h=600&fit=crop',
  },
  {
    id: 5,
    title: 'מחירים משתלמים לכל כיס',
    image: 'https://images.unsplash.com/photo-1622445275576-721325763afe?w=1200&h=600&fit=crop',
  },
]

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlaying(false)
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  return (
    <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden rounded-xl">
      {/* Slides */}
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="w-full h-full bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-12">
                <h2 className="text-white text-2xl md:text-4xl font-bold text-center px-4">
                  {slide.title}
                </h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1/2 -translate-y-1/2 right-4 bg-white/80 hover:bg-white"
        onClick={prevSlide}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1/2 -translate-y-1/2 left-4 bg-white/80 hover:bg-white"
        onClick={nextSlide}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      {/* Dots Navigation */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide
                ? 'bg-primary w-8'
                : 'bg-white/60 hover:bg-white/80'
            }`}
            aria-label={`עבור לשקופית ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
