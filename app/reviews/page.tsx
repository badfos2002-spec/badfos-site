import { Metadata } from 'next'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'ביקורות לקוחות | בדפוס',
  description: 'מה הלקוחות שלנו אומרים - ביקורות אמיתיות על השירות',
}

const reviews = [
  {
    id: 1,
    name: 'יוסי כהן',
    rating: 5,
    text: 'שירות מעולה! החולצות הגיעו מהר והאיכות פשוט מדהימה. בהחלט אזמין שוב',
    date: '15 בינואר 2024',
    featured: true,
  },
  {
    id: 2,
    name: 'שרה לוי',
    rating: 5,
    text: 'הזמנתי חולצות לאירוע חברה וכולם היו מרוצים. ההדפסה איכותית והצבעים חדים',
    date: '10 בינואר 2024',
    featured: true,
  },
  {
    id: 3,
    name: 'דני אברהם',
    rating: 4,
    text: 'המחירים הכי טובים שמצאתי. איכות טובה ושירות מהיר',
    date: '5 בינואר 2024',
    featured: false,
  },
]

export default function ReviewsPage() {
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

  return (
    <div className="container-rtl py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          מה הלקוחות שלנו אומרים
        </h1>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-5xl font-bold">{avgRating.toFixed(1)}</span>
          <div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-6 h-6 ${
                    i < avgRating ? 'fill-primary text-primary' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-text-gray">מתוך {reviews.length} ביקורות</p>
          </div>
        </div>
        <Button className="btn-cta">כתבו ביקורת</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {reviews.map((review) => (
          <Card
            key={review.id}
            className={review.featured ? 'border-2 border-primary' : ''}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold">{review.name}</span>
                {review.featured && (
                  <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                    מומלץ
                  </span>
                )}
              </div>
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating ? 'fill-primary text-primary' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-text-gray mb-3">{review.text}</p>
              <p className="text-sm text-text-gray">{review.date}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
