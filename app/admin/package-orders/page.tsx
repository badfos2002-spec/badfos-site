'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, Trash2, Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getAllDocuments, updateDocument, deleteDocument } from '@/lib/db'
import type { PackageOrder, PackageOrderStatus } from '@/lib/types'

const statusLabels: Record<PackageOrderStatus, { label: string; color: string }> = {
  new:              { label: 'חדשה',              color: 'bg-blue-100 text-blue-700' },
  in_design:        { label: 'בעיצוב',            color: 'bg-yellow-100 text-yellow-700' },
  pending_approval: { label: 'ממתין לאישור',      color: 'bg-orange-100 text-orange-700' },
  approved:         { label: 'אושר',              color: 'bg-teal-100 text-teal-700' },
  in_production:    { label: 'בייצור',            color: 'bg-indigo-100 text-indigo-700' },
  shipped:          { label: 'נשלח',              color: 'bg-purple-100 text-purple-700' },
  completed:        { label: 'הושלם',             color: 'bg-gray-100 text-gray-700' },
}

export default function AdminPackageOrdersPage() {
  const [orders, setOrders] = useState<PackageOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    getAllDocuments<PackageOrder>('packageOrders')
      .then(data => setOrders(data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: PackageOrderStatus) => {
    try {
      await updateDocument<PackageOrder>('packageOrders', orderId, { status: newStatus } as any)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון סטטוס')
    }
  }

  const handleDelete = async (orderId: string) => {
    if (!confirm('למחוק את הזמנת החבילה?')) return
    try {
      await deleteDocument('packageOrders', orderId)
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } catch (e) {
      console.error(e)
    }
  }

  const filtered = orders.filter(o => {
    const matchSearch = !searchTerm ||
      `${o.customer.firstName} ${o.customer.lastName}`.includes(searchTerm) ||
      o.customer.phone.includes(searchTerm)
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">הזמנות חבילות</h1>
        <p className="text-gray-600">ניהול הזמנות שהתקבלו דרך עמוד החבילות</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="חיפוש לפי שם לקוח או טלפון..."
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
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">אין הזמנות חבילות</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">לקוח</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">צבע / בד</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">כמות</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">תאריך</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">סטטוס</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((order) => {
                  const date = order.createdAt?.toDate?.()?.toLocaleDateString('he-IL') ?? ''
                  const { label, color } = statusLabels[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' }
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{order.customer.firstName} {order.customer.lastName}</p>
                        <p className="text-sm text-gray-500">{order.customer.phone}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {order.color}{order.fabricType ? ` / ${order.fabricType}` : ''}
                      </td>
                      <td className="px-6 py-4 font-medium">{order.totalQuantity}</td>
                      <td className="px-6 py-4 text-gray-600">{date}</td>
                      <td className="px-6 py-4">
                        <select
                          className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${color}`}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as PackageOrderStatus)}
                        >
                          {Object.entries(statusLabels).map(([val, { label: l }]) => (
                            <option key={val} value={val}>{l}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(order.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
