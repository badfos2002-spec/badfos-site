import type { ProductConfig } from '@/lib/types'
import {
  calculateItemPrice,
  calculateTotalQuantity,
  formatPrice,
  getPriceBreakdown,
} from '@/lib/pricing'
import { QUANTITY_DISCOUNT } from '@/lib/constants'

interface PriceSummaryProps {
  config: ProductConfig
}

export default function PriceSummary({ config }: PriceSummaryProps) {
  const { designs, sizes } = config

  const breakdown = getPriceBreakdown(config)
  const pricePerUnit = calculateItemPrice(config)
  const totalQuantity = calculateTotalQuantity(sizes || [])
  const subtotal = pricePerUnit * totalQuantity
  const hasDiscount = totalQuantity >= QUANTITY_DISCOUNT.minQuantity
  const discount = hasDiscount ? subtotal * (QUANTITY_DISCOUNT.discountPercent / 100) : 0
  const totalPrice = subtotal - discount

  return (
    <div className="bg-white rounded-2xl border-2 border-[#fbbf24]/30 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-yellow-50 border-b border-[#fbbf24]/20">
        <h3 className="font-bold text-[#1e293b] text-sm">סיכום מחיר</h3>
      </div>

      <div className="p-4 space-y-2">
        {/* Breakdown rows */}
        <div className="space-y-1.5 pb-3 border-b border-gray-100 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>מחיר בסיס</span>
            <span className="font-medium">{formatPrice(breakdown.basePrice)}</span>
          </div>
          {breakdown.fabricSurcharge > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>תוספת בד</span>
              <span className="font-medium">+{formatPrice(breakdown.fabricSurcharge)}</span>
            </div>
          )}
          {breakdown.designAreaPrices > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>עיצובים ({(designs || []).length})</span>
              <span className="font-medium">+{formatPrice(breakdown.designAreaPrices)}</span>
            </div>
          )}
          {breakdown.sizeSurcharge > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>תוספת מידה</span>
              <span className="font-medium">+{formatPrice(breakdown.sizeSurcharge)}</span>
            </div>
          )}
        </div>

        {/* Per unit price — always visible */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">מחיר ליחידה</span>
          <span className="font-bold text-[#f59e0b]">{formatPrice(pricePerUnit)}</span>
        </div>

        {/* Total section — only when quantities entered */}
        {totalQuantity > 0 ? (
          <>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>כמות</span>
              <span className="font-medium">×{totalQuantity}</span>
            </div>
            {hasDiscount && (
              <div className="flex justify-between items-center text-sm text-green-600">
                <span>הנחה ({QUANTITY_DISCOUNT.discountPercent}%)</span>
                <span className="font-medium">-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-[#1e293b]">סה&quot;כ</span>
              <span className="text-2xl font-bold text-[#f59e0b]">{formatPrice(totalPrice)}</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-400 text-center pt-1">בחר מידות לצפייה בסה&quot;כ</p>
        )}

        <p className="text-xs text-gray-400 text-center pt-1">* לא כולל משלוח</p>
      </div>
    </div>
  )
}
