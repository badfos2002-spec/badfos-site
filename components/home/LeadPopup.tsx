'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createLead } from '@/lib/db'
import { sendGoogleAdsConversion, sendMetaLeadEvent } from '@/lib/tracking'

export default function LeadPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Check if popup was already shown in this session
    const popupShown = sessionStorage.getItem('leadPopupShown')

    if (!popupShown) {
      // Show popup after 10 seconds
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 10000) // 10 seconds

      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    sessionStorage.setItem('leadPopupShown', 'true')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await createLead({ name, phone, email: '', source: 'popup', status: 'new' })

      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_lead', data: { name, phone, email: '', source: 'popup', status: 'new' } }),
      }).catch(console.error)

      sendGoogleAdsConversion()
      sendMetaLeadEvent()

      handleClose()
    } catch (error) {
      console.error('Error submitting lead:', error)
      alert('אירעה שגיאה. נסה שוב מאוחר יותר.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Popup Window */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-[85%] md:w-full p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="סגור"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="text-center mb-6" dir="rtl">
          <div className="text-5xl mb-4">🎁</div>
          <h2 className="text-2xl font-bold text-[#1e293b] mb-2">
            רוצים שנחזור אליכם?
          </h2>
          <p className="text-[#64748b]">
            השאירו פרטים ונחזור בהקדם עם הצעה משתלמת!
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
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
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full h-12 text-right pr-10"
              dir="ltr"
            />
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
              '🚀 שלחו לי הצעה!'
            )}
          </Button>
        </form>

        <p className="text-xs text-[#64748b] text-center mt-4">
          נשמור על הפרטים שלכם ולא נשתף אותם עם צד שלישי
        </p>
      </div>
    </div>
  )
}
