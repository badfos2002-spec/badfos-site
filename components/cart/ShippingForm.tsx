'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Shipping, Address } from '@/lib/types'
import { SHIPPING_COSTS } from '@/lib/constants'

interface ShippingFormProps {
  onSubmit: (shipping: Shipping) => void
}

const STORAGE_KEY = 'badfos_shipping_info'

function loadSavedShipping(): { method: 'delivery' | 'pickup'; address: Address } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return { method: 'delivery', address: { street: '', number: '', city: '', zipCode: 'קרקע', entrance: '' } }
}

export default function ShippingForm({ onSubmit }: ShippingFormProps) {
  const saved = loadSavedShipping()
  const [method, setMethod] = useState<'delivery' | 'pickup'>(saved.method)
  const [address, setAddress] = useState<Address>(saved.address)

  // Auto-update parent whenever method/address changes + save to localStorage
  useEffect(() => {
    if (method === 'pickup') {
      onSubmit({ method, cost: SHIPPING_COSTS[method] })
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ method, address }))
    } else if (address.street && address.number && address.city && address.zipCode) {
      onSubmit({ method, address, cost: SHIPPING_COSTS[method] })
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ method, address }))
    }
  }, [method, address])

  return (
    <Card>
      <CardHeader>
        <CardTitle>משלוח</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Shipping Method */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors">
              <input
                type="radio"
                name="method"
                value="delivery"
                checked={method === 'delivery'}
                onChange={() => setMethod('delivery')}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="font-bold">משלוח עד הבית</div>
                <div className="text-sm text-text-gray">3-7 ימי עסקים</div>
              </div>
              <div className="font-bold text-black">₪35</div>
            </label>

            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors">
              <input
                type="radio"
                name="method"
                value="pickup"
                checked={method === 'pickup'}
                onChange={() => setMethod('pickup')}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="font-bold">איסוף עצמי</div>
                <div className="text-sm text-text-gray">ראשון לציון</div>
              </div>
              <div className="font-bold text-black">₪0</div>
            </label>
          </div>

          {/* Address Fields (only if delivery) */}
          {method === 'delivery' && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-bold">כתובת למשלוח</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">רחוב *</label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">מספר בית/בניין *</label>
                  <input
                    type="text"
                    value={address.number}
                    onChange={(e) => setAddress({ ...address, number: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">עיר *</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">קומה *</label>
                  <select
                    value={address.zipCode}
                    onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary bg-white"
                  >
                    <option value="קרקע">קרקע</option>
                    {Array.from({ length: 99 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={String(n)}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">כניסה</label>
                <input
                  type="text"
                  value={address.entrance}
                  onChange={(e) => setAddress({ ...address, entrance: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="אופציונלי"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
