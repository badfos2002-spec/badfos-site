'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { CartItem, Shipping } from '@/lib/types'
import { formatPrice, calculateOrderTotal } from '@/lib/pricing'

interface OrderSummaryProps {
  items: CartItem[]
  shipping: Shipping | null
  couponCode: string
  onCouponChange: (code: string) => void
  onCheckout: () => void
  loading: boolean
  canCheckout: boolean
}

export default function OrderSummary({
  items,
  shipping,
  couponCode,
  onCouponChange,
  onCheckout,
  loading,
  canCheckout,
}: OrderSummaryProps) {
  const shippingMethod = shipping?.method || 'delivery'
  const orderTotal = calculateOrderTotal(items, shippingMethod, 0)

  return (
    <Card className="border-primary/20 border-2">
      <CardHeader>
        <CardTitle>סיכום הזמנה</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items Summary */}
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{index + 1}. {item.productType} ×{item.totalQuantity}</span>
              <span className="font-bold">{formatPrice(item.totalPrice)}</span>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between">
            <span>סכום ביניים:</span>
            <span className="font-bold">{formatPrice(orderTotal.subtotal)}</span>
          </div>

          {orderTotal.quantityDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>הנחת כמות:</span>
              <span className="font-bold">-{formatPrice(orderTotal.quantityDiscount)}</span>
            </div>
          )}

          {shipping && (
            <div className="flex justify-between">
              <span>משלוח:</span>
              <span className="font-bold">
                {shipping.cost === 0 ? 'חינם!' : formatPrice(shipping.cost)}
              </span>
            </div>
          )}
        </div>

        {/* Coupon Code */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-2">קוד קופון</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => onCouponChange(e.target.value)}
              placeholder="הכנס קוד"
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <Button variant="outline" size="sm" disabled>
              החל
            </Button>
          </div>
        </div>

        {/* Total */}
        <div className="border-t pt-4">
          <div className="flex justify-between text-2xl font-bold mb-4">
            <span>סה"כ לתשלום:</span>
            <span className="text-primary">{formatPrice(orderTotal.total)}</span>
          </div>

          <Button
            onClick={onCheckout}
            disabled={!canCheckout || loading}
            className="w-full btn-cta text-lg h-14"
          >
            {loading ? 'מעבד...' : 'המשך לתשלום 💳'}
          </Button>

          <p className="text-xs text-center text-text-gray mt-3">
            כרגע התשלום מתבצע דרך WhatsApp
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
