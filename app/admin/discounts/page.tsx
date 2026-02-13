'use client'

import { Percent, Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminDiscountsPage() {
  const discounts = [
    { id: 1, name: 'הנחת כמות - 15+', type: 'quantity', category: 'all', minQty: 15, discount: 5, status: 'active' },
    { id: 2, name: 'הנחה חולצות - 20+', type: 'quantity', category: 'tshirt', minQty: 20, discount: 10, status: 'active' },
    { id: 3, name: 'מבצע קיץ', type: 'seasonal', category: 'all', minQty: 0, discount: 15, status: 'inactive' },
  ]

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול הנחות</h1>
          <p className="text-gray-600">הגדרת כללי הנחה אוטומטיים</p>
        </div>
        <Button className="bg-purple-500 hover:bg-purple-600 text-white">
          <Plus className="w-4 h-4 ml-2" />
          הנחה חדשה
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2">
            <tr>
              <th className="px-6 py-4 text-right text-sm font-bold">שם ההנחה</th>
              <th className="px-6 py-4 text-right text-sm font-bold">סוג</th>
              <th className="px-6 py-4 text-right text-sm font-bold">קטגוריה</th>
              <th className="px-6 py-4 text-right text-sm font-bold">כמות מינימלית</th>
              <th className="px-6 py-4 text-right text-sm font-bold">אחוז הנחה</th>
              <th className="px-6 py-4 text-right text-sm font-bold">סטטוס</th>
              <th className="px-6 py-4 text-right text-sm font-bold">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {discounts.map((discount) => (
              <tr key={discount.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{discount.name}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    {discount.type === 'quantity' ? 'כמות' : 'עונתי'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{discount.category === 'all' ? 'הכל' : 'חולצות'}</td>
                <td className="px-6 py-4 text-gray-600">{discount.minQty || '-'}</td>
                <td className="px-6 py-4">
                  <span className="font-bold text-purple-600">{discount.discount}%</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    discount.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {discount.status === 'active' ? 'פעיל' : 'לא פעיל'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500 text-red-600">
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
  )
}
