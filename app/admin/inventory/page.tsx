'use client'

import { useState } from 'react'
import { Search, Plus, Edit, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function AdminInventoryPage() {
  const inventory = [
    { id: 1, product: 'חולצה', fabric: 'כותנה', color: 'לבן', size: 'M', quantity: 150, threshold: 50, status: 'in_stock' },
    { id: 2, product: 'חולצה', fabric: 'כותנה', color: 'שחור', size: 'L', quantity: 45, threshold: 50, status: 'low_stock' },
    { id: 3, product: 'סווטשרט', fabric: 'כותנה', color: 'נייבי', size: 'XL', quantity: 80, threshold: 30, status: 'in_stock' },
    { id: 4, product: 'באף', fabric: 'פוליאסטר', color: 'אדום', size: '-', quantity: 10, threshold: 20, status: 'low_stock' },
  ]

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול מלאי</h1>
          <p className="text-gray-600">מעקב אחר כמויות במלאי</p>
        </div>
        <Button className="bg-green-500 hover:bg-green-600 text-white">
          <Plus className="w-4 h-4 ml-2" />
          הוסף פריט
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          <Input placeholder="חיפוש..." className="pr-10" />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2">
            <tr>
              <th className="px-6 py-4 text-right text-sm font-bold">מוצר</th>
              <th className="px-6 py-4 text-right text-sm font-bold">בד</th>
              <th className="px-6 py-4 text-right text-sm font-bold">צבע</th>
              <th className="px-6 py-4 text-right text-sm font-bold">מידה</th>
              <th className="px-6 py-4 text-right text-sm font-bold">כמות</th>
              <th className="px-6 py-4 text-right text-sm font-bold">סטטוס</th>
              <th className="px-6 py-4 text-right text-sm font-bold">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {inventory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{item.product}</td>
                <td className="px-6 py-4 text-gray-600">{item.fabric}</td>
                <td className="px-6 py-4 text-gray-600">{item.color}</td>
                <td className="px-6 py-4 text-gray-600">{item.size}</td>
                <td className="px-6 py-4">
                  <span className={`font-bold ${item.quantity < item.threshold ? 'text-red-600' : 'text-green-600'}`}>
                    {item.quantity}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {item.status === 'low_stock' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      מלאי נמוך
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      במלאי
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
