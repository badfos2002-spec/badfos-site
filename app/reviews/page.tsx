'use client'

import { useState, useEffect, useRef } from 'react'
import { Star, User, Upload, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getApprovedReviews, createReview } from '@/lib/db'

type DisplayReview = {
  id: string
  name: string
  rating: number
  product?: string
  text: string
  dateStr: string
}

const FALLBACK: DisplayReview[] = [
  { id: '1', name: 'רועי אבירבוך', rating: 5, product: 'חולצה כותנה', text: 'אחלה חוויה! השירות מהיר, המחיר הוגן וההדפסה באיכות ברמה גבוהה. אגיע שוב בוודאות', dateStr: '15/1/2024' },
  { id: '2', name: 'אורי קארה', rating: 5, product: 'סווטשרט', text: 'השתמשתי בשירות כמה פעמים והכל תמיד מושלם. ממליץ בחום!', dateStr: '10/1/2024' },
  { id: '3', name: 'דניאל שטופל', rating: 5, product: 'באף', text: 'ההזמנה לקחה זמן מזערי והאיכות מעולה. ממליץ!', dateStr: '5/1/2024' },
]

export default function ReviewsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [reviews, setReviews] = useState<DisplayReview[]>(FALLBACK)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    rating: 0,
    productType: '',
    review: '',
    image: null as File | null,
  })

  const [googleReviews, setGoogleReviews] = useState<{ author: string; authorPhoto: string; rating: number; text: string; time: string }[]>([])
  const [googleRating, setGoogleRating] = useState<number | null>(null)
  const [googleReviewCount, setGoogleReviewCount] = useState(0)
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')

  useEffect(() => {
    // Fetch site reviews from Firestore
    getApprovedReviews()
      .then(data => {
        if (data.length > 0) {
          setReviews(data.map(r => ({
            id: r.id,
            name: r.name,
            rating: r.rating,
            product: r.product,
            text: r.text,
            dateStr: r.createdAt?.toDate?.()?.toLocaleDateString('he-IL') ?? '',
          })))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    // Fetch Google Business reviews
    fetch('/api/google-business')
      .then(r => r.json())
      .then(data => {
        if (data.reviews) {
          setGoogleReviews(data.reviews)
          setGoogleRating(data.rating)
          setGoogleReviewCount(data.reviewCount)
          setGoogleMapsUrl(data.googleMapsUrl)
        }
      })
      .catch(console.error)
  }, [])

  const averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.rating) {
      alert('יש לבחור דירוג')
      return
    }
    setSubmitting(true)
    try {
      await createReview({
        name: formData.name,
        rating: formData.rating,
        product: formData.productType || undefined,
        text: formData.review,
        status: 'pending',
        featured: false,
      })
      setIsDialogOpen(false)
      setFormData({ name: '', rating: 0, productType: '', review: '', image: null })
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 5000)
    } catch (e) {
      console.error(e)
      alert('שגיאה בשליחת ביקורת, נסה שוב')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStarClick = (rating: number) => {
    setFormData({ ...formData, rating })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 py-20 relative overflow-hidden" dir="rtl">
      {/* Floating Background Blobs */}
      <div className="hidden md:block absolute top-20 right-20 w-72 h-72 bg-yellow-300/30 rounded-full blur-3xl animate-pulse"></div>
      <div className="hidden md:block absolute bottom-20 left-20 w-96 h-96 bg-orange-300/30 rounded-full blur-3xl animate-bounce" style={{ animationDuration: '3s' }}></div>
      <div className="hidden md:block absolute top-1/2 left-1/2 w-64 h-64 bg-red-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>

      <div className="mx-auto max-w-[1536px] px-4 md:px-0 relative z-10">
        {/* Header */}
        <div className="text-center mb-16" dir="rtl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6">
            <Star className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-600">חוויות לקוחות</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600">
              מה הלקוחות שלנו אומרים
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            אלפי לקוחות מרוצים שיתפו את החוויה שלהם
          </p>

          {/* Score Card */}
          <div className="inline-flex items-stretch gap-8 bg-white/80 backdrop-blur-sm rounded-3xl px-10 py-6 shadow-xl mb-8">
            {/* Google Rating */}
            {googleRating && (
              <div className="flex flex-col items-center justify-between min-w-[120px]">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold text-gray-900">{googleRating}</span>
                  <svg className="w-7 h-7" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                </div>
                <div className="flex gap-1 justify-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < Math.round(googleRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <p className="text-xs text-gray-500">{googleReviewCount} ביקורות בגוגל</p>
              </div>
            )}
            {googleRating && <div className="w-px bg-gray-200 self-stretch"></div>}
            {/* Site Rating */}
            <div className="flex flex-col items-center justify-between min-w-[120px]">
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600">
                  {averageRating.toFixed(1)}
                </span>
                <Star className="w-7 h-7 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="flex gap-1 justify-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-5 h-5 ${i < Math.round(averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              <p className="text-xs text-gray-500">{reviews.length} ביקורות באתר</p>
            </div>
          </div>

          {/* Success message */}
          {submitSuccess && (
            <div className="mb-6 inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-full">
              <CheckCircle className="w-5 h-5" />
              <span>הביקורת נשלחה ותפורסם לאחר אישור</span>
            </div>
          )}

          {/* Write Review Button */}
          <div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all">
                  כתוב ביקורת
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-right">
                    שתף את החוויה שלך
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-right">
                      שם מלא *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="הזן שם מלא"
                      className="text-right h-12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-right">
                      דירוג *
                    </label>
                    <div className="flex gap-2 justify-end">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => handleStarClick(rating)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-10 h-10 transition-all ${
                              formData.rating >= rating
                                ? 'text-yellow-400 fill-yellow-400 scale-110'
                                : 'text-gray-300 hover:text-yellow-200'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-right">
                      סוג מוצר
                    </label>
                    <Input
                      type="text"
                      value={formData.productType}
                      onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                      placeholder="למשל: חולצה כותנה לבנה"
                      className="text-right h-12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-right">
                      הביקורת שלך *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.review}
                      onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                      placeholder="ספר לנו על החוויה שלך..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-right resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-right">
                      העלאת תמונה (רשות)
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-yellow-400 transition-colors cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        {formData.image ? formData.image.name : 'לחץ להעלאת תמונה'}
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setFormData({ ...formData, image: e.target.files[0] })
                          }
                        }}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold h-14 text-lg rounded-xl"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'שלח ביקורת'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          </div>
        )}

        {/* Google Reviews Section */}
        {googleReviews.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                <h2 className="text-2xl font-bold text-gray-900">ביקורות מגוגל</h2>
                {googleRating && (
                  <span className="text-sm text-gray-500">
                    {googleRating} ({googleReviewCount} ביקורות)
                  </span>
                )}
              </div>
              {googleMapsUrl && (
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  צפה בכל הביקורות בגוגל
                </a>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {googleReviews.map((review, idx) => (
                <div
                  key={`google-${idx}`}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 border-l-4 border-blue-400"
                  dir="rtl"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {review.authorPhoto ? (
                      <img src={review.authorPhoto} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1 text-right">
                      <h3 className="font-bold text-gray-900">{review.author}</h3>
                      <p className="text-xs text-gray-500">{review.time}</p>
                    </div>
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  </div>
                  <div className="flex gap-1 mb-3 justify-end">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Site Reviews Grid */}
        {!loading && (
          <>
            {googleReviews.length > 0 && reviews.length > 0 && (
              <h2 className="text-2xl font-bold text-gray-900 mb-8">ביקורות מהאתר</h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                  dir="rtl"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="font-bold text-gray-900">{review.name}</h3>
                      <p className="text-xs text-gray-500">{review.dateStr}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-3 justify-end">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  {review.product && (
                    <div className="mb-3">
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">{review.product}</span>
                    </div>
                  )}
                  <p className="text-gray-700 leading-relaxed">{review.text}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
