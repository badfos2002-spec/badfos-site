'use client'

import { useState, useEffect } from 'react'
import { Search, Download, Trash2, Package, Loader2, MapPin, Phone, Mail, User, ChevronUp, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getAllOrders, updateOrderStatus, deleteDocument, createCoupon, deductInventory, markAbandonedOrders, onOrdersSnapshot } from '@/lib/db'
import { deleteFile } from '@/lib/storage'
import type { Order } from '@/lib/types'

const statusLabels: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'ממתין לתשלום', color: 'bg-yellow-100 text-yellow-800' },
  cart_abandoned:  { label: 'נטש עגלה',      color: 'bg-red-100 text-red-700' },
  new:             { label: 'חדשה',           color: 'bg-emerald-100 text-emerald-700' },
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
  turquoise: 'טורקיז', lightblue: 'תכלת',
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterShipping, setFilterShipping] = useState<'all' | 'delivery' | 'pickup'>('all')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

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
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון סטטוס')
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול הזמנות</h1>
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
              <div key={order.id} className="rounded-xl border bg-white shadow overflow-hidden">
                {/* Card Header */}
                <div
                  className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                >
                  {/* Mobile: stacked layout */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base sm:text-lg">הזמנה #{order.orderNumber}</div>
                      <p className="text-sm text-gray-600 mt-0.5 truncate">{customerName} &bull; {date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <select
                          className={`appearance-none rounded-lg pl-7 pr-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer border border-gray-200 shadow-sm outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${statusLabels[order.status]?.color ?? 'bg-gray-100 text-gray-700'}`}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        >
                          {Object.entries(statusLabels).filter(([val]) => val !== 'pending_payment').map(([val, { label }]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="font-bold text-base sm:text-lg whitespace-nowrap">₪{(order as any).paymentSum || order.total}</div>
                      <button
                        className="h-8 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 hidden sm:block"
                        title="מחק הזמנה"
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
                            {order.customer.notes && (
                              <p className="text-sm text-gray-500 border-t pt-2 mt-2">{order.customer.notes}</p>
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
                              </div>
                            ) : order.shipping?.address ? (
                              <div className="space-y-2">
                                <div className="font-medium text-blue-600">משלוח עד הבית</div>
                                <div className="text-gray-600">
                                  <div>{order.shipping.address.street} {order.shipping.address.number}</div>
                                  <div>{order.shipping.address.city}{order.shipping.address.floor ? `, קומה ${order.shipping.address.floor}` : ''}</div>
                                  {order.shipping.address.entrance && <div>כניסה: {order.shipping.address.entrance}</div>}
                                </div>
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
                            {Object.entries(statusLabels).filter(([val]) => val !== 'pending_payment').map(([val, { label }]) => (
                              <option key={val} value={val}>{label}</option>
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
                                    <div className="font-bold">₪{item.totalPrice}</div>
                                    <div className="text-sm text-gray-500">{item.totalQuantity} יח&apos; &times; ₪{item.pricePerUnit}</div>
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
                                      {item.designs.map((d, di) => (
                                        <div key={di} className="flex items-center justify-between bg-blue-50 p-3 rounded">
                                          <div className="flex items-center">
                                            <div className="w-12 h-12 bg-gray-200 rounded mr-3 overflow-hidden flex-shrink-0">
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img src={d.imageUrl} alt={d.areaName ?? d.area} className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-sm font-medium">{d.areaName ?? d.area}</span>
                                          </div>
                                          <a
                                            href={d.imageUrl}
                                            download={`עיצוב-${d.areaName ?? d.area}-${order.orderNumber}.${d.imageUrl.startsWith('data:image/png') ? 'png' : 'jpg'}`}
                                            className="inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium h-8 rounded-md px-3 transition-colors"
                                          >
                                            <Download className="w-4 h-4 ml-1" />
                                            הורד
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {/* Order Total */}
                          <div className="bg-gray-100 p-4 rounded-lg">
                            {order.couponCode && (
                              <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                                <span>קופון {order.couponCode}</span>
                                <span className="text-green-600">-₪{order.discount ?? 0}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                              <span>משלוח</span>
                              <span>{order.shipping?.method === 'pickup' ? 'חינם' : `₪${order.shipping?.cost ?? 35}`}</span>
                            </div>
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
