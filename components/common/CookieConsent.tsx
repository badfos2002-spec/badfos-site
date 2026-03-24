'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { safeGetItem, safeSetItem } from '@/lib/safe-storage'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = safeGetItem('cookie_consent')
    if (!consent) {
      // Small delay so page renders first
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    safeSetItem('cookie_consent', 'accepted')
    document.cookie = 'cookie_consent=accepted; max-age=31536000; path=/'
    setVisible(false)
    window.dispatchEvent(new Event('cookieConsentAccepted'))
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[11000] animate-in slide-in-from-bottom duration-300"
      dir="rtl"
    >
      <div className="bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3 md:py-4">
        <div className="max-w-[1536px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-600 text-center sm:text-right">
            🍪 אנו משתמשים בעוגיות לשיפור החוויה באתר.{' '}
            <Link href="/privacy" className="underline text-indigo-600 hover:text-indigo-800">
              מדיניות פרטיות
            </Link>
          </p>
          <button
            onClick={handleAccept}
            className="shrink-0 px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] rounded-full shadow-md transition-all"
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  )
}
