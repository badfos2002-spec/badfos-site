'use client'

import { DollarSign, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminPricingPage() {
  const pricing = {
    tshirt: {
      base: 45,
      fabrics: { cotton: 0, dryfit: 0, polo: 10, oversize: 10 },
      design_areas: { front: 10, back: 10, pocket: 5 },
      sizes: { '3XL': 12, '4XL': 12 }
    },
    sweatshirt: {
      base: 53,
      design_areas: { front: 12, back: 12 }
    },
    buff: {
      base: 8,
      design_areas: { center: 8 }
    }
  }

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול תמחור</h1>
        <p className="text-gray-600">עדכון מחירים ותעריפים</p>
      </div>

      {/* T-Shirt Pricing */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">חולצות</h2>
          <Button size="sm" variant="outline">
            <Edit className="w-4 h-4 ml-2" />
            ערוך
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-700">מחיר בסיס</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">₪{pricing.tshirt.base}</p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-xl">
            <p className="font-medium text-gray-700 mb-3">תוספת בד</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>כותנה:</span><span>₪{pricing.tshirt.fabrics.cotton}</span></div>
              <div className="flex justify-between"><span>דרייפיט:</span><span>₪{pricing.tshirt.fabrics.dryfit}</span></div>
              <div className="flex justify-between"><span>פולו:</span><span>₪{pricing.tshirt.fabrics.polo}</span></div>
              <div className="flex justify-between"><span>אוברסייז:</span><span>₪{pricing.tshirt.fabrics.oversize}</span></div>
            </div>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-xl">
            <p className="font-medium text-gray-700 mb-3">תוספת עיצוב</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>קידמי:</span><span>₪{pricing.tshirt.design_areas.front}</span></div>
              <div className="flex justify-between"><span>גב:</span><span>₪{pricing.tshirt.design_areas.back}</span></div>
              <div className="flex justify-between"><span>כיס:</span><span>₪{pricing.tshirt.design_areas.pocket}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Sweatshirt Pricing */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">סווטשרטים</h2>
          <Button size="sm" variant="outline">
            <Edit className="w-4 h-4 ml-2" />
            ערוך
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-pink-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-pink-600" />
              <span className="font-medium text-gray-700">מחיר בסיס</span>
            </div>
            <p className="text-2xl font-bold text-pink-600">₪{pricing.sweatshirt.base}</p>
          </div>
          
          <div className="p-4 bg-orange-50 rounded-xl">
            <p className="font-medium text-gray-700 mb-3">תוספת עיצוב</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>קידמי:</span><span>₪{pricing.sweatshirt.design_areas.front}</span></div>
              <div className="flex justify-between"><span>גב:</span><span>₪{pricing.sweatshirt.design_areas.back}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Buff Pricing */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">באפים</h2>
          <Button size="sm" variant="outline">
            <Edit className="w-4 h-4 ml-2" />
            ערוך
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-700">מחיר בסיס</span>
            </div>
            <p className="text-2xl font-bold text-green-600">₪{pricing.buff.base}</p>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-xl">
            <p className="font-medium text-gray-700 mb-3">תוספת עיצוב מרכזי</p>
            <p className="text-2xl font-bold text-yellow-600">₪{pricing.buff.design_areas.center}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
