'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    dataLayer: any[]
    gtag?: (...args: any[]) => void
    gtagSendEvent?: (url?: string) => boolean
    fbq?: (...args: any[]) => void
    _fbq?: any
  }
}

export default function TrackingScripts() {
  // Capture GCLID from URL and save to localStorage + cookie (90 day expiry)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const raw = params.get('gclid')
      if (raw) {
        // Clean: trim whitespace, no encoding — store raw value only
        const gclid = raw.trim()
        if (gclid) {
          localStorage.setItem('gclid', gclid)
          // Store raw in cookie too (no encodeURIComponent — GCLID is already URL-safe)
          document.cookie = `gclid=${gclid}; max-age=${90 * 24 * 60 * 60}; path=/; SameSite=Lax`
        }
      }
    } catch {}
  }, [])

  // Google Consent Mode v2 — the gtag stub + consent DEFAULT now live as a
  // static inline script in app/layout.tsx <head>, so they execute before
  // gtag.js/gtm.js are ever requested. This effect only listens for the user
  // accepting cookies and fires the consent UPDATE via the head-defined
  // window.gtag. Do NOT re-stub window.gtag or re-send a consent default here —
  // that would double the page_view.
  useEffect(() => {
    const handleConsent = () => {
      window.gtag?.('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted',
      })
    }
    window.addEventListener('cookieConsentAccepted', handleConsent)
    return () => window.removeEventListener('cookieConsentAccepted', handleConsent)
  }, [])

  // Script loading — split by vendor:
  //  • GTM loads ALWAYS (gtag.js is static in app/layout.tsx <head>, so the
  //    tag is detectable in raw HTML and all traffic is measured). Consent
  //    Mode v2 — default set in <head> — keeps Google cookieless until the
  //    user accepts.
  //  • Meta Pixel + AdSense stay gated behind cookie consent — Consent Mode has
  //    no authority over them.
  useEffect(() => {
    let googleLoaded = false
    let marketingLoaded = false
    let googleTimer: ReturnType<typeof setTimeout> | null = null
    let marketingTimer: ReturnType<typeof setTimeout> | null = null

    const loadGoogleScripts = () => {
      if (googleLoaded) return
      googleLoaded = true

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

      // gtag.js itself (with 'js'/'config' calls) is loaded statically from
      // app/layout.tsx <head>. Loading or configuring it again here would
      // double-count every page_view.

      // Helper function to delay opening a URL until a gtag event is sent
      window.gtagSendEvent = function (url?: string) {
        const callback = function () {
          if (typeof url === 'string') {
            try {
              const parsed = new URL(url, window.location.origin)
              // Allow same-origin relative URLs and whitelisted external domains
              const isSameOrigin = parsed.origin === window.location.origin
              const isAllowed = parsed.protocol === 'https:' && [
                'badfos.co.il', 'make.com', 'grow.business', 'grow.link',
                'cardcom.solutions', 'meshulam.co.il', 'hyp.co.il',
                'pay.google.com', 'checkout.stripe.com',
              ].some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))
              if (isSameOrigin || isAllowed) {
                window.location.href = url
              } else {
                console.warn('Blocked unauthorized redirect in gtagSendEvent:', url)
              }
            } catch {
              console.warn('Invalid URL in gtagSendEvent:', url)
            }
          }
        }
        const gtagFn =
          window.gtag ||
          function (..._args: any[]) {
            ;(window.dataLayer = window.dataLayer || []).push(arguments)
          }

        gtagFn('event', 'ads_conversion___1', {
          event_callback: callback,
          event_timeout: 2000,
        })
        return false
      }
    }

    const loadMarketingScripts = () => {
      if (marketingLoaded) return
      marketingLoaded = true

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
      window.fbq!('init', '877576361459806')
      window.fbq!('track', 'PageView')

      // Google AdSense
      const adsenseScript = document.createElement('script')
      adsenseScript.async = true
      adsenseScript.src =
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7072889783523515'
      adsenseScript.crossOrigin = 'anonymous'
      document.head.appendChild(adsenseScript)
    }

    // Google: always load. The small delay is for performance only — it is NOT
    // a consent gate. Consent Mode v2 governs whether cookies are written.
    googleTimer = setTimeout(loadGoogleScripts, 500)

    // Meta Pixel + AdSense: consent-gated (unchanged behaviour)
    const checkConsentAndLoad = () => {
      let storedConsent: string | null = null
      try { storedConsent = localStorage.getItem('cookie_consent') } catch {}
      const hasConsent =
        storedConsent === 'accepted' ||
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('cookie_consent=accepted'))

      if (hasConsent) {
        marketingTimer = setTimeout(loadMarketingScripts, 500)
      }
    }

    checkConsentAndLoad()

    const handleConsent = () => {
      loadMarketingScripts()
    }

    window.addEventListener('cookieConsentAccepted', handleConsent)

    return () => {
      if (googleTimer) clearTimeout(googleTimer)
      if (marketingTimer) clearTimeout(marketingTimer)
      window.removeEventListener('cookieConsentAccepted', handleConsent)
    }
  }, [])

  return null
}
