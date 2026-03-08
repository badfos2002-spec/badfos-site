'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'
import { createOrder } from '@/lib/db'
import { sendGoogleAdsConversion, sendMetaPurchaseEvent } from '@/lib/tracking'

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

    // Create order in Firestore — only now, after payment succeeded
    const orderDataStr = sessionStorage.getItem('badfos_pending_order')
    if (orderDataStr) {
      try {
        const orderData = JSON.parse(orderDataStr)
        createOrder(orderData).then(orderId => {
          // Fire-and-forget: conversion events + emails
          sendGoogleAdsConversion(orderData.total, orderId)
          sendMetaPurchaseEvent(orderData.total, orderId)

          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'new_order',
              data: {
                orderId,
                customer: orderData.customer,
                itemsCount: orderData.items?.length ?? 0,
                total: orderData.total,
              },
            }),
          }).catch(console.error)

          // Send design mockup email if items have designs
          const itemsWithDesigns = (orderData.items || []).filter(
            (item: any) => item.designs && item.designs.length > 0
          )
          if (itemsWithDesigns.length > 0) {
            fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'design_mockup',
                data: {
                  customer: orderData.customer,
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
        }).catch(err => console.error('Failed to create order:', err))
      } catch (e) {
        console.error('Failed to parse order data:', e)
      }
    }

    sessionStorage.removeItem('badfos_pending_order')
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
          <Link href="/" className="block">
            <Button variant="outline" className="w-full h-12">חזור לדף הבית</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
