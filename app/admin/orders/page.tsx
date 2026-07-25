'use client'

import { useState, useEffect } from 'react'
import { Search, Download, Trash2, Package, Loader2, MapPin, Phone, Mail, User, ChevronUp, ChevronDown, StickyNote, MessageCircle, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getAllOrders, updateOrderStatus, deleteDocument, createCoupon, createRecoveryCoupon, updateDocument, deductInventory, markAbandonedOrders, onOrdersSnapshot } from '@/lib/db'
import { Timestamp } from 'firebase/firestore'
import { deleteFile } from '@/lib/storage'
import { auth } from '@/lib/firebase'
import type { Order, DesignUpscale } from '@/lib/types'

const statusLabels: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'ממתין לתשלום', color: 'bg-yellow-100 text-yellow-800' },
  cart_abandoned:  { label: 'נטש עגלה',      color: 'bg-red-100 text-red-700' },
  paid:            { label: 'שולם',           color: 'bg-green-100 text-green-700' },
  in_production:   { label: 'בייצור',         color: 'bg-blue-100 text-blue-700' },
  shipped:         { label: 'נשלח',           color: 'bg-purple-100 text-purple-700' },
  completed:       { label: 'הושלם',          color: 'bg-gray-100 text-gray-700' },
  cancelled:       { label: 'בוטל',           color: 'bg-red-100 text-red-700' },
}

const productLabels: Record<string, string> = {
  tshirt: 'חולצה',
  sweatshirt: 'סווטשרט',
  buff: 'באף',
  cap: 'כובע',
  apron: 'סינר',
  baby: 'בגד גוף תינוק',
}

const fabricLabels: Record<string, string> = {
  cotton: 'כותנה',
  'dri-fit': 'דרייפיט',
  polo: 'פולו',
  oversized: 'אוברסייז',
}

const colorLabels: Record<string, string> = {
  white: 'לבן', black: 'שחור', gray: 'אפור', red: 'אדום',
  navy: 'נייבי', beige: 'בז׳', burgundy: 'בורדו', olive: 'זית',
  blue: 'כחול', green: 'ירוק', purple: 'סגול', orange: 'כתום',
  turquoise: 'טורקיז', lightblue: 'תכלת', pink: 'ורוד',
}

// A pending upscale is shown as "in progress" only for 24h — after that
// (lost webhook / gave up) the row falls back to the plain original download
const UPSCALE_PENDING_UI_MS = 24 * 60 * 60 * 1000
const isUpscaleInProgress = (u?: DesignUpscale) => {
  if (u?.status !== 'pending') return false
  const c = u.createdAt
  const ms = c instanceof Date ? c.getTime()
    : typeof c?.toMillis === 'function' ? c.toMillis() : NaN
  return Number.isFinite(ms) && Date.now() - ms < UPSCALE_PENDING_UI_MS
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterShipping, setFilterShipping] = useState<'all' | 'delivery' | 'pickup'>('all')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)

  // Real-time listener — orders update automatically when payment confirmed
  useEffect(() => {
    const unsubscribe = onOrdersSnapshot((updatedOrders) => {
      setOrders(updatedOrders)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    try {
      await updateOrderStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o))

      if (newStatus === 'paid') {
        const couponCode = await createCoupon(orderId)
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'order_confirmation', data: order, couponCode }),
        }).catch(console.error)
      }

      if (newStatus === 'in_production') {
        deductInventory(order.items).catch(console.error)
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'order_in_production', data: order }),
        }).catch(console.error)
      }

      if (newStatus === 'shipped') {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'order_shipped', data: order }),
        }).catch(console.error)
      }

      // Pickup order completed → auto WhatsApp "ready for pickup" (once per order)
      if (newStatus === 'completed' && order.shipping?.method === 'pickup' && !(order as any).pickupReadySentAt) {
        try {
          const res = await fetch('/api/pickup-ready', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId }),
          })
          const result = await res.json().catch(() => null)
          if (result?.whatsapp?.sent || result?.alreadySent) {
            const pickupReadySentAt = Timestamp.now()
            setOrders(prev => prev.map(o => o.id === orderId ? ({ ...o, pickupReadySentAt } as any) : o))
          } else {
            alert(`הודעת 'מוכן לאיסוף' לא נשלחה אוטומטית (${result?.whatsapp?.reason || result?.error || 'שגיאה לא ידועה'}) — שלחו ללקוח הודעה ידנית`)
          }
        } catch (err) {
          console.error(err)
          alert("הודעת 'מוכן לאיסוף' לא נשלחה אוטומטית — שלחו ללקוח הודעה ידנית")
        }
      }
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון סטטוס')
    }
  }

  // Eligible for cart recovery: abandoned, or pending_payment older than 10 minutes
  // (matches the client-side abandonment delay in CartPage)
  const isRecoveryEligible = (order: Order) => {
    if (order.status === 'cart_abandoned') return true
    if (order.status === 'pending_payment') {
      const created = order.createdAt?.toDate?.()
      if (!created) return false
      return Date.now() - created.getTime() > 10 * 60 * 1000
    }
    return false
  }

  // Recovered customer: recovery WhatsApp was sent and the order was later completed/paid,
  // OR this is a NEW order linked (via BACK5 coupon redemption) to an abandoned one
  const isRecoveredCustomer = (order: Order) =>
    (Boolean((order as any).recoverySentAt) || Boolean((order as any).recoveredFromOrderId)) &&
    ['paid', 'in_production', 'shipped', 'completed'].includes(order.status)

  const handleRowRecovery = (order: Order) => {
    // Open WhatsApp first — handleRecoveryWhatsApp opens the tab synchronously (popup-blocker safe)
    handleRecoveryWhatsApp(order)
    if (order.status === 'pending_payment') {
      updateOrderStatus(order.id, 'cart_abandoned')
        .then(() => setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cart_abandoned' as any } : o)))
        .catch(console.error)
    }
  }

  const handleRecoveryWhatsApp = async (order: Order) => {
    // Open the tab synchronously so popup blockers don't kill it
    const win = window.open('', '_blank')
    const digits = order.customer.phone.replace(/\D/g, '')
    const waNumber = digits.startsWith('0') ? `972${digits.slice(1)}` : digits
    const buildMessage = (couponCode?: string) =>
      `היי ${order.customer.firstName} 👋 כאן בדפוס!\n` +
      `שמנו לב שהתחלת הזמנה באתר ולא הספקת לסיים — שמרנו לך את העגלה 🛒\n` +
      (couponCode ? `מגיע לך קופון 5% הנחה להשלמת ההזמנה: ${couponCode}\n` : '') +
      `להשלמת ההזמנה: https://badfos.co.il/cart\n` +
      `נשמח לעזור בכל שאלה 🙂`

    try {
      const couponCode = await createRecoveryCoupon(order.id, order.customer.phone)
      if (win) win.location.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(buildMessage(couponCode))}`
    } catch (e) {
      console.error(e)
      // Never leave a blank tab — send the message without the coupon line
      if (win) win.location.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(buildMessage())}`
    }

    try {
      const recoverySentAt = Timestamp.now()
      await updateDocument('orders', order.id, { recoverySentAt } as any)
      setOrders(prev => prev.map(o => o.id === order.id ? ({ ...o, recoverySentAt } as any) : o))
    } catch (e) {
      console.error(e)
    }
  }

  const handleReviewRequest = async (order: Order) => {
    // Open the tab synchronously so popup blockers don't kill it
    const win = window.open('', '_blank')
    const digits = order.customer.phone.replace(/\D/g, '')
    const waNumber = digits.startsWith('0') ? `972${digits.slice(1)}` : digits
    const message =
      `היי ${order.customer.firstName}, תודה שהזמנתם אצלנו בבדפוס! 💛\n` +
      `נשמח אם תשאירו לנו ביקורת קצרה בגוגל: https://search.google.com/local/writereview?placeid=ChIJdWBwSp2984gRNGbFgb-Kykc`

    if (win) win.location.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`

    try {
      const reviewRequestSentAt = Timestamp.now()
      await updateDocument('orders', order.id, { reviewRequestSentAt } as any)
      setOrders(prev => prev.map(o => o.id === order.id ? ({ ...o, reviewRequestSentAt } as any) : o))
    } catch (e) {
      console.error(e)
    }
  }

  // Download a design file through the same-origin, admin-authenticated proxy.
  // The proxy streams with Content-Disposition: attachment, and blob: URLs are
  // same-origin so the `download` attribute is honored (cross-origin Storage
  // URLs silently ignore `download` and open in a new tab instead).
  const downloadDesign = async (
    orderId: string,
    itemIdx: number,
    area: string,
    variant: 'source' | 'upscale',
    baseName: string,
  ) => {
    const key = `${orderId}_${itemIdx}_${area}_${variant}`
    if (downloadingKey) return
    setDownloadingKey(key)
    try {
      const token = await auth?.currentUser?.getIdToken()
      if (!token) { alert('נדרשת התחברות מחדש כדי להוריד קבצים'); return }
      const res = await fetch(
        `/api/admin/download-design?orderId=${encodeURIComponent(orderId)}&itemIdx=${itemIdx}&area=${encodeURIComponent(area)}&variant=${variant}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data?.error === 'file_missing') {
          alert('לא נמצא קובץ עיצוב שמור להזמנה הזו — ייתכן שהקובץ לא נשמר בעת ההזמנה. פנה/י לתמיכה.')
        } else {
          alert('ההורדה נכשלה, נסה/י שוב בעוד רגע')
        }
        return
      }
      const blob = await res.blob()
      const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png'
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${baseName}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      alert('ההורדה נכשלה, נסה/י שוב בעוד רגע')
    } finally {
      setDownloadingKey(null)
    }
  }

  const handleDelete = async (orderId: string) => {
    if (!confirm('למחוק את ההזמנה?')) return
    try {
      const order = orders.find(o => o.id === orderId)
      if (order) {
        const storageUrls = order.items
          .flatMap(item => item.designs)
          .map(d => d.imageUrl)
          .filter(url => url.startsWith('https://firebasestorage.googleapis.com'))
        if (storageUrls.length > 0) {
          await Promise.allSettled(storageUrls.map(url => deleteFile(url)))
        }
      }
      await deleteDocument('orders', orderId)
      setOrders(prev => prev.filter(o => o.id !== orderId))
      if (expandedOrderId === orderId) setExpandedOrderId(null)
    } catch (e) {
      console.error(e)
      alert('שגיאה במחיקת הזמנה')
    }
  }

  const handleExportCSV = () => {
    const rows = [
      ['מספר הזמנה', 'שם לקוח', 'טלפון', 'אימייל', 'תאריך', 'פריטים', 'סכום', 'סטטוס', 'משלוח'],
      ...filtered.map(o => [
        `#${o.orderNumber}`,
        `${o.customer.firstName} ${o.customer.lastName}`,
        o.customer.phone,
        o.customer.email || '',
        o.createdAt?.toDate?.()?.toLocaleDateString('he-IL') ?? '',
        String(o.items.reduce((s, i) => s + i.totalQuantity, 0)),
        `₪${o.total}`,
        statusLabels[o.status]?.label ?? o.status,
        o.shipping?.method === 'pickup' ? 'איסוף עצמי' : 'משלוח',
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = orders.filter(o => {
    const matchSearch = !searchTerm ||
      `${o.customer.firstName} ${o.customer.lastName}`.includes(searchTerm) ||
      String(o.orderNumber).includes(searchTerm) ||
      o.customer.phone.includes(searchTerm)
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    const matchShipping = filterShipping === 'all' || o.shipping?.method === filterShipping
    return matchSearch && matchStatus && matchShipping
  })

  const shippingTabs: { key: 'all' | 'delivery' | 'pickup'; label: string }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'delivery', label: 'משלוח' },
    { key: 'pickup', label: 'איסוף עצמי' },
  ]

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">ניהול הזמנות</h1>
        <p className="text-gray-600">צפייה וניהול כל ההזמנות במערכת</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="חיפוש לפי מספר הזמנה, שם לקוח..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          <select
            className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-yellow-500 focus:outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">כל הסטטוסים</option>
            {Object.entries(statusLabels).map(([val, { label }]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleExportCSV}>
              <Download className="w-4 h-4 ml-2" />
              ייצוא לCSV
            </Button>
            <Button
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={async () => {
                const count = await markAbandonedOrders(60)
                if (count > 0) {
                  alert(`${count} הזמנות סומנו כנטושות`)
                  const refreshed = await getAllOrders()
                  setOrders(refreshed)
                } else {
                  alert('אין הזמנות ממתינות ישנות לסימון')
                }
              }}
            >
              סמן נטושים
            </Button>
          </div>
        </div>
      </div>

      {/* Shipping filter tabs */}
      <div className="flex gap-2 mb-4">
        {shippingTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterShipping(tab.key)}
            className={`px-5 py-2 rounded-full text-sm font-semibold shadow-md transition-all ${
              filterShipping === tab.key
                ? 'bg-yellow-400 text-white shadow-yellow-200'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`mr-1.5 text-xs ${filterShipping === tab.key ? 'text-yellow-100' : 'text-gray-400'}`}>
              ({orders.filter(o => tab.key === 'all' || o.shipping?.method === tab.key).length})
            </span>
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">אין הזמנות</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const isExpanded = expandedOrderId === order.id
            const date = order.createdAt?.toDate?.()?.toLocaleDateString('he-IL') ?? ''
            const customerName = `${order.customer.firstName} ${order.customer.lastName}`

            return (
              <div key={order.id} className={`rounded-xl border bg-white shadow overflow-hidden ${order.shipping?.express ? 'border-orange-400 bg-orange-50/70 ring-1 ring-orange-300' : isRecoveredCustomer(order) ? 'border-yellow-400 bg-yellow-50/60 ring-1 ring-yellow-300' : ''}`}>
                {/* Card Header */}
                <div
                  className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                >
                  {/* Mobile: stacked layout */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base sm:text-lg flex items-center gap-2 flex-wrap">
                        הזמנה #{order.orderNumber}
                        {order.shipping?.express && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 text-white text-xs font-bold px-2.5 py-0.5 ring-2 ring-orange-300 shadow-sm whitespace-nowrap">⚡ אקספרס</span>
                        )}
                        {isRecoveredCustomer(order) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-300 text-yellow-950 text-xs font-bold px-2.5 py-0.5 ring-2 ring-yellow-400 shadow-sm whitespace-nowrap">🎉 לקוח חזר אחרי קופון</span>
                        )}                        {order.customer.notes && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-amber-950 text-xs font-bold px-2.5 py-0.5 ring-2 ring-amber-300 shadow-sm animate-pulse">
                            <StickyNote className="w-3.5 h-3.5 shrink-0" />
                            הערה
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 truncate">{customerName} &bull; {date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isRecoveryEligible(order) && !(order as any).recoverySentAt && (
                        <button
                          className="relative bg-green-600 hover:bg-green-700 text-white rounded-lg h-8 px-2.5 shadow-sm inline-flex items-center gap-1"
                          title="קופון 5% החזרת לקוח בוואטסאפ"
                          onClick={(e) => { e.stopPropagation(); handleRowRecovery(order) }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="hidden sm:inline text-xs font-bold whitespace-nowrap">קופון 5% החזרת לקוח</span>
                        </button>
                      )}
                      {isRecoveryEligible(order) && (order as any).recoverySentAt && (
                        <span className="hidden sm:inline text-xs font-bold text-green-600 whitespace-nowrap">✓ נשלחה תזכורת אוטומטית</span>
                      )}
                      {['shipped', 'completed'].includes(order.status) && (
                        <button
                          className="relative bg-amber-500 hover:bg-amber-600 text-white rounded-lg h-8 px-2.5 shadow-sm inline-flex items-center gap-1"
                          title="בקשת ביקורת בוואטסאפ"
                          onClick={(e) => { e.stopPropagation(); handleReviewRequest(order) }}
                        >
                          <Star className="w-4 h-4" />
                          <span className="hidden sm:inline text-xs font-bold whitespace-nowrap">בקשת ביקורת{(order as any).reviewRequestSentAt ? ' ✓' : ''}</span>
                          {(order as any).reviewRequestSentAt && (
                            <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-amber-300 ring-2 ring-white" />
                          )}
                        </button>
                      )}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <select
                          className={`appearance-none rounded-lg pl-7 pr-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer border border-gray-200 shadow-sm outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${statusLabels[order.status]?.color ?? 'bg-gray-100 text-gray-700'}`}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        >
                          {Object.entries(statusLabels).map(([val, { label }]) => (
                            <option key={val} value={val} disabled={val === 'pending_payment'}>{label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {order.couponCode && (
                          <span className="hidden sm:inline-flex items-center bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full text-xs" title={`קופון ${order.couponCode}`}>🎟️</span>
                        )}
                        <span className="font-bold text-base sm:text-lg">₪{(order as any).paymentSum || order.total}</span>
                      </div>
                      <button
                        className="h-8 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 hidden sm:block"
                        title="מחק הזמנה"
                        aria-label="מחק הזמנה"
                        onClick={(e) => { e.stopPropagation(); handleDelete(order.id) }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="p-1">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 pt-0 border-t bg-gray-50">
                    {order.shipping?.express && (
                      <div className="mt-4 sm:mt-6 mb-2 rounded-xl border-2 border-orange-500 bg-orange-50 px-4 py-3 shadow-lg shadow-orange-200/60">
                        <span className="text-orange-700 font-extrabold text-base sm:text-lg">⚡ אקספרס — 1-2 ימי עסקים!</span>
                        <span className="mr-2 text-sm font-bold text-red-600">(+₪{order.shipping.expressCost ?? 50} • איסוף עצמי בתיאום מראש)</span>
                      </div>
                    )}
                    {order.customer.notes && (
                      <div className="mt-4 sm:mt-6 mb-2 rounded-xl border-2 border-amber-500 bg-amber-50 shadow-lg shadow-amber-200/60 overflow-hidden animate-note-flash">
                        <div className="flex items-center gap-2 bg-amber-400 px-4 py-2.5 text-amber-950 font-extrabold text-base sm:text-lg">
                          <StickyNote className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                          <span>הערות</span>
                        </div>
                        <p className="px-4 py-3 text-amber-900 font-bold text-base sm:text-lg whitespace-pre-wrap break-words leading-relaxed">
                          {order.customer.notes}
                        </p>
                      </div>
                    )}
                    {(order as any).recoveredFromOrderId && (
                      <div className="mt-4 sm:mt-6 mb-2 text-sm font-bold text-yellow-800">
                        🎉 חזר מעגלה נטושה{(order as any).recoveredFromOrderNumber ? ` #${(order as any).recoveredFromOrderNumber}` : ''}
                      </div>
                    )}
                    {isRecoveryEligible(order) && (
                      <div className="mt-4 sm:mt-6 mb-2 flex flex-wrap items-center gap-3 rounded-xl border-2 border-green-500 bg-green-50 p-4">
                        {!(order as any).recoverySentAt ? (
                          <button
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg px-5 py-2.5 shadow-md transition-colors"
                            onClick={() => handleRowRecovery(order)}
                          >
                            <MessageCircle className="w-5 h-5" />
                            🛒 שחזור עגלה בוואטסאפ
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full">
                            ✓ נשלחה תזכורת אוטומטית
                            {(order as any).recoverySentAt?.toDate?.() && (
                              <span className="font-normal">
                                ({(order as any).recoverySentAt.toDate().toLocaleDateString('he-IL')})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                    {(order as any).syncHealedAt && (
                      <div className="mt-4 sm:mt-6 mb-2">
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
                          ⚠️ סנכרון עיצובים תוקן אוטומטית בתשלום
                          {(order as any).syncHealedAt?.toDate?.() && (
                            <span className="font-normal">
                              ({(order as any).syncHealedAt.toDate().toLocaleDateString('he-IL')})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {order.shipping?.method === 'pickup' && (order as any).pickupReadySentAt && (
                      <div className="mt-4 sm:mt-6 mb-2">
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full">
                          📦 נשלחה הודעת מוכן לאיסוף ✓
                          {(order as any).pickupReadySentAt?.toDate?.() && (
                            <span className="font-normal">
                              ({(order as any).pickupReadySentAt.toDate().toLocaleDateString('he-IL')})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 pt-4 sm:pt-6">
                      {/* Left Column: Customer + Shipping + Status */}
                      <div className="space-y-6">
                        {/* Customer Details */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                            <User className="w-5 h-5 ml-2" />
                            פרטי לקוח
                          </h3>
                          <div className="space-y-3 bg-white p-4 rounded-lg">
                            <div className="flex items-center">
                              <User className="w-4 h-4 text-gray-400 ml-2" />
                              <span>{customerName}</span>
                            </div>
                            <a href={`tel:${order.customer.phone}`} className="flex items-center hover:text-blue-600">
                              <Phone className="w-4 h-4 text-gray-400 ml-2" />
                              <span>{order.customer.phone}</span>
                            </a>
                            {order.customer.email && (
                              <a href={`mailto:${order.customer.email}`} className="flex items-center hover:text-blue-600">
                                <Mail className="w-4 h-4 text-gray-400 ml-2" />
                                <span>{order.customer.email}</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Shipping */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                            <MapPin className="w-5 h-5 ml-2" />
                            משלוח
                          </h3>
                          <div className="bg-white p-4 rounded-lg">
                            {order.shipping?.method === 'pickup' ? (
                              <div className="space-y-2">
                                <div className="font-medium text-green-600">איסוף עצמי</div>
                                <div className="text-gray-600">ראשון לציון</div>
                                {order.shipping.express && (
                                  <div className="font-bold text-orange-600">⚡ אקספרס — 1-2 ימי עסקים!</div>
                                )}
                              </div>
                            ) : order.shipping?.address ? (
                              <div className="space-y-2">
                                <div className="font-medium text-blue-600 mb-2">משלוח עד הבית</div>
                                {(() => {
                                  const addr = order.shipping.address as any
                                  // For old orders: if `number` contains "/" (e.g. "1/59"), split into building/apartment
                                  let buildingNum = addr.number || ''
                                  let aptNum = addr.apartment || ''
                                  if (!aptNum && buildingNum.includes('/')) {
                                    const [b, a] = buildingNum.split('/')
                                    buildingNum = b.trim()
                                    aptNum = a.trim()
                                  }
                                  return (
                                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                                      <span className="font-semibold text-gray-700">רחוב:</span>
                                      <span className="text-gray-900">{addr.street || '—'}</span>

                                      <span className="font-semibold text-gray-700">מספר:</span>
                                      <span className="text-gray-900">{buildingNum || '—'}</span>

                                      <span className="font-semibold text-gray-700">דירה:</span>
                                      <span className="text-gray-900">{aptNum || '—'}</span>

                                      <span className="font-semibold text-gray-700">קומה:</span>
                                      <span className="text-gray-900">{addr.floor || '—'}</span>

                                      <span className="font-semibold text-gray-700">כניסה:</span>
                                      <span className="text-gray-900">{addr.entrance || '—'}</span>

                                      <span className="font-semibold text-gray-700">עיר:</span>
                                      <span className="text-gray-900">{addr.city || '—'}</span>
                                    </div>
                                  )
                                })()}
                                {order.shipping.additionalPhone && (
                                  <div className="grid grid-cols-[auto_1fr] gap-x-3 text-sm pt-1">
                                    <span className="font-semibold text-gray-700">טלפון נוסף:</span>
                                    <a href={`tel:${order.shipping.additionalPhone}`} className="text-gray-900 hover:text-blue-600 flex items-center">
                                      <Phone className="w-4 h-4 text-gray-400 ml-2" />
                                      <span>{order.shipping.additionalPhone}</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">—</p>
                            )}
                          </div>
                        </div>

                        {/* Status Update */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-4">עדכון סטטוס</h3>
                          <select
                            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          >
                            {Object.entries(statusLabels).map(([val, { label }]) => (
                              <option key={val} value={val} disabled={val === 'pending_payment'}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Right Column: Order Items */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                          <Package className="w-5 h-5 ml-2" />
                          פרטי הזמנה
                        </h3>
                        <div className="space-y-4">
                          {order.items.map((item, idx) => {
                            const fabricName = item.fabricType ? (fabricLabels[item.fabricType] ?? item.fabricType) : ''
                            const productName = `${productLabels[item.productType] ?? item.productType}${fabricName ? ` ${fabricName}` : ''} מעוצבת`

                            return (
                              <div key={idx} className="bg-white border rounded-lg p-4">
                                {/* Item Header */}
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-medium">{productName}</h4>
                                  <div className="text-left">
                                    <div className="font-bold">₪{Math.round((item.totalPrice ?? 0) * 100) / 100}</div>
                                    <div className="text-sm text-gray-500">{item.totalQuantity} יח&apos; &times; ₪{Math.round((item.pricePerUnit ?? 0) * 100) / 100}</div>
                                  </div>
                                </div>

                                {/* Item Details Grid */}
                                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                  {item.fabricType && <div><strong>סוג:</strong> {fabricName}</div>}
                                  <div><strong>צבע:</strong> {colorLabels[item.color] ?? item.color}</div>
                                  {item.sizes && item.sizes.length > 0 && (
                                    <div><strong>מידה:</strong> {item.sizes.map(s => `${s.size}(${s.quantity})`).join(', ')}</div>
                                  )}
                                  <div><strong>כמות:</strong> {item.totalQuantity}</div>
                                </div>

                                {/* Design Files */}
                                {item.designs && item.designs.length > 0 && (
                                  <div className="border-t pt-3">
                                    <h5 className="font-medium text-gray-900 mb-2">קבצי עיצוב:</h5>
                                    <div className="grid grid-cols-1 gap-2">
                                      {item.designs.map((d, di) => {
                                        const upscale = order.upscales?.[`${idx}_${d.area}`]
                                        return (
                                        <div key={di} className="flex items-center justify-between gap-2 flex-wrap bg-blue-50 p-3 rounded">
                                          <div className="flex items-center">
                                            <div className="w-12 h-12 bg-gray-200 rounded mr-3 overflow-hidden flex-shrink-0">
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img src={d.imageUrl} alt={d.areaName ?? d.area} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                              <span className="text-sm font-medium">{d.areaName ?? d.area}</span>
                                              {isUpscaleInProgress(upscale) && (
                                                <div className="text-xs text-gray-500">⏳ בהגדלה...</div>
                                              )}
                                            </div>
                                          </div>
                                          {upscale?.status === 'done' && upscale.url ? (
                                            <div className="flex items-center gap-3">
                                              <button
                                                type="button"
                                                onClick={() => downloadDesign(order.id, idx, d.area, 'upscale', `עיצוב-לדפוס-${d.areaName ?? d.area}-${order.orderNumber}`)}
                                                disabled={downloadingKey === `${order.id}_${idx}_${d.area}_upscale`}
                                                className="inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium min-h-[44px] rounded-md px-3 transition-colors disabled:opacity-60"
                                              >
                                                {downloadingKey === `${order.id}_${idx}_${d.area}_upscale`
                                                  ? <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                                                  : <Download className="w-4 h-4 ml-1" />}
                                                {upscale.alreadyHighRes ? 'הורדה לדפוס ✨ (איכות מקורית גבוהה)' : 'הורדה לדפוס ✨ (פי 4)'}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => downloadDesign(order.id, idx, d.area, 'source', `עיצוב-${d.areaName ?? d.area}-${order.orderNumber}`)}
                                                disabled={downloadingKey === `${order.id}_${idx}_${d.area}_source`}
                                                className="text-xs text-blue-600 hover:text-blue-800 underline py-3 disabled:opacity-60"
                                              >
                                                מקור
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => downloadDesign(order.id, idx, d.area, 'source', `עיצוב-${d.areaName ?? d.area}-${order.orderNumber}`)}
                                              disabled={downloadingKey === `${order.id}_${idx}_${d.area}_source`}
                                              className="inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium h-8 rounded-md px-3 transition-colors disabled:opacity-60"
                                            >
                                              {downloadingKey === `${order.id}_${idx}_${d.area}_source`
                                                ? <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                                                : <Download className="w-4 h-4 ml-1" />}
                                              הורד
                                            </button>
                                          )}
                                        </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {/* Order Total */}
                          <div className="bg-gray-100 p-4 rounded-lg">
                            {(order.subtotal ?? 0) > 0 && (
                              <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                                <span>סכום ביניים</span>
                                <span>₪{Math.round((order.subtotal ?? 0) * 100) / 100}</span>
                              </div>
                            )}
                            {/* Coupon/discount line — shown also when only couponCode exists
                                (pre-fix orders may have a coupon without a discount amount) */}
                            {((order.discount ?? 0) > 0 || order.couponCode) && (
                              <div className="flex justify-between items-center text-sm mb-2">
                                <span className="flex items-center gap-2 text-gray-600">
                                  הנחה
                                  {order.couponCode && (
                                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full text-xs whitespace-nowrap">
                                      🎟️ קופון {order.couponCode}
                                    </span>
                                  )}
                                </span>
                                <span className="text-green-600 font-medium">
                                  {(order.discount ?? 0) > 0 ? `-₪${Math.round((order.discount ?? 0) * 100) / 100}` : '—'}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                              <span>{order.shipping?.method === 'pickup' ? 'איסוף עצמי' : 'משלוח'}</span>
                              <span>{order.shipping?.method === 'pickup' ? 'חינם' : `₪${order.shipping?.cost ?? 35}`}</span>
                            </div>
                            {order.shipping?.express && (
                              <div className="flex justify-between items-center text-sm font-bold text-orange-600 mb-2">
                                <span>אקספרס ⚡</span>
                                <span>₪{order.shipping.expressCost ?? 50}</span>
                              </div>
                            )}
                            {(order as any).paymentSum && (order as any).paymentSum !== order.total && (
                              <div className="flex justify-between items-center text-sm text-gray-400 line-through">
                                <span>מחיר לפני הנחה:</span>
                                <span>₪{order.total}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                              <span>סה&quot;כ ששולם:</span>
                              <span>₪{(order as any).paymentSum || order.total}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile delete button */}
                    <div className="sm:hidden pt-4 border-t mt-4">
                      <button
                        className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg py-3 text-sm font-medium transition-colors"
                        onClick={() => handleDelete(order.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        מחק הזמנה
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
