'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { STANDARD_SIZES } from '@/lib/constants'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Ruler, Eye, ShoppingCart } from 'lucide-react'
import type { SizeQuantity } from '@/lib/types'

const PRODUCT_NAME = 'חולצת שאגת הארי'
const PRODUCT_PRICE = 50
const PRODUCT_IMAGE = '/assets/lion-roar-shirt.png'

export default function LionRoarPage() {
  const router = useRouter()
  const { addItem } = useCart()
  const [sizes, setSizes] = useState<SizeQuantity[]>([])
  const [added, setAdded] = useState(false)

  const getQuantity = (sizeId: string) => sizes.find(s => s.size === sizeId)?.quantity || 0
  const totalQuantity = sizes.reduce((sum, s) => sum + s.quantity, 0)
  const totalPrice = sizes.reduce((sum, s) => {
    const sizeInfo = STANDARD_SIZES.find(sz => sz.id === s.size)
    const surcharge = sizeInfo?.surcharge || 0
    return sum + s.quantity * (PRODUCT_PRICE + surcharge)
  }, 0)

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
    <div className="bg-gray-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Product Info Header ── */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1e293b] mb-2">{PRODUCT_NAME} 🇮🇱</h1>
          <p className="text-gray-500 text-sm sm:text-base">
            &quot;עם ישראל חי וקיים&quot; — חולצה איכותית עם הדפס ייחודי
            <span className="mx-1">•</span>
            <strong className="text-blue-600">10% מההכנסות נתרם לעמותת &quot;האגודה למען החייל&quot;</strong>
          </p>
        </div>

        {/* ── Step Bar ── */}
        <div className="flex items-start w-full mb-8 px-2">
          {/* Step 1: מידות וכמויות */}
          <div className="flex items-start flex-1">
            <div className="flex flex-col items-center text-center flex-shrink-0 w-16">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                added ? 'bg-green-500 border-green-500 text-white' : 'bg-yellow-500 border-yellow-500 text-white'
              }`}>
                <span className="text-sm font-semibold">{added ? '✓' : '1'}</span>
              </div>
              <p className={`mt-2 text-xs sm:text-sm font-semibold ${added ? 'text-green-600' : 'text-yellow-600'}`}>
                מידות וכמויות
              </p>
            </div>
            <div className={`flex-1 h-1 mt-[19px] mx-1 sm:mx-2 transition-colors duration-300 ${added ? 'bg-green-400' : 'bg-gray-200'}`} />
          </div>
          {/* Step 2: הוסף לעגלה */}
          <div className="flex items-start flex-none">
            <div className="flex flex-col items-center text-center flex-shrink-0 w-16">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                added ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-500'
              }`}>
                <span className="text-sm font-semibold">{added ? '✓' : <ShoppingCart className="w-4 h-4" />}</span>
              </div>
              <p className={`mt-2 text-xs sm:text-sm font-semibold ${added ? 'text-green-600' : 'text-gray-500'}`}>
                הוסף לעגלה
              </p>
            </div>
          </div>
        </div>

        {/* ── Desktop Navigation Buttons (below step bar) ── */}
        <div className="hidden lg:flex justify-center items-center gap-3 mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/home')}
            className="flex items-center gap-2 px-6"
          >
            דף הבית
          </Button>
          <Button
            onClick={handleAddToCart}
            disabled={totalQuantity === 0 || added}
            className={`flex items-center gap-2 px-6 text-white ${
              added ? 'bg-green-500 hover:bg-green-500' : 'gradient-yellow'
            }`}
          >
            {added ? 'נוסף לעגלה ✓' : 'הוסף לעגלה 🛒'}
          </Button>
        </div>

        {/* ── MOBILE LAYOUT ── */}
        <div className="lg:hidden space-y-6 pb-8 overflow-x-hidden">
          {/* Step content card */}
          <div className="rounded-xl border bg-white border-yellow-200 shadow-sm">
            <div className="p-6">
              <div className="font-semibold leading-none tracking-tight flex items-center mb-6 text-[#1e293b]">
                <Ruler className="w-5 h-5 ml-2 text-yellow-500" />
                בחר מידות וכמויות
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {STANDARD_SIZES.map((size) => {
                  const quantity = getQuantity(size.id)
                  return (
                    <div
                      key={size.id}
                      className="p-2 sm:p-4 border rounded-lg flex flex-col items-center justify-center space-y-2 sm:space-y-3"
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
                        className="w-16 sm:w-20 text-center font-bold h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="flex items-center gap-1 sm:gap-2">
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
              {totalQuantity === 0 && (
                <p className="text-sm text-red-500 mt-4">יש לבחור לפחות פריט אחד כדי להמשיך.</p>
              )}
            </div>
          </div>

          {/* Price summary */}
          <div className="bg-white rounded-2xl border-2 border-[#fbbf24]/30 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-yellow-50 border-b border-[#fbbf24]/20">
              <h3 className="font-bold text-[#1e293b] text-sm">סיכום מחיר</h3>
            </div>
            <div className="p-4 space-y-2">
              <div className="space-y-1.5 pb-3 border-b border-gray-100 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>מחיר בסיס</span>
                  <span className="font-medium">₪{PRODUCT_PRICE}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">מחיר ליחידה</span>
                <span className="font-bold text-[#f59e0b]">₪{PRODUCT_PRICE}</span>
              </div>
              {totalQuantity > 0 ? (
                <>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>כמות</span>
                    <span className="font-medium">×{totalQuantity}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-[#1e293b]">סה&quot;כ</span>
                    <span className="text-2xl font-bold text-[#f59e0b]">₪{totalPrice}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400 text-center pt-1">בחר מידות לצפייה בסה&quot;כ</p>
              )}
              <p className="text-xs text-gray-400 text-center pt-1">* לא כולל משלוח</p>
            </div>
          </div>

          {/* Mockup preview — below content on mobile */}
          <div className="bg-white/95 pt-2 pb-4 -mx-4 px-4">
            <div className="relative mx-auto max-w-sm">
              <Image
                src={PRODUCT_IMAGE}
                alt={PRODUCT_NAME}
                width={0}
                height={0}
                sizes="100vw"
                className="w-full h-auto block"
                priority
              />
            </div>
          </div>

          {/* Mobile bottom nav */}
          <div className="bg-white border-t border-gray-200 p-4 shadow-sm flex justify-between items-center gap-3 rounded-lg border relative z-20">
            <Button
              variant="outline"
              onClick={() => router.push('/home')}
              className="flex-1 h-10"
            >
              דף הבית
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={totalQuantity === 0 || added}
              className={`flex-1 h-10 text-white ${
                added ? 'bg-green-500 hover:bg-green-500' : 'gradient-yellow'
              }`}
            >
              {added ? 'נוסף לעגלה ✓' : 'הוסף לעגלה 🛒'}
            </Button>
          </div>

        </div>

        {/* ── DESKTOP LAYOUT ── */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-12">

          {/* Left: step content + price summary */}
          <div className="lg:order-first space-y-6">
            <div className="rounded-xl border bg-white border-yellow-200 shadow-lg">
              <div className="p-6">
                <div className="font-semibold leading-none tracking-tight flex items-center mb-6 text-[#1e293b]">
                  <Ruler className="w-5 h-5 ml-2 text-yellow-500" />
                  בחר מידות וכמויות
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {STANDARD_SIZES.map((size) => {
                    const quantity = getQuantity(size.id)
                    return (
                      <div
                        key={size.id}
                        className="p-2 sm:p-4 border rounded-lg flex flex-col items-center justify-center space-y-2 sm:space-y-3"
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
                          className="w-16 sm:w-20 text-center font-bold h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="flex items-center gap-1 sm:gap-2">
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
                {totalQuantity === 0 && (
                  <p className="text-sm text-red-500 mt-4">יש לבחור לפחות פריט אחד כדי להמשיך.</p>
                )}
              </div>
            </div>

            {/* Price summary */}
            <div className="bg-white rounded-2xl border-2 border-[#fbbf24]/30 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-yellow-50 border-b border-[#fbbf24]/20">
                <h3 className="font-bold text-[#1e293b] text-sm">סיכום מחיר</h3>
              </div>
              <div className="p-4 space-y-2">
                <div className="space-y-1.5 pb-3 border-b border-gray-100 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>מחיר בסיס</span>
                    <span className="font-medium">₪{PRODUCT_PRICE}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">מחיר ליחידה</span>
                  <span className="font-bold text-[#f59e0b]">₪{PRODUCT_PRICE}</span>
                </div>
                {totalQuantity > 0 ? (
                  <>
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>כמות</span>
                      <span className="font-medium">×{totalQuantity}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                      <span className="font-bold text-[#1e293b]">סה&quot;כ</span>
                      <span className="text-2xl font-bold text-[#f59e0b]">₪{totalPrice}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 text-center pt-1">בחר מידות לצפייה בסה&quot;כ</p>
                )}
                <p className="text-xs text-gray-400 text-center pt-1">* לא כולל משלוח</p>
              </div>
            </div>

          </div>

          {/* Right: sticky preview */}
          <div className="lg:order-last sticky top-24 self-start">
            <div className="rounded-xl border bg-white shadow border-yellow-200 hover-lift">
              <div className="flex flex-col space-y-1.5 p-6">
                <div className="font-semibold leading-none tracking-tight flex items-center gap-2">
                  <Eye className="w-5 h-5 text-yellow-500" />
                  <span>תצוגה מקדימה</span>
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="relative mx-auto max-w-md">
                  <Image
                    src={PRODUCT_IMAGE}
                    alt={PRODUCT_NAME}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-full h-auto block"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
