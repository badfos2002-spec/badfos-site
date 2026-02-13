'use client'

import { useState } from 'react'
import { Star, User, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function ReviewsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    rating: 0,
    productType: '',
    review: '',
    image: null as File | null,
  })

  // Mock reviews data - will be replaced with Firebase
  const reviews = [
    {
      id: 1,
      name: 'רועי אבירבוך',
      rating: 5,
      productType: 'חולצה כותנה',
      review: 'אחלה חוויה! השירות מהיר, המחיר הוגן וההדפסה באיכות ברמה גבוהה. אגיע שוב בוודאות',
      date: new Date('2024-01-15'),
      image: null,
    },
    {
      id: 2,
      name: 'אורי קארה',
      rating: 5,
      productType: 'סווטשרט',
      review: 'השתמשתי בשירות כמה פעמים והכל תמיד מושלם. ממליץ בחום!',
      date: new Date('2024-01-10'),
      image: null,
    },
    {
      id: 3,
      name: 'דניאל שטופל',
      rating: 5,
      productType: 'באף',
      review: 'ההזמנה לקחה זמן מזערי והאיכות מעולה. ממליץ!',
      date: new Date('2024-01-05'),
      image: null,
    },
  ]

  const averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Add Firebase integration
    console.log('Review submitted:', formData)
    setIsDialogOpen(false)
    setFormData({ name: '', rating: 0, productType: '', review: '', image: null })
  }

  const handleStarClick = (rating: number) => {
    setFormData({ ...formData, rating })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 py-20 relative overflow-hidden" dir="rtl">
      {/* Floating Background Blobs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-yellow-300/30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-orange-300/30 rounded-full blur-3xl animate-bounce" style={{ animationDuration: '3s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-red-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-8 relative z-10">
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
          <div className="inline-block bg-white/80 backdrop-blur-sm rounded-3xl px-8 py-6 shadow-xl mb-8">
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600">
                {averageRating.toFixed(1)}
              </div>
              <div>
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-6 h-6 ${
                        i < Math.round(averageRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600">מתוך {reviews.length} ביקורות</p>
              </div>
            </div>
          </div>

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
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-yellow-400 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">לחץ להעלאת תמונה</p>
                      <input
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
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold h-14 text-lg rounded-xl"
                  >
                    שלח ביקורת
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              dir="rtl"
            >
              {/* User Avatar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-bold text-gray-900">{review.name}</h3>
                  <p className="text-xs text-gray-500">
                    {review.date.toLocaleDateString('he-IL')}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-3 justify-end">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Product Type */}
              {review.productType && (
                <div className="mb-3">
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                    {review.productType}
                  </span>
                </div>
              )}

              {/* Review Text */}
              <p className="text-gray-700 leading-relaxed mb-4">
                {review.review}
              </p>

              {/* Review Image */}
              {review.image && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden">
                  <img
                    src={review.image}
                    alt="Review"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
