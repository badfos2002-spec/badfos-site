'use client'

import { Star, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminReviewsPage() {
  const reviews = [
    { id: 1, name: 'רועי אבירבוך', rating: 5, product: 'חולצה כותנה', text: 'אחלה חוויה! השירות מהיר...', status: 'pending', date: '13/02/2026' },
    { id: 2, name: 'אורי קארה', rating: 5, product: 'סווטשרט', text: 'השתמשתי בשירות הזמנת חולצות...', status: 'approved', date: '12/02/2026' },
  ]

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול ביקורות</h1>
        <p className="text-gray-600">אישור וניהול ביקורות לקוחות</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{review.name}</h3>
                <p className="text-sm text-gray-500">{review.product} • {review.date}</p>
                <div className="flex gap-1 mt-2">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                review.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {review.status === 'approved' ? 'מאושר' : 'ממתין'}
              </span>
            </div>
            
            <p className="text-gray-700 mb-4">{review.text}</p>
            
            {review.status === 'pending' && (
              <div className="flex gap-2 pt-4 border-t">
                <Button className="bg-green-500 hover:bg-green-600 text-white">
                  <Check className="w-4 h-4 ml-2" />
                  אשר
                </Button>
                <Button variant="outline" className="border-red-500 text-red-600 hover:bg-red-50">
                  <X className="w-4 h-4 ml-2" />
                  דחה
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
