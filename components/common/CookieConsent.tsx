'use client'

import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      setVisible(true)
      document.body.style.overflow = 'hidden'
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted')
    document.cookie = 'cookie_consent=accepted; max-age=31536000; path=/'
    document.body.style.overflow = 'unset'
    setVisible(false)
    window.dispatchEvent(new Event('cookieConsentAccepted'))
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center"
      style={{ direction: 'ltr', touchAction: 'none', overscrollBehavior: 'none' }}
      onTouchMove={(e) => e.preventDefault()}
      onWheel={(e) => e.preventDefault()}
    >
      {/* Overlay — blocks everything */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Popup */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-[85%] p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 z-10"
        dir="rtl"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="text-5xl mb-4">🍪</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            עוגיות ופרטיות
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            אנו משתמשים בקובצי Cookie כדי לשפר את החוויה שלך באתר, לנתח תנועה
            ולהציג תוכן מותאם אישית.
          </p>
        </div>

        <button
          onClick={handleAccept}
          className="w-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] rounded-full shadow-lg transition-all"
        >
          אני מסכים/ה
        </button>

        <p className="text-xs text-gray-400 text-center mt-3">
          בלחיצה על &quot;אני מסכים/ה&quot; אתה מאשר את השימוש בעוגיות
        </p>
      </div>
    </div>
  )
}
