'use client'

import { useState, useEffect } from 'react'
import { Star, Quote } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getFeaturedReviews } from '@/lib/db'
import type { Review } from '@/lib/types'

const FALLBACK = [
  { name: 'רועי אבירבוך', text: 'אחלה חוויה! השירות מהיר, המחיר הוגן וההדפסה באיכות ברמה גבוהה. הזמנו חולצות לאירוע של החברה ונהננו מכל שלב בתהליך.', rating: 5 },
  { name: 'אורי קארה',    text: 'השתמשתי בשירות הזמנת חולצות בעבר אצל מתחרים, אבל בדפוס היו הכי מקצועיים והכי נעימים לעבוד איתם. ממליץ בחום!', rating: 5 },
  { name: 'דניאל שטופל',  text: 'הזמנתי 30 חולצות עם הדפסה מותאמת אישית. התהליך היה פשוט וקל, איכות ההדפסה מדהימה והמשלוח הגיע בזמן. בהחלט נזמין שוב!', rating: 5 },
]

export default function NewTestimonialsSection() {
  const [testimonials, setTestimonials] = useState<{ name: string; text: string; rating: number; isGoogle?: boolean }[]>(FALLBACK)
  const [googleRating, setGoogleRating] = useState<number | null>(null)
  const [googleReviewCount, setGoogleReviewCount] = useState(0)
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')

  useEffect(() => {
    // Try Google reviews first, fall back to Firestore
    fetch('/api/google-business')
      .then(r => r.json())
      .then(data => {
        if (data.reviews?.length > 0) {
          setTestimonials(data.reviews.slice(0, 3).map((r: any) => ({
            name: r.author,
            text: r.text,
            rating: r.rating,
            isGoogle: true,
          })))
          setGoogleRating(data.rating)
          setGoogleReviewCount(data.reviewCount)
          setGoogleMapsUrl(data.googleMapsUrl)
        } else {
          // Fallback to Firestore
          getFeaturedReviews()
            .then(reviews => {
              if (reviews.length > 0) {
                setTestimonials(reviews.map(r => ({ name: r.name, text: r.text, rating: r.rating })))
              }
            })
            .catch(console.error)
        }
      })
      .catch(() => {
        getFeaturedReviews()
          .then(reviews => {
            if (reviews.length > 0) {
              setTestimonials(reviews.map(r => ({ name: r.name, text: r.text, rating: r.rating })))
            }
          })
          .catch(console.error)
      })
  }, [])

  return (
    <section className="w-full bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-20" dir="rtl">
      <div className="mx-auto max-w-[1536px] px-4 md:px-0">
        {/* Heading */}
        <div className="text-center mb-12" dir="rtl">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1e293b] mb-4">
            מה הלקוחות שלנו חושבים
          </h2>
          {googleRating ? (
            <div className="flex items-center justify-center gap-3 mb-2">
              <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span className="text-2xl font-bold text-gray-900">{googleRating}</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-5 h-5 ${i < Math.round(googleRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-sm text-[#64748b]">({googleReviewCount} ביקורות בגוגל)</span>
            </div>
          ) : (
            <p className="text-xl text-[#64748b]">
              קראו מה הלקוחות שלנו אומרים על האיכות שלנו
            </p>
          )}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 hover:shadow-2xl hover:scale-105 hover-lift transition-all duration-200 text-right"
              dir="rtl"
            >
              <Quote className="w-10 h-10 text-purple-200 mb-4 transform -scale-x-100" />
              <div className="flex gap-1 mb-4 justify-end">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-[#64748b] mb-4 leading-relaxed text-base">{testimonial.text}</p>
              <p className="font-bold text-base text-[#1e293b]">{testimonial.name}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/reviews">
            <Button
              variant="outline"
              className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 font-bold px-8 py-5 h-auto rounded-full"
            >
              כל הביקורות
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
