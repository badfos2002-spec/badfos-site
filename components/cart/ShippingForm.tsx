'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Shipping, Address } from '@/lib/types'
import { SHIPPING_COSTS, EXPRESS_PICKUP, isExpressEligible } from '@/lib/constants'

interface ShippingFormProps {
  onSubmit: (shipping: Shipping) => void
  /** Total units in the cart (items + packages) — express is limited to small orders */
  totalQuantity: number
}

export default function ShippingForm({ onSubmit, totalQuantity }: ShippingFormProps) {
  const [method, setMethod] = useState<'delivery' | 'pickup'>('delivery')
  const [express, setExpress] = useState(false)
  const [isPrivateHouse, setIsPrivateHouse] = useState(false)
  const [address, setAddress] = useState<Address>({ street: '', number: '', city: '', apartment: '', floor: 'קרקע', entrance: '' })
  const [additionalPhone, setAdditionalPhone] = useState('')
  const [touched, setTouched] = useState(false)

  const expressAvailable = isExpressEligible(method, totalQuantity)

  // Express is pickup-only and limited to small orders — clear it the moment
  // it stops being eligible (switch to delivery / quantity crosses the limit),
  // so the ₪50 fee can never linger on an ineligible order
  useEffect(() => {
    if (!isExpressEligible(method, totalQuantity)) setExpress(false)
  }, [method, totalQuantity])

  // When private house is selected, apartment becomes "בית פרטי" and floor becomes "קרקע"
  useEffect(() => {
    if (isPrivateHouse) {
      setAddress(a => ({ ...a, apartment: 'בית פרטי', floor: 'קרקע' }))
    } else {
      setAddress(a => ({ ...a, apartment: a.apartment === 'בית פרטי' ? '' : a.apartment }))
    }
  }, [isPrivateHouse])

  // Auto-update parent with debounce (300ms)
  useEffect(() => {
    if (method === 'pickup') {
      const withExpress = express && isExpressEligible(method, totalQuantity)
      const timer = setTimeout(() => onSubmit({
        method,
        cost: SHIPPING_COSTS[method],
        ...(withExpress && { express: true, expressCost: EXPRESS_PICKUP.cost }),
      }), 300)
      return () => clearTimeout(timer)
    } else if (address.street && address.number && address.city && address.floor && address.apartment) {
      const timer = setTimeout(() => onSubmit({ method, address, ...(additionalPhone.trim() && { additionalPhone: additionalPhone.trim() }), cost: SHIPPING_COSTS[method] }), 300)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, express, totalQuantity, address.street, address.number, address.city, address.apartment, address.floor, address.entrance, additionalPhone])

  // Mark as touched after 3 seconds of delivery being selected
  useEffect(() => {
    if (method !== 'delivery') return
    const timer = setTimeout(() => setTouched(true), 3000)
    return () => clearTimeout(timer)
  }, [method])

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
                <div className="text-sm text-text-gray">ראשון לציון • בתיאום מראש</div>
              </div>
              <div className="font-bold text-black">₪0</div>
            </label>

            {/* Express — pickup only, up to 20 units */}
            {expressAvailable && (
              <label
                className={
                  express
                    ? 'flex items-center gap-3 p-4 border-2 border-orange-400 rounded-lg cursor-pointer transition-colors bg-gradient-to-l from-amber-50 to-orange-50 shadow-sm'
                    : 'flex items-center gap-3 p-4 border-2 border-amber-200 rounded-lg cursor-pointer transition-colors bg-gradient-to-l from-amber-50 to-orange-50 hover:border-orange-300'
                }
              >
                <input
                  type="checkbox"
                  checked={express}
                  onChange={(e) => setExpress(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <div className="flex-1">
                  <div className="font-bold text-orange-900">⚡ אקספרס — ההזמנה מוכנה תוך 1-2 ימי עסקים</div>
                  <div className="text-sm text-orange-700">בתיאום מראש</div>
                </div>
                <div className="font-bold text-orange-600">+₪{EXPRESS_PICKUP.cost}</div>
              </label>
            )}
          </div>

          {/* Address Fields (only if delivery) */}
          {method === 'delivery' && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-bold">כתובת למשלוח</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">רחוב <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="street"
                    required
                    autoComplete="street-address"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${!address.street && touched ? 'border-red-500' : ''}`}
                  />
                  {!address.street && touched && <p className="text-red-500 text-sm mt-1">שדה חובה</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">מספר בית/בניין <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="houseNumber"
                    required
                    autoComplete="address-line2"
                    value={address.number}
                    onChange={(e) => setAddress({ ...address, number: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${!address.number && touched ? 'border-red-500' : ''}`}
                  />
                  {!address.number && touched && <p className="text-red-500 text-sm mt-1">שדה חובה</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">עיר <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="city"
                    required
                    autoComplete="address-level2"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${!address.city && touched ? 'border-red-500' : ''}`}
                  />
                  {!address.city && touched && <p className="text-red-500 text-sm mt-1">שדה חובה</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">קומה <span className="text-red-500">*</span></label>
                  <select
                    value={address.floor}
                    onChange={(e) => setAddress({ ...address, floor: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary bg-white"
                  >
                    <option value="קרקע">קרקע</option>
                    {Array.from({ length: 200 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={String(n)}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Private house checkbox */}
              <label className="flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors bg-gray-50">
                <input
                  type="checkbox"
                  checked={isPrivateHouse}
                  onChange={(e) => setIsPrivateHouse(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">🏡 בית פרטי / קרקע (ללא דירה)</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    דירה {!isPrivateHouse && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    name="apartment"
                    autoComplete="off"
                    required={!isPrivateHouse}
                    disabled={isPrivateHouse}
                    value={address.apartment}
                    onChange={(e) => setAddress({ ...address, apartment: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${!address.apartment && touched && !isPrivateHouse ? 'border-red-500' : ''} ${isPrivateHouse ? 'bg-gray-100 text-gray-500' : ''}`}
                    placeholder={isPrivateHouse ? 'בית פרטי' : 'מספר דירה'}
                  />
                  {!address.apartment && touched && !isPrivateHouse && <p className="text-red-500 text-sm mt-1">שדה חובה</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">כניסה</label>
                  <input
                    type="text"
                    name="entrance"
                    autoComplete="off"
                    value={address.entrance}
                    onChange={(e) => setAddress({ ...address, entrance: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="אופציונלי"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">טלפון נוסף (אופציונלי)</label>
                  <input
                    type="tel"
                    name="additionalPhone"
                    autoComplete="tel"
                    maxLength={10}
                    value={additionalPhone}
                    onChange={(e) => setAdditionalPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="איש קשר נוסף לשליח"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
