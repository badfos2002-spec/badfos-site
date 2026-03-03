'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Pencil } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import type { CartItem as CartItemType, DesignArea } from '@/lib/types'
import { formatPrice } from '@/lib/pricing'
import { tshirtMockups, tshirtMockupsBack, colorFallback, DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'

interface CartItemProps {
  item: CartItemType
}

function MockupView({ view, color, designs }: {
  view: 'front' | 'back'
  color: string
  designs: DesignArea[]
}) {
  const resolvedColor = colorFallback[color] || color
  const mockupSrc = view === 'front'
    ? (tshirtMockups[resolvedColor] || tshirtMockups['black'])
    : (tshirtMockupsBack[resolvedColor] || tshirtMockupsBack['black'])

  // Filter designs for this view
  const viewDesigns = designs.filter(d => {
    const overlay = DESIGN_AREA_OVERLAYS[d.area]
    return overlay && overlay.view === view
  })

  return (
    <div className="relative w-24 h-24 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
      {/* Mockup shirt image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mockupSrc}
        alt={view === 'front' ? 'קדימה' : 'אחורה'}
        className="w-full h-full object-contain"
      />
      {/* Design overlays */}
      {viewDesigns.map((design) => {
        const overlay = DESIGN_AREA_OVERLAYS[design.area]
        if (!overlay) return null
        return (
          <div
            key={design.area}
            className="absolute overflow-hidden"
            style={{
              ...overlay.style,
              position: 'absolute',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={design.imageUrl}
              alt={design.areaName}
              className="w-full h-full object-contain"
            />
          </div>
        )
      })}
    </div>
  )
}

export default function CartItem({ item }: CartItemProps) {
  const router = useRouter()
  const removeItem = useCart((state) => state.removeItem)
  const setEditingItem = useCart((state) => state.setEditingItem)

  const handleEdit = () => {
    setEditingItem(item.id)
    router.push(`/designer/${item.productType}`)
  }

  // Check which views have designs
  const hasFrontDesigns = item.designs.some(d => {
    const overlay = DESIGN_AREA_OVERLAYS[d.area]
    return overlay && overlay.view === 'front'
  })
  const hasBackDesigns = item.designs.some(d => {
    const overlay = DESIGN_AREA_OVERLAYS[d.area]
    return overlay && overlay.view === 'back'
  })

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Mockup Previews */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {item.designs.length > 0 ? (
              <>
                {hasFrontDesigns && (
                  <MockupView view="front" color={item.color} designs={item.designs} />
                )}
                {hasBackDesigns && (
                  <MockupView view="back" color={item.color} designs={item.designs} />
                )}
                {!hasFrontDesigns && !hasBackDesigns && (
                  <MockupView view="front" color={item.color} designs={[]} />
                )}
              </>
            ) : (
              <MockupView view="front" color={item.color} designs={[]} />
            )}
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-lg">
                  {{
                    tshirt: 'חולצה בעיצוב אישי',
                    sweatshirt: 'סווטשירט בעיצוב אישי',
                    buff: 'באף בעיצוב אישי',
                    cap: 'כובע בעיצוב אישי',
                  }[item.productType] ?? item.productType}
                </h3>
                <p className="text-sm text-text-gray">
                  {item.fabricType} • {item.color}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEdit}
                  className="text-gray-500 hover:text-yellow-600 hover:bg-yellow-50"
                  title="ערוך פריט"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
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
              <span className="text-xl font-bold text-black">
                {formatPrice(item.totalPrice)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
