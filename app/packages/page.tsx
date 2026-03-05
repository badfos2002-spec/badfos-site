'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Gift, Check, Loader2, Minus, Plus, ShoppingCart } from 'lucide-react'
import { getAllDocuments } from '@/lib/db'
import { useCart } from '@/hooks/useCart'
import type { Package } from '@/lib/types'

type DisplayPackage = {
  id: string
  name: string
  tag: string
  range: string
  subtitle: string
  pricePerUnit: number
  graphicDesignerCost: number
  graphicDesignerLabel: string
  graphicDesignerFree: boolean
  description: string
  image?: string
  minQuantity: number
  maxQuantity: number
}

const FALLBACK: DisplayPackage[] = [
  {
    id: '1',
    name: 'עד 10 חולצות',
    tag: 'חדש',
    range: '1–10 חולצות',
    subtitle: 'ליווי גרפיקאי בתוספת',
    pricePerUnit: 42,
    graphicDesignerCost: 250,
    graphicDesignerLabel: 'גרפיקאי: ₪250',
    graphicDesignerFree: false,
    description: 'מחיר ליחידה: 42 ₪. ליווי גרפיקאי בתוספת 250 ₪.',
    image: 'https://base44.app/api/apps/68626ca21a08e364608a704b/files/ddc5d7f82_10.png',
    minQuantity: 1,
    maxQuantity: 10,
  },
  {
    id: '2',
    name: '11-20 חולצות',
    tag: 'חסכוני',
    range: '11–20 חולצות',
    subtitle: 'ליווי גרפיקאי בתוספת',
    pricePerUnit: 40,
    graphicDesignerCost: 250,
    graphicDesignerLabel: 'גרפיקאי: ₪250',
    graphicDesignerFree: false,
    description: 'מחיר ליחידה: 40 ₪. ליווי גרפיקאי בתוספת 250 ₪.',
    image: 'https://base44.app/api/apps/68626ca21a08e364608a704b/files/0181cec14_11-20.png',
    minQuantity: 11,
    maxQuantity: 20,
  },
  {
    id: '3',
    name: '21-50 חולצות',
    tag: 'הכי משתלם',
    range: '21–50 חולצות',
    subtitle: 'כולל גרפיקאי',
    pricePerUnit: 38,
    graphicDesignerCost: 0,
    graphicDesignerLabel: 'גרפיקאי חינם',
    graphicDesignerFree: true,
    description: 'מחיר ליחידה: 38 ₪. ליווי גרפיקאי חינם.',
    image: 'https://base44.app/api/apps/68626ca21a08e364608a704b/files/056e4ce29_21-50.png',
    minQuantity: 21,
    maxQuantity: 50,
  },
]

const features = [
  'שירות מהיר ואמין',
  'איכות הדפסה גבוהה',
  'תמיכה עד אישור סופי',
]

function toDisplay(pkg: Package): DisplayPackage {
  const free = pkg.graphicDesignerCost === 0
  return {
    id: pkg.id,
    name: pkg.name,
    tag: pkg.tag,
    range: `${pkg.minQuantity}–${pkg.maxQuantity} חולצות`,
    subtitle: free ? 'כולל גרפיקאי' : 'ליווי גרפיקאי בתוספת',
    pricePerUnit: pkg.pricePerUnit,
    graphicDesignerCost: pkg.graphicDesignerCost,
    graphicDesignerLabel: free ? 'גרפיקאי חינם' : `גרפיקאי: ₪${pkg.graphicDesignerCost}`,
    graphicDesignerFree: free,
    description: `מחיר ליחידה: ${pkg.pricePerUnit} ₪. ליווי גרפיקאי ${free ? 'חינם' : `בתוספת ${pkg.graphicDesignerCost} ₪`}.`,
    image: pkg.image,
    minQuantity: pkg.minQuantity,
    maxQuantity: pkg.maxQuantity,
  }
}

export default function PackagesPage() {
  const router = useRouter()
  const { addPackage } = useCart()
  const [packages, setPackages] = useState<DisplayPackage[]>(FALLBACK)
  const [loading, setLoading] = useState(true)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [addedId, setAddedId] = useState<string | null>(null)

  useEffect(() => {
    getAllDocuments<Package>('packages')
      .then((data: Package[]) => {
        const active = data.filter(p => p.isActive).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        if (active.length > 0) setPackages(active.map(toDisplay))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Initialize quantities to minQuantity when packages load
  useEffect(() => {
    const initial: Record<string, number> = {}
    packages.forEach(pkg => { initial[pkg.id] = pkg.minQuantity })
    setQuantities(initial)
  }, [packages])

  const updateQuantity = (pkgId: string, delta: number) => {
    setQuantities(prev => {
      const pkg = packages.find(p => p.id === pkgId)
      if (!pkg) return prev
      const current = prev[pkgId] ?? pkg.minQuantity
      const next = Math.max(pkg.minQuantity, Math.min(pkg.maxQuantity, current + delta))
      return { ...prev, [pkgId]: next }
    })
  }

  const handleAddToCart = (pkg: DisplayPackage) => {
    const quantity = quantities[pkg.id] ?? pkg.minQuantity
    addPackage({
      packageId: pkg.id,
      packageName: pkg.name,
      quantity,
      pricePerUnit: pkg.pricePerUnit,
      graphicDesignerCost: pkg.graphicDesignerCost,
      image: pkg.image,
    })
    setAddedId(pkg.id)
    setTimeout(() => setAddedId(null), 2000)
  }

  return (
    <div className="min-h-screen bg-white py-10" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 bg-yellow-100 border border-yellow-200 rounded-full text-yellow-700 text-sm font-medium shadow-sm mb-4">
            <Gift className="w-4 h-4 ml-2" />
            חבילות ומבצעים
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            חבילות הדפסה משתלמות
          </h1>
          <p className="text-gray-600">
            בחרו את החבילה המתאימה לכם, עם ליווי גרפי צמוד וקבלת עיצוב עד אישור סופי.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const qty = quantities[pkg.id] ?? pkg.minQuantity
              const total = qty * pkg.pricePerUnit + pkg.graphicDesignerCost
              const isAdded = addedId === pkg.id

              return (
                <Card key={pkg.id} className="group overflow-hidden hover-lift border-yellow-100 h-full flex flex-col">
                  {pkg.image && (
                    <img
                      src={pkg.image}
                      alt={pkg.name}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}

                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold tracking-tight text-xl">{pkg.name}</div>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">{pkg.tag}</span>
                    </div>
                    <div className="mt-2 text-gray-600">{pkg.range} • {pkg.subtitle}</div>
                  </CardHeader>

                  <CardContent className="space-y-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between min-h-10">
                      <div className="text-2xl font-bold text-gray-900">
                        ₪{pkg.pricePerUnit} <span className="text-sm font-normal text-gray-600">ליח&apos;</span>
                      </div>
                      <div className={`text-sm px-3 py-1 rounded-full ${pkg.graphicDesignerFree ? 'text-green-700 bg-green-50' : 'text-gray-700 bg-gray-50'}`}>
                        {pkg.graphicDesignerLabel}
                      </div>
                    </div>

                    <ul className="text-sm text-gray-700 space-y-1">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* Quantity Selector */}
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">כמות חולצות</span>
                        <span className="text-xs text-gray-500">{pkg.minQuantity}–{pkg.maxQuantity}</span>
                      </div>
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => updateQuantity(pkg.id, -1)}
                          disabled={qty <= pkg.minQuantity}
                          className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-2xl font-bold min-w-[3ch] text-center">{qty}</span>
                        <button
                          onClick={() => updateQuantity(pkg.id, 1)}
                          disabled={qty >= pkg.maxQuantity}
                          className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-center mt-2 text-sm font-semibold text-gray-900">
                        סה&quot;כ: ₪{total}
                      </div>
                    </div>

                    <div className="pt-2 mt-auto">
                      <button
                        onClick={() => handleAddToCart(pkg)}
                        className={`w-full h-12 flex items-center justify-center text-lg font-semibold rounded-md shadow transition-all ${
                          isAdded
                            ? 'bg-green-500 text-white'
                            : 'gradient-yellow text-white hover:opacity-90'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-5 h-5 ml-2" />
                            נוסף לסל!
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-5 h-5 ml-2" />
                            הוסף לסל
                          </>
                        )}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
