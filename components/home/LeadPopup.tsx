'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { X, User, Phone, Loader2, Check } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createLead } from '@/lib/db'
import { sendGoogleAdsConversion, sendGenerateLeadEvent, sendMetaLeadEvent, sendLeadWebhook, setEnhancedConversionData, getGclid } from '@/lib/tracking'
import { safeGetItem, safeSetItem, safeSessionGet, safeSessionSet } from '@/lib/safe-storage'

const validatePhone = (p: string) => {
  const clean = p.replace(/\D/g, '')
  return /^(05\d{8}|0[23489]\d{7})$/.test(clean)
}

export default function LeadPopup() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const lastSubmitRef = useRef(0)
  const triggeredRef = useRef(false)

  // Don't show on admin, share, landing, cart, payment pages
  const hideOnRoutes = ['/admin', '/share', '/landing', '/cart', '/payment']
  const shouldHide = hideOnRoutes.some(r => pathname?.startsWith(r))

  // Show popup after 4 seconds on page
  useEffect(() => {
    if (shouldHide) return
    const isClosed = safeGetItem('lead_popup_closed')
    const wasShown = safeSessionGet('lead_popup_shown')
    if (isClosed || wasShown) return

    const timer = setTimeout(() => {
      if (!triggeredRef.current) {
        triggeredRef.current = true
        setIsOpen(true)
        safeSessionSet('lead_popup_shown', 'true')
      }
    }, 4000)

    return () => clearTimeout(timer)
  }, [shouldHide])

  const handleClose = () => {
    safeSetItem('lead_popup_closed', 'true')
    setIsOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone) return

    if (Date.now() - lastSubmitRef.current < 15000) {
      alert('נא להמתין לפני שליחה נוספת')
      return
    }

    if (!validatePhone(phone)) {
      setPhoneError('מספר לא חוקי')
      return
    }
    setPhoneError('')

    setIsSubmitting(true)
    lastSubmitRef.current = Date.now()

    try {
      const gclid = getGclid()

      await createLead({
        name,
        phone,
        source: 'popup',
        status: 'new',
        ...(gclid && { gclid }),
      })

      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'new_lead', data: { name, phone, source: 'popup', status: 'new' } }),
        })
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr)
      }

      setEnhancedConversionData({ phone })
      sendGoogleAdsConversion()
      sendGenerateLeadEvent('popup')
      sendMetaLeadEvent()
      sendLeadWebhook({ name, phone, source: 'popup', ...(gclid && { gclid }) })

      setIsSuccess(true)
      safeSetItem('lead_popup_closed', 'true')
      setTimeout(() => setIsOpen(false), 3000)
    } catch (error) {
      console.error('Error submitting lead:', error)
      alert('אירעה שגיאה. נסו שוב מאוחר יותר.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Semi-transparent backdrop — click to dismiss */}
      <div
        className="fixed inset-0 z-[9999] bg-black/30 animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Popup — slides up from bottom, doesn't block scrolling */}
      <div
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 z-[10000] animate-in slide-in-from-bottom-4 duration-300"
        dir="rtl"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-3 left-3 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <Image src="/logo.png" alt="בדפוס" width={40} height={40} className="h-10 w-auto" />
            <div>
              <h3 className="text-gray-900 font-bold text-lg">רוצים שנחזור אליכם?</h3>
              <p className="text-gray-500 text-sm">השאירו פרטים ונחזור בהקדם</p>
            </div>
          </div>

          {/* Form / Success */}
          {isSuccess ? (
            <div className="text-center py-4 animate-in fade-in duration-300" role="status" aria-live="polite">
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
                <Input
                  type="text"
                  placeholder="שם מלא *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full h-10 text-right pr-9 text-sm"
                />
              </div>

              <div className="relative">
                <Phone className="absolute top-3 right-3 w-4 h-4 text-gray-400" />
                <Input
                  type="tel"
                  placeholder="טלפון *"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError('') }}
                  required
                  className={`w-full h-10 text-right pr-9 text-sm ${phoneError ? 'border-red-500' : ''}`}
                  dir="ltr"
                />
                {phoneError && (
                  <p className="text-xs text-red-500 mt-1">{phoneError}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-semibold h-10 rounded-full shadow-lg inline-flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    שולח...
                  </>
                ) : (
                  'שלחו לי הצעה!'
                )}
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
