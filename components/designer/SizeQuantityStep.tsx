import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { STANDARD_SIZES, QUANTITY_DISCOUNT } from '@/lib/constants'
import type { ProductConfig, SizeQuantity } from '@/lib/types'
import { Minus, Plus } from 'lucide-react'

interface SizeQuantityStepProps {
  sizes: SizeQuantity[]
  onUpdate: (sizes: SizeQuantity[]) => void
  onBack: () => void
  onAddToCart: () => void
  config: ProductConfig
}

export default function SizeQuantityStep({
  sizes,
  onUpdate,
  onBack,
  onAddToCart,
  config,
}: SizeQuantityStepProps) {
  const [showDiscountPopup, setShowDiscountPopup] = useState(false)

  useEffect(() => {
    // Show discount popup on entry
    setShowDiscountPopup(true)
    const timer = setTimeout(() => setShowDiscountPopup(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  const updateQuantity = (sizeId: string, delta: number) => {
    const existing = sizes.find(s => s.size === sizeId)

    if (existing) {
      const newQuantity = Math.max(0, existing.quantity + delta)
      if (newQuantity === 0) {
        onUpdate(sizes.filter(s => s.size !== sizeId))
      } else {
        onUpdate(sizes.map(s =>
          s.size === sizeId ? { ...s, quantity: newQuantity } : s
        ))
      }
    } else if (delta > 0) {
      onUpdate([...sizes, { size: sizeId, quantity: 1 }])
    }
  }

  const getQuantity = (sizeId: string) => {
    return sizes.find(s => s.size === sizeId)?.quantity || 0
  }

  const totalQuantity = sizes.reduce((sum, s) => sum + s.quantity, 0)
  const hasMinQuantity = totalQuantity > 0
  const hasDiscount = totalQuantity >= QUANTITY_DISCOUNT.minQuantity

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">שלב 4: בחרו מידות וכמויות</h2>

      {/* Discount Popup */}
      {showDiscountPopup && (
        <div className="bg-primary/10 border-2 border-primary rounded-lg p-4 mb-6 animate-pulse">
          <p className="text-center font-bold text-primary text-lg">
            🎉 הזמינו {QUANTITY_DISCOUNT.minQuantity} חולצות או יותר וקבלו {QUANTITY_DISCOUNT.discountPercent}% הנחה!
          </p>
        </div>
      )}

      {/* Total Quantity Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="font-bold">סה"כ יחידות:</span>
          <span className={`text-2xl font-bold ${hasDiscount ? 'text-green-600' : ''}`}>
            {totalQuantity}
          </span>
        </div>
        {hasDiscount && (
          <p className="text-sm text-green-600 font-bold mt-2">
            ✓ זכאי להנחת כמות של {QUANTITY_DISCOUNT.discountPercent}%!
          </p>
        )}
      </div>

      {/* Size Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STANDARD_SIZES.map((size) => {
          const quantity = getQuantity(size.id)
          const isSelected = quantity > 0

          return (
            <div
              key={size.id}
              className={`border-2 rounded-lg p-4 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center mb-3">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xl font-bold">{size.name}</span>
                  {size.surcharge > 0 && (
                    <span className="text-xs bg-primary text-white px-1 rounded">
                      +{size.surcharge}₪
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => updateQuantity(size.id, -1)}
                  disabled={quantity === 0}
                  className="h-8 w-8"
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <span className="text-xl font-bold w-12 text-center">
                  {quantity}
                </span>

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => updateQuantity(size.id, 1)}
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-between mt-8">
        <Button variant="outline" onClick={onBack}>
          חזור
        </Button>
        <Button
          onClick={onAddToCart}
          disabled={!hasMinQuantity}
          className="btn-cta text-lg px-8"
        >
          הוסף לעגלה 🛒
        </Button>
      </div>

      {!hasMinQuantity && (
        <p className="text-sm text-red-600 mt-4 text-center font-bold">
          * עליכם לבחור לפחות יחידה אחת
        </p>
      )}
    </div>
  )
}
