'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { CartItem, Shipping, Discount, PackageCartItem } from '@/lib/types'
import { formatPrice, calculateOrderTotal } from '@/lib/pricing'
import { getActiveDiscounts } from '@/lib/db'
import { CheckCircle, X, Loader2 } from 'lucide-react'

interface OrderSummaryProps {
  items: CartItem[]
  packageItems?: PackageCartItem[]
  shipping: Shipping | null
  couponCode: string
  customerPhone?: string
  onCouponChange: (code: string) => void
  onDiscountApplied: (discount: number, code: string) => void
  onCheckout: () => void
  loading: boolean
  canCheckout: boolean
  paymentReady?: boolean
}

const DEFAULT_COUPON_ERROR = 'קוד קופון לא תקין או פג תוקף'

export default function OrderSummary({
  items,
  packageItems = [],
  shipping,
  couponCode,
  customerPhone,
  onCouponChange,
  onDiscountApplied,
  onCheckout,
  loading,
  canCheckout,
  paymentReady = false,
}: OrderSummaryProps) {
  const [applying, setApplying] = useState(false)
  const [couponStatus, setCouponStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [couponError, setCouponError] = useState(DEFAULT_COUPON_ERROR)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [activeDiscounts, setActiveDiscounts] = useState<Discount[]>([])

  useEffect(() => {
    getActiveDiscounts().then(setActiveDiscounts).catch(console.error)
  }, [])

  // If CartPage strips the coupon (e.g. personal coupon rejected at checkout),
  // the couponCode prop becomes empty — reset local state so the green banner
  // and discounted total disappear. Never fires during a normal apply, where
  // couponCode is non-empty.
  useEffect(() => {
    if (couponStatus === 'valid' && !couponCode) {
      setCouponStatus('idle')
      setCouponDiscount(0)
      setCouponError(DEFAULT_COUPON_ERROR)
    }
  }, [couponCode, couponStatus])

  // Compute quantity discount from Firestore rules (fallback to hardcoded if none)
  // Exclude noDiscount items (special products) from discount calculations
  const discountableItems = items.filter(item => !item.noDiscount)
  const discountableQuantity = discountableItems.reduce((sum, item) => sum + item.totalQuantity, 0)
  const discountableSubtotal = discountableItems.reduce((sum, item) => sum + item.totalPrice, 0)
  const totalQuantity = items.reduce((sum, item) => sum + item.totalQuantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
  const packagesTotal = packageItems.reduce((sum, pkg) => sum + pkg.totalPrice, 0)
  const firestoreQuantityDiscount = activeDiscounts.length > 0
    ? (() => {
        const match = activeDiscounts
          .filter(d => d.type === 'quantity' && discountableQuantity >= d.minQuantity)
          .sort((a, b) => b.discountPercent - a.discountPercent)[0]
        return match ? Math.round(discountableSubtotal * match.discountPercent / 100) : 0
      })()
    : undefined // undefined = use hardcoded fallback in calculateOrderTotal

  // Use 'pickup' (₪0) when shipping not yet selected, to avoid phantom shipping cost in total
  const shippingMethod = shipping?.method || 'pickup'
  // Express surcharge — pickup only, flat fee, never discounted
  const expressCost = shipping?.method === 'pickup' && shipping.express ? (shipping.expressCost ?? 50) : 0
  const orderTotal = calculateOrderTotal(discountableItems, shippingMethod, couponDiscount, firestoreQuantityDiscount, expressCost)
  // Add back non-discountable items to the totals
  const noDiscountTotal = items.filter(i => i.noDiscount).reduce((sum, item) => sum + item.totalPrice, 0)
  orderTotal.subtotal += noDiscountTotal
  orderTotal.total += noDiscountTotal
  orderTotal.totalQuantity = totalQuantity
  // Include packages in totals
  orderTotal.subtotal += packagesTotal
  orderTotal.total += packagesTotal

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setApplying(true)
    setCouponStatus('idle')
    try {
      // Coupon validation runs server-side (admin SDK) — the browser no longer
      // reads the coupons collection. The endpoint returns only this coupon's
      // result and never leaks other codes or the personal restrictedPhone.
      const res = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim().toUpperCase(), phone: customerPhone || '' }),
      })
      const data = await res.json()
      if (data?.valid) {
        const itemsSubtotal = items.filter(i => !i.noDiscount).reduce((sum, item) => sum + item.totalPrice, 0)
        const pkgSubtotal = packageItems.reduce((sum, pkg) => sum + pkg.totalPrice, 0)
        const discount = Math.round((itemsSubtotal + pkgSubtotal) * data.discountPercent / 100)
        setCouponDiscount(discount)
        setCouponStatus('valid')
        onDiscountApplied(discount, couponCode.trim().toUpperCase())
      } else {
        setCouponStatus('invalid')
        setCouponError(
          data?.reason === 'personal_needs_phone'
            ? 'קופון אישי — נא למלא קודם את מספר הטלפון בפרטי ההזמנה ואז להזין את הקופון'
            : data?.reason === 'personal_wrong_phone'
            ? 'הקופון הזה אישי ואינו תקף למספר הטלפון שהוזן'
            : DEFAULT_COUPON_ERROR
        )
        setCouponDiscount(0)
        onDiscountApplied(0, '')
      }
    } catch {
      setCouponStatus('invalid')
      setCouponError(DEFAULT_COUPON_ERROR)
    } finally {
      setApplying(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponStatus('idle')
    setCouponDiscount(0)
    onCouponChange('')
    onDiscountApplied(0, '')
  }

  return (
    <Card className="border-primary/20 border-2">
      <CardHeader>
        <CardTitle>סיכום הזמנה</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items Summary */}
        <div className="space-y-2">
          {items.map((item, index) => {
            const productLabel: Record<string, string> = {
              tshirt: 'חולצה בעיצוב אישי',
              sweatshirt: 'סווטשירט בעיצוב אישי',
              buff: 'באף בעיצוב אישי',
              cap: 'כובע בעיצוב אישי',
            }
            const label = item.specialProductName || productLabel[item.productType] || item.productType
            return (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{index + 1}. {label} ×{item.totalQuantity}</span>
                <span className="font-bold text-black">{formatPrice(item.totalPrice)}</span>
              </div>
            )
          })}
          {packageItems.map((pkg) => (
            <div key={pkg.id} className="flex justify-between text-sm">
              <span>חבילה: {pkg.packageName} ×{pkg.quantity}</span>
              <span className="font-bold text-black">{formatPrice(pkg.totalPrice)}</span>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between">
            <span>סכום ביניים:</span>
            <span className="font-bold text-black">{formatPrice(orderTotal.subtotal)}</span>
          </div>

          {orderTotal.quantityDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>הנחת כמות:</span>
              <span className="font-bold">-{formatPrice(orderTotal.quantityDiscount)}</span>
            </div>
          )}

          {couponDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>הנחת קופון:</span>
              <span className="font-bold">-{formatPrice(couponDiscount)}</span>
            </div>
          )}

          {shipping ? (
            <div className="flex justify-between">
              <span>{shipping.method === 'pickup' ? 'איסוף עצמי:' : 'משלוח:'}</span>
              <span className="font-bold text-black">{shipping.method === 'pickup' ? 'חינם' : formatPrice(shipping.cost)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-gray-400 text-sm">
              <span>משלוח:</span>
              <span>ייקבע בהמשך</span>
            </div>
          )}

          {expressCost > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>אקספרס ⚡:</span>
              <span className="font-bold">{formatPrice(expressCost)}</span>
            </div>
          )}
        </div>

        {/* Coupon Code */}
        <div className="border-t pt-4">
          <label htmlFor="coupon-code" className="block text-sm font-medium mb-2">קוד קופון</label>
          {couponStatus === 'valid' ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-sm text-green-700 font-medium flex-1">{couponCode} — הנחה של {formatPrice(couponDiscount)}</span>
              <button onClick={handleRemoveCoupon} aria-label="הסרת קופון" className="text-gray-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                id="coupon-code"
                type="text"
                value={couponCode}
                onChange={(e) => { onCouponChange(e.target.value); setCouponStatus('idle') }}
                placeholder="הכנס קוד"
                aria-invalid={couponStatus === 'invalid'}
                aria-describedby={couponStatus === 'invalid' ? 'coupon-error' : undefined}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyCoupon}
                disabled={applying || !couponCode.trim()}
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'החל'}
              </Button>
            </div>
          )}
          {couponStatus === 'invalid' && (
            <p id="coupon-error" role="alert" className="text-xs text-red-500 mt-1">{couponError}</p>
          )}
        </div>

        {/* Total */}
        <div className="border-t pt-4">
          <div className="flex justify-between text-2xl font-bold mb-4">
            <span>סה"כ לתשלום:</span>
            <span className="text-black">{formatPrice(orderTotal.total)}</span>
          </div>

          {/* Terms acceptance */}
          <label className="flex items-start gap-3 cursor-pointer mb-4 select-none">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-4 h-4 accent-yellow-500 shrink-0"
            />
            <span className="text-sm text-gray-600 leading-snug">
              אני מאשר/ת את{' '}
              <Link href="/privacy" target="_blank" className="text-yellow-600 underline hover:text-yellow-700">
                מדיניות הפרטיות
              </Link>
              {' '}ו
              <Link href="/terms" target="_blank" className="text-yellow-600 underline hover:text-yellow-700">
                תקנון האתר
              </Link>
            </span>
          </label>

          <Button
            onClick={onCheckout}
            disabled={!canCheckout || loading || !acceptedTerms}
            className="w-full btn-cta text-lg h-14"
          >
            {loading ? 'מעבד...' : 'המשך לתשלום 💳'}
          </Button>

          <p className="text-xs text-center text-text-gray mt-3 flex items-center justify-center gap-1.5">
            {canCheckout && acceptedTerms && paymentReady && (
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
            <span>תשלום מאובטח בכרטיס אשראי</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
