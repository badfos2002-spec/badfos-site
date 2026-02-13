'use client'

import { Tag, Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminCouponsPage() {
  const coupons = [
    { id: 1, code: 'WELCOME10', discount: 10, expiry: '31/12/2026', status: 'active', usedCount: 23 },
    { id: 2, code: 'SUMMER20', discount: 20, expiry: '31/08/2026', status: 'active', usedCount: 12 },
    { id: 3, code: 'OLD50', discount: 50, expiry: '01/01/2026', status: 'expired', usedCount: 5 },
  ]

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול קופונים</h1>
          <p className="text-gray-600">יצירה וניהול קופוני הנחה</p>
        </div>
        <Button className="bg-yellow-500 hover:bg-yellow-600 text-white">
          <Plus className="w-4 h-4 ml-2" />
          קופון חדש
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-yellow-600" />
                <span className="font-bold text-lg text-gray-900">{coupon.code}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                coupon.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {coupon.status === 'active' ? 'פעיל' : 'פג תוקף'}
              </span>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">הנחה:</span>
                <span className="font-bold text-yellow-600">{coupon.discount}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">תפוגה:</span>
                <span className="text-sm text-gray-900">{coupon.expiry}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">שימושים:</span>
                <span className="font-medium text-gray-900">{coupon.usedCount}</span>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4 border-t">
              <Button size="sm" variant="outline" className="flex-1">
                <Edit className="w-4 h-4 ml-2" />
                ערוך
              </Button>
              <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
