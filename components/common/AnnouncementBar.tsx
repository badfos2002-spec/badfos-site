'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Check, Tag } from 'lucide-react'

interface CouponBannerSettings {
  isActive: boolean
  code: string
  text: string
  showInHeader: boolean
  showInDesigner: boolean
}

const DEFAULTS: CouponBannerSettings = {
  isActive: false,
  code: '',
  text: '',
  showInHeader: true,
  showInDesigner: true,
}

interface AnnouncementBarProps {
  placement: 'header' | 'designer'
}

export default function AnnouncementBar({ placement }: AnnouncementBarProps) {
  const [settings, setSettings] = useState<CouponBannerSettings | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const key = `coupon_banner_dismissed_${placement}`
    if (typeof window !== 'undefined' && sessionStorage.getItem(key)) {
      setDismissed(true)
      return
    }
    // Dynamic import — don't pull Firebase into initial bundle
    import('@/lib/firebase').then(({ db }) => {
      if (!db) return
      import('firebase/firestore').then(({ doc, getDoc }) => {
        getDoc(doc(db, 'settings', 'couponBanner'))
          .then(snap => {
            if (snap.exists()) {
              setSettings({ ...DEFAULTS, ...snap.data() as CouponBannerSettings })
            }
          })
          .catch(console.error)
      })
    })
  }, [placement])

  const handleDismiss = () => {
    sessionStorage.setItem(`coupon_banner_dismissed_${placement}`, '1')
    setDismissed(true)
  }

  const handleCopy = () => {
    if (settings?.code) {
      navigator.clipboard.writeText(settings.code).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (dismissed || !settings || !settings.isActive) return null
  if (placement === 'header' && !settings.showInHeader) return null
  if (placement === 'designer' && !settings.showInDesigner) return null

  // ── Designer card variant ──────────────────────────────────────────────────
  if (placement === 'designer') {
    return (
      <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex items-center gap-3 relative" dir="rtl">
        <div className="flex-shrink-0 w-9 h-9 bg-yellow-400 rounded-full flex items-center justify-center">
          <Tag className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 font-medium leading-snug">{settings.text}</p>
          {settings.code && (
            <button
              type="button"
              onClick={handleCopy}
              className="mt-1.5 inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-xs px-3 py-1 rounded-full transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-700" /> : <Copy className="w-3 h-3" />}
              {copied ? 'הועתק!' : settings.code}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-yellow-200 rounded-full transition-colors"
          aria-label="סגור"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    )
  }

  // ── Header bar variant ─────────────────────────────────────────────────────
  return (
    <div className="bg-yellow-400 text-gray-900 py-2 px-4 relative z-50" dir="rtl">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm font-medium">
        <Tag className="w-4 h-4 flex-shrink-0" />
        <span>{settings.text}</span>
        {settings.code && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-white/80 hover:bg-white px-3 py-0.5 rounded-full font-bold transition-colors text-sm border border-yellow-500"
          >
            {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
            {copied ? 'הועתק!' : settings.code}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 rounded-full transition-colors"
        aria-label="סגור"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
