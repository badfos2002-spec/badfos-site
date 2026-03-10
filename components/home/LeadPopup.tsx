'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Loader2, Check } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createLead } from '@/lib/db'
import { sendGoogleAdsConversion, sendGenerateLeadEvent, sendMetaLeadEvent, getGclid } from '@/lib/tracking'

const validatePhone = (p: string) => {
  const clean = p.replace(/\D/g, '')
  return /^(05\d{8}|0[23489]\d{7})$/.test(clean)
}

export default function LeadPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [hasConsentedCookies, setHasConsentedCookies] = useState(false)

  // Check cookie consent
  useEffect(() => {
    const checkConsent = () => {
      const consent =
        localStorage.getItem('cookie_consent') === 'accepted' ||
        document.cookie.includes('cookie_consent=accepted')
      setHasConsentedCookies(consent)
    }

    checkConsent()
    window.addEventListener('storage', checkConsent)

    const handleConsentAccepted = () => setHasConsentedCookies(true)
    window.addEventListener('cookieConsentAccepted', handleConsentAccepted)

    return () => {
      window.removeEventListener('storage', checkConsent)
      window.removeEventListener('cookieConsentAccepted', handleConsentAccepted)
    }
  }, [])

  // Show popup after delay (only if consented and not dismissed)
  useEffect(() => {
    if (!hasConsentedCookies) return

    const isClosed = localStorage.getItem('lead_popup_closed')
    const wasShown = sessionStorage.getItem('lead_popup_shown')

    if (isClosed || wasShown) return

    const timer = setTimeout(() => {
      setIsOpen(true)
      sessionStorage.setItem('lead_popup_shown', 'true')
    }, 4000)

    return () => clearTimeout(timer)
  }, [hasConsentedCookies])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  const handleClose = () => {
    localStorage.setItem('lead_popup_closed', 'true')
    setIsOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone) return

    if (!validatePhone(phone)) {
      setPhoneError('מספר לא חוקי')
      return
    }
    setPhoneError('')

    setIsSubmitting(true)

    try {
      const gclid = getGclid()

      await createLead({
        name,
        phone,
        email: '',
        source: 'popup',
        status: 'new',
        ...(gclid && { gclid }),
      })

      // Send email notification
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_lead', data: { name, phone, email: '', source: 'popup', status: 'new' } }),
      }).catch(console.error)

      sendGoogleAdsConversion()
      sendGenerateLeadEvent('popup')
      sendMetaLeadEvent()

      setIsSuccess(true)
      setTimeout(() => {
        setIsOpen(false)
      }, 3000)
    } catch (error) {
      console.error('Error submitting lead:', error)
      alert('אירעה שגיאה. נסה שוב מאוחר יותר.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ direction: 'ltr' }}>
      {/* Overlay — no click to dismiss */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* Popup Window */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-[85%] md:w-96 p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 z-10"
        style={{ direction: 'rtl' }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="סגור"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center mb-6">
          <Image
            src="/logo.png"
            alt="בדפוס"
            width={80}
            height={80}
            className="h-20 w-auto mb-4 object-contain"
          />
          <h3 className="text-gray-900 font-bold text-2xl">
            רוצים שנחזור אליכם?
          </h3>
          <p className="text-gray-500 text-base mt-2">
            השאירו פרטים ונחזור בהקדם עם הצעה משתלמת!
          </p>
        </div>

        {/* Form / Success */}
        {isSuccess ? (
          <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">תודה רבה!</h4>
            <p className="text-gray-500">נחזור אליכם בהקדם</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute top-3 right-3 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="שם מלא *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-12 text-right pr-10"
              />
            </div>

            <div className="relative">
              <Phone className="absolute top-3 right-3 w-5 h-5 text-gray-400" />
              <Input
                type="tel"
                placeholder="טלפון *"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError('') }}
                required
                className={`w-full h-12 text-right pr-10 ${phoneError ? 'border-red-500' : ''}`}
                dir="ltr"
              />
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">{phoneError}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-semibold h-12 rounded-full shadow-lg inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  שולח...
                </>
              ) : (
                'שלחו לי הצעה!'
              )}
            </Button>
          </form>
        )}

        <p className="text-xs text-[#64748b] text-center mt-4">
          נשמור על הפרטים שלכם ולא נשתף אותם עם צד שלישי
        </p>
      </div>
    </div>
  )
}
