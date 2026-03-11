'use client'

import { useState, useEffect, useRef } from 'react'
import { Star, User } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getFeaturedReviews } from '@/lib/db'

type GoogleReview = {
  author: string
  authorPhoto: string
  text: string
  rating: number
  time: string
}

const FALLBACK: GoogleReview[] = [
  { author: 'רועי אבירבוך', authorPhoto: '', text: 'אחלה חוויה! השירות מהיר, המחיר הוגן וההדפסה באיכות ברמה גבוהה. הזמנו חולצות לאירוע של החברה ונהננו מכל שלב בתהליך.', rating: 5, time: '' },
  { author: 'אורי קארה', authorPhoto: '', text: 'השתמשתי בשירות הזמנת חולצות בעבר אצל מתחרים, אבל בדפוס היו הכי מקצועיים והכי נעימים לעבוד איתם. ממליץ בחום!', rating: 5, time: '' },
  { author: 'דניאל שטופל', authorPhoto: '', text: 'הזמנתי 30 חולצות עם הדפסה מותאמת אישית. התהליך היה פשוט וקל, איכות ההדפסה מדהימה והמשלוח הגיע בזמן. בהחלט נזמין שוב!', rating: 5, time: '' },
]

const GoogleIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
)

function ReviewCard({ review, isGoogle }: { review: GoogleReview; isGoogle: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        {review.authorPhoto ? (
          <img src={review.authorPhoto} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-blue-600" />
          </div>
        )}
        <div className="flex-1 text-right">
          <p className="font-semibold text-sm text-gray-900">{review.author}</p>
          {review.time && <p className="text-xs text-gray-400">{review.time}</p>}
        </div>
        {isGoogle && <GoogleIcon className="w-5 h-5 flex-shrink-0" />}
      </div>
      <div className="flex gap-0.5 mb-3 justify-end">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
        ))}
      </div>
      <p className="text-gray-600 text-sm leading-relaxed text-right flex-1">{review.text}</p>
    </div>
  )
}

export default function NewTestimonialsSection() {
  const [allReviews, setAllReviews] = useState<GoogleReview[]>(FALLBACK)
  const [googleRating, setGoogleRating] = useState<number | null>(null)
  const [googleReviewCount, setGoogleReviewCount] = useState(0)
  const [isGoogle, setIsGoogle] = useState(false)
  const [page, setPage] = useState(0)
  const [fade, setFade] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    const TARGET = 15

    Promise.all([
      fetch('/api/google-business').then(r => r.json()).catch(() => null),
      getFeaturedReviews().catch(() => []),
    ]).then(([googleData, firestoreReviews]) => {
      const combined: GoogleReview[] = []

      // Add Google reviews first
      if (googleData?.reviews?.length > 0) {
        for (const r of googleData.reviews) {
          combined.push(r)
        }
        setGoogleRating(googleData.rating)
        setGoogleReviewCount(googleData.reviewCount)
        setIsGoogle(true)
      }

      // Fill up to TARGET with Firestore reviews
      const googleNames = new Set(combined.map(r => r.author))
      for (const r of firestoreReviews) {
        if (combined.length >= TARGET) break
        if (googleNames.has(r.name)) continue
        combined.push({ author: r.name, authorPhoto: '', text: r.text, rating: r.rating, time: '' })
      }

      // If still not enough, pad with fallback
      for (const r of FALLBACK) {
        if (combined.length >= TARGET) break
        const exists = combined.some(c => c.author === r.author)
        if (!exists) combined.push(r)
      }

      if (combined.length > 0) setAllReviews(combined)
    })
  }, [])

  // Auto-rotate every 7 seconds
  const totalPages = Math.ceil(allReviews.length / 3)

  useEffect(() => {
    if (totalPages <= 1) return
    timerRef.current = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setPage(prev => (prev + 1) % totalPages)
        setFade(true)
      }, 400)
    }, 7000)
    return () => clearInterval(timerRef.current)
  }, [totalPages])

  const visibleReviews = allReviews.slice(page * 3, page * 3 + 3)

  return (
    <section className="w-full bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-20" dir="rtl">
      <div className="mx-auto max-w-[1536px] px-4 md:px-0">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1e293b] mb-4">
            מה הלקוחות שלנו חושבים
          </h2>
          {googleRating ? (
            <div className="flex items-center justify-center gap-3 mb-2">
              <GoogleIcon className="w-6 h-6" />
              <span className="text-2xl font-bold text-gray-900">{googleRating}</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-5 h-5 ${i < Math.round(googleRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
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

        {/* Carousel */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8 transition-opacity duration-400 ${fade ? 'opacity-100' : 'opacity-0'}`}
        >
          {visibleReviews.map((review, index) => (
            <ReviewCard key={`${page}-${index}`} review={review} isGoogle={isGoogle} />
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
