'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
      // TODO: Add Firebase lead creation
      console.log('Lead submitted:', { name, phone, source: 'popup' })

      // Show success message
      alert('תודה! ניצור איתך קשר בהקדם.')
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Popup Window */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="סגור"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🎁</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            רוצים הטבה מיוחדת?
          </h2>
          <p className="text-gray-600">
            השאירו פרטים ונחזור אליכם עם הצעה אישית!
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="שם מלא *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full text-right"
            />
          </div>

          <div>
            <Input
              type="tel"
              placeholder="טלפון *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full text-right"
              dir="ltr"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-semibold h-12 rounded-full shadow-lg"
          >
            {isSubmitting ? 'שולח...' : '🚀 שלחו לי הצעה!'}
          </Button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          נשמור על הפרטים שלכם ולא נשתף אותם עם צד שלישי
        </p>
      </div>
    </div>
  )
}
