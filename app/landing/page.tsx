'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { CheckCircle, Clock, Users, Shield, Star, ChevronDown, Phone } from 'lucide-react'
import { setEnhancedConversionData, sendGoogleAdsConversion, sendMetaLeadEvent } from '@/lib/tracking'

export default function LandingPage() {
  const [form, setForm] = useState({ name: '', phone: '', description: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [phoneError, setPhoneError] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => { setVisible(true) }, [])

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
      await createLead({ name: form.name.trim(), phone: form.phone.trim(), message: form.description.trim(), source: 'landing', status: 'new', gclid })
      await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'new_lead', data: { name: form.name.trim(), phone: form.phone.trim(), notes: form.description.trim(), source: 'landing' } }) }).catch(() => {})
      await fetch('/api/lead-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim(), notes: form.description.trim(), source: 'landing', gclid }) }).catch(() => {})
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
      {/* Skip to content */}
      <a href="#form-section" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:z-[999]">
        דלג לטופס
      </a>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-[#f5a623]/15 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-8 pb-12 text-center">
          <Image src="/logo.png" alt="לוגו בדפוס — הדפסת חולצות" width={56} height={56} className="rounded-full mx-auto mb-5" />

          <div className="inline-flex items-center gap-2 bg-[#f5a623]/15 border border-[#f5a623]/30 text-[#f5a623] text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full mb-5 whitespace-nowrap">
            <span aria-hidden="true">⚡</span>
            <span>מענה תוך שעה</span>
          </div>

          <h1 className={`text-[1.55rem] sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight mb-3 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            חולצות מודפסות באיכות פרימיום
            <br />
            <span className="text-[#f5a623]">במחיר ישיר מהמפעל</span>
          </h1>

          <p className={`text-sm sm:text-base text-white/70 max-w-xl mx-auto mb-6 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            מינימום 10 יח׳ | אספקה עד 7 ימי עסקים | הדפסה בישראל
          </p>

          <a
            href="#form-section"
            className={`inline-flex items-center gap-2 bg-gradient-to-r from-[#f5a623] to-[#c97d0a] text-[#1a1a2e] font-bold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full shadow-[0_4px_24px_rgba(245,166,35,0.4)] hover:shadow-[0_8px_32px_rgba(245,166,35,0.55)] hover:scale-105 transition-all whitespace-nowrap ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            קבלו הצעת מחיר חינם
            <ChevronDown className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          </a>
          <p className="text-xs sm:text-sm text-white/40 mt-2">בלי התחייבות — ממלאים פרטים ואנחנו מתקשרים</p>

          <div className={`flex justify-center flex-wrap gap-4 sm:gap-6 mt-8 transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="flex items-center gap-1.5 text-white/60 text-xs sm:text-sm"><span aria-hidden="true">✅</span> 500+ לקוחות</div>
            <div className="flex items-center gap-1.5 text-white/60 text-xs sm:text-sm"><span aria-hidden="true">⭐</span> 4.8 בגוגל</div>
            <div className="flex items-center gap-1.5 text-white/60 text-xs sm:text-sm"><span aria-hidden="true">🛡️</span> ביטוח איכות</div>
          </div>
        </div>
      </section>

      {/* Google Rating — BIG */}
      <section className="bg-white py-8 sm:py-10 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-yellow-400 fill-yellow-400 drop-shadow-sm" aria-hidden="true" />
            ))}
          </div>
          <p className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-0.5">4.8 מתוך 5</p>
          <p className="text-base sm:text-lg text-gray-500">30+ ביקורות מאומתות בגוגל</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-xs font-medium text-gray-400">Google Reviews</span>
          </div>
        </div>
      </section>

      {/* Video — autoplay full width */}
      <section className="bg-[#1a1a2e] py-8 sm:py-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative w-full max-w-sm mx-auto aspect-[9/16] rounded-2xl shadow-2xl overflow-hidden">
            <iframe
              src="https://www.youtube.com/embed/ZBnLtKpF3l8?start=64&autoplay=1&mute=1&loop=1&playlist=ZBnLtKpF3l8&controls=0&modestbranding=1&rel=0"
              title="בדפוס - הדפסת חולצות באיכות גבוהה"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
          <p className="text-center text-white/40 text-xs sm:text-sm mt-3">ראו את איכות ההדפסה שלנו במו עיניכם</p>
        </div>
      </section>

      {/* Trust cards */}
      <section className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Users className="w-7 h-7 text-[#a86200]" aria-hidden="true" />, title: '500+ לקוחות מרוצים', desc: 'עסקים, אירועים, קבוצות ספורט — כולם חוזרים' },
            { icon: <Clock className="w-7 h-7 text-[#a86200]" aria-hidden="true" />, title: 'אספקה עד 7 ימי עסקים', desc: 'מהאישור עד אליכם — מהיר ואמין' },
            { icon: <Shield className="w-7 h-7 text-[#a86200]" aria-hidden="true" />, title: 'פגם בייצור? מדפיסים מחדש', desc: 'פגם ייצור = הדפסה חוזרת או החזר כספי מלא' },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#f5a623]/10 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all p-5 sm:p-6 text-center md:text-right" style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#fef3c7] flex items-center justify-center mx-auto md:mx-0 mb-3">
                {card.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm sm:text-base">{card.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials — BEFORE form */}
      <section className="bg-white py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-center text-xs font-semibold text-[#a86200] tracking-wider uppercase mb-2">ביקורות מאומתות</p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a1a2e] text-center mb-6 sm:mb-8">מה הלקוחות שלנו אומרים</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {[
              { name: 'דני אברהם', role: 'מנהל אירועים', initial: 'ד', text: 'הדפסנו 200 חולצות לאירוע — איכות מעולה ושירות מהיר. ממליץ בחום!' },
              { name: 'מיכל לוי', role: 'מעצבת', initial: 'מ', text: 'הצוות היה סבלני ומקצועי. התוצאה הסופית הפתיעה אותי לטובה.' },
              { name: 'אורי כהן', role: 'בעל עסק', initial: 'א', text: 'מחיר תחרותי, איכות גבוהה, ומענה מהיר. חזרתי להזמין פעם שנייה.' },
            ].map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl border border-[#f5a623]/10 p-5 sm:p-6 hover:shadow-md hover:-translate-y-1 transition-all">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f5a623] to-[#c97d0a] flex items-center justify-center text-[#1a1a2e] font-bold text-sm" aria-hidden="true">{t.initial}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form section */}
      <section id="form-section" className="max-w-lg mx-auto px-4 py-10 sm:py-14 scroll-mt-8">
        <p className="text-center text-xs font-semibold text-[#a86200] tracking-wider uppercase mb-2">הצעת מחיר חינם</p>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#1a1a2e] text-center mb-2">קבלו הצעת מחיר תוך שעה</h2>
        <p className="text-center text-gray-500 text-sm sm:text-base mb-6 sm:mb-8">ממלאים פרטים — מתקשרים אליכם</p>

        {status === 'success' ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center" role="alert" aria-live="polite">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">תודה!</h3>
            <p className="text-gray-600">נחזור אליך תוך שעה בימי עסקים עם הצעת מחיר</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-[#f5a623]/10 p-5 sm:p-6 md:p-8 space-y-4 sm:space-y-5">
            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm text-center" role="alert">
                בעיה בשליחה. בדקו חיבור לאינטרנט ונסו שוב.
              </div>
            )}

            <div>
              <label htmlFor="name-field" className="block text-sm font-semibold text-gray-800 mb-1.5">
                שם מלא <span className="text-[#a86200]">*</span>
              </label>
              <input id="name-field" type="text" required aria-required="true" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="איך קוראים לך?"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-right focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none transition-all" />
            </div>

            <div>
              <label htmlFor="phone-field" className="block text-sm font-semibold text-gray-800 mb-1.5">
                טלפון <span className="text-[#a86200]">*</span>
              </label>
              <input id="phone-field" type="tel" required aria-required="true" aria-describedby={phoneError ? 'phone-error' : undefined}
                value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (phoneError) setPhoneError('') }}
                placeholder="050-0000000" dir="ltr" style={{ textAlign: 'left' }}
                className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none transition-all ${phoneError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
              {phoneError && <p id="phone-error" className="text-red-500 text-xs mt-1.5" role="alert">{phoneError}</p>}
            </div>

            <div>
              <label htmlFor="desc-field" className="block text-sm font-semibold text-gray-800 mb-1.5">
                ספרו לנו עוד <span className="text-gray-400 font-normal text-xs">(אופציונלי)</span>
              </label>
              <textarea id="desc-field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="כמה חולצות? סוג הדפסה? תיאור העיצוב..."
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-right focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none transition-all resize-none" />
            </div>

            <div className="flex items-center justify-center gap-1 pt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" aria-hidden="true" />
              ))}
              <span className="text-gray-400 text-xs mr-1.5">4.8 מתוך 5 | 30+ ביקורות בגוגל</span>
            </div>

            <button type="submit" disabled={status === 'loading'}
              className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-[#f5a623] to-[#c97d0a] hover:from-[#c97d0a] hover:to-[#a86200] text-[#1a1a2e] font-bold text-base sm:text-lg rounded-full shadow-[0_4px_24px_rgba(245,166,35,0.35)] hover:shadow-[0_8px_32px_rgba(245,166,35,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap">
              {status === 'loading' ? (
                <span className="flex items-center gap-2"><span className="animate-spin w-5 h-5 border-2 border-[#1a1a2e] border-t-transparent rounded-full" />שולח...</span>
              ) : (
                <>שלחו לי הצעת מחיר <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" /></>
              )}
            </button>

            <p className="text-xs text-center text-gray-400">
              ✓ אנחנו לא שולחים ספאם, רק הצעה מותאמת לך |{' '}
              <a href="/privacy" className="underline hover:text-[#a86200]">מדיניות פרטיות</a>
            </p>
          </form>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#1a1a2e] py-10 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">מוכנים להתחיל?</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="#form-section"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#f5a623] to-[#c97d0a] text-[#1a1a2e] font-bold text-base px-6 py-3 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap">
            קבלו הצעת מחיר חינם <CheckCircle className="w-5 h-5" aria-hidden="true" />
          </a>
          <a href="tel:0559885954"
            className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-bold text-base px-6 py-3 rounded-full hover:bg-white/10 transition-all whitespace-nowrap">
            <Phone className="w-4 h-4" aria-hidden="true" /> 055-988-5954
          </a>
        </div>
      </section>

      {/* WhatsApp FAB */}
      <a href="https://wa.me/972559885954?text=היי%20אני%20מעוניין/ת%20בהצעת%20מחיר%20להדפסת%20חולצות"
        target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50 group"
        aria-label="שלח הודעת WhatsApp — מענה תוך שעה">
        <svg className="w-7 h-7 text-white fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="absolute left-full mr-3 bg-[#1a1a2e] text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          מענה תוך שעה
        </span>
      </a>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] border-t border-[#f5a623]/10 py-6 text-center">
        <Image src="/logo.png" alt="בדפוס" width={36} height={36} className="mx-auto mb-2 opacity-80" />
        <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} בדפוס. כל הזכויות שמורות.</p>
        <a href="https://badfos.co.il" className="text-xs text-white/60 hover:text-[#f5a623] transition-colors mt-1 inline-block">badfos.co.il</a>
      </footer>
    </div>
  )
}
