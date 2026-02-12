import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'חבילות ומבצעים | בדפוס',
  description: 'חבילות מיוחדות להדפסת חולצות בכמויות - מחירים משתלמים',
}

const packages = [
  {
    id: 1,
    name: 'חבילה בסיסית',
    tag: 'מתאים למתחילים',
    minQuantity: 10,
    maxQuantity: 24,
    pricePerUnit: 45,
    graphicDesignerCost: 250,
  },
  {
    id: 2,
    name: 'חבילה משתלמת',
    tag: 'הכי פופולרי',
    minQuantity: 25,
    maxQuantity: 49,
    pricePerUnit: 40,
    graphicDesignerCost: 0,
  },
  {
    id: 3,
    name: 'חבילה מקצועית',
    tag: 'חסכוני ביותר',
    minQuantity: 50,
    maxQuantity: 100,
    pricePerUnit: 35,
    graphicDesignerCost: 0,
  },
]

export default function PackagesPage() {
  return (
    <div className="container-rtl py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          חבילות ומבצעים מיוחדים
        </h1>
        <p className="text-xl text-text-gray max-w-2xl mx-auto">
          חבילות מיוחדות עם מחירים משתלמים להזמנות בכמויות
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {packages.map((pkg) => (
          <Card key={pkg.id} className="relative hover:shadow-xl transition-shadow">
            {pkg.tag && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                {pkg.tag}
              </div>
            )}
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-2xl">{pkg.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  ₪{pkg.pricePerUnit}
                </div>
                <p className="text-text-gray">ליחידה</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>כמות מינימלית:</span>
                  <span className="font-bold">{pkg.minQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>כמות מקסימלית:</span>
                  <span className="font-bold">{pkg.maxQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>גרפיקאי:</span>
                  <span className="font-bold">
                    {pkg.graphicDesignerCost === 0 ? 'חינם!' : `₪${pkg.graphicDesignerCost}`}
                  </span>
                </div>
              </div>

              <Link href="/designer" className="block">
                <Button className="w-full btn-cta">
                  בחר חבילה
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
