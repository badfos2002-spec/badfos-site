'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CustomerInfo } from '@/lib/types'

interface ContactFormProps {
  onSubmit: (info: CustomerInfo) => void
}

export default function ContactForm({ onSubmit }: ContactFormProps) {
  const [formData, setFormData] = useState<CustomerInfo>({
    firstName: '', lastName: '', email: '', phone: '', phoneSecondary: '', notes: ''
  })

  const isValidPhone = (phone: string) => /^05\d{8}$/.test(phone)

  // Auto-update parent whenever required fields are filled
  useEffect(() => {
    if (formData.firstName && formData.lastName && formData.email && isValidPhone(formData.phone)) {
      onSubmit(formData)
    }
  }, [formData])

  const update = (key: keyof CustomerInfo, value: string) =>
    setFormData(prev => ({ ...prev, [key]: value }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>פרטי קשר</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">שם פרטי *</label>
              <input
                type="text"
                name="firstName"
                autoComplete="given-name"
                required
                value={formData.firstName}
                onChange={e => update('firstName', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">שם משפחה *</label>
              <input
                type="text"
                name="lastName"
                autoComplete="family-name"
                required
                value={formData.lastName}
                onChange={e => update('lastName', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">אימייל *</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={e => update('email', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">טלפון *</label>
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                required
                maxLength={10}
                value={formData.phone}
                onChange={e => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${
                  formData.phone && !isValidPhone(formData.phone) ? 'border-red-400' : ''
                }`}
                placeholder="05XXXXXXXX"
              />
              {formData.phone && !isValidPhone(formData.phone) && (
                <p className="text-xs text-red-500 mt-1">נא להזין מספר פלאפון תקין (10 ספרות, מתחיל ב-05)</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">טלפון נוסף</label>
              <input
                type="tel"
                name="phoneSecondary"
                autoComplete="tel"
                maxLength={10}
                value={formData.phoneSecondary}
                onChange={e => update('phoneSecondary', e.target.value.replace(/\D/g, '').slice(0, 10))}
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
              onChange={e => update('notes', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="הערות מיוחדות להזמנה..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
