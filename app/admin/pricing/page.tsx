'use client'

import { DollarSign } from 'lucide-react'
import {
  BASE_PRICES,
  FABRIC_TYPES,
  TSHIRT_DESIGN_AREAS,
  SWEATSHIRT_DESIGN_AREAS,
  BUFF_DESIGN_AREAS,
  STANDARD_SIZES,
  QUANTITY_DISCOUNT,
} from '@/lib/constants'

export default function AdminPricingPage() {
  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול תמחור</h1>
        <p className="text-gray-600">מחירים בפועל כפי שמחושבים באתר</p>
      </div>

      {/* T-Shirt Pricing */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">חולצות</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-700">מחיר בסיס</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">₪{BASE_PRICES.tshirt}</p>
          </div>

          <div className="p-4 bg-green-50 rounded-xl">
            <p className="font-medium text-gray-700 mb-3">תוספת בד</p>
            <div className="space-y-2 text-sm">
              {FABRIC_TYPES.map(f => (
                <div key={f.id} className="flex justify-between">
                  <span>{f.name}:</span>
                  <span>{f.surcharge > 0 ? `+₪${f.surcharge}` : 'ללא תוספת'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-xl">
            <p className="font-medium text-gray-700 mb-3">תוספת עיצוב</p>
            <div className="space-y-2 text-sm">
              {TSHIRT_DESIGN_AREAS.map(a => (
                <div key={a.id} className="flex justify-between">
                  <span>{a.name}:</span>
                  <span>+₪{a.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-orange-50 rounded-xl">
          <p className="font-medium text-gray-700 mb-3">תוספת מידות</p>
          <div className="flex flex-wrap gap-4 text-sm">
            {STANDARD_SIZES.filter(s => s.surcharge > 0).map(s => (
              <span key={s.id} className="text-orange-700 font-medium">{s.name}: +₪{s.surcharge}</span>
            ))}
            <span className="text-gray-500">XS–XXL: ללא תוספת</span>
          </div>
        </div>
      </div>

      {/* Sweatshirt Pricing */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">סווטשרטים</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-pink-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-pink-600" />
              <span className="font-medium text-gray-700">מחיר בסיס</span>
            </div>
            <p className="text-2xl font-bold text-pink-600">₪{BASE_PRICES.sweatshirt}</p>
          </div>

          <div className="p-4 bg-orange-50 rounded-xl">
            <p className="font-medium text-gray-700 mb-3">תוספת עיצוב</p>
            <div className="space-y-2 text-sm">
              {SWEATSHIRT_DESIGN_AREAS.map(a => (
                <div key={a.id} className="flex justify-between">
                  <span>{a.name}:</span>
                  <span>+₪{a.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Buff Pricing */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">באפים</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-700">מחיר בסיס</span>
            </div>
            <p className="text-2xl font-bold text-green-600">₪{BASE_PRICES.buff}</p>
          </div>

          <div className="p-4 bg-yellow-50 rounded-xl">
            <p className="font-medium text-gray-700 mb-3">תוספת עיצוב</p>
            <div className="space-y-2 text-sm">
              {BUFF_DESIGN_AREAS.map(a => (
                <div key={a.id} className="flex justify-between">
                  <span>{a.name}:</span>
                  <span>+₪{a.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quantity Discount */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">הנחת כמות</h2>
        <div className="p-4 bg-indigo-50 rounded-xl inline-block">
          <p className="text-sm text-gray-600">
            מינימום <span className="font-bold text-indigo-700">{QUANTITY_DISCOUNT.minQuantity} יחידות</span>
            {' '}← הנחה של{' '}
            <span className="font-bold text-indigo-700">{QUANTITY_DISCOUNT.discountPercent}%</span>
          </p>
        </div>
      </div>
    </div>
  )
}
