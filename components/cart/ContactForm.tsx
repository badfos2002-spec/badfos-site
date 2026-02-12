'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { CustomerInfo } from '@/lib/types'

interface ContactFormProps {
  onSubmit: (info: CustomerInfo) => void
}

export default function ContactForm({ onSubmit }: ContactFormProps) {
  const [formData, setFormData] = useState<CustomerInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneSecondary: '',
    notes: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
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
              <h3 className="font-bold text-green-800">✓ פרטי קשר נשמרו</h3>
              <p className="text-sm text-green-700">
                {formData.firstName} {formData.lastName} • {formData.phone}
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
        <CardTitle>פרטי קשר</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">שם פרטי *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">שם משפחה *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">אימייל *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">טלפון *</label>
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="05X-XXXXXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">טלפון נוסף</label>
              <input
                type="tel"
                pattern="[0-9]{10}"
                value={formData.phoneSecondary}
                onChange={(e) => setFormData({ ...formData, phoneSecondary: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="אופציונלי"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">הערות</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="הערות מיוחדות להזמנה..."
            />
          </div>

          <Button type="submit" className="w-full btn-cta">
            שמור פרטים
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
