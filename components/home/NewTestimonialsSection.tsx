'use client'

import { useState, useEffect, useRef } from 'react'
import { Star } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// ---------- Unified review type ----------
type ReviewItem = {
  author_name: string
  rating: number
  text: string
  relative_time_description: string
  profile_photo_url: string
  isGoogle?: boolean
}

// ---------- 10 manual reviews ----------
const MANUAL_REVIEWS: ReviewItem[] = [
  {
    author_name: 'רועי אבירבוך',
    rating: 5,
    text: 'אחלה חוויה! השירות מהיר, המחיר הוגן וההדפסה באיכות ברמה גבוהה. הזמנו חולצות לאירוע של החברה ונהננו מכל שלב בתהליך. בהחלט נחזור.',
    relative_time_description: 'לפני יומיים',
    profile_photo_url: '',
  },
  {
    author_name: 'אורי קארה',
    rating: 5,
    text: 'ממליץ בחום! מקצועיים, נעימים ומהירים.',
    relative_time_description: 'לפני חודשיים',
    profile_photo_url: '',
  },
  {
    author_name: 'דניאל שטופל',
    rating: 5,
    text: 'הזמנתי 30 חולצות עם הדפסה מותאמת אישית. התהליך היה פשוט וקל, איכות ההדפסה מדהימה והמשלוח הגיע בזמן. בהחלט נזמין שוב!',
    relative_time_description: 'לפני 4 חודשים',
    profile_photo_url: '',
  },
  {
    author_name: 'שירה כהן',
    rating: 5,
    text: 'הצבעים חיים ומדויקים והבד נעים מאוד. הזמנתי לצוות בעבודה וכולם התלהבו!',
    relative_time_description: 'לפני שבוע',
    profile_photo_url: '',
  },
  {
    author_name: 'יוסי לוי',
    rating: 5,
    text: 'הגרפיקאי עזר לי לעצב בדיוק את מה שרציתי. החולצות יצאו מהממות, הגיעו תוך 3 ימים. לא ציפיתי לשירות כזה טוב מאתר הדפסה.',
    relative_time_description: 'לפני 3 שבועות',
    profile_photo_url: '',
  },
  {
    author_name: 'מיכל אברהם',
    rating: 5,
    text: 'מחיר מעולה ואיכות מדהימה. נזמין שוב!',
    relative_time_description: 'לפני חצי שנה',
    profile_photo_url: '',
  },
  {
    author_name: 'אלון דוד',
    rating: 5,
    text: 'לקוח חוזר כבר בפעם השלישית. הפעם הזמנתי סווטשרטים והם יצאו מושלמים. כל פעם מחדש אני מופתע מהאיכות ומהיחס האישי. אין כמוכם!',
    relative_time_description: 'לפני חודש',
    profile_photo_url: '',
  },
  {
    author_name: 'נועה גולן',
    rating: 5,
    text: 'עיצבתי חולצה עם תמונה אישית במתנה ליום הולדת. חברה שלי התרגשה! האיכות הרבה מעבר למצופה.',
    relative_time_description: 'לפני 5 ימים',
    profile_photo_url: '',
  },
  {
    author_name: 'תומר ברק',
    rating: 5,
    text: 'הזמנו 50 חולצות לאירוע חברה. מהרגע שפנינו ועד שקיבלנו הכל היה חלק ומקצועי — תקשורת מהירה, עיצוב מדויק, משלוח בזמן. התוצאה עלתה על כל הציפיות. כבר מתכננים הזמנה נוספת.',
    relative_time_description: 'לפני חודשיים',
    profile_photo_url: '',
  },
  {
    author_name: 'ליאת מזרחי',
    rating: 5,
    text: 'הדפסתי חולצות לחתונה וכולם שאלו מאיפה. תודה בדפוס!',
    relative_time_description: 'לפני 3 חודשים',
    profile_photo_url: '',
  },
]

// ---------- Google "G" icon ----------
const GoogleIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
)

// ---------- Avatar background colors (hex) for manual reviews ----------
const AVATAR_BG_COLORS = [
  '4285F4', '34A853', '9C27B0', 'F4511E', 'E91E63',
  '00ACC1', 'E53935', '3F51B5', '009688', 'FF8F00',
]

// ---------- Generate avatar URL for manual reviews ----------
function getAvatarUrl(name: string, index: number): string {
  const bg = AVATAR_BG_COLORS[index % AVATAR_BG_COLORS.length]
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=80&bold=true&format=png`
}

// ---------- Single unified review card ----------
function ReviewCard({ review, index }: { review: ReviewItem; index: number }) {
  const avatarSrc = review.profile_photo_url || getAvatarUrl(review.author_name, index)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg p-6 h-full flex flex-col min-w-0 transition-shadow duration-200">
      {/* Author row */}
      <div className="flex items-center gap-3 mb-4">
        <img src={avatarSrc} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        <div className="flex-1 text-right min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{review.author_name}</p>
          {review.relative_time_description && (
            <p className="text-xs text-gray-400">{review.relative_time_description}</p>
          )}
        </div>
        {/* Stars + Google icon */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
            ))}
          </div>
          {review.isGoogle && <GoogleIcon className="w-4 h-4 mr-1" />}
        </div>
      </div>
      {/* Review text */}
      <p className="text-gray-600 text-sm leading-relaxed text-right flex-1">{review.text}</p>
    </div>
  )
}

// ---------- Main section ----------
export default function NewTestimonialsSection() {
  const [allReviews, setAllReviews] = useState<ReviewItem[]>(MANUAL_REVIEWS.slice(0, 15))
  const [googleRating, setGoogleRating] = useState<number | null>(null)
  const [googleReviewCount, setGoogleReviewCount] = useState(0)
  const [page, setPage] = useState(0)
  const [slideDir, setSlideDir] = useState<'in' | 'out' | 'idle'>('idle')
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    fetch('/api/google-business')
      .then(r => r.json())
      .then(data => {
        if (data.reviews?.length > 0) {
          // Map Google reviews to unified type
          const googleReviews: ReviewItem[] = data.reviews.map((r: any) => ({
            author_name: r.author,
            rating: r.rating,
            text: r.text,
            relative_time_description: r.time,
            profile_photo_url: r.authorPhoto || '',
            isGoogle: true,
          }))

          setGoogleRating(data.rating)
          setGoogleReviewCount(data.reviewCount)

          // Merge: Google first, then manual reviews to fill up to 15
          const combined: ReviewItem[] = [...googleReviews]
          const usedNames = new Set(combined.map(r => r.author_name))

          for (const r of MANUAL_REVIEWS) {
            if (combined.length >= 15) break
            if (usedNames.has(r.author_name)) continue
            usedNames.add(r.author_name)
            combined.push(r)
          }

          setAllReviews(combined.slice(0, 15))
        }
        // If API fails — MANUAL_REVIEWS are already the default state
      })
      .catch(() => {
        // API failed — keep manual reviews as fallback (already set)
      })
  }, [])

  // Auto-rotate every 7 seconds
  const totalPages = Math.ceil(allReviews.length / 3)

  useEffect(() => {
    if (totalPages <= 1) return
    timerRef.current = setInterval(() => {
      setSlideDir('out')
      setTimeout(() => {
        setPage(prev => (prev + 1) % totalPages)
        setSlideDir('in')
        setTimeout(() => setSlideDir('idle'), 500)
      }, 500)
    }, 7000)
    return () => clearInterval(timerRef.current)
  }, [totalPages])

  const visibleReviews = allReviews.slice(page * 3, page * 3 + 3)

  const slideClass =
    slideDir === 'out'
      ? 'translate-x-full opacity-0'
      : slideDir === 'in'
        ? '-translate-x-full opacity-0'
        : 'translate-x-0 opacity-100'

  return (
    <section className="w-full bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-20 overflow-hidden" dir="rtl">
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
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8 transition-all duration-500 ease-in-out ${slideClass}`}
        >
          {visibleReviews.map((review, index) => (
            <ReviewCard key={`${page}-${index}`} review={review} index={page * 3 + index} />
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
