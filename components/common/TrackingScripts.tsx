'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    dataLayer: any[]
    gtag: (...args: any[]) => void
    gtagSendEvent: (url?: string) => boolean
    fbq: (...args: any[]) => void
    _fbq: any
  }
}

export default function TrackingScripts() {
  // Capture GCLID from URL and save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const gclid = params.get('gclid')
      if (gclid) {
        localStorage.setItem('gclid', gclid)
      }
    }
  }, [])

  // Load GTM, Google Ads (gtag.js), Meta Pixel, AdSense - Gated by Cookie Consent
  useEffect(() => {
    let scriptLoaded = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const loadScripts = () => {
      if (scriptLoaded) return
      scriptLoaded = true

      // Google Tag Manager
      ;(function (w: any, d: Document, s: string, l: string, i: string) {
        w[l] = w[l] || []
        w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
        const f = d.getElementsByTagName(s)[0]
        const j = d.createElement(s) as HTMLScriptElement
        const dl = l !== 'dataLayer' ? '&l=' + l : ''
        j.async = true
        j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl
        f.parentNode?.insertBefore(j, f)
      })(window, document, 'script', 'dataLayer', 'GTM-W677BNL4')

      // Google Ads (gtag.js)
      const gtagScript = document.createElement('script')
      gtagScript.async = true
      gtagScript.src =
        'https://www.googletagmanager.com/gtag/js?id=AW-17871272500'
      document.head.appendChild(gtagScript)

      window.dataLayer = window.dataLayer || []
      function gtag(...args: any[]) {
        window.dataLayer.push(args)
      }
      window.gtag = gtag
      gtag('js', new Date())
      gtag('config', 'AW-17871272500')
      gtag('config', 'G-4P6F1YWVN5') // GA4

      // Helper function to delay opening a URL until a gtag event is sent
      window.gtagSendEvent = function (url?: string) {
        const callback = function () {
          if (typeof url === 'string') {
            window.location.href = url
          }
        }
        const gtagFn =
          window.gtag ||
          function (...args: any[]) {
            ;(window.dataLayer = window.dataLayer || []).push(args)
          }

        gtagFn('event', 'ads_conversion___1', {
          event_callback: callback,
          event_timeout: 2000,
        })
        return false
      }

      // Meta Pixel Code
      ;(function (
        f: any,
        b: Document,
        e: string,
        v: string,
        n?: any,
        t?: any,
        s?: any
      ) {
        if (f.fbq) return
        n = f.fbq = function () {
          n.callMethod
            ? n.callMethod.apply(n, arguments)
            : n.queue.push(arguments)
        }
        if (!f._fbq) f._fbq = n
        n.push = n
        n.loaded = true
        n.version = '2.0'
        n.queue = []
        t = b.createElement(e) as HTMLScriptElement
        t.async = true
        t.src = v
        s = b.getElementsByTagName(e)[0]
        s.parentNode?.insertBefore(t, s)
      })(
        window,
        document,
        'script',
        'https://connect.facebook.net/en_US/fbevents.js'
      )
      window.fbq('init', '877576361459806')
      window.fbq('track', 'PageView')

      // Google AdSense
      const adsenseScript = document.createElement('script')
      adsenseScript.async = true
      adsenseScript.src =
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7072889783523515'
      adsenseScript.crossOrigin = 'anonymous'
      document.head.appendChild(adsenseScript)
    }

    // Check for consent
    const checkConsentAndLoad = () => {
      const hasConsent =
        localStorage.getItem('cookie_consent') === 'accepted' ||
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('cookie_consent=accepted'))

      if (hasConsent) {
        timer = setTimeout(loadScripts, 3500)
      }
    }

    checkConsentAndLoad()

    const handleConsent = () => {
      loadScripts()
    }

    window.addEventListener('cookieConsentAccepted', handleConsent)

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('cookieConsentAccepted', handleConsent)
    }
  }, [])

  return null
}
