'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Award, Zap, Shield, CheckCircle, ArrowLeft, Clock, Users, Star } from 'lucide-react'
import { setEnhancedConversionData, sendGoogleAdsConversion, sendMetaLeadEvent } from '@/lib/tracking'

export default function LandingPage() {
  const [form, setForm] = useState({ name: '', phone: '', description: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [phoneError, setPhoneError] = useState('')
  const [visible, setVisible] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    setVisible(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneError('')
    if (!form.name.trim() || !form.phone.trim()) return

    const cleanPhone = form.phone.replace(/[-\s]/g, '')
    if (!/^05\d{8}$/.test(cleanPhone)) {
      setPhoneError('מספר טלפון לא תקין — נא להזין מספר ישראלי (05X)')
      return
    }

    setStatus('loading')

    try {
      const { createLead } = await import('@/lib/db')
      const gclid = typeof window !== 'undefined' ? localStorage.getItem('gclid') || '' : ''

      await createLead({
        name: form.name.trim(),
        phone: form.phone.trim(),
        message: form.description.trim(),
        source: 'landing',
        status: 'new',
        gclid,
      })

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

      setEnhancedConversionData({ phone: form.phone.trim() })
      sendGoogleAdsConversion()
      sendMetaLeadEvent()

      setStatus('success')
      setForm({ name: '', phone: '', description: '' })
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  return (
    <div className="min-h-screen bg-[#fffdf5]" dir="rtl">
      {/* Header */}
      <header className="py-5 text-center">
        <div className="flex justify-center mb-2">
          <Image src="/logo.png" alt="בדפוס" width={72} height={72} className="rounded-full" />
        </div>
      </header>

      {/* Hero + Form side by side on desktop */}
      <section className={`max-w-5xl mx-auto px-4 py-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Left: Hero text + trust */}
          <div className="text-center lg:text-right space-y-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              חולצות מודפסות באיכות פרימיום
              <br />
              <span className="text-[#f5a623]">במחיר שלא תמצאו במקום אחר</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-lg mx-auto lg:mx-0">
              ספרו לנו מה אתם מחפשים — ונחזור אליכם עם הצעת מחיר מותאמת אישית, בלי התחייבות.
            </p>

            {/* Trust strip */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full bg-[#fef3c7] flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#f5a623]" />
                </div>
                <span className="text-xs font-medium text-gray-700">500+ לקוחות</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full bg-[#fef3c7] flex items-center justify-center">
                  <Clock className="w-6 h-6 text-[#f5a623]" />
                </div>
                <span className="text-xs font-medium text-gray-700">מענה תוך 2 שעות</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full bg-[#fef3c7] flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#f5a623]" />
                </div>
                <span className="text-xs font-medium text-gray-700">ביטוח איכות 100%</span>
              </div>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-1 justify-center lg:justify-start pt-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
              <span className="text-gray-500 text-sm mr-2">4.8 מתוך 5 | 30+ ביקורות בגוגל</span>
            </div>
          </div>

          {/* Right: Form */}
          <div>
            {status === 'success' ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center" role="alert" aria-live="polite">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">תודה!</h2>
                <p className="text-gray-600">נחזור אליך תוך 2 שעות עם הצעת מחיר</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-4">
                <h2 className="text-xl font-bold text-gray-900 text-center mb-1">קבלו הצעת מחיר חינם</h2>
                <p className="text-sm text-gray-500 text-center mb-4">ממלאים פרטים — מתקשרים תוך 2 שעות</p>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">שם מלא *</label>
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
                  <label className="block text-sm font-medium text-gray-900 mb-1">טלפון *</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => {
                      setForm({ ...form, phone: e.target.value })
                      if (phoneError) setPhoneError('')
                    }}
                    placeholder="050-0000000"
                    dir="ltr"
                    className={`w-full px-4 py-3 border rounded-xl text-right focus:ring-2 focus:ring-[#f5a623] focus:border-transparent outline-none transition-all ${
                      phoneError ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {phoneError && (
                    <p className="text-red-500 text-xs mt-1" role="alert">{phoneError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">תיאור ההזמנה</label>
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
                    <span className="text-base">שולח את הפרטים...</span>
                  ) : (
                    <>
                      שלחו לי הצעת מחיר
                      <ArrowLeft className="w-5 h-5" />
                    </>
                  )}
                </button>

                {status === 'error' && (
                  <p className="text-red-500 text-sm text-center" role="alert">
                    בעיה בשליחה. בדוק חיבור לאינטרנט ונסה שוב.
                  </p>
                )}

                <p className="text-xs text-center text-gray-400 mt-2">
                  הפרטים שלך מאובטחים בהתאם ל<a href="/privacy" className="underline hover:text-[#f5a623]">מדיניות הפרטיות</a>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={`max-w-4xl mx-auto px-4 py-12 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">מה הלקוחות שלנו אומרים</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'דני אברהם', role: 'מנהל אירועים', text: 'הדפסנו 200 חולצות לאירוע — איכות מעולה ושירות מהיר. ממליץ בחום!' },
            { name: 'מיכל לוי', role: 'מעצבת', text: 'הצוות היה סבלני ומקצועי. התוצאה הסופית הפתיעה אותי לטובה.' },
            { name: 'אורי כהן', role: 'בעל עסק', text: 'מחיר תחרותי, איכות גבוהה, ומענה מהיר. חזרתי להזמין פעם שנייה.' },
          ].map((t, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-3">&ldquo;{t.text}&rdquo;</p>
              <p className="text-sm font-bold text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-400">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Video — lazy loaded */}
      <section className={`max-w-2xl mx-auto px-4 py-8 transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <h2 className="text-xl font-bold text-gray-900 text-center mb-4">ראו את איכות ההדפסה שלנו</h2>
        {showVideo ? (
          <div className="relative w-full aspect-video rounded-2xl shadow-xl overflow-hidden bg-black">
            <iframe
              src="https://www.youtube.com/embed/ZBnLtKpF3l8?start=64&autoplay=1&mute=0&loop=1&playlist=ZBnLtKpF3l8"
              title="בדפוס - הדפסת חולצות באיכות גבוהה"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        ) : (
          <button
            onClick={() => setShowVideo(true)}
            className="relative w-full aspect-video rounded-2xl shadow-xl overflow-hidden bg-gray-900 group cursor-pointer"
          >
            <Image
              src={`https://img.youtube.com/vi/ZBnLtKpF3l8/hqdefault.jpg`}
              alt="צפו בסרטון"
              fill
              className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-[#f5a623] mr-[-2px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </button>
        )}
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
