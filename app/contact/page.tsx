'use client'

import { useState } from 'react'
import { Phone, Mail, MessageCircle, Instagram, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CONTACT_INFO } from '@/lib/constants'
import { createLead } from '@/lib/db'
import { sendGoogleAdsConversion, sendGenerateLeadEvent, sendMetaLeadEvent, trackWhatsAppClick, trackPhoneClick, getGclid } from '@/lib/tracking'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.phone && !/^(05\d{8}|0[23489]\d{7})$/.test(formData.phone.replace(/\D/g, ''))) {
      alert('מספר טלפון לא חוקי')
      return
    }

    setIsSubmitting(true)

    try {
      const gclid = getGclid()
      const message = formData.message ? `${formData.subject ? `נושא: ${formData.subject}\n` : ''}${formData.message}` : formData.subject

      await createLead({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        message,
        source: 'contact_form',
        status: 'new',
        ...(gclid && { gclid }),
      })

      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_lead',
          data: { name: formData.name, phone: formData.phone, email: formData.email, source: 'contact_form', status: 'new', message },
        }),
      }).catch(console.error)

      sendGoogleAdsConversion()
      sendGenerateLeadEvent('contact_form')
      sendMetaLeadEvent()

      setSubmitted(true)
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
      setTimeout(() => setSubmitted(false), 5000)
    } catch (error) {
      console.error('Error:', error)
      alert('אירעה שגיאה. אנא נסו שוב.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const contactMethods = [
    {
      icon: Phone,
      title: 'טלפון',
      value: '050-7794277',
      link: `tel:${CONTACT_INFO.phone}`,
      gradient: 'from-green-500 to-emerald-600',
      external: false,
    },
    {
      icon: Mail,
      title: 'אימייל',
      value: 'badfos2002@gmail.com',
      link: `mailto:${CONTACT_INFO.email}`,
      gradient: 'from-blue-500 to-indigo-600',
      external: false,
    },
    {
      icon: MessageCircle,
      title: 'וואטסאפ',
      value: 'שלח הודעה',
      link: `https://wa.me/${CONTACT_INFO.whatsapp}`,
      gradient: 'from-green-500 to-teal-600',
      external: true,
    },
    {
      icon: Instagram,
      title: 'אינסטגרם',
      value: 'עקבו אחרינו',
      link: CONTACT_INFO.instagram,
      gradient: 'from-pink-500 to-rose-600',
      external: true,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 py-20 relative overflow-hidden" dir="rtl">
      {/* Decorative Background Circles */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-teal-300/30 to-cyan-300/30 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-blue-300/30 to-indigo-300/30 rounded-full blur-3xl"></div>

      <div className="mx-auto max-w-[1536px] px-4 md:px-0 relative z-10">
        {/* Header */}
        <div className="text-center mb-16" dir="rtl">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6">
            <MessageCircle className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-600">בואו נשוחח</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            יצירת קשר
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            יש לכם שאלה? רוצים להתייעץ? אנחנו כאן בשבילכם
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Contact Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl" dir="rtl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              שלחו לנו הודעה
            </h2>

            {submitted ? (
              <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-8 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">
                  תודה רבה!
                </h3>
                <p className="text-green-700">
                  קיבלנו את ההודעה שלך ונחזור אליך בהקדם
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2 text-right text-gray-700">
                    שם מלא *
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="הזן שם מלא"
                    className="text-right h-12 border-teal-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-right text-gray-700">
                    אימייל *
                  </label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@email.com"
                    className="text-right h-12 border-teal-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-right text-gray-700">
                    טלפון
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="050-0000000"
                    className="text-right h-12 border-teal-200 focus:border-teal-500 focus:ring-teal-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-right text-gray-700">
                    נושא
                  </label>
                  <Input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="על מה תרצו לדבר?"
                    className="text-right h-12 border-teal-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-right text-gray-700">
                    הודעה *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="כתבו לנו את ההודעה שלכם..."
                    className="w-full px-4 py-3 border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-right resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-14 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all inline-flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    'שולח...'
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      שלח הודעה
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Contact Methods */}
          <div className="space-y-6" dir="rtl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              פרטי התקשרות
            </h2>

            {contactMethods.map((method, index) => {
              const Icon = method.icon
              const handleMethodClick = () => {
                if (method.link.startsWith('https://wa.me')) trackWhatsAppClick('contact_page')
                else if (method.link.startsWith('tel:')) trackPhoneClick()
              }
              return (
                <a
                  key={index}
                  href={method.link}
                  {...(method.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  onClick={handleMethodClick}
                  className="flex items-center gap-4 bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-200 group"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.gradient} flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-bold text-gray-900 mb-1">{method.title}</h3>
                    <p className="text-gray-600">{method.value}</p>
                  </div>
                </a>
              )
            })}

            {/* Info Box */}
            <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl p-8 text-white shadow-xl mt-8">
              <h3 className="text-xl font-bold mb-3">שעות פעילות</h3>
              <p className="mb-4">
                ראשון-חמישי: 9:00-18:00
                <br />
                שישי: 9:00-13:00
              </p>
              <p className="text-sm opacity-90">
                זמן מענה ממוצע: תוך 24 שעות
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
