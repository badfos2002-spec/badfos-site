'use client'

import { STANDARD_SIZES, BUFF_QUANTITIES } from '@/lib/constants'
import type { ProductConfig, SizeQuantity } from '@/lib/types'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SizeQuantityStepProps {
  sizes: SizeQuantity[]
  onUpdate: (sizes: SizeQuantity[]) => void
  config: ProductConfig
}

export default function SizeQuantityStep({ sizes, onUpdate, config }: SizeQuantityStepProps) {
  const isBuff = config.productType === 'buff'

  // ── Buff: quantity-only mode ──────────────────────────────────────────────
  if (isBuff) {
    const selectedQty = sizes[0]?.quantity ?? null

    return (
      <div>
        <p className="text-sm text-gray-500 mb-4">בחרו כמות באפים להזמנה:</p>
        <div className="grid grid-cols-2 gap-4">
          {BUFF_QUANTITIES.map(({ value, label }) => {
            const isSelected = selectedQty === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onUpdate([{ size: 'one-size', quantity: value }])}
                className={`py-6 rounded-xl border-2 text-center transition-all font-bold text-lg ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-yellow-300'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        {!selectedQty && (
          <p className="text-sm text-red-500 mt-4">יש לבחור כמות כדי להמשיך.</p>
        )}
      </div>
    )
  }

  // ── Default: size + quantity grid ─────────────────────────────────────────
  const getQuantity = (sizeId: string) => sizes.find(s => s.size === sizeId)?.quantity || 0
  const totalQuantity = sizes.reduce((sum, s) => sum + s.quantity, 0)

  const setQuantity = (sizeId: string, value: number) => {
    const clamped = Math.max(0, value)
    if (clamped === 0) {
      onUpdate(sizes.filter(s => s.size !== sizeId))
    } else {
      const existing = sizes.find(s => s.size === sizeId)
      if (existing) {
        onUpdate(sizes.map(s => s.size === sizeId ? { ...s, quantity: clamped } : s))
      } else {
        onUpdate([...sizes, { size: sizeId, quantity: clamped }])
      }
    }
  }

  const updateQuantity = (sizeId: string, delta: number) => {
    setQuantity(sizeId, getQuantity(sizeId) + delta)
  }

  return (
    <div>
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
                  onClick={() => updateQuantity(size.id, -1)}
                  className="h-8 w-8"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => updateQuantity(size.id, 1)}
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
  )
}
