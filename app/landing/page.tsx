'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { CheckCircle, Clock, Users, Shield, Star, ChevronDown, Phone, Briefcase, Swords, Trophy } from 'lucide-react'
import { setEnhancedConversionData, sendGoogleAdsConversion, sendMetaLeadEvent } from '@/lib/tracking'

// Counter animation hook
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = Date.now()
        const tick = () => {
          const elapsed = Date.now() - start
          const progress = Math.min(elapsed / duration, 1)
          setCount(Math.floor(progress * target))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return { count, ref }
}

// Scroll reveal hook
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

export default function LandingPage() {
  const [form, setForm] = useState({ name: '', phone: '', description: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [phoneError, setPhoneError] = useState('')
  const [heroVisible, setHeroVisible] = useState(false)
  const [nameValid, setNameValid] = useState(false)
  const [phoneValid, setPhoneValid] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const counter = useCountUp(1200)
  const audienceReveal = useReveal()
  const trustReveal = useReveal()
  const testimonialsReveal = useReveal()
  const guaranteeReveal = useReveal()
  const formReveal = useReveal()

  useEffect(() => {
    setHeroVisible(true)
    window.scrollTo(0, 0)
  }, [])
  useEffect(() => { nameRef.current?.focus() }, [])

  // Inline validation
  useEffect(() => {
    setNameValid(form.name.trim().length >= 2)
  }, [form.name])

  useEffect(() => {
    const clean = form.phone.replace(/[-\s]/g, '')
    setPhoneValid(/^05\d{8}$/.test(clean))
  }, [form.phone])

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
    <div className="min-h-screen bg-[#fdfcf9] pb-[72px] md:pb-0" dir="rtl">
      <a href="#form-section" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:z-[999]">דלג לטופס</a>

      {/* ═══ HERO ═══ */}
      <section className="relative bg-gradient-to-br from-[#0d1b2a] via-[#1a2e45] to-[#0d1b2a] text-white overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-[#ffc32e]/15 rounded-full blur-3xl pointer-events-none animate-pulse" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-32 w-[300px] h-[300px] bg-[#ffc32e]/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-8 pb-10 text-center">
          <Image src="/logo.png" alt="לוגו בדפוס — הדפסת חולצות" width={52} height={52} className="rounded-full mx-auto mb-4" />

          {/* Badge with pulse */}
          <div className={`inline-flex items-center gap-2 bg-[#ffc32e]/15 border border-[#ffc32e]/30 text-[#ffc32e] text-xs sm:text-sm font-semibold px-4 py-2 rounded-full mb-5 whitespace-nowrap transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true" />
            <span>מענה תוך שעה ⚡</span>
          </div>

          {/* H1 — AIDA: Attention */}
          <h1 className={`text-[1.5rem] sm:text-[1.85rem] md:text-4xl lg:text-[2.8rem] font-black leading-[1.2] tracking-[-0.5px] mb-3 transition-all duration-700 delay-100 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            חולצות שאנשים עוצרים ושואלים עליהן
            <br />
            <span className="text-[#ffc32e]">ישירות מהמפעל בישראל</span>
          </h1>

          {/* Sub — AIDA: Interest */}
          <p className={`text-sm sm:text-base text-white/65 max-w-lg mx-auto mb-5 leading-relaxed transition-all duration-700 delay-200 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            לחיילים, עסקים וקבוצות | מינימום 10 יח׳ | אספקה עד 7 ימי עסקים
          </p>

          {/* Trust row — AIDA: Desire */}
          <div className={`flex justify-center flex-wrap gap-4 sm:gap-5 mb-6 transition-all duration-700 delay-300 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="flex items-center gap-1.5 text-white/55 text-xs sm:text-sm font-medium"><span aria-hidden="true">✅</span> 500+ לקוחות</div>
            <div className="flex items-center gap-1.5 text-white/55 text-xs sm:text-sm font-medium">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" aria-hidden="true" /> 4.8 בגוגל
            </div>
            <div className="flex items-center gap-1.5 text-white/55 text-xs sm:text-sm font-medium"><span aria-hidden="true">🛡️</span> ערבות איכות</div>
          </div>

          {/* CTA — AIDA: Action */}
          <a href="#form-section"
            className={`inline-flex items-center gap-2 bg-gradient-to-r from-[#ffc32e] to-[#f5a623] text-[#0d1b2a] font-bold text-base px-7 py-3.5 rounded-full shadow-[0_4px_24px_rgba(240,165,0,0.4)] hover:shadow-[0_8px_36px_rgba(240,165,0,0.55)] hover:scale-105 transition-all whitespace-nowrap ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            קבלו מחיר תוך שעה — חינם
            <ChevronDown className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          </a>

          {/* Micro-copy */}
          <p className="text-[11px] text-white/35 mt-2">✓ חינם | ✓ ללא התחייבות | ✓ מענה תוך שעה</p>
        </div>
      </section>

      {/* ═══ URGENCY BAR ═══ */}
      <div className="bg-[#ffc32e]/10 border-b border-[#ffc32e]/20 py-2.5 text-center">
        <p className="text-sm text-[#92400e] font-medium flex items-center justify-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
          3 עסקים פנו אלינו היום — מענה מהיר לפניות שמגיעות עכשיו
        </p>
      </div>

      {/* ═══ GOOGLE RATING ═══ */}
      <section className="bg-white py-8 sm:py-10 border-y border-gray-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 fill-yellow-400 drop-shadow-sm" aria-hidden="true" />
            ))}
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 mb-0.5">4.8 מתוך 5</p>
          <p className="text-base text-gray-500">30+ ביקורות מאומתות בגוגל</p>
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

      {/* ═══ VIDEO ═══ */}
      <section className="bg-gradient-to-b from-[#fdfcf9] to-[#f5f0e8] py-8 sm:py-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">ראו את איכות ההדפסה שלנו</h2>
          <div className="relative w-full max-w-sm mx-auto aspect-[9/16] rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            <iframe
              src="https://www.youtube.com/embed/ZBnLtKpF3l8?start=64&autoplay=1&mute=1&loop=1&playlist=ZBnLtKpF3l8&controls=0&modestbranding=1&rel=0"
              title="בדפוס - הדפסת חולצות באיכות גבוהה"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </section>

      {/* ═══ FORM (moved up before video) ═══ */}
      <section ref={formReveal.ref} id="form-section" className="max-w-lg mx-auto px-4 py-10 sm:py-14 scroll-mt-8">
        <p className="text-center text-xs font-semibold text-[#d4940a] tracking-wider uppercase mb-2">הצעת מחיר חינם</p>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0d1b2a] text-center mb-2">קבלו הצעת מחיר תוך שעה</h2>
        <p className="text-center text-gray-500 text-sm mb-6">ממלאים פרטים — מתקשרים אליכם</p>

        {status === 'success' ? (
          <div className={`bg-white rounded-2xl shadow-lg p-8 text-center transition-all duration-500 ${formReveal.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} role="alert" aria-live="polite">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">תודה!</h3>
            <p className="text-gray-600">נחזור אליך תוך שעה בימי עסקים עם הצעת מחיר</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={`bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border-t-4 border-[#ffc32e] p-5 sm:p-6 md:p-8 space-y-4 sm:space-y-5 transition-all duration-700 ${formReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm text-center" role="alert">
                בעיה בשליחה. בדקו חיבור לאינטרנט ונסו שוב.
              </div>
            )}

            <div>
              <label htmlFor="name-field" className="block text-sm font-semibold text-gray-800 mb-1.5 text-center md:text-right">שם מלא <span className="text-[#d4940a]">*</span></label>
              <div className="relative">
                <input ref={nameRef} id="name-field" type="text" required aria-required="true" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="איך קוראים לך?"
                  className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-center md:text-right focus:ring-2 focus:ring-[#ffc32e] focus:border-[#ffc32e] outline-none transition-all ${nameValid ? 'border-green-400' : 'border-gray-200'}`} />
                {nameValid && <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" aria-hidden="true" />}
              </div>
            </div>

            <div>
              <label htmlFor="phone-field" className="block text-sm font-semibold text-gray-800 mb-1.5 text-center md:text-right">טלפון <span className="text-[#d4940a]">*</span></label>
              <div className="relative">
                <input id="phone-field" type="tel" required aria-required="true" aria-describedby={phoneError ? 'phone-error' : undefined}
                  value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (phoneError) setPhoneError('') }}
                  placeholder="050-0000000" dir="ltr" style={{ textAlign: 'left' }}
                  className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-[#ffc32e] focus:border-[#ffc32e] outline-none transition-all ${phoneError ? 'border-red-400 bg-red-50' : phoneValid ? 'border-green-400' : 'border-gray-200'}`} />
                {phoneValid && !phoneError && <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" aria-hidden="true" />}
              </div>
              {phoneError && <p id="phone-error" className="text-red-500 text-xs mt-1.5 text-center" role="alert">{phoneError}</p>}
            </div>

            <div>
              <label htmlFor="desc-field" className="block text-sm font-semibold text-gray-800 mb-1.5 text-center md:text-right">ספרו לנו עוד <span className="text-gray-400 font-normal text-xs">(אופציונלי)</span></label>
              <textarea id="desc-field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="כמה חולצות? סוג הדפסה? תיאור העיצוב..."
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-center md:text-right focus:ring-2 focus:ring-[#ffc32e] focus:border-[#ffc32e] outline-none transition-all resize-none" />
            </div>

            <div className="flex items-center justify-center gap-1 pt-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" aria-hidden="true" />)}
              <span className="text-gray-400 text-xs mr-1.5">4.8 מתוך 5 | 30+ ביקורות בגוגל</span>
            </div>

            <button type="submit" disabled={status === 'loading'}
              className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-[#ffc32e] to-[#f5a623] hover:from-[#f5a623] hover:to-[#d4940a] text-[#0d1b2a] font-bold text-base sm:text-lg rounded-full shadow-[0_4px_24px_rgba(240,165,0,0.35)] hover:shadow-[0_8px_32px_rgba(240,165,0,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap">
              {status === 'loading' ? (
                <span className="flex items-center gap-2"><span className="animate-spin w-5 h-5 border-2 border-[#0d1b2a] border-t-transparent rounded-full" />שולח...</span>
              ) : (
                <>שלחו לי הצעה עכשיו <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" /></>
              )}
            </button>

            <p className="text-xs text-center text-gray-400">
              ✓ תוך שעה | ✓ ללא ספאם | ✓ ללא התחייבות |{' '}
              <a href="/privacy" className="underline hover:text-[#d4940a]">מדיניות פרטיות</a>
            </p>
          </form>
        )}
      </section>

      {/* ═══ AUDIENCE CARDS ═══ */}
      <section ref={audienceReveal.ref} className="max-w-4xl mx-auto px-4 py-10 sm:py-12">
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-700 ${audienceReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {[
            { icon: <Swords className="w-8 h-8 text-[#d4940a]" />, title: 'חיילים ויחידות', desc: 'גדודים, טקסי סיום, עיצוב אישי — מינימום 10 יח׳' },
            { icon: <Briefcase className="w-8 h-8 text-[#d4940a]" />, title: 'עסקים ומותגים', desc: 'חולצות צוות, מיתוג, אירועי חברה' },
            { icon: <Trophy className="w-8 h-8 text-[#d4940a]" />, title: 'קבוצות ספורט', desc: 'יוניפורמים, אימוניות, חולצות תחרות' },
          ].map((card, i) => (
            <div key={i} className={`bg-white rounded-2xl p-5 sm:p-6 border-r-4 border-[#ffc32e] text-center md:text-right shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${audienceReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${i * 120}ms` }}>
              <div className="mb-3 flex justify-center md:justify-start" aria-hidden="true">{card.icon}</div>
              <h3 className="font-bold text-gray-900 text-base mb-1">{card.title}</h3>
              <p className="text-sm text-gray-500">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TRUST CARDS ═══ */}
      <section ref={trustReveal.ref} className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Users className="w-7 h-7 text-[#d4940a]" aria-hidden="true" />, title: '500+ לקוחות מרוצים', desc: 'עסקים, אירועים, קבוצות ספורט — כולם חוזרים' },
            { icon: <Clock className="w-7 h-7 text-[#d4940a]" aria-hidden="true" />, title: 'אספקה עד 7 ימי עסקים', desc: 'מהאישור עד אליכם — מהיר ואמין' },
            { icon: <Shield className="w-7 h-7 text-[#d4940a]" aria-hidden="true" />, title: 'פגם בייצור? מדפיסים מחדש', desc: 'הדפסה חוזרת או החזר כספי מלא' },
          ].map((card, i) => (
            <div key={i} className={`bg-white rounded-2xl border border-[#ffc32e]/10 shadow-sm hover:shadow-lg hover:-translate-y-2 transition-all duration-500 ease-out p-5 sm:p-6 text-center ${trustReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${i * 150}ms` }}>
              <div className="w-12 h-12 rounded-full bg-[#fef3c7] flex items-center justify-center mx-auto mb-3">{card.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm sm:text-base">{card.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ COUNTER + TESTIMONIALS ═══ */}
      <section ref={testimonialsReveal.ref} className="bg-[#fdfcf9] py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4">
          {/* Counter */}
          <div ref={counter.ref} className="text-center mb-8">
            <p className="text-3xl sm:text-4xl font-black text-[#0d1b2a]">{counter.count.toLocaleString()}+</p>
            <p className="text-sm text-gray-500 mt-1">הזמנות הושלמו בהצלחה</p>
          </div>

          <h2 className={`text-xl sm:text-2xl font-bold text-[#0d1b2a] text-center mb-6 sm:mb-8 transition-all duration-700 ${testimonialsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>מה הלקוחות שלנו אומרים</h2>
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 transition-all duration-700 delay-200 ${testimonialsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {[
              { name: 'דני אברהם', role: 'מנהל אירועים', badge: 'הזמין 200 חולצות לאירוע', initial: 'ד', text: 'איכות מעולה ושירות מהיר. ממליץ בחום!' },
              { name: 'מיכל לוי', role: 'מנהלת שיווק', badge: 'חולצות ממותגות לצוות', initial: 'מ', text: 'הצוות היה סבלני ומקצועי. התוצאה הפתיעה לטובה.' },
              { name: 'אורי כהן', role: 'מאמן קבוצת כדורגל', badge: 'יוניפורם לקבוצה', initial: 'א', text: 'מחיר תחרותי, איכות גבוהה. חזרתי להזמין פעם שנייה.' },
            ].map((t, i) => (
              <div key={i} className={`bg-white rounded-2xl border border-[#ffc32e]/10 p-5 sm:p-6 shadow-sm hover:shadow-lg hover:-translate-y-2 transition-all duration-500 ease-out ${testimonialsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${i * 150}ms` }}>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" aria-hidden="true" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-3">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffc32e] to-[#f5a623] flex items-center justify-center text-[#0d1b2a] font-bold text-sm flex-shrink-0" aria-hidden="true">{t.initial}</div>
                  <div className="text-center md:text-right">
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                    <p className="text-[11px] text-[#d4940a] font-medium mt-0.5">{t.badge}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GUARANTEE ═══ */}
      <section ref={guaranteeReveal.ref} className="bg-[#fef3c7]/50 py-10 border-y border-[#ffc32e]/15">
        <div className={`max-w-2xl mx-auto px-4 text-center transition-all duration-700 ${guaranteeReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <Shield className="w-12 h-12 text-[#d4940a] mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-xl sm:text-2xl font-black text-[#0d1b2a] mb-2">ערבות איכות מוחלטת</h2>
          <p className="text-gray-700 text-sm sm:text-base leading-relaxed mb-4">פגם בייצור = הדפסה חוזרת חינם, או החזר כספי מלא — ללא שאלות</p>
          <p className="text-xs text-[#92400e] font-medium">🇮🇱 הדפסה בישראל | תמיכה בעברית | עסק ישראלי</p>
        </div>
      </section>

      {/* ═══ BOTTOM CTA ═══ */}
      <section className="bg-[#fef3c7] py-10 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">מוכנים? תנו לנו 30 שניות</h2>
        <p className="text-sm text-gray-600 mb-5">תקבלו מחיר מותאם אישית — חינם</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="#form-section" className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ffc32e] to-[#f5a623] text-[#0d1b2a] font-bold text-base px-6 py-3 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap">
            קבלו הצעת מחיר חינם <CheckCircle className="w-5 h-5" aria-hidden="true" />
          </a>
          <a href="tel:0559885954" className="inline-flex items-center gap-2 border-2 border-[#0d1b2a]/20 text-gray-900 font-bold text-base px-6 py-3 rounded-full hover:bg-white/50 transition-all whitespace-nowrap">
            <Phone className="w-4 h-4" aria-hidden="true" /> 055-988-5954
          </a>
        </div>
      </section>

      {/* ═══ MOBILE STICKY BAR ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-[200] md:hidden bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-3 py-2.5 flex gap-2">
        <a href="https://wa.me/972559885954?text=היי%20אני%20מעוניין/ת%20בהצעת%20מחיר" target="_blank" rel="noopener noreferrer"
          className="flex-1 bg-[#25D366] text-white font-bold text-sm py-3 rounded-xl text-center flex items-center justify-center gap-1.5">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </a>
        <a href="/" className="flex-1 bg-gradient-to-r from-[#ffc32e] to-[#f5a623] text-white font-bold text-sm py-3 rounded-xl text-center shadow-sm">
          לאתר שלנו
        </a>
      </div>

      {/* WhatsApp FAB — desktop only */}
      <a href="https://wa.me/972559885954?text=היי%20אני%20מעוניין/ת%20בהצעת%20מחיר%20להדפסת%20חולצות"
        target="_blank" rel="noopener noreferrer"
        className="hidden md:flex fixed bottom-6 right-6 w-14 h-14 bg-green-500 rounded-full items-center justify-center shadow-lg hover:scale-110 transition-transform z-50 group"
        aria-label="שלח הודעת WhatsApp — מענה תוך שעה">
        <svg className="w-7 h-7 text-white fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="absolute left-full mr-3 bg-[#0d1b2a] text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">מענה תוך שעה</span>
      </a>

      {/* Footer */}
      <footer className="bg-[#0d1b2a] border-t border-[#ffc32e]/10 py-6 text-center">
        <Image src="/logo.png" alt="בדפוס" width={36} height={36} className="mx-auto mb-2 opacity-80" />
        <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} בדפוס. כל הזכויות שמורות.</p>
        <a href="https://badfos.co.il" className="text-xs text-white/60 hover:text-[#ffc32e] transition-colors mt-1 inline-block">badfos.co.il</a>
      </footer>
    </div>
  )
}
