'use client'

import { Gift, Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminPackagesPage() {
  const packages = [
    { id: 1, name: '10-20 חולצות', tag: 'מתחילים', minQty: 10, maxQty: 20, pricePerUnit: 45, designerCost: 150, active: true },
    { id: 2, name: '21-50 חולצות', tag: 'הכי פופולרי', minQty: 21, maxQty: 50, pricePerUnit: 40, designerCost: 0, active: true },
    { id: 3, name: '51-100 חולצות', tag: 'עסקים', minQty: 51, maxQty: 100, pricePerUnit: 35, designerCost: 0, active: true },
    { id: 4, name: '100+ חולצות', tag: 'ארגונים', minQty: 100, maxQty: 1000, pricePerUnit: 30, designerCost: 0, active: true },
  ]

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול חבילות</h1>
          <p className="text-gray-600">הגדרת חבילות מוצרים ומבצעים</p>
        </div>
        <Button className="bg-green-500 hover:bg-green-600 text-white">
          <Plus className="w-4 h-4 ml-2" />
          חבילה חדשה
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.id} className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{pkg.name}</h3>
                  <span className="text-sm text-gray-500">{pkg.tag}</span>
                </div>
              </div>
              <span className={`w-3 h-3 rounded-full ${pkg.active ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">כמות מינימלית</p>
                <p className="font-bold text-blue-600">{pkg.minQty}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">כמות מקסימלית</p>
                <p className="font-bold text-purple-600">{pkg.maxQty}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">מחיר ליחידה</p>
                <p className="font-bold text-green-600">₪{pkg.pricePerUnit}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">עלות גרפיקאי</p>
                <p className="font-bold text-orange-600">{pkg.designerCost === 0 ? 'חינם' : `₪${pkg.designerCost}`}</p>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4 border-t">
              <Button size="sm" variant="outline" className="flex-1">
                <Edit className="w-4 h-4 ml-2" />
                ערוך
              </Button>
              <Button size="sm" variant="outline" className="border-red-500 text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
