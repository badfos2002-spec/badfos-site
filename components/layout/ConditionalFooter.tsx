'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { X, User, Phone as PhoneIcon, Loader2, Check } from 'lucide-react'
import Footer from './Footer'
import WhatsAppButton from './WhatsAppButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CookieConsent = dynamic(() => import('@/components/common/CookieConsent'), { ssr: false })

function SimpleLeadPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const lastSubmitRef = useRef(0)

  useEffect(() => {
    try {
      if (localStorage.getItem('lead_popup_closed')) return
      if (sessionStorage.getItem('lead_popup_shown')) return
    } catch { /* storage blocked */ }

    const timer = setTimeout(() => {
      setIsOpen(true)
      try { sessionStorage.setItem('lead_popup_shown', 'true') } catch {}
    }, 4000)

    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    try { localStorage.setItem('lead_popup_closed', 'true') } catch {}
    setIsOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    if (Date.now() - lastSubmitRef.current < 15000) return

    const clean = phone.replace(/\D/g, '')
    if (!/^05\d{8}$/.test(clean)) {
      setPhoneError('מספר לא חוקי')
      return
    }
    setPhoneError('')
    setStatus('loading')
    lastSubmitRef.current = Date.now()

    try {
      const gclid = (() => { try { return localStorage.getItem('gclid') || '' } catch { return '' } })()

      // Save lead via dynamic import (non-blocking)
      import('@/lib/db').then(({ createLead }) =>
        createLead({ name: name.trim(), phone: phone.trim(), source: 'popup' as const, status: 'new', ...(gclid && { gclid }) })
      ).catch(() => {})

      // Email notification
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_lead', data: { name: name.trim(), phone: phone.trim(), source: 'popup', status: 'new' } }),
      }).catch(() => {})

      // Lead webhook
      fetch('/api/lead-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), source: 'popup', ...(gclid && { gclid }) }),
      }).catch(() => {})

      // Tracking (dynamic to avoid import issues)
      import('@/lib/tracking').then(({ sendGoogleAdsConversion, sendGenerateLeadEvent, sendMetaLeadEvent, setEnhancedConversionData }) => {
        setEnhancedConversionData({ phone: phone.trim() })
        sendGoogleAdsConversion()
        sendGenerateLeadEvent('popup')
        sendMetaLeadEvent()
      }).catch(() => {})

      setStatus('success')
      try { localStorage.setItem('lead_popup_closed', 'true') } catch {}
      setTimeout(() => setIsOpen(false), 3000)
    } catch {
      setStatus('idle')
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl p-7 sm:p-8 md:p-10 border border-gray-100 relative w-full max-w-[420px] md:max-w-md lg:max-w-lg pointer-events-auto">
          <button onClick={handleClose} className="absolute top-3 left-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" aria-label="סגור">
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col items-center text-center mb-6">
            <Image src="/logo.png" alt="בדפוס" width={56} height={56} className="h-12 w-auto md:h-14 mb-3" />
            <h3 className="text-gray-900 font-bold text-xl md:text-2xl">רוצים שנחזור אליכם?</h3>
            <p className="text-gray-500 text-base md:text-lg mt-1">השאירו פרטים ונחזור בהקדם</p>
          </div>

          {status === 'success' ? (
            <div className="text-center py-8" role="status">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">תודה רבה!</h4>
              <p className="text-gray-500 text-base">נחזור אליכם בהקדם</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute top-3.5 right-3 w-5 h-5 text-gray-400" />
                <Input type="text" placeholder="שם מלא *" value={name} onChange={(e) => setName(e.target.value)} required className="w-full h-12 text-right pr-11 text-base" />
              </div>
              <div className="relative">
                <PhoneIcon className="absolute top-3.5 right-3 w-5 h-5 text-gray-400" />
                <Input type="tel" placeholder="טלפון *" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneError('') }} required className={`w-full h-12 text-right pr-11 text-base ${phoneError ? 'border-red-500' : ''}`} dir="ltr" />
                {phoneError && <p className="text-sm text-red-500 mt-1">{phoneError}</p>}
              </div>
              <Button type="submit" disabled={status === 'loading'} className="w-full bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-bold h-12 md:h-14 rounded-full shadow-lg text-base md:text-lg">
                {status === 'loading' ? <><Loader2 className="w-5 h-5 animate-spin" /> שולח...</> : 'שלחו לי הצעה!'}
              </Button>
            </form>
          )}

          <p className="text-sm text-gray-400 text-center mt-4">
            הפרטים שלכם מאובטחים בהתאם ל<a href="/privacy" target="_blank" className="underline hover:text-indigo-500">מדיניות הפרטיות</a>
          </p>
        </div>
      </div>
    </>
  )
}

function StickyMobileCTA() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  // Only show on pages where user isn't already in a flow
  const hideOnRoutes = ['/designer', '/cart', '/payment', '/admin', '/share', '/landing', '/lion-roar']
  const shouldShow = !hideOnRoutes.some(r => pathname?.startsWith(r))

  useEffect(() => {
    if (!shouldShow) return

    const onScroll = () => {
      // Show after scrolling past the hero (400px)
      setVisible(window.scrollY > 400)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [shouldShow])

  if (!shouldShow || !visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] lg:hidden">
      <div className="bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">הדפסת חולצות בעיצוב אישי</p>
          <p className="text-xs text-gray-500">החל מ-₪37 לחולצה</p>
        </div>
        <a
          href="/designer"
          className="flex-shrink-0 bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-lg"
        >
          עצב עכשיו
        </a>
      </div>
    </div>
  )
}

export default function ConditionalFooter() {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/share') || pathname?.startsWith('/landing')) return null
  return (
    <>
      <Footer />
      <WhatsAppButton />
      <SimpleLeadPopup />
      <StickyMobileCTA />
      <CookieConsent />
    </>
  )
}
