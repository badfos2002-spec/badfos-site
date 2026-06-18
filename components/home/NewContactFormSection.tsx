'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendLeadWebhook, getGclid } from '@/lib/tracking'
import { User, Phone, ArrowLeft, Clock, Star, ShieldCheck, Sparkles } from 'lucide-react'
import Reveal from '@/components/common/Reveal'
import RevealText from '@/components/common/RevealText'

export default function NewContactFormSection() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    comments: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Auto-reset submitted state with cleanup (prevents memory leak)
  useEffect(() => {
    if (!submitted) return
    const timer = setTimeout(() => setSubmitted(false), 5000)
    return () => clearTimeout(timer)
  }, [submitted])
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

      sendLeadWebhook({ name: formData.name, phone: formData.phone, message, source: 'bottom_form', ...(gclid && { gclid }) })

      setSubmitted(true)
      setFormData({ name: '', phone: '', comments: '' })
    } catch (error) {
      console.error('Error:', error)
      alert('אירעה שגיאה. אנא נסו שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-24 lg:py-32 bg-[#0a0a0f] text-white relative overflow-hidden" dir="rtl">
      {/* Deep brand gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d14] via-[#0a0a0f] to-[#100a05] pointer-events-none"></div>
      {/* Atmosphere Blobs — richer, brand-forward glow */}
      <div className="absolute top-[-6rem] right-[-4rem] w-72 h-72 md:w-[34rem] md:h-[34rem] bg-yellow-400/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-8rem] left-[-4rem] w-72 h-72 md:w-[36rem] md:h-[36rem] bg-orange-500/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-amber-500/[0.05] rounded-full blur-3xl pointer-events-none"></div>
      {/* Subtle grid texture */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:34px_34px]"></div>
      {/* Top hairline accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent pointer-events-none"></div>

      <div className="mx-auto max-w-[1536px] px-4 md:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Right Side - Form Card */}
          <Reveal as="div" className="order-2 lg:order-2" y={48} duration={0.9} scale={0.94} delay={0.1}>
            <div className="group/card relative max-w-md mx-auto lg:mx-0 lg:ml-auto" dir="rtl">
              {/* Soft glow halo behind the card */}
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-yellow-400/40 via-orange-500/25 to-amber-300/40 rounded-[2rem] blur-2xl opacity-60 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <div className="relative bg-white rounded-[1.75rem] shadow-2xl ring-1 ring-black/5 p-6 sm:p-7 md:p-8 text-gray-900 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_40px_80px_-20px_rgba(251,191,36,0.45)]">
              {/* Floating Decorative Icon */}
              <div className="absolute -top-5 -left-5 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl rotate-3 flex items-center justify-center shadow-xl shadow-orange-500/50 animate-bounce ring-4 ring-white">
                <Phone className="w-6 h-6 text-white" />
              </div>

              {/* Form Header */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 mb-3 text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full ring-1 ring-orange-100">
                  <Sparkles className="w-3.5 h-3.5" />
                  ללא התחייבות
                </div>
                <h3 className="text-2xl md:text-[1.7rem] font-black text-gray-900 mb-1.5 tracking-tight">
                  השאירו פרטים ליצירת קשר
                </h3>
                <p className="text-sm text-gray-500">
                  נחזור אליכם בהקדם עם הצעה מותאמת אישית
                </p>
                <div className="mt-4 h-px w-full bg-gradient-to-l from-transparent via-gray-200 to-transparent"></div>
              </div>

              {submitted ? (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 rounded-2xl p-6 text-center" role="status" aria-live="polite">
                  <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30 text-3xl">✅</div>
                  <h4 className="font-extrabold text-lg text-green-800 mb-1">
                    תודה רבה!
                  </h4>
                  <p className="text-sm text-green-700">
                    קיבלנו את הפרטים שלך ונחזור אליך בהקדם
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="relative">
                    <label className="block text-xs font-semibold mb-1.5 text-right text-gray-700">
                      שם מלא *
                    </label>
                    <User className="absolute top-[2.1rem] right-3 w-4 h-4 text-yellow-500" />
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="הזן שם מלא"
                      className="text-right h-12 text-sm bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:bg-white transition-colors pr-9"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-semibold mb-1.5 text-right text-gray-700">
                      מספר טלפון *
                    </label>
                    <Phone className="absolute top-[2.1rem] right-3 w-4 h-4 text-yellow-500" />
                    <Input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="050-0000000"
                      className="text-right h-12 text-sm bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:bg-white transition-colors pr-9"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-right text-gray-700">
                      הערות
                    </label>
                    <textarea
                      rows={2}
                      value={formData.comments}
                      onChange={(e) =>
                        setFormData({ ...formData, comments: e.target.value })
                      }
                      placeholder="הערות נוספות (אופציונלי)"
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:bg-white transition-colors text-right"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 text-white font-extrabold h-14 text-base rounded-2xl shadow-lg shadow-orange-500/25 inline-flex items-center justify-center gap-2 group transition-all duration-200"
                  >
                    {loading ? 'שולח...' : (
                      <>
                        חזרו אלי עם הצעה
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    <span>
                      הפרטים שלך מאובטחים בהתאם ל<a href="/privacy" target="_blank" className="underline hover:text-yellow-600">מדיניות הפרטיות</a>
                    </span>
                  </div>
                </form>
              )}
            </div>
            </div>
          </Reveal>

          {/* Left Side - Text Content */}
          <div className="order-1 lg:order-1 text-center lg:text-right">
            <Reveal as="div" className="space-y-7" stagger={0.15} y={28}>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-4 py-1.5 rounded-full shadow-lg shadow-black/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
                </span>
                <span className="text-sm font-semibold text-yellow-400 tracking-wide">מענה מהיר ומקצועי</span>
              </div>

              {/* Main Heading */}
              <h2 className="text-4xl lg:text-[3.75rem] font-black leading-[1.05] tracking-tight">
                <RevealText
                  as="span"
                  text="אל תתקשרו אלינו,"
                  className="block"
                  y={24}
                  stagger={0.07}
                />
                <RevealText
                  as="span"
                  text="אנחנו נתקשר אליכם!"
                  className="block mt-1.5 text-white drop-shadow-[0_4px_24px_rgba(251,191,36,0.35)]"
                  y={24}
                  delay={0.2}
                  stagger={0.07}
                />
              </h2>

              {/* Description */}
              <p className="text-lg text-gray-300/90 leading-relaxed max-w-xl mx-auto lg:mx-0">
                רוצים לעשות כמו אלפי הלקוחות המרוצים שלנו? צרו קשר עכשיו והצוות
                שלנו יחזור אליכם בתוך דקות ספורות. נשמח לשמוע מה אתם מחפשים
                ולהציע לכם הצעת מחיר מותאמת אישית.
              </p>

              {/* Trust Signals */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 pt-1">
                <div className="inline-flex items-center gap-2 text-gray-200">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/15 ring-1 ring-yellow-400/30">
                    <Clock className="w-4 h-4 text-yellow-400" />
                  </span>
                  <span className="text-sm font-semibold">מענה תוך דקות</span>
                </div>
                <div className="inline-flex items-center gap-2 text-gray-200">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/15 ring-1 ring-yellow-400/30">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  </span>
                  <span className="text-sm font-semibold">דירוג 5 כוכבים</span>
                </div>
                <div className="inline-flex items-center gap-2 text-gray-200">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/15 ring-1 ring-yellow-400/30">
                    <ShieldCheck className="w-4 h-4 text-yellow-400" />
                  </span>
                  <span className="text-sm font-semibold">ללא התחייבות</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
