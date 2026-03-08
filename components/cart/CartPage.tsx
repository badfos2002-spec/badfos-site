'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import CartItem from './CartItem'
import ContactForm from './ContactForm'
import ShippingForm from './ShippingForm'
import OrderSummary from './OrderSummary'
import { ArrowRight, ShoppingBag, Check, Share2, Loader2, Package, Trash2 } from 'lucide-react'
import { createOrder, createSharedCart } from '@/lib/db'
import { uploadBase64Image, generateUniqueFileName } from '@/lib/storage'
import { sendGoogleAdsConversion, sendMetaPurchaseEvent } from '@/lib/tracking'
import { calculateOrderTotal } from '@/lib/pricing'
import type { CustomerInfo, Shipping } from '@/lib/types'

async function blobToBase64(blobUrl: string): Promise<string> {
  if (!blobUrl.startsWith('blob:')) return blobUrl
  const response = await fetch(blobUrl)
  const blob = await response.blob()
  if (blob.type === 'image/png') {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
  const img = new Image()
  img.src = blobUrl
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Image load failed'))
  })
  const MAX = 800
  const scale = Math.min(1, MAX / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.7)
}

/** Recursively strip undefined values — Firestore rejects them */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(stripUndefined) as T
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    ) as T
  }
  return obj
}

export default function CartPage() {
  const router = useRouter()
  const { items, packageItems, removePackage, clearCart } = useCart()
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [shipping, setShipping] = useState<Shipping | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [sharingAll, setSharingAll] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const checkoutInProgress = useRef(false)

  // Mark hydrated after first client-side render (Zustand persist loads synchronously)
  useEffect(() => { setHydrated(true) }, [])

  // Pre-upload cache: base64 hash → Firebase Storage URL
  const uploadCacheRef = useRef<Map<string, Promise<string>>>(new Map())
  const tempOrderIdRef = useRef(`order-${Date.now()}`)

  // Pre-fetch payment link cache
  const paymentCacheRef = useRef<{ promise: Promise<any>; amount: number; key: string } | null>(null)

  // Pre-upload design images in background while user fills contact/shipping
  useEffect(() => {
    if (items.length === 0) return
    const cache = uploadCacheRef.current
    const tempOrderId = tempOrderIdRef.current

    for (const item of items) {
      for (const d of item.designs) {
        if (d.imageUrl.startsWith('data:') && !cache.has(d.imageUrl)) {
          const uploadPromise = uploadBase64Image(
            d.imageUrl,
            tempOrderId,
            generateUniqueFileName(d.fileName || 'design.png')
          ).catch((err) => {
            console.warn('Pre-upload failed, will retry at checkout:', err)
            cache.delete(d.imageUrl)
            return ''
          })
          cache.set(d.imageUrl, uploadPromise)
        }
      }
    }
  }, [items])

  // Pre-fetch payment link as soon as customer info + shipping are ready
  useEffect(() => {
    if (!customerInfo || !shipping || (items.length === 0 && packageItems.length === 0)) return
    if (!/^05\d{8}$/.test(customerInfo.phone)) return

    const orderCalc = calculateOrderTotal(items, shipping.method as 'delivery' | 'pickup', couponDiscount)
    const packagesTotal = packageItems.reduce((sum, pkg) => sum + pkg.totalPrice, 0)
    const total = orderCalc.total + packagesTotal
    const cacheKey = `${customerInfo.phone}-${total}-${couponCode}`

    // Skip if already fetching same data
    if (paymentCacheRef.current?.key === cacheKey) return

    // Check sessionStorage for a cached payment URL (from a previous attempt)
    try {
      const cached = sessionStorage.getItem('badfos_payment_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.key === cacheKey && parsed.url) {
          paymentCacheRef.current = { promise: Promise.resolve({ url: parsed.url }), amount: total, key: cacheKey }
          return
        }
      }
    } catch {}

    const promise = fetch('/api/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: tempOrderIdRef.current,
        amount: total,
        name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        phone: customerInfo.phone,
        email: customerInfo.email,
        description: `הזמנה ${items.length + packageItems.length} פריטים - badfos.co.il`,
      }),
    }).then(r => r.json()).then(data => {
      // Cache the URL in sessionStorage for instant reuse
      if (data?.url) {
        try { sessionStorage.setItem('badfos_payment_cache', JSON.stringify({ key: cacheKey, url: data.url })) } catch {}
      }
      return data
    }).catch(() => null)

    paymentCacheRef.current = { promise, amount: total, key: cacheKey }
  }, [customerInfo, shipping, items, packageItems, couponDiscount, couponCode])

  const handleCheckout = async () => {
    if (checkoutInProgress.current) return
    if (!customerInfo || !shipping || (items.length === 0 && packageItems.length === 0)) {
      alert('נא למלא את כל הפרטים')
      return
    }

    if (!/^05\d{8}$/.test(customerInfo.phone)) {
      alert('נא להזין מספר פלאפון תקין (10 ספרות, מתחיל ב-05)')
      return
    }

    checkoutInProgress.current = true
    setLoading(true)
    setLoadingMessage('מכין את ההזמנה...')

    try {
      // Calculate correct totals (including quantity discount)
      const orderCalc = calculateOrderTotal(items, shipping.method as 'delivery' | 'pickup', couponDiscount)
      // Add package totals
      const packagesTotal = packageItems.reduce((sum, pkg) => sum + pkg.totalPrice, 0)
      orderCalc.subtotal += packagesTotal
      orderCalc.total += packagesTotal

      // Use pre-uploaded images from cache, fallback to upload now if needed
      const cache = uploadCacheRef.current
      const tempOrderId = tempOrderIdRef.current
      const itemsForOrder = await Promise.all(
        items.map(async (item) => ({
          productType: item.productType,
          fabricType: item.fabricType,
          color: item.color,
          sizes: item.sizes,
          designs: await Promise.all(
            item.designs.map(async (d) => {
              if (!d.imageUrl.startsWith('data:')) return d
              // Check pre-upload cache first
              const cached = cache.get(d.imageUrl)
              const url = cached ? await cached : ''
              return {
                ...d,
                imageUrl: url || await uploadBase64Image(d.imageUrl, tempOrderId, generateUniqueFileName(d.fileName || 'design.png')),
              }
            })
          ),
          pricePerUnit: item.pricePerUnit,
          totalQuantity: item.totalQuantity,
          totalPrice: item.totalPrice,
        }))
      )

      setLoadingMessage('יוצר לינק תשלום...')

      // Run Firestore order creation
      const orderPromise = createOrder(stripUndefined({
        status: 'pending_payment' as const,
        paymentId: tempOrderId,
        customer: customerInfo,
        shipping,
        items: itemsForOrder,
        ...(packageItems.length > 0 && {
          packages: packageItems.map(pkg => ({
            packageId: pkg.packageId,
            packageName: pkg.packageName,
            quantity: pkg.quantity,
            pricePerUnit: pkg.pricePerUnit,
            graphicDesignerCost: pkg.graphicDesignerCost,
            totalPrice: pkg.totalPrice,
          })),
        }),
        subtotal: orderCalc.subtotal,
        discount: couponDiscount + orderCalc.quantityDiscount,
        ...(couponCode && { couponCode }),
        total: orderCalc.total,
      }))

      // Use pre-fetched payment link if amount matches, otherwise create new
      let paymentPromise: Promise<any>
      const cached = paymentCacheRef.current
      if (cached && cached.amount === orderCalc.total) {
        paymentPromise = cached.promise
      } else {
        paymentPromise = fetch('/api/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: tempOrderId,
            amount: orderCalc.total,
            name: `${customerInfo.firstName} ${customerInfo.lastName}`,
            phone: customerInfo.phone,
            email: customerInfo.email,
            description: `הזמנה ${items.length + packageItems.length} פריטים - badfos.co.il`,
          }),
        }).then(r => r.json())
      }

      const [orderId, paymentData] = await Promise.all([orderPromise, paymentPromise])

      // Fire-and-forget: conversion events + emails
      sendGoogleAdsConversion(orderCalc.total, orderId)
      sendMetaPurchaseEvent(orderCalc.total, orderId)

      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_order',
          data: { orderId, customer: customerInfo, itemsCount: items.length, total: orderCalc.total },
        }),
      }).catch(console.error)

      const itemsWithDesigns = items.filter(item => item.designs.length > 0)
      if (itemsWithDesigns.length > 0) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'design_mockup',
            data: {
              customer: customerInfo,
              items: itemsWithDesigns.map(item => ({
                productType: item.productType,
                color: item.color,
                fabricType: item.fabricType,
                designs: item.designs,
                totalQuantity: item.totalQuantity,
              })),
            },
          }),
        }).catch(err => console.error('Failed to send mockup email:', err))
      }

      if (paymentData.url) {
        setLoadingMessage('מעביר לעמוד תשלום...')
        // Don't clearCart() here — success page handles it to avoid empty cart flash
        window.location.href = paymentData.url
        return
      } else {
        throw new Error(paymentData.error || 'No payment URL')
      }

    } catch (error: any) {
      console.error('Checkout error:', error?.message || error)
      alert(`אירעה שגיאה: ${error?.message || 'אנא נסו שוב.'}`)
      checkoutInProgress.current = false
      setLoading(false)
    }
  }

  const handleShare = async () => {
    const url = 'https://badfos.co.il/designer'
    const text = 'עצבתי חולצה ב-בדפוס! גם אתם יכולים'
    if (navigator.share) {
      try { await navigator.share({ title: 'בדפוס', text, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      alert('הקישור הועתק!')
    }
  }

  const handleShareAll = async () => {
    const itemsWithDesigns = items.filter(item => item.designs.length > 0)
    if (itemsWithDesigns.length === 0) return

    setSharingAll(true)
    try {
      const sharePrefix = `share-${Date.now()}`
      const sharedItems = await Promise.all(
        itemsWithDesigns.map(async (item, itemIdx) => {
          const base: Record<string, unknown> = {
            productType: item.productType,
            color: item.color,
            designs: await Promise.all(
              item.designs.map(async (d, dIdx) => {
                // Upload to Firebase Storage instead of storing base64 in Firestore
                const base64 = await blobToBase64(d.imageUrl)
                const url = await uploadBase64Image(
                  base64,
                  sharePrefix,
                  `item${itemIdx}-${d.area}-${dIdx}.png`
                )
                return {
                  area: d.area,
                  areaName: d.areaName,
                  imageBase64: url, // Storage URL, not base64
                }
              })
            ),
          }
          if (item.fabricType) base.fabricType = item.fabricType
          return base
        })
      )

      const shareId = await createSharedCart({ items: sharedItems as any })
      const shareUrl = `${window.location.origin}/share/cart/${shareId}`
      const shareText = `ראו ${sharedItems.length} עיצובים שיצרתי ב-בדפוס!\n${shareUrl}`
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      if (isMobile && navigator.share) {
        await navigator.share({ title: 'העיצובים שלי - בדפוס', text: shareText, url: shareUrl })
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl)
        } catch {
          const ta = document.createElement('textarea')
          ta.value = shareUrl
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.focus()
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
        alert('הקישור הועתק!')
        window.open(shareUrl, '_blank')
      }
    } catch (err: any) {
      console.error('Share all failed:', err)
      alert(`שגיאה בשיתוף: ${err?.message || err}`)
    } finally {
      setSharingAll(false)
    }
  }

  if (orderSuccess) {
    return (
      <div className="container-rtl py-16">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-xl">
          <Check className="w-24 h-24 text-green-500 mx-auto mb-6 animate-bounce" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">הזמנתך נקלטה בהצלחה!</h1>
          <p className="text-lg text-gray-700 mb-6">תודה על הזמנתך! נעדכן במייל את סטטוס הזמנתך</p>
          <div className="space-y-4">
            <Button className="gradient-yellow text-white hover-lift w-full" onClick={handleShare}>
              <Share2 className="w-5 h-5 ml-2" />
              שתף את העיצוב עם חברים
            </Button>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">חזור לדף הבית</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show loading while cart hydrates from localStorage
  if (!hydrated) {
    return (
      <div className="container-rtl py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    )
  }

  if (items.length === 0 && packageItems.length === 0) {
    return (
      <div className="container-rtl py-16">
        <div className="max-w-2xl mx-auto text-center">
          <ShoppingBag className="w-24 h-24 mx-auto text-gray-300 mb-6" />
          <h1 className="text-3xl font-bold mb-4">העגלה שלך ריקה</h1>
          <p className="text-text-gray mb-8">
            עדיין לא הוספת מוצרים לעגלה. התחל לעצב עכשיו!
          </p>
          <Link href="/designer">
            <Button size="lg" className="btn-cta drop-shadow-md">
              <ArrowRight className="ml-2 h-5 w-5 text-white drop-shadow" />
              <span className="text-white drop-shadow">התחלו לעצב</span>
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
    {loading && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4">
          <Loader2 className="w-14 h-14 text-yellow-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{loadingMessage || 'מעבד את ההזמנה שלך...'}</h2>
          <p className="text-gray-500 text-sm">אנא המתן, זה ייקח מספר שניות</p>
        </div>
      </div>
    )}
    <div className="container-rtl py-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">עגלת קניות</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cart Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">העיצובים שלי ({items.length})</h2>
              <div className="flex items-center gap-2">
                {items.filter(i => i.designs.length > 0).length >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareAll}
                    disabled={sharingAll}
                    className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    {sharingAll ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Share2 className="w-4 h-4 ml-1" />}
                    שתף את כל העיצובים
                  </Button>
                )}
                <Link href="/designer">
                  <Button variant="outline" size="sm">+ הוסף עיצוב חדש</Button>
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              {items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Package Items */}
          {packageItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">חבילות ({packageItems.length})</h2>
                <Link href="/packages">
                  <Button variant="outline">+ הוסף חבילה</Button>
                </Link>
              </div>
              <div className="space-y-4">
                {packageItems.map((pkg) => (
                  <div key={pkg.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-yellow-50 flex items-center justify-center">
                          <Package className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{pkg.packageName}</h3>
                          <p className="text-sm text-gray-500">{pkg.quantity} חולצות × ₪{pkg.pricePerUnit}</p>
                          {pkg.graphicDesignerCost > 0 && (
                            <p className="text-xs text-gray-400">+ גרפיקאי ₪{pkg.graphicDesignerCost}</p>
                          )}
                          {pkg.graphicDesignerCost === 0 && (
                            <p className="text-xs text-green-600">גרפיקאי חינם</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg">₪{pkg.totalPrice}</span>
                        <button
                          onClick={() => removePackage(pkg.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              packageItems={packageItems}
              shipping={shipping}
              couponCode={couponCode}
              onCouponChange={setCouponCode}
              onDiscountApplied={(discount, code) => { setCouponDiscount(discount); if (code) setCouponCode(code) }}
              onCheckout={handleCheckout}
              loading={loading}
              canCheckout={!!customerInfo && !!shipping && (items.length > 0 || packageItems.length > 0)}
            />
          </div>
        </div>
      </div>
    </div>
    </>
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
