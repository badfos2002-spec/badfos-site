'use client'

import { useEffect } from 'react'
import { STANDARD_SIZES, KIDS_SIZES, BUFF_QUANTITIES } from '@/lib/constants'
import type { ProductConfig, SizeQuantity } from '@/lib/types'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AnnouncementBar from '@/components/common/AnnouncementBar'

interface SizeQuantityStepProps {
  sizes: SizeQuantity[]
  onUpdate: (sizes: SizeQuantity[]) => void
  config: ProductConfig
}

export default function SizeQuantityStep({ sizes, onUpdate, config }: SizeQuantityStepProps) {
  const isBuff = config.productType === 'buff'

  // Kid sizes (2–18): ONLY cotton t-shirts in white or black.
  const hasKidSizes =
    config.productType === 'tshirt' &&
    config.fabricType === 'cotton' &&
    (config.color === 'white' || config.color === 'black')

  // If the user picked kid sizes and then switched to a fabric/colour that
  // doesn't offer them, silently drop those rows so they can't be ordered.
  useEffect(() => {
    if (isBuff || hasKidSizes) return
    const kidIds = new Set<string>(KIDS_SIZES.map(k => k.id))
    if (sizes.some(s => kidIds.has(s.size))) {
      onUpdate(sizes.filter(s => !kidIds.has(s.size)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKidSizes, isBuff])

  // Dri-fit has no 4XL (supplier doesn't stock it). If the user picked 4XL on
  // another fabric and then switched to dri-fit, drop that row the same way.
  useEffect(() => {
    if (config.fabricType !== 'dri-fit') return
    if (sizes.some(s => s.size === '4XL')) {
      onUpdate(sizes.filter(s => s.size !== '4XL'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.fabricType])

  // ── Buff: quantity-only mode ──────────────────────────────────────────────
  if (isBuff) {
    const selectedQty = sizes[0]?.quantity ?? null

    return (
      <div>
        <AnnouncementBar placement="designer" />
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
          <p role="alert" className="text-sm text-red-500 mt-4">יש לבחור כמות כדי להמשיך.</p>
        )}
      </div>
    )
  }

  // ── Default: size + quantity grid ─────────────────────────────────────────
  // Oversized t-shirts: no XS, 3XL, or 4XL — sizes start from S
  // Dri-fit: no 4XL — the supplier doesn't stock it
  const isOversized = config.fabricType === 'oversized'
  const isDriFit = config.fabricType === 'dri-fit'
  const availableSizes = isOversized
    ? STANDARD_SIZES.filter(s => s.id !== 'XS' && s.id !== '3XL' && s.id !== '4XL')
    : isDriFit
      ? STANDARD_SIZES.filter(s => s.id !== '4XL')
      : STANDARD_SIZES

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

  const renderSizeCard = (size: { id: string; name: string; surcharge: number }) => {
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
          aria-label={`כמות למידה ${size.name}`}
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
            aria-label={`הפחתת כמות למידה ${size.name}`}
            className="h-8 w-8"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={() => updateQuantity(size.id, 1)}
            aria-label={`הוספת כמות למידה ${size.name}`}
            className="h-8 w-8"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <AnnouncementBar placement="designer" />
      {hasKidSizes && (
        <p className="text-sm font-bold text-gray-700 mb-3">מידות מבוגרים</p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {availableSizes.map(renderSizeCard)}
      </div>

      {hasKidSizes && (
        <>
          <p className="text-sm font-bold text-gray-700 mt-6 mb-3">מידות ילדים (2–18)</p>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-3 sm:gap-4">
            {KIDS_SIZES.map(renderSizeCard)}
          </div>
        </>
      )}

      {totalQuantity === 0 && (
        <p role="alert" className="text-sm text-red-500 mt-4">יש לבחור לפחות פריט אחד כדי להמשיך.</p>
      )}
    </div>
  )
}
