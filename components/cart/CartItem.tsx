'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import type { CartItem as CartItemType } from '@/lib/types'
import { formatPrice } from '@/lib/pricing'

interface CartItemProps {
  item: CartItemType
}

export default function CartItem({ item }: CartItemProps) {
  const removeItem = useCart((state) => state.removeItem)

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Mockup Preview */}
          <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-4xl">👕</span>
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-lg">
                  {item.productType === 'tshirt' ? 'חולצה' : item.productType}
                </h3>
                <p className="text-sm text-text-gray">
                  {item.fabricType} • {item.color}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Design Areas */}
            {item.designs.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium">עיצובים:</p>
                <p className="text-sm text-text-gray">
                  {item.designs.map(d => d.areaName).join(', ')}
                </p>
              </div>
            )}

            {/* Sizes & Quantities */}
            <div className="mb-3">
              <p className="text-sm font-medium mb-1">מידות וכמויות:</p>
              <div className="flex flex-wrap gap-2">
                {item.sizes.map((size) => (
                  <span
                    key={size.size}
                    className="text-sm bg-gray-100 px-2 py-1 rounded"
                  >
                    {size.size}: {size.quantity}
                  </span>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-sm text-text-gray">
                {formatPrice(item.pricePerUnit)} × {item.totalQuantity}
              </span>
              <span className="text-xl font-bold text-primary">
                {formatPrice(item.totalPrice)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
