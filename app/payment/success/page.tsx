'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'
import { ensureGtagLoaded, sendGoogleAdsPurchase, sendPurchaseEvent, sendMetaPurchaseEvent, setEnhancedConversionData } from '@/lib/tracking'

export default function PaymentSuccessPage() {
  const clearCart = useCart((state) => state.clearCart)
  const didProcess = useRef(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  useEffect(() => {
    if (didProcess.current) return
    didProcess.current = true
    clearCart()

    // Grab share URL before clearing sessionStorage
    const savedShareUrl = sessionStorage.getItem('badfos_share_url')
    if (savedShareUrl) setShareUrl(savedShareUrl)

    // Try sessionStorage first, fallback to cookie (survives cross-origin redirect from Grow)
    let orderDataStr = sessionStorage.getItem('badfos_pending_order')
    if (!orderDataStr) {
      const match = document.cookie.match(/(?:^|; )badfos_pending_order=([^;]+)/)
      if (match) {
        try { orderDataStr = decodeURIComponent(match[1]) } catch {}
      }
    }
    if (orderDataStr) {
      try {
        const { orderId, customer, items, total } = JSON.parse(orderDataStr)

        // Fallback: update to 'paid' via server API (in case webhook hasn't arrived yet)
        if (orderId && customer?.phone) {
          fetch('/api/payment/client-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, phone: customer.phone }),
          }).catch(console.error)
        }

        // Ensure gtag.js is loaded before firing conversions (don't wait for cookie consent)
        if (orderId) {
          ensureGtagLoaded().then(() => {
            // Set user data for Enhanced Conversions before firing conversion
            if (customer) {
              setEnhancedConversionData({
                email: customer.email,
                phone: customer.phone,
                firstName: customer.firstName,
                lastName: customer.lastName,
              })
            }
            sendGoogleAdsPurchase(total, orderId)
            sendPurchaseEvent(orderId, total, (items || []).map((item: any) => ({
              id: item.productType,
              name: item.productType,
              category: item.productType,
              price: item.pricePerUnit || 0,
              quantity: item.totalQuantity || 1,
            })))
            sendMetaPurchaseEvent(total, orderId)
          })
        }

        // Send admin notification email
        if (customer) {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'new_order',
              data: {
                orderId,
                customer,
                itemsCount: items?.length ?? 0,
                total,
              },
            }),
          }).catch(console.error)
        }

        // Send design mockup email if items have designs
        const itemsWithDesigns = (items || []).filter(
          (item: any) => item.designs && item.designs.length > 0
        )
        if (itemsWithDesigns.length > 0 && customer) {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'design_mockup',
              data: {
                customer,
                items: itemsWithDesigns.map((item: any) => ({
                  productType: item.productType,
                  color: item.color,
                  fabricType: item.fabricType,
                  designs: item.designs,
                  totalQuantity: item.totalQuantity,
                })),
              },
            }),
          }).catch(console.error)
        }
      } catch (e) {
        console.error('Failed to process success page data:', e)
      }
    }

    sessionStorage.removeItem('badfos_pending_order')
    // Clean up cookie too
    document.cookie = 'badfos_pending_order=; max-age=0; path=/'
    sessionStorage.removeItem('badfos_payment_cache')
    sessionStorage.removeItem('badfos_share_url')
  }, [clearCart])

  const handleShare = async () => {
    const url = shareUrl || 'https://badfos.co.il/designer'
    const text = shareUrl
      ? 'ראו את העיצוב שיצרתי ב-בדפוס!'
      : 'עצבתי חולצה ב-בדפוס! גם אתם יכולים'
    if (navigator.share) {
      try { await navigator.share({ title: 'בדפוס', text, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      alert('הקישור הועתק!')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-16" dir="rtl">
      <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-xl">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">התשלום בוצע בהצלחה!</h1>
        <p className="text-lg text-gray-600 mb-8">
          תודה על הזמנתך! נעדכן אותך במייל לגבי סטטוס ההזמנה.
        </p>
        <div className="space-y-3">
          <Button className="gradient-yellow text-white hover-lift w-full h-12" onClick={handleShare}>
            <Share2 className="w-5 h-5 ml-2" />
            שתף את העיצוב עם חברים
          </Button>
          <Link href="/home" className="block">
            <Button variant="outline" className="w-full h-12">חזור לדף הבית</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
