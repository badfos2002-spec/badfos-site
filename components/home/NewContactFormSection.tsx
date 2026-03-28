'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendGoogleAdsConversion, sendGenerateLeadEvent, sendMetaLeadEvent, sendLeadWebhook, setEnhancedConversionData, getGclid } from '@/lib/tracking'
import { User, Phone, ArrowLeft } from 'lucide-react'

export default function NewContactFormSection() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    comments: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const lastSubmitRef = useRef(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (Date.now() - lastSubmitRef.current < 15000) {
      alert('נא להמתין לפני שליחה נוספת')
      return
    }

    if (!/^(05\d{8}|0[23489]\d{7})$/.test(formData.phone.replace(/\D/g, ''))) {
      alert('מספר טלפון לא חוקי')
      return
    }

    setLoading(true)
    lastSubmitRef.current = Date.now()

    try {
      const gclid = getGclid() || localStorage.getItem('gclid') || ''
      const message = formData.comments || ''

      const { createLead } = await import('@/lib/db')
      await createLead({
        name: formData.name,
        phone: formData.phone,
        message,
        source: 'bottom_form',
        status: 'new',
        gclid,
      })

      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_lead',
            data: { name: formData.name, phone: formData.phone, source: 'bottom_form', status: 'new', message },
          }),
        })
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr)
      }

      setEnhancedConversionData({ phone: formData.phone })
      sendGoogleAdsConversion()
      sendGenerateLeadEvent('bottom_form')
      sendMetaLeadEvent()
      sendLeadWebhook({ name: formData.name, phone: formData.phone, message, source: 'bottom_form', ...(gclid && { gclid }) })

      setSubmitted(true)
      setFormData({ name: '', phone: '', comments: '' })
      setTimeout(() => setSubmitted(false), 5000)
    } catch (error) {
      console.error('Error:', error)
      alert('אירעה שגיאה. אנא נסו שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-20 bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white relative overflow-hidden" dir="rtl">
      {/* Atmosphere Blobs */}
      <div className="absolute top-0 right-0 w-40 h-40 md:w-64 md:h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 md:w-96 md:h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="mx-auto max-w-[1536px] px-4 md:px-0 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Right Side - Form Card */}
          <div className="order-2 lg:order-2" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-5 md:p-6 text-gray-900 hover:scale-[1.01] transition-transform duration-200 relative">
              {/* Floating Decorative Icon */}
              <div className="absolute -top-3 -left-3 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <Phone className="w-6 h-6 text-white" />
              </div>

              {/* Form Header */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  השאירו פרטים ליצור קשר
                </h3>
                <p className="text-xs text-gray-500">
                  נחזור אליכם בהקדם עם הצעה מותאמת אישית
                </p>
              </div>

              {submitted ? (
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 text-center" role="status" aria-live="polite">
                  <div className="text-3xl mb-2">✅</div>
                  <h4 className="font-bold text-base text-green-800 mb-1">
                    תודה רבה!
                  </h4>
                  <p className="text-sm text-green-700">
                    קיבלנו את הפרטים שלך ונחזור אליך בהקדם
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="relative">
                    <label className="block text-xs font-medium mb-1 text-right text-gray-700">
                      שם מלא *
                    </label>
                    <User className="absolute top-7 right-2 w-4 h-4 text-yellow-400" />
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="הזן שם מלא"
                      className="text-right h-10 text-sm bg-gray-50 border-gray-200 focus:ring-yellow-400 pr-8"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-medium mb-1 text-right text-gray-700">
                      מספר טלפון *
                    </label>
                    <Phone className="absolute top-7 right-2 w-4 h-4 text-yellow-400" />
                    <Input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="050-0000000"
                      className="text-right h-10 text-sm bg-gray-50 border-gray-200 focus:ring-yellow-400 pr-8"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-right text-gray-700">
                      הערות
                    </label>
                    <textarea
                      rows={2}
                      value={formData.comments}
                      onChange={(e) =>
                        setFormData({ ...formData, comments: e.target.value })
                      }
                      placeholder="הערות נוספות (אופציונלי)"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-right"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 hover:shadow-xl text-white font-bold h-12 text-base rounded-xl shadow-lg inline-flex items-center justify-center gap-2 group"
                  >
                    {loading ? 'שולח...' : (
                      <>
                        חזרו אלי עם הצעה
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>

                  <p className="text-[10px] text-center text-gray-400 mt-2">
                    * שדות חובה | הפרטים שלך מאובטחים בהתאם ל<a href="/privacy" target="_blank" className="underline hover:text-yellow-500">מדיניות הפרטיות</a>
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Left Side - Text Content */}
          <div className="order-1 lg:order-1 text-center lg:text-right space-y-6" dir="rtl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1 rounded-full">
              <Phone className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">מענה מהיר ומקצועי</span>
            </div>

            {/* Main Heading */}
            <h2 className="text-3xl lg:text-5xl font-bold leading-tight">
              אל תתקשרו אלינו,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                אנחנו נתקשר אליכם!
              </span>
            </h2>

            {/* Description */}
            <p className="text-lg text-gray-300 leading-relaxed max-w-xl mx-auto lg:mx-0">
              רוצים לעשות כמו אלפי הלקוחות המרוצים שלנו? צרו קשר עכשיו והצוות
              שלנו יחזור אליכם בתוך דקות ספורות. נשמח לשמוע מה אתם מחפשים
              ולהציע לכם הצעת מחיר מותאמת אישית.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
