'use client'

import { useState, useEffect } from 'react'
import { Search, Download, Eye, Trash2, Package, Loader2, X, MapPin, Phone, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getAllOrders, updateOrderStatus, deleteDocument, createCoupon, deductInventory } from '@/lib/db'
import { deleteFile } from '@/lib/storage'
import type { Order } from '@/lib/types'

const statusLabels: Record<string, { label: string; color: string }> = {
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
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filterShipping, setFilterShipping] = useState<'all' | 'delivery' | 'pickup'>('all')

  useEffect(() => {
    getAllOrders()
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    try {
      await updateOrderStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o))
      if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any } : null)

      // When paid → generate coupon + send confirmation email
      if (newStatus === 'paid') {
        const couponCode = await createCoupon(orderId)
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'order_confirmation', data: order, couponCode }),
        }).catch(console.error)
      }

      // When in_production → deduct inventory + send email
      if (newStatus === 'in_production') {
        deductInventory(order.items).catch(console.error)
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'order_in_production', data: order }),
        }).catch(console.error)
      }

      // When shipped → send shipping email
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
      if (selectedOrder?.id === orderId) setSelectedOrder(null)
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
    // Hide unpaid orders — they haven't completed payment yet
    if (o.status === 'pending_payment') return false
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
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleExportCSV}>
            <Download className="w-4 h-4 ml-2" />
            ייצוא לCSV
          </Button>
        </div>
      </div>

      {/* Floating shipping filter tabs */}
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
              ({orders.filter(o => o.status !== 'pending_payment' && (tab.key === 'all' || o.shipping?.method === tab.key)).length})
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">מספר הזמנה</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">לקוח</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">תאריך</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">פריטים</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">סכום</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">סטטוס</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((order) => {
                  const totalItems = order.items.reduce((s, i) => s + i.totalQuantity, 0)
                  const date = order.createdAt?.toDate?.()?.toLocaleDateString('he-IL') ?? ''
                  return (
                    <tr key={order.id} className="hover:bg-yellow-50/40 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                      <td className="px-6 py-4 font-medium text-gray-900">#{order.orderNumber}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{order.customer.firstName} {order.customer.lastName}</p>
                          <p className="text-sm text-gray-500">{order.customer.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{date}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <Package className="w-4 h-4" />
                          {totalItems}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">₪{order.total}</td>
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <select
                          className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusLabels[order.status]?.color ?? 'bg-gray-100 text-gray-700'}`}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        >
                          {Object.entries(statusLabels).map(([val, { label }]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" onClick={() => setSelectedOrder(order)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={() => handleDelete(order.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Order Details Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto" dir="rtl" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* ── Gradient Header ── */}
            <div className="bg-gradient-to-l from-yellow-400 to-orange-400 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium mb-1">
                    {selectedOrder.createdAt?.toDate?.()?.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <h2 className="text-3xl font-black">הזמנה #{selectedOrder.orderNumber}</h2>
                  <div className="mt-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/25 text-white`}>
                      {statusLabels[selectedOrder.status]?.label ?? selectedOrder.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">

              {/* ── Customer + Shipping ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">פרטי לקוח</p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {selectedOrder.customer.firstName.charAt(0)}
                    </div>
                    <p className="font-bold text-gray-900">{selectedOrder.customer.firstName} {selectedOrder.customer.lastName}</p>
                  </div>
                  <a href={`tel:${selectedOrder.customer.phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-yellow-600 mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {selectedOrder.customer.phone}
                  </a>
                  {selectedOrder.customer.email && (
                    <a href={`mailto:${selectedOrder.customer.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-yellow-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {selectedOrder.customer.email}
                    </a>
                  )}
                </div>

                {/* Shipping */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">משלוח</p>
                  {selectedOrder.shipping?.method === 'pickup' ? (
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="font-semibold text-sm">איסוף עצמי</p>
                        <p className="text-xs text-gray-500">ראשון לציון</p>
                      </div>
                    </div>
                  ) : selectedOrder.shipping?.address ? (
                    <div className="flex items-start gap-2 text-gray-700">
                      <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">{selectedOrder.shipping.address.street} {selectedOrder.shipping.address.number}</p>
                        <p className="text-xs text-gray-500">{selectedOrder.shipping.address.city}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">—</p>
                  )}

                  {/* Price summary inside shipping card */}
                  <div className="mt-4 pt-3 border-t border-gray-200 space-y-1">
                    {selectedOrder.couponCode && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>קופון {selectedOrder.couponCode}</span>
                        <span className="text-green-600">-₪{selectedOrder.discount ?? 0}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>משלוח</span>
                      <span>{selectedOrder.shipping?.method === 'pickup' ? 'חינם' : '₪35'}</span>
                    </div>
                    <div className="flex justify-between font-black text-base text-gray-900 pt-1">
                      <span>סה״כ</span>
                      <span className="text-yellow-600">₪{selectedOrder.total}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Items ── */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">פריטים להזמנה</p>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="border-2 border-gray-100 rounded-2xl p-4 hover:border-yellow-200 transition-colors">
                      {/* Item header */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-gray-900">{productLabels[item.productType] ?? item.productType}</p>
                          <p className="text-sm text-gray-500">{item.color}{item.fabricType ? ` • ${item.fabricType}` : ''}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-gray-900">₪{item.totalPrice}</p>
                          <p className="text-xs text-gray-400">{item.totalQuantity} יח׳ × ₪{item.pricePerUnit}</p>
                        </div>
                      </div>

                      {/* Sizes */}
                      {item.sizes && item.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {item.sizes.map(s => (
                            <span key={s.size} className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 font-semibold px-2.5 py-1 rounded-full">
                              {s.size}: {s.quantity}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Designs */}
                      {item.designs && item.designs.length > 0 && (
                        <div className="pt-3 border-t border-gray-100">
                          <p className="text-xs font-bold text-gray-400 mb-2">קבצי עיצוב:</p>
                          <div className="flex gap-3 flex-wrap">
                            {item.designs.map((d, di) => (
                              <div key={di} className="bg-gray-50 rounded-xl p-2 text-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={d.imageUrl} alt={d.areaName ?? d.area} className="w-24 h-24 object-contain rounded-lg" />
                                <p className="text-xs font-medium text-gray-600 mt-1.5">{d.areaName ?? d.area}</p>
                                <a
                                  href={d.imageUrl}
                                  download={`עיצוב-${d.areaName ?? d.area}-הזמנה-${selectedOrder?.orderNumber ?? ''}.${d.imageUrl.startsWith('data:image/png') ? 'png' : 'jpg'}`}
                                  className="mt-1.5 inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium h-8 rounded-md px-3 transition-colors"
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
                  ))}
                </div>
              </div>

              {/* ── Update Status ── */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">עדכון סטטוס</p>
                <select
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-yellow-400 focus:outline-none text-gray-700 bg-white"
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                >
                  {Object.entries(statusLabels).map(([val, { label }]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex gap-3 p-6 pt-0">
              <Button
                variant="outline"
                className="border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400"
                onClick={() => { handleDelete(selectedOrder.id) }}
              >
                <Trash2 className="w-4 h-4 ml-1.5" />
                מחק
              </Button>
              <Button className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-xl" onClick={() => setSelectedOrder(null)}>
                סגור
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
