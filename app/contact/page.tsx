'use client'

import { useState } from 'react'
import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Phone, Mail, MapPin, Instagram, Facebook, MessageCircle } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/constants'
import { createLead } from '@/lib/db'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createLead({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        source: 'contact_form',
        status: 'new',
      })

      setSubmitted(true)
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
      setTimeout(() => setSubmitted(false), 5000)
    } catch (error) {
      console.error('Error:', error)
      alert('אירעה שגיאה. אנא נסו שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-rtl py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          יצירת קשר
        </h1>
        <p className="text-xl text-text-gray">
          נשמח לעזור! צרו קשר בכל דרך שנוחה לכם
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle>שלחו לנו הודעה</CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="text-4xl mb-2">✅</div>
                <h3 className="text-lg font-bold text-green-800 mb-2">
                  תודה! קיבלנו את ההודעה
                </h3>
                <p className="text-green-700">
                  נחזור אליך בהקדם האפשרי
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">שם מלא *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
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

                <div>
                  <label className="block text-sm font-medium mb-2">טלפון</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="אופציונלי"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">נושא</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="אופציונלי"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">הודעה *</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="ספרו לנו איך נוכל לעזור..."
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white h-12 text-lg"
                >
                  {loading ? 'שולח...' : 'שלח הודעה ✈️'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Contact Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>פרטי התקשרות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <a
                href={`tel:${CONTACT_INFO.phone}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-bold">טלפון</div>
                  <div className="text-text-gray">{CONTACT_INFO.phone}</div>
                </div>
              </a>

              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-bold">אימייל</div>
                  <div className="text-text-gray">{CONTACT_INFO.email}</div>
                </div>
              </a>

              <div className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-bold">כתובת</div>
                  <div className="text-text-gray">{CONTACT_INFO.address}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-bold mb-3">עקבו אחרינו</p>
                <div className="flex gap-3">
                  <a
                    href={`https://wa.me/${CONTACT_INFO.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-accent-whatsapp text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <MessageCircle className="w-6 h-6" />
                  </a>
                  <a
                    href={CONTACT_INFO.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Instagram className="w-6 h-6" />
                  </a>
                  <a
                    href={CONTACT_INFO.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Facebook className="w-6 h-6" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
            <CardContent className="p-6 text-center">
              <h3 className="font-bold text-lg mb-2">שעות פעילות</h3>
              <p className="text-text-gray">
                ראשון - חמישי: 9:00 - 18:00
              </p>
              <p className="text-text-gray">
                שישי: 9:00 - 13:00
              </p>
              <p className="text-sm text-text-gray mt-3">
                שבת: סגור
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
