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
import { createSharedCart, createOrder, getOrdersPaused } from '@/lib/db'
import { uploadBase64Image, uploadDesignFile, generateUniqueFileName } from '@/lib/storage'
import { preparePrintDataUrl, printUploadErrorMessage, isDesignUploadError } from '@/lib/print-image'
import { calculateOrderTotal } from '@/lib/pricing'
import { EXPRESS_PICKUP, CONTACT_INFO } from '@/lib/constants'
import type { CustomerInfo, Shipping } from '@/lib/types'
import { isAuthorizedRedirect } from '@/lib/url-validation'
import { getGclid } from '@/lib/tracking'
import { updateOrderStatus } from '@/lib/db'
import { resolveCartRevisit, PENDING_ORDER_STALE_MS, CREATE_FRESH_ORDER_REASONS } from '@/lib/pending-order'

async function blobToBase64(blobUrl: string): Promise<string> {
  // All designs are now base64 from upload time, so this is a passthrough
  if (!blobUrl.startsWith('blob:')) return blobUrl

  // Fallback for any legacy blob URLs: use XHR (Safari-compatible)
  const blob = await new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', blobUrl, true)
    xhr.responseType = 'blob'
    xhr.onload = () => resolve(xhr.response as Blob)
    xhr.onerror = () => reject(new Error('Failed to read blob URL'))
    xhr.send()
  })
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
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

/** Owner's "pause orders" switch — customer-facing copy (single source) */
const ORDERS_PAUSED_TITLE = 'לא מקבלים הזמנות כרגע'
const ORDERS_PAUSED_TEXT = 'אנחנו בהפסקה קצרה ולא מקבלים הזמנות חדשות ולא מבצעים חיובים. נחזור לפעילות בקרוב — העגלה שלכם נשמרת ותחכה לכם בדיוק כמו שהיא.'

/** Flat express surcharge — pickup only, never discounted */
function getExpressCost(shipping: Shipping | null): number {
  return shipping?.method === 'pickup' && shipping.express
    ? (shipping.expressCost ?? EXPRESS_PICKUP.cost)
    : 0
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
  const [ordersPaused, setOrdersPaused] = useState(false)
  const checkoutInProgress = useRef(false)

  // Mark hydrated after first client-side render (Zustand persist loads synchronously)
  useEffect(() => { setHydrated(true) }, [])

  // Owner's "pause orders" switch (settings/orders). This is UX only — it spares
  // the customer from filling the whole form and hitting a wall. The authoritative
  // block is /api/payment/create, so a read failure here is safe to ignore.
  useEffect(() => {
    getOrdersPaused().then(setOrdersPaused).catch(() => {})
  }, [])

  // Reset loading state when user navigates back from payment page (bfcache/pageshow)
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Page was restored from bfcache (user pressed Back from payment)
        setLoading(false)
        setLoadingMessage('')
        checkoutInProgress.current = false
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  // If user returns to cart with a pending order, check if it was paid or abandoned.
  // Wait 30 seconds before marking as abandoned — the webhook might still be in transit.
  // NEVER mark as abandoned if already paid.
  useEffect(() => {
    async function checkAndMarkAbandoned() {
      try {
        const pendingStr = sessionStorage.getItem('badfos_pending_order')
        if (!pendingStr) return

        const { orderId, timestamp } = JSON.parse(pendingStr)
        if (!orderId) {
          sessionStorage.removeItem('badfos_pending_order')
          return
        }

        // Wait at least 10 minutes from order creation before considering it abandoned
        // (gives customer time to complete 3DS verification + webhook transit time)
        const orderAge = Date.now() - (timestamp || 0)
        if (orderAge < PENDING_ORDER_STALE_MS) {
          // Too early — don't mark as abandoned yet, keep in sessionStorage
          return
        }

        const { getDocument } = await import('@/lib/db')
        const order = await getDocument<{ status: string }>('orders', orderId)
        const action = resolveCartRevisit(orderAge, order?.status ?? null)

        if (action === 'mark_abandoned') {
          updateOrderStatus(orderId, 'cart_abandoned').catch(console.error)
          // Instant abandoned-cart alert to the business owner (fire-and-forget)
          fetch('/api/abandoned-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, source: 'cart_revisit' }),
          }).catch(() => {})
        }

        if (action === 'forget') {
          // Paid or deleted — stop tracking this order
          sessionStorage.removeItem('badfos_pending_order')
        }
        // mark_abandoned / keep_for_reuse: KEEP badfos_pending_order — if the
        // customer actively checks out again, the SAME order is reused and
        // revived to pending_payment by /api/order-sync. This is what prevents
        // duplicate orders (#1312/#1313: abandon+recreate → one payment,
        // two orders marked paid).
        sessionStorage.removeItem('badfos_payment_cache')
      } catch {}
    }
    checkAndMarkAbandoned()
  }, [])

  // Pre-upload cache: base64 hash → Firebase Storage URL
  const uploadCacheRef = useRef<Map<string, Promise<string>>>(new Map())
  // Reuse existing orderId if returning from payment (prevents duplicate orders)
  const existingOrderId = (() => {
    try {
      const pending = sessionStorage.getItem('badfos_pending_order')
      if (pending) {
        const { orderId } = JSON.parse(pending)
        if (orderId) return orderId as string
      }
      // Fallback: the cookie survives new tabs / the cross-origin redirect from
      // Grow — without it a new tab would create a duplicate order
      const match = document.cookie.match(/(?:^|; )badfos_pending_order=([^;]+)/)
      if (match) {
        const { orderId } = JSON.parse(decodeURIComponent(match[1]))
        if (orderId) return orderId as string
      }
    } catch {}
    return null
  })()
  const tempOrderIdRef = useRef(existingOrderId || `order-${Date.now()}`)

  // Pre-fetch payment link cache
  const paymentCacheRef = useRef<{ promise: Promise<any>; amount: number; key: string } | null>(null)
  const [paymentReady, setPaymentReady] = useState(false)

  // Pre-upload design images in background while user fills contact/shipping
  useEffect(() => {
    if (items.length === 0) return
    const cache = uploadCacheRef.current
    const tempOrderId = tempOrderIdRef.current

    for (const item of items) {
      for (const d of item.designs) {
        if (d.imageUrl.startsWith('data:') && !cache.has(d.imageUrl)) {
          // Print-safe: byte-identical under the storage cap, reduced above it
          // (lib/print-image.ts). storage.rules reports an oversized design as
          // `storage/unauthorized`, which used to look like an auth failure.
          const uploadPromise = preparePrintDataUrl(d.imageUrl, d.fileName || 'design.png')
            .then((ready) => uploadDesignFile(ready, tempOrderId, generateUniqueFileName(ready.name)))
            .catch((err) => {
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
    if (ordersPaused) return
    if (!customerInfo || !shipping || (items.length === 0 && packageItems.length === 0)) return
    if (!/^05\d{8}$/.test(customerInfo.phone)) return

    const orderCalc = calculateOrderTotal(items, shipping.method as 'delivery' | 'pickup', couponDiscount, undefined, getExpressCost(shipping))
    const packagesTotal = packageItems.reduce((sum, pkg) => sum + pkg.totalPrice, 0)
    const total = orderCalc.total + packagesTotal
    // Fingerprint of cart contents — ANY cart mutation (item added/removed/edited,
    // design swapped, quantity changed, package changed) must invalidate the cached link
    const cartFingerprint = items
      .map(i => `${i.id}:${i.totalQuantity}:${i.designs.map(d => `${d.area}.${d.imageUrl.length}`).join('+')}`)
      .join('|') + '#' + packageItems.map(p => `${p.id}:${p.quantity}`).join('|')
    const cacheKey = `${customerInfo.phone}-${total}-${couponCode}-${cartFingerprint}`

    // Skip if already fetching same data
    if (paymentCacheRef.current?.key === cacheKey) return

    setPaymentReady(false)

    // Check sessionStorage for a cached payment URL (from a previous attempt)
    try {
      const cached = sessionStorage.getItem('badfos_payment_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.key === cacheKey && parsed.url) {
          paymentCacheRef.current = { promise: Promise.resolve({ url: parsed.url }), amount: total, key: cacheKey }
          setPaymentReady(true)
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
        ...(getGclid() && { gclid: getGclid() }),
      }),
    }).then(r => r.json()).then(data => {
      if (data?.url) {
        try { sessionStorage.setItem('badfos_payment_cache', JSON.stringify({ key: cacheKey, url: data.url })) } catch {}
        setPaymentReady(true)
      }
      return data
    }).catch(() => null)

    paymentCacheRef.current = { promise, amount: total, key: cacheKey }
  }, [customerInfo, shipping, items, packageItems, couponDiscount, couponCode, ordersPaused])

  const handleCheckout = async () => {
    if (checkoutInProgress.current) return
    // Covers the flag flipping while this page is already open — the checkout
    // button is gone on re-render, but never let this path create an order.
    if (ordersPaused) {
      alert(`${ORDERS_PAUSED_TITLE}\n${ORDERS_PAUSED_TEXT}`)
      return
    }
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
      // Re-validate personal coupons against the customer's phone.
      // A Firestore hiccup must NEVER block checkout — on error, proceed as today.
      let effectiveCouponDiscount = couponDiscount
      let effectiveCouponCode = couponCode
      if (couponCode) {
        try {
          // Server-side re-validation (admin SDK) — strips a personal coupon
          // that belongs to a different phone. The browser no longer reads the
          // coupons collection directly.
          const res = await fetch('/api/coupon/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: couponCode.trim().toUpperCase(), phone: customerInfo.phone }),
          })
          const data = await res.json().catch(() => null)
          if (data && data.valid === false && data.reason === 'personal_wrong_phone') {
            effectiveCouponDiscount = 0
            effectiveCouponCode = ''
            setCouponDiscount(0)
            setCouponCode('')
            // Invalidate the pre-fetched payment link — its amount includes the removed coupon
            paymentCacheRef.current = null
            try { sessionStorage.removeItem('badfos_payment_cache') } catch {}
            alert('הקופון שהוזן אישי ללקוח אחר ולכן הוסר מההזמנה')
          }
        } catch {}
      }

      // Calculate correct totals (including quantity discount + coupon + express)
      const expressCost = getExpressCost(shipping)
      const orderCalc = calculateOrderTotal(items, shipping.method as 'delivery' | 'pickup', effectiveCouponDiscount, undefined, expressCost)
      // Add package totals
      const packagesTotal = packageItems.reduce((sum, pkg) => sum + pkg.totalPrice, 0)
      orderCalc.subtotal += packagesTotal
      orderCalc.total += packagesTotal

      // Use pre-uploaded images from cache, fallback to upload now if needed
      const cache = uploadCacheRef.current
      let tempOrderId = tempOrderIdRef.current
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
              if (url) return { ...d, imageUrl: url }
              const ready = await preparePrintDataUrl(d.imageUrl, d.fileName || 'design.png')
              return {
                ...d,
                imageUrl: await uploadDesignFile(ready, tempOrderId, generateUniqueFileName(ready.name)),
                fileName: ready.name,
              }
            })
          ),
          pricePerUnit: item.pricePerUnit,
          totalQuantity: item.totalQuantity,
          totalPrice: item.totalPrice,
        }))
      )

      // ALWAYS reuse the existing pending order on an ACTIVE re-checkout —
      // even if >10 minutes passed and it was marked cart_abandoned.
      // Abandon+recreate is what produced duplicate orders #1312/#1313 (one
      // payment, two orders marked paid). /api/order-sync revives a
      // cart_abandoned order back to pending_payment.
      let reuseOrderId: string | null = null
      if (existingOrderId) {
        // The cart may have changed since the order was created (items/designs
        // added, removed or edited, coupon applied after pressing Back from the
        // payment page). Sync the existing order from the SAME itemsForOrder
        // payload that feeds the pending-order snapshot (which builds the
        // design_mockup email) — otherwise the admin order and the email show
        // different designs / a pre-coupon price.
        // Runs SERVER-SIDE (/api/order-sync): Firestore rules only allow admins
        // to update orders, so a client-side updateDocument always fails here.
        try {
          const syncRes = await fetch('/api/order-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stripUndefined({
              orderId: existingOrderId,
              phone: customerInfo.phone,
              customer: customerInfo,
              shipping,
              items: itemsForOrder,
              packages: packageItems.map(pkg => ({
                packageId: pkg.packageId,
                packageName: pkg.packageName,
                quantity: pkg.quantity,
                pricePerUnit: pkg.pricePerUnit,
                graphicDesignerCost: pkg.graphicDesignerCost,
                totalPrice: pkg.totalPrice,
              })),
              subtotal: orderCalc.subtotal,
              discount: effectiveCouponDiscount + orderCalc.quantityDiscount,
              couponCode: effectiveCouponCode || '',
              total: orderCalc.total,
              // Keep webhook matching working if a fresh payment link was created
              paymentId: tempOrderId,
              // Attribution self-heal: fills a missing gclid on the existing
              // order (server never overwrites an existing one)
              ...(getGclid() && { gclid: getGclid() }),
            })),
          })
          const sync = await syncRes.json().catch(() => null)
          if (sync?.synced) {
            reuseOrderId = existingOrderId
          } else if (CREATE_FRESH_ORDER_REASONS.includes(sync?.reason)) {
            // The tracked order is paid/deleted/another customer's — paying
            // against it would lose this payment. Start a clean order with a
            // FRESH paymentId and a fresh payment link.
            console.error('Order sync skipped, creating a fresh order:', sync?.reason)
            tempOrderId = `order-${Date.now()}`
            tempOrderIdRef.current = tempOrderId
            paymentCacheRef.current = null
            try {
              sessionStorage.removeItem('badfos_payment_cache')
              sessionStorage.removeItem('badfos_pending_order')
              document.cookie = 'badfos_pending_order=; max-age=0; path=/'
            } catch {}
          } else {
            // Transient server issue — sync is best-effort, keep reusing the
            // order exactly like before (payment still matches via webhook).
            console.error('Order sync skipped:', sync?.reason || syncRes.status)
            reuseOrderId = existingOrderId
          }
        } catch (e) {
          // A sync failure must not block checkout — payment still works,
          // and the webhook/phone fallback will match the order.
          console.error('Failed to sync existing order with current cart:', e)
          reuseOrderId = existingOrderId
        }
      }

      setLoadingMessage('יוצר לינק תשלום...')

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
            items: items.map(i => ({ productType: i.productType, fabricType: i.fabricType, designs: i.designs.map(d => ({ area: d.area })), sizes: i.sizes, fixedPrice: i.fixedPrice, totalQuantity: i.totalQuantity })),
            couponDiscount: effectiveCouponDiscount,
            ...(expressCost > 0 && { express: true }),
            ...(getGclid() && { gclid: getGclid() }),
          }),
        }).then(r => r.json())
      }

      const paymentData = await paymentPromise

      if (paymentData.url) {
        if (!isAuthorizedRedirect(paymentData.url)) {
          throw new Error('כתובת התשלום אינה מאושרת')
        }

        setLoadingMessage('שומר הזמנה...')

        // Skip creating order if one already exists (user pressed back and
        // retried, or came back to a cart_abandoned order — synced above)
        if (reuseOrderId) {
          const orderId = reuseOrderId
          const orderJson = JSON.stringify({
            orderId,
            customer: customerInfo,
            items: itemsForOrder,
            subtotal: orderCalc.subtotal,
            discount: effectiveCouponDiscount + orderCalc.quantityDiscount,
            couponCode: effectiveCouponCode || '',
            total: orderCalc.total,
            express: expressCost > 0,
            timestamp: Date.now(),
          })
          sessionStorage.setItem('badfos_pending_order', orderJson)
          // Also save to cookie — survives cross-origin redirect from Grow
          document.cookie = `badfos_pending_order=${encodeURIComponent(orderJson)}; max-age=3600; path=/; SameSite=Lax`
          setLoadingMessage('מעביר לעמוד תשלום...')
          window.location.href = paymentData.url
          return
        }

        // Create order in Firestore BEFORE redirecting to payment (pending_payment status)
        const orderData = stripUndefined({
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
          discount: effectiveCouponDiscount + orderCalc.quantityDiscount,
          ...(effectiveCouponCode && { couponCode: effectiveCouponCode }),
          // orderCalc.total is the amount actually charged: when the pre-fetched
          // payment link is reused its amount equals orderCalc.total, and when it
          // doesn't match, a fresh link is created at orderCalc.total. Never use
          // the cached amount here — it may be stale (e.g. pre-coupon).
          total: orderCalc.total,
          ...(getGclid() && { gclid: getGclid() }),
        })

        // Run order creation + share link in parallel for speed
        const orderPromise = createOrder(orderData as any)

        // Share link creation — non-blocking, runs in parallel
        const sharePromise = (async () => {
          const itemsWithDesigns2 = items.filter(item => item.designs.length > 0)
          if (itemsWithDesigns2.length === 0) return
          try {
            const sharedItems = itemsWithDesigns2.map((item) => {
              const base: Record<string, unknown> = {
                productType: item.productType,
                color: item.color,
                designs: item.designs.map((d) => ({
                  area: d.area,
                  areaName: d.areaName,
                  imageBase64: d.imageUrl,
                })),
              }
              if (item.fabricType) base.fabricType = item.fabricType
              return base
            })
            if (sharedItems.length === 1) {
              const { createSharedDesign } = await import('@/lib/db')
              const shareId = await createSharedDesign(sharedItems[0] as any)
              sessionStorage.setItem('badfos_share_url', `${window.location.origin}/share/${shareId}`)
            } else {
              const shareId = await createSharedCart({ items: sharedItems as any })
              sessionStorage.setItem('badfos_share_url', `${window.location.origin}/share/cart/${shareId}`)
            }
          } catch (e) {
            console.warn('Failed to create share link:', e)
          }
        })()

        // Wait for order (critical) — share link can finish in background
        const orderId = await orderPromise

        // Customer returned with a personal BACK5 recovery coupon → link this new
        // order to the original abandoned one. Fire-and-forget: must never block
        // or break checkout (keepalive survives the payment redirect).
        try {
          if (effectiveCouponCode && effectiveCouponCode.trim().toUpperCase().startsWith('BACK5')) {
            fetch('/api/link-recovery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId }),
              keepalive: true,
            }).catch(() => {})
          }
        } catch {}

        const orderJson = JSON.stringify({
          orderId,
          customer: customerInfo,
          items: itemsForOrder,
          subtotal: orderCalc.subtotal,
          discount: effectiveCouponDiscount + orderCalc.quantityDiscount,
          couponCode: effectiveCouponCode || '',
          total: orderCalc.total,
          express: expressCost > 0,
          timestamp: Date.now(),
        })
        sessionStorage.setItem('badfos_pending_order', orderJson)
        // Also save to cookie — survives cross-origin redirect from Grow
        document.cookie = `badfos_pending_order=${encodeURIComponent(orderJson)}; max-age=3600; path=/; SameSite=Lax`

        // Redirect immediately — don't wait for share link
        setLoadingMessage('מעביר לעמוד תשלום...')
        window.location.href = paymentData.url

        // Let share link finish in background (best effort)
        sharePromise.catch(() => {})
        return
      } else {
        throw new Error(paymentData.error || 'No payment URL')
      }

    } catch (error: any) {
      console.error('Checkout error:', error?.message || error)
      // A design the storage rules refused arrives here as an English
      // `storage/...` code — never let that reach the customer raw.
      alert(isDesignUploadError(error)
        ? printUploadErrorMessage(error)
        : `אירעה שגיאה: ${error?.message || 'אנא נסו שוב.'}`)
    } finally {
      // Guarantee loading state resets (prevents infinite spinner)
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
                // A design the designer already uploaded IS a Storage URL —
                // reuse it. Re-uploading would hand an https string to
                // uploadBase64Image → dataUrlToBlob, which splits on ',' and
                // throws on a URL that has no base64 payload.
                // Otherwise (a legacy data: cart) upload it now, so Firestore
                // never has to hold the base64.
                const url = d.imageUrl.startsWith('https://')
                  ? d.imageUrl
                  : await uploadBase64Image(
                      await blobToBase64(d.imageUrl),
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
            <Link href="/home" className="block">
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
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4" role="status" aria-live="polite">
          <Loader2 className="w-14 h-14 text-yellow-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{loadingMessage || 'מעבד את ההזמנה שלך...'}</h2>
          <p className="text-gray-500 text-sm">אנא המתן, זה ייקח מספר שניות</p>
        </div>
      </div>
    )}
    <div className="container-rtl py-8 pb-28 sm:pb-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-2">עגלת קניות</h1>
      <p className="text-sm text-gray-400 mb-6">העגלה נשמרת אוטומטית גם אם תסגרו את הדף</p>

      {ordersPaused && (
        <div className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4" role="alert">
          <h2 className="font-bold text-amber-900 mb-1">{ORDERS_PAUSED_TITLE}</h2>
          <p className="text-sm text-amber-800 mb-3">{ORDERS_PAUSED_TEXT}</p>
          <a
            href={`https://wa.me/${CONTACT_INFO.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-bold text-amber-900 underline hover:text-amber-700"
          >
            יש שאלה? דברו איתנו בוואטסאפ
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
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
                          aria-label={`הסרת חבילה ${pkg.packageName}`}
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
          <ShippingForm
            onSubmit={setShipping}
            totalQuantity={items.reduce((s, i) => s + i.totalQuantity, 0) + packageItems.reduce((s, p) => s + p.quantity, 0)}
          />
        </div>

        {/* Sidebar - Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <OrderSummary
              items={items}
              packageItems={packageItems}
              shipping={shipping}
              couponCode={couponCode}
              customerPhone={customerInfo?.phone}
              onCouponChange={setCouponCode}
              onDiscountApplied={(discount, code) => { setCouponDiscount(discount); if (code) setCouponCode(code) }}
              onCheckout={handleCheckout}
              loading={loading}
              canCheckout={!!customerInfo && !!shipping && (items.length > 0 || packageItems.length > 0)}
              paymentReady={paymentReady}
              ordersPaused={ordersPaused}
              ordersPausedTitle={ORDERS_PAUSED_TITLE}
              ordersPausedText={ORDERS_PAUSED_TEXT}
            />
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

