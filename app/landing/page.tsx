'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Phone, Award, Zap, Shield, CheckCircle, ArrowLeft } from 'lucide-react'
import { setEnhancedConversionData, sendGoogleAdsConversion, sendMetaLeadEvent } from '@/lib/tracking'

export default function LandingPage() {
  const [form, setForm] = useState({ name: '', phone: '', description: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return
    if (!/^05\d{8}$/.test(form.phone.replace(/[-\s]/g, ''))) {
      alert('מספר טלפון לא תקין — נא להזין מספר ישראלי (05X)')
      return
    }

    setStatus('loading')

    try {
      // Save lead
      const { createLead } = await import('@/lib/db')
      const gclid = typeof window !== 'undefined' ? localStorage.getItem('gclid') || '' : ''

      await createLead({
        name: form.name.trim(),
        phone: form.phone.trim(),
        notes: form.description.trim(),
        source: 'landing',
        gclid,
      })

      // Send email notification
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_lead',
          data: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            notes: form.description.trim(),
            source: 'landing',
          },
        }),
      }).catch(() => {})

      // Send lead webhook
      await fetch('/api/lead-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          notes: form.description.trim(),
          source: 'landing',
          gclid,
        }),
      }).catch(() => {})

      // Tracking
      setEnhancedConversionData({ phone: form.phone.trim() })
      sendGoogleAdsConversion()
      sendMetaLeadEvent()

      setStatus('success')
      setForm({ name: '', phone: '', description: '' })
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-[#fffdf5]" dir="rtl">
      {/* Header */}
      <header className="py-6 text-center">
        <div className="flex justify-center mb-3">
          <Image src="/logo.png" alt="בדפוס" width={80} height={80} className="rounded-full" />
        </div>
        <p className="text-gray-500 text-lg">הדפסת חולצות איכותית במחיר שתאהבו</p>
      </header>

      {/* Hero */}
      <section className={`max-w-3xl mx-auto px-4 text-center py-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
          רוצים חולצות מודפסות?
          <br />
          <span className="text-[#f5a623]">השאירו פרטים ונחזור אליכם</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-xl mx-auto">
          ספרו לנו מה אתם מחפשים — ונחזור אליכם עם הצעת מחיר מותאמת אישית, בלי התחייבות.
        </p>
      </section>

      {/* Trust strip */}
      <section className={`max-w-3xl mx-auto px-4 py-8 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-[#fef3c7] flex items-center justify-center">
              <Award className="w-7 h-7 text-[#f5a623]" />
            </div>
            <span className="text-sm font-medium text-gray-700">איכות פרימיום</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-[#fef3c7] flex items-center justify-center">
              <Zap className="w-7 h-7 text-[#f5a623]" />
            </div>
            <span className="text-sm font-medium text-gray-700">מענה מהיר</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-[#fef3c7] flex items-center justify-center">
              <Shield className="w-7 h-7 text-[#f5a623]" />
            </div>
            <span className="text-sm font-medium text-gray-700">מחיר תחרותי</span>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className={`max-w-md mx-auto px-4 py-10 transition-all duration-700 delay-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        {status === 'success' ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">תודה!</h2>
            <p className="text-gray-600">נחזור אליך בהקדם עם הצעת מחיר</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">קבלו הצעת מחיר</h2>
            <p className="text-sm text-gray-500 text-center mb-4">ממלאים פרטים — אנחנו מתקשרים</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="איך קוראים לך?"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-right focus:ring-2 focus:ring-[#f5a623] focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון *</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="050-0000000"
                dir="ltr"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-right focus:ring-2 focus:ring-[#f5a623] focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תיאור ההזמנה</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="כמה חולצות? סוג הדפסה? תיאור העיצוב..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-right focus:ring-2 focus:ring-[#f5a623] focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3.5 bg-[#f5a623] hover:bg-[#e6950f] text-white font-bold text-lg rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {status === 'loading' ? (
                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  שלחו לי הצעת מחיר
                  <ArrowLeft className="w-5 h-5" />
                </>
              )}
            </button>

            {status === 'error' && (
              <p className="text-red-500 text-sm text-center">משהו השתבש, נסה שוב</p>
            )}

            <p className="text-[10px] text-center text-gray-400 mt-2">
              הפרטים שלך מאובטחים בהתאם ל<a href="/privacy" className="underline hover:text-[#f5a623]">מדיניות הפרטיות</a>
            </p>
          </form>
        )}
      </section>

      {/* Social proof */}
      <section className={`max-w-3xl mx-auto px-4 py-10 text-center transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="flex items-center justify-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <p className="text-gray-600 text-sm">4.8 מתוך 5 | 30+ ביקורות מאומתות בגוגל</p>
      </section>

      {/* WhatsApp float */}
      <a
        href="https://wa.me/972559885954?text=היי%20אני%20מעוניין/ת%20בהצעת%20מחיר%20להדפסת%20חולצות"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
        aria-label="שלח הודעת WhatsApp"
      >
        <svg className="w-7 h-7 text-white fill-current" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-400 border-t border-gray-100">
        <p>&copy; {new Date().getFullYear()} בדפוס. כל הזכויות שמורות.</p>
        <a href="https://badfos.co.il" className="text-[#f5a623] hover:underline mt-1 inline-block">badfos.co.il</a>
      </footer>
    </div>
  )
}
