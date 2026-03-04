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
  const [testimonials, setTestimonials] = useState<{ name: string; text: string; rating: number }[]>(FALLBACK)

  useEffect(() => {
    getFeaturedReviews()
      .then(reviews => {
        if (reviews.length > 0) {
          setTestimonials(reviews.map(r => ({ name: r.name, text: r.text, rating: r.rating })))
        }
      })
      .catch(console.error)
  }, [])

  return (
    <section className="w-full bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-20" dir="rtl">
      <div className="mx-auto max-w-[1536px] px-4 md:px-0">
        {/* Heading */}
        <div className="text-center mb-12" dir="rtl">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1e293b] mb-4">
            מה הלקוחות שלנו חושבים
          </h2>
          <p className="text-xl text-[#64748b]">
            קראו מה אלפי לקוחות מרוצים יש לנו מהאיכות שלנו
          </p>
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
