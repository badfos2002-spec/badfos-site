'use client'

import { useState, useEffect } from 'react'
import { Search, Download, Eye, Trash2, Package, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getAllOrders, updateOrderStatus, deleteDocument, createCoupon, deductInventory } from '@/lib/db'
import { deleteFile } from '@/lib/storage'
import type { Order } from '@/lib/types'

const statusLabels: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'ממתין לתשלום', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'שולם', color: 'bg-green-100 text-green-700' },
  in_production: { label: 'בייצור', color: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'נשלח', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'הושלם', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'בוטל', color: 'bg-red-100 text-red-700' },
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    getAllOrders()
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o))

      const order = orders.find(o => o.id === orderId)
      if (!order) return

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
    } catch (e) {
      console.error(e)
    }
  }

  const filtered = orders.filter(o => {
    const matchSearch = !searchTerm ||
      `${o.customer.firstName} ${o.customer.lastName}`.includes(searchTerm) ||
      String(o.orderNumber).includes(searchTerm) ||
      o.customer.phone.includes(searchTerm)
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    return matchSearch && matchStatus
  })

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
            <option value="pending_payment">ממתין לתשלום</option>
            <option value="paid">שולם</option>
            <option value="in_production">בייצור</option>
            <option value="shipped">נשלח</option>
            <option value="completed">הושלם</option>
            <option value="cancelled">בוטל</option>
          </select>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <Download className="w-4 h-4 ml-2" />
            ייצוא לExcel
          </Button>
        </div>
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
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
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
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
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
    </div>
  )
}
