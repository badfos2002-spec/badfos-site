'use client'

import { useState } from 'react'
import { Search, Filter, Download, Eye, Trash2, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function AdminOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const orders = [
    { 
      id: '#1234', 
      customer: 'יוסי כהן', 
      email: 'yossi@example.com',
      phone: '050-1234567',
      amount: '₪450', 
      status: 'pending_payment', 
      date: '13/02/2026',
      items: 3,
      delivery: 'delivery'
    },
    { 
      id: '#1233', 
      customer: 'שרה לוי', 
      email: 'sara@example.com',
      phone: '052-9876543',
      amount: '₪680', 
      status: 'paid', 
      date: '13/02/2026',
      items: 5,
      delivery: 'pickup'
    },
    { 
      id: '#1232', 
      customer: 'דוד אברהם', 
      email: 'david@example.com',
      phone: '054-5555555',
      amount: '₪1,200', 
      status: 'in_production', 
      date: '12/02/2026',
      items: 12,
      delivery: 'delivery'
    },
    { 
      id: '#1231', 
      customer: 'מיכל רוזן', 
      email: 'michal@example.com',
      phone: '053-7777777',
      amount: '₪320', 
      status: 'shipped', 
      date: '11/02/2026',
      items: 2,
      delivery: 'delivery'
    },
  ]

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending_payment: { label: 'ממתין לתשלום', color: 'bg-yellow-100 text-yellow-700' },
    paid: { label: 'שולם', color: 'bg-green-100 text-green-700' },
    in_production: { label: 'בייצור', color: 'bg-blue-100 text-blue-700' },
    shipped: { label: 'נשלח', color: 'bg-purple-100 text-purple-700' },
    completed: { label: 'הושלם', color: 'bg-gray-100 text-gray-700' },
  }

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול הזמנות</h1>
        <p className="text-gray-600">צפייה וניהול כל ההזמנות במערכת</p>
      </div>

      {/* Filters */}
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
          </select>

          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <Download className="w-4 h-4 ml-2" />
            ייצוא לExcel
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
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
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{order.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{order.customer}</p>
                      <p className="text-sm text-gray-500">{order.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{order.date}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <Package className="w-4 h-4" />
                      {order.items}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">{order.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusLabels[order.status].color}`}>
                      {statusLabels[order.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
