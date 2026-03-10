'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { STANDARD_SIZES } from '@/lib/constants'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import { Minus, Plus, ShoppingCart, ArrowRight } from 'lucide-react'
import type { SizeQuantity } from '@/lib/types'

const PRODUCT_NAME = 'חולצת שאגת האריה'
const PRODUCT_PRICE = 50
const PRODUCT_IMAGE = '/assets/lion-roar-shirt.png'

export default function LionRoarPage() {
  const router = useRouter()
  const { addItem } = useCart()
  const [sizes, setSizes] = useState<SizeQuantity[]>([])
  const [added, setAdded] = useState(false)

  const getQuantity = (sizeId: string) => sizes.find(s => s.size === sizeId)?.quantity || 0
  const totalQuantity = sizes.reduce((sum, s) => sum + s.quantity, 0)

  const setQuantity = (sizeId: string, value: number) => {
    const clamped = Math.max(0, value)
    if (clamped === 0) {
      setSizes(sizes.filter(s => s.size !== sizeId))
    } else {
      const existing = sizes.find(s => s.size === sizeId)
      if (existing) {
        setSizes(sizes.map(s => s.size === sizeId ? { ...s, quantity: clamped } : s))
      } else {
        setSizes([...sizes, { size: sizeId, quantity: clamped }])
      }
    }
  }

  const handleAddToCart = () => {
    if (totalQuantity === 0) return

    addItem({
      productType: 'tshirt',
      fabricType: 'cotton',
      color: 'white',
      designs: [{
        area: 'front_full',
        areaName: 'שאגת האריה',
        imageUrl: PRODUCT_IMAGE,
        fileName: 'lion-roar.png',
      }],
      sizes,
      noDiscount: true,
      specialProductName: PRODUCT_NAME,
      fixedPrice: PRODUCT_PRICE,
    })

    setAdded(true)
    setTimeout(() => router.push('/cart'), 1200)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50" dir="rtl">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-8 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span className="text-sm">חזרה לדף הבית</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Product Image */}
          <div className="bg-white rounded-3xl shadow-xl p-6 flex items-center justify-center">
            <div className="relative w-full max-w-[450px] aspect-square">
              <Image
                src={PRODUCT_IMAGE}
                alt={PRODUCT_NAME}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Product Details + Size Selection */}
          <div className="space-y-8">
            {/* Title & Price */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mb-3">
                עם ישראל חי וקיים
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                {PRODUCT_NAME}
              </h1>
              <p className="text-gray-600 text-lg mb-4">
                חולצה איכותית עם הדפס &quot;עם ישראל חי וקיים&quot; — שאגת האריה.
                <br />
                10% מההכנסות נתרם לעמותת &quot;האגודה למען החייל&quot;.
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900">₪{PRODUCT_PRICE}</span>
                <span className="text-gray-400 text-lg">ליחידה</span>
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">בחרו מידות וכמויות</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STANDARD_SIZES.map((size) => {
                  const quantity = getQuantity(size.id)
                  return (
                    <div
                      key={size.id}
                      className={`p-4 border-2 rounded-xl flex flex-col items-center justify-center space-y-3 transition-all ${
                        quantity > 0
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <span className="font-semibold text-lg">{size.name}</span>
                        {size.surcharge > 0 && (
                          <div className="text-xs text-orange-600 font-medium">+₪{size.surcharge}</div>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={quantity || ''}
                        onChange={(e) => setQuantity(size.id, parseInt(e.target.value) || 0)}
                        className="w-16 text-center font-bold h-9 rounded-md border border-gray-300 bg-transparent px-2 py-1 text-base shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          type="button"
                          disabled={quantity === 0}
                          onClick={() => setQuantity(size.id, quantity - 1)}
                          className="h-8 w-8"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          type="button"
                          onClick={() => setQuantity(size.id, quantity + 1)}
                          className="h-8 w-8"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary & Add to Cart */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 space-y-4">
              {totalQuantity > 0 ? (
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-600">{totalQuantity} יח&apos; × ₪{PRODUCT_PRICE}</span>
                  <span className="text-2xl font-bold text-gray-900">
                    ₪{totalQuantity * PRODUCT_PRICE}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-red-500">יש לבחור לפחות פריט אחד</p>
              )}

              <Button
                onClick={handleAddToCart}
                disabled={totalQuantity === 0 || added}
                className={`w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all ${
                  added
                    ? 'bg-green-500 hover:bg-green-500'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                } text-white`}
              >
                {added ? (
                  'נוסף לעגלה!'
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 ml-2" />
                    הוסף לעגלה
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-400">
                מוצר זה אינו כולל הנחות או קופונים
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
