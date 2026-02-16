import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PRODUCT_CATEGORIES } from '@/lib/constants'

const categoryDetails: Record<string, { title: string; description: string }> = {
  tshirt: {
    title: 'חולצות',
    description: 'הדפסה איכותית על מגוון חולצות כותנה ודרייפיט',
  },
  sweatshirt: {
    title: 'סווטשרטים',
    description: 'סווטשרטים חמים ואיכותיים עם הדפסה אישית',
  },
  cap: {
    title: 'כובעים',
    description: 'כובעים עם רקמה או הדפסה בהתאמה אישית',
  },
  buff: {
    title: 'באפים',
    description: 'באפים ייחודיים עם העיצוב שלך',
  },
}

export default function ProductSelector() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-none mx-auto px-6">
      {PRODUCT_CATEGORIES.map((category) => {
        const details = categoryDetails[category.id]
        return (
          <Link
            key={category.id}
            href={category.comingSoon ? '#' : `/designer/${category.id}`}
            className={`${category.comingSoon ? 'pointer-events-none' : ''}`}
          >
            <Card
              className={`${category.color} border-2 rounded-3xl hover:shadow-xl transition-all hover:scale-105 relative overflow-hidden ${
                category.comingSoon ? 'opacity-60' : ''
              }`}
            >
              {category.popular && (
                <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold">
                  הכי פופולרי! ⭐
                </div>
              )}
              {category.comingSoon && (
                <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  בקרוב! 🚀
                </div>
              )}
              <CardContent className="p-10 text-center">
                <div className="text-8xl mb-5">{category.icon}</div>
                <h3 className={`text-2xl font-bold mb-2 ${category.textColor}`}>
                  {category.name}
                </h3>
              </CardContent>

              {/* Bottom section */}
              <div className="bg-white border-t border-gray-200 p-5 text-center">
                <h4 className="font-bold text-lg text-[#1e293b] mb-2">
                  {details.title}
                </h4>
                <p className="text-sm text-[#64748b] mb-4">
                  {details.description}
                </p>
                <span className="inline-block bg-[#fbbf24] text-white font-semibold px-6 py-2 rounded-full shadow-md text-sm">
                  {category.comingSoon ? 'בקרוב' : 'התחל לעצב'}
                </span>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
