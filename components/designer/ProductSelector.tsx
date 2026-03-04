import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { PRODUCT_CATEGORIES } from '@/lib/constants'

const categoryDetails: Record<string, { title: string; description: string; image?: string }> = {
  tshirt: {
    title: 'חולצות בעיצוב אישי',
    description: 'הדפסה איכותית על מגוון חולצות כותנה ודרייפיט',
    image: '/assets/תמונת קטגורייה חולצות.png',
  },
  sweatshirt: {
    title: 'סווטשרטים',
    description: 'סווטשרטים חמים ואיכותיים עם הדפסה אישית',
    image: '/assets/סווטשרטים.png',
  },
  cap: {
    title: 'כובעים',
    description: 'כובעים עם רקמה או הדפסה בהתאמה אישית',
  },
  buff: {
    title: 'באפים',
    description: 'באפים ייחודיים עם העיצוב שלך',
    image: '/assets/רקע קטגוריית באפים.png',
  },
}

export default function ProductSelector() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-none mx-auto">
      {PRODUCT_CATEGORIES.map((category) => {
        const details = categoryDetails[category.id]
        return (
          <Link
            key={category.id}
            href={'comingSoon' in category && category.comingSoon ? '#' : `/designer/${category.id}`}
            className={`${'comingSoon' in category && category.comingSoon ? 'pointer-events-none' : ''}`}
          >
            <Card
              className={`${category.color} border-2 rounded-xl hover:shadow-xl transition-all hover:scale-105 relative overflow-hidden h-[382px] flex flex-col ${
                'comingSoon' in category && category.comingSoon ? 'opacity-60' : ''
              }`}
            >
              {category.popular && (
                <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold">
                  הכי פופולרי! ⭐
                </div>
              )}
              {'comingSoon' in category && category.comingSoon && (
                <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  בקרוב! 🚀
                </div>
              )}
              {/* Full-height image */}
              <div className="relative w-full flex-1 overflow-hidden rounded-t-xl">
                {details.image ? (
                  <Image
                    src={details.image}
                    alt={details.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl bg-gray-100">
                    {category.icon}
                  </div>
                )}
              </div>

              {/* Bottom section */}
              <div className="bg-white border-t border-gray-200 px-5 py-4 text-center shrink-0">
                <h4 className="font-bold text-xl text-[#1e293b] mb-1">
                  {details.title}
                </h4>
                <p className="text-sm text-[#64748b] mb-3">
                  {details.description}
                </p>
                <span className="inline-flex items-center justify-center gradient-yellow text-white font-medium px-4 py-2 rounded-md shadow text-sm h-9">
                  {'comingSoon' in category && category.comingSoon ? 'בקרוב' : 'התחל לעצב'}
                </span>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
