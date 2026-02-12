'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Shipping, Address } from '@/lib/types'
import { SHIPPING_COSTS } from '@/lib/constants'

interface ShippingFormProps {
  onSubmit: (shipping: Shipping) => void
}

export default function ShippingForm({ onSubmit }: ShippingFormProps) {
  const [method, setMethod] = useState<'delivery' | 'pickup'>('delivery')
  const [address, setAddress] = useState<Address>({
    street: '',
    number: '',
    city: '',
    zipCode: '',
    entrance: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      method,
      address: method === 'delivery' ? address : undefined,
      cost: SHIPPING_COSTS[method],
    })
    setSubmitted(true)
  }

  const handleEdit = () => {
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-green-800">✓ פרטי משלוח נשמרו</h3>
              <p className="text-sm text-green-700">
                {method === 'delivery'
                  ? `משלוח ל: ${address.street} ${address.number}, ${address.city}`
                  : 'איסוף עצמי מראשון לציון'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              ערוך
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>משלוח</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="font-bold text-primary">₪35</div>
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
              <div className="font-bold text-green-600">חינם!</div>
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
                    required
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">מספר *</label>
                  <input
                    type="text"
                    required
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
                    required
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">מיקוד</label>
                  <input
                    type="text"
                    value={address.zipCode}
                    onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="אופציונלי"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">כניסה / קומה</label>
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

          <Button type="submit" className="w-full btn-cta">
            שמור פרטי משלוח
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
