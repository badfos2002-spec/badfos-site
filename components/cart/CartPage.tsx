'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import CartItem from './CartItem'
import ContactForm from './ContactForm'
import ShippingForm from './ShippingForm'
import OrderSummary from './OrderSummary'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { createOrder } from '@/lib/db'
import type { CustomerInfo, Shipping } from '@/lib/types'

export default function CartPage() {
  const router = useRouter()
  const { items, clearCart } = useCart()
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [shipping, setShipping] = useState<Shipping | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    if (!customerInfo || !shipping || items.length === 0) {
      alert('נא למלא את כל הפרטים')
      return
    }

    setLoading(true)

    try {
      // Create order
      const orderId = await createOrder({
        status: 'pending_payment',
        customer: customerInfo,
        shipping,
        items: items.map(item => ({
          productType: item.productType,
          fabricType: item.fabricType,
          color: item.color,
          sizes: item.sizes,
          designs: item.designs,
          pricePerUnit: item.pricePerUnit,
          totalQuantity: item.totalQuantity,
          totalPrice: item.totalPrice,
        })),
        subtotal: items.reduce((sum, item) => sum + item.totalPrice, 0),
        discount: 0,
        couponCode: couponCode || undefined,
        total: items.reduce((sum, item) => sum + item.totalPrice, 0) + shipping.cost,
      })

      // Generate WhatsApp message
      const message = generateWhatsAppMessage(items, customerInfo, shipping)
      const whatsappUrl = `https://wa.me/5507794277?text=${encodeURIComponent(message)}`

      // Clear cart and redirect
      clearCart()
      window.open(whatsappUrl, '_blank')
      router.push('/')

    } catch (error) {
      console.error('Error creating order:', error)
      alert('אירעה שגיאה. אנא נסו שוב.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="container-rtl py-16">
        <div className="max-w-2xl mx-auto text-center">
          <ShoppingBag className="w-24 h-24 mx-auto text-gray-300 mb-6" />
          <h1 className="text-3xl font-bold mb-4">העגלה שלך ריקה</h1>
          <p className="text-text-gray mb-8">
            עדיין לא הוספת מוצרים לעגלה. התחל לעצב עכשיו!
          </p>
          <Link href="/designer">
            <Button size="lg" className="btn-cta">
              עצב חולצה
              <ArrowRight className="mr-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-rtl py-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">עגלת קניות</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cart Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">העיצובים שלי ({items.length})</h2>
              <Link href="/designer">
                <Button variant="outline">+ הוסף עיצוב חדש</Button>
              </Link>
            </div>
            <div className="space-y-4">
              {items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Customer Info */}
          <ContactForm onSubmit={setCustomerInfo} />

          {/* Shipping */}
          <ShippingForm onSubmit={setShipping} />
        </div>

        {/* Sidebar - Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <OrderSummary
              items={items}
              shipping={shipping}
              couponCode={couponCode}
              onCouponChange={setCouponCode}
              onCheckout={handleCheckout}
              loading={loading}
              canCheckout={!!customerInfo && !!shipping}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function generateWhatsAppMessage(items: any[], customer: CustomerInfo, shipping: Shipping): string {
  let message = `היי, אני רוצה להזמין:\n\n`

  items.forEach((item, index) => {
    message += `${index + 1}. ${item.productType} - ${item.color}\n`
    message += `   מידות: ${item.sizes.map((s: any) => `${s.size}(${s.quantity})`).join(', ')}\n`
    message += `   סה"כ: ₪${item.totalPrice}\n\n`
  })

  message += `פרטי משלוח:\n`
  message += shipping.method === 'delivery'
    ? `משלוח ל: ${shipping.address?.street} ${shipping.address?.number}, ${shipping.address?.city}\n`
    : `איסוף עצמי מראשון לציון\n`

  message += `\nפרטי קשר:\n`
  message += `${customer.firstName} ${customer.lastName}\n`
  message += `${customer.phone}\n`
  message += `${customer.email}\n`

  return message
}
