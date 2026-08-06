'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Gift, Check, Loader2, ShoppingCart, Plus, Minus } from 'lucide-react'
import { getAllDocuments } from '@/lib/db'
import { useCart } from '@/hooks/useCart'
import { packageDisplayName } from '@/lib/constants'
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
    pricePerUnit: 45,
    graphicDesignerCost: 250,
    graphicDesignerLabel: 'גרפיקאי: ₪250',
    graphicDesignerFree: false,
    description: 'מחיר ליחידה: 45 ₪. ליווי גרפיקאי בתוספת 250 ₪.',
    image: '/images/packages/package-10.png',
    minQuantity: 1,
    maxQuantity: 10,
  },
  {
    id: '2',
    name: '11-20 חולצות',
    tag: 'חסכוני',
    range: '11–20 חולצות',
    subtitle: 'ליווי גרפיקאי בתוספת',
    pricePerUnit: 42,
    graphicDesignerCost: 250,
    graphicDesignerLabel: 'גרפיקאי: ₪250',
    graphicDesignerFree: false,
    description: 'מחיר ליחידה: 42 ₪. ליווי גרפיקאי בתוספת 250 ₪.',
    image: '/images/packages/package-11-20.png',
    minQuantity: 11,
    maxQuantity: 20,
  },
  {
    id: '3',
    name: '20-50 חולצות',
    tag: 'הכי משתלם',
    range: '20–50 חולצות',
    subtitle: 'כולל גרפיקאי',
    pricePerUnit: 40,
    graphicDesignerCost: 0,
    graphicDesignerLabel: 'גרפיקאי חינם',
    graphicDesignerFree: true,
    description: 'מחיר ליחידה: 40 ₪. ליווי גרפיקאי צמוד חינם.',
    image: '/images/packages/package-21-50.png',
    minQuantity: 20,
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
    // Name is DERIVED from the range — never trust a stored name that may
    // contradict the quantities the customer can actually pick.
    name: packageDisplayName(pkg.minQuantity, pkg.maxQuantity),
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

  // Quantity is bounded by the package's own range (the range in its name).
  const clampQty = (pkg: DisplayPackage, v: number) =>
    Math.max(pkg.minQuantity, Math.min(pkg.maxQuantity, v))
  const setQty = (pkg: DisplayPackage, v: number, clamp = true) =>
    setQuantities(prev => ({ ...prev, [pkg.id]: clamp ? clampQty(pkg, v) : v }))

  const handleAddToCart = (pkg: DisplayPackage) => {
    const quantity = clampQty(pkg, quantities[pkg.id] ?? pkg.minQuantity)
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
              const isAdded = addedId === pkg.id
              const qty = quantities[pkg.id] ?? pkg.minQuantity
              const shownQty = clampQty(pkg, qty)
              const subtotal = shownQty * pkg.pricePerUnit

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
                    <div className="mt-2 text-gray-600">{pkg.subtitle}</div>
                  </CardHeader>

                  <CardContent className="space-y-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between min-h-10">
                      <div className="text-2xl font-bold text-gray-900">
                        ₪{pkg.pricePerUnit} <span className="text-sm font-normal text-gray-600">ליח&apos;</span>
                        <div className="text-xs font-normal text-gray-500 mt-0.5">לא כולל הדפסה</div>
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

                    <div className="mt-auto space-y-2">
                      <div className="flex items-center justify-between bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                        <span className="text-sm font-medium text-gray-700">כמות:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQty(pkg, shownQty - 1)}
                            disabled={shownQty <= pkg.minQuantity}
                            aria-label="הפחתת כמות"
                            className="w-8 h-8 rounded-md border border-gray-300 bg-white flex items-center justify-center disabled:opacity-40 hover:border-yellow-400 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min={pkg.minQuantity}
                            max={pkg.maxQuantity}
                            value={qty || ''}
                            aria-label="כמות יחידות"
                            onChange={(e) => setQty(pkg, parseInt(e.target.value) || 0, false)}
                            onBlur={() => setQty(pkg, qty)}
                            className="w-14 h-8 text-center font-bold rounded-md border border-gray-300 bg-white text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => setQty(pkg, shownQty + 1)}
                            disabled={shownQty >= pkg.maxQuantity}
                            aria-label="הוספת כמות"
                            className="w-8 h-8 rounded-md border border-gray-300 bg-white flex items-center justify-center disabled:opacity-40 hover:border-yellow-400 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm px-1">
                        <span className="text-gray-500">בין {pkg.minQuantity} ל-{pkg.maxQuantity} יח׳ בחבילה זו</span>
                        <span className="font-bold text-gray-900">סה&quot;כ: ₪{subtotal.toLocaleString()}</span>
                      </div>
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
