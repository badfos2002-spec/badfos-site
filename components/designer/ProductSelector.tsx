import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { PRODUCT_CATEGORIES } from '@/lib/constants'

export default function ProductSelector() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {PRODUCT_CATEGORIES.map((category) => (
        <Link
          key={category.id}
          href={category.comingSoon ? '#' : `/designer/${category.id}`}
          className={category.comingSoon ? 'pointer-events-none' : ''}
        >
          <Card
            className={`${category.color} border-2 hover:shadow-xl transition-all hover:scale-105 relative overflow-hidden ${
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
            <CardContent className="p-8 text-center">
              <div className="text-7xl mb-4">{category.icon}</div>
              <h3 className={`text-2xl font-bold mb-2 ${category.textColor}`}>
                {category.name}
              </h3>
              {!category.comingSoon && (
                <p className="text-text-gray">
                  לחץ להתחיל לעצב
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
