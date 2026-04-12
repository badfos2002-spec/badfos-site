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
      <div className="fixed inset-0 z-[9999] bg-black/30" onClick={handleClose} />
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 z-[10000]" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 relative">
          <button onClick={handleClose} className="absolute top-3 left-3 text-gray-400 hover:text-gray-600" aria-label="סגור">
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <Image src="/logo.png" alt="בדפוס" width={40} height={40} className="h-10 w-auto" />
            <div>
              <h3 className="text-gray-900 font-bold text-lg">רוצים שנחזור אליכם?</h3>
              <p className="text-gray-500 text-sm">השאירו פרטים ונחזור בהקדם</p>
            </div>
          </div>

          {status === 'success' ? (
            <div className="text-center py-4" role="status">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">תודה רבה!</h4>
              <p className="text-gray-500 text-sm">נחזור אליכם בהקדם</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <User className="absolute top-3 right-3 w-4 h-4 text-gray-400" />
                <Input type="text" placeholder="שם מלא *" value={name} onChange={(e) => setName(e.target.value)} required className="w-full h-10 text-right pr-9 text-sm" />
              </div>
              <div className="relative">
                <PhoneIcon className="absolute top-3 right-3 w-4 h-4 text-gray-400" />
                <Input type="tel" placeholder="טלפון *" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneError('') }} required className={`w-full h-10 text-right pr-9 text-sm ${phoneError ? 'border-red-500' : ''}`} dir="ltr" />
                {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
              </div>
              <Button type="submit" disabled={status === 'loading'} className="w-full bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-semibold h-10 rounded-full shadow-lg text-sm">
                {status === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" /> שולח...</> : 'שלחו לי הצעה!'}
              </Button>
            </form>
          )}

          <p className="text-xs text-gray-400 text-center mt-3">
            הפרטים שלכם מאובטחים בהתאם ל<a href="/privacy" target="_blank" className="underline hover:text-indigo-500">מדיניות הפרטיות</a>
          </p>
        </div>
      </div>
    </>
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
      <CookieConsent />
    </>
  )
}
