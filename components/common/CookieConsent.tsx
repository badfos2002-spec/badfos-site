'use client'

import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted')
    document.cookie = 'cookie_consent=accepted; max-age=31536000; path=/'
    setVisible(false)
    window.dispatchEvent(new Event('cookieConsentAccepted'))
  }

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-auto md:right-6 z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-100 px-6 py-5 md:max-w-sm animate-in slide-in-from-bottom duration-300"
      dir="rtl"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        🍪 עוגיות ופרטיות
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        אנו משתמשים בקובצי Cookie כדי לשפר את החוויה שלך באתר, לנתח תנועה
        ולהציג תוכן מותאם אישית. למידע נוסף, קרא את מדיניות הפרטיות שלנו.
      </p>
      <button
        onClick={handleAccept}
        className="w-full px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] rounded-full shadow-md transition-all"
      >
        אני מסכים/ה
      </button>
    </div>
  )
}
