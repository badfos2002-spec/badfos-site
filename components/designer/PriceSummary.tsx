import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProductConfig } from '@/lib/types'
import {
  calculateItemPrice,
  calculateTotalQuantity,
  formatPrice,
  getPriceBreakdown,
} from '@/lib/pricing'

interface PriceSummaryProps {
  config: ProductConfig
}

export default function PriceSummary({ config }: PriceSummaryProps) {
  const { designs, sizes } = config

  if (!designs || !sizes || sizes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">סיכום מחיר</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-text-gray text-sm">
            המחיר יוצג לאחר בחירת כל הפרמטרים
          </p>
        </CardContent>
      </Card>
    )
  }

  const breakdown = getPriceBreakdown(config)
  const totalQuantity = calculateTotalQuantity(sizes)
  const pricePerUnit = calculateItemPrice(config)
  const totalPrice = pricePerUnit * totalQuantity

  return (
    <Card className="border-primary/20 border-2">
      <CardHeader>
        <CardTitle className="text-center">סיכום מחיר</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Breakdown */}
        <div className="space-y-2 pb-3 border-b">
          <div className="flex justify-between text-sm">
            <span>מחיר בסיס:</span>
            <span className="font-bold">{formatPrice(breakdown.basePrice)}</span>
          </div>

          {breakdown.fabricSurcharge > 0 && (
            <div className="flex justify-between text-sm">
              <span>תוספת בד:</span>
              <span className="font-bold">+{formatPrice(breakdown.fabricSurcharge)}</span>
            </div>
          )}

          {breakdown.designAreaPrices > 0 && (
            <div className="flex justify-between text-sm">
              <span>עיצובים ({designs.length}):</span>
              <span className="font-bold">+{formatPrice(breakdown.designAreaPrices)}</span>
            </div>
          )}

          {breakdown.sizeSurcharge > 0 && (
            <div className="flex justify-between text-sm">
              <span>תוספת מידה:</span>
              <span className="font-bold">+{formatPrice(breakdown.sizeSurcharge)}</span>
            </div>
          )}
        </div>

        {/* Price Per Unit */}
        <div className="flex justify-between text-lg font-bold">
          <span>מחיר ליחידה:</span>
          <span className="text-primary">{formatPrice(pricePerUnit)}</span>
        </div>

        {/* Total Quantity */}
        <div className="flex justify-between">
          <span>כמות:</span>
          <span className="font-bold">×{totalQuantity}</span>
        </div>

        {/* Total Price */}
        <div className="pt-3 border-t">
          <div className="flex justify-between text-2xl font-bold">
            <span>סה"כ:</span>
            <span className="text-primary">{formatPrice(totalPrice)}</span>
          </div>
        </div>

        <p className="text-xs text-center text-text-gray mt-4">
          * לא כולל משלוח
        </p>
      </CardContent>
    </Card>
  )
}
