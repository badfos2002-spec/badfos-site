/**
 * Google Ads & Meta Pixel conversion tracking helpers
 */

const GOOGLE_ADS_ID = 'AW-17871272500'
const CONVERSION_LABEL = 'AW-17871272500/cEpjCIyrqOobELT018lC'

/** Push to dataLayer even if gtag not loaded yet — GTM will pick it up */
function gtagSafe(...args: any[]) {
  if (typeof window === 'undefined') return
  if (window.gtag) {
    window.gtag(...args)
  } else {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(arguments)
  }
}

/**
 * Ensure gtag.js is loaded — loads the script directly if not already present.
 * Used on payment/success page where we can't wait for cookie consent delay.
 * Returns a promise that resolves when gtag is ready.
 */
export function ensureGtagLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()

  // Already loaded
  if (window.gtag) return Promise.resolve()

  return new Promise((resolve) => {
    // Check if script tag already exists
    const existing = document.querySelector(`script[src*="gtag/js?id=${GOOGLE_ADS_ID}"]`)
    if (existing) {
      // Script exists but gtag not ready yet — wait for it
      const check = setInterval(() => {
        if (window.gtag) { clearInterval(check); resolve() }
      }, 100)
      setTimeout(() => { clearInterval(check); resolve() }, 5000)
      return
    }

    // Load gtag.js directly
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`
    script.onload = () => {
      window.dataLayer = window.dataLayer || []
      function gtag(..._args: any[]) { window.dataLayer.push(arguments) }
      window.gtag = gtag
      gtag('js', new Date())
      gtag('config', GOOGLE_ADS_ID)
      gtag('config', 'G-4P6F1YWVN5')
      resolve()
    }
    script.onerror = () => resolve() // Don't block on failure
    document.head.appendChild(script)
  })
}

export function sendGoogleAdsConversion(value = 1.0, transactionId?: string) {
  const gclid = getGclid()
  gtagSafe('event', 'conversion', {
    send_to: CONVERSION_LABEL,
    value,
    currency: 'ILS',
    ...(transactionId && { transaction_id: transactionId }),
    ...(gclid && { gclid }),
  })
}

export function sendGenerateLeadEvent(source: string) {
  const gclid = getGclid()
  gtagSafe('event', 'generate_lead', {
    currency: 'ILS',
    value: 1.0,
    source,
    ...(gclid && { gclid }),
  })
  // Push explicit dataLayer event for GTM triggers
  pushDataLayerEvent('lead_form_submit', {
    source,
    currency: 'ILS',
    value: 1.0,
    ...(gclid && { gclid }),
  })
}

export function sendPurchaseEvent(transactionId: string, value: number, items: Array<{ id: string; name: string; category: string; price: number; quantity: number }>) {
  const gclid = getGclid()
  gtagSafe('event', 'purchase', {
    transaction_id: transactionId,
    value,
    currency: 'ILS',
    ...(gclid && { gclid }),
    items: items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.price,
      quantity: item.quantity,
    })),
  })
  // Push explicit dataLayer event for GTM triggers
  pushDataLayerEvent('purchase_complete', {
    transaction_id: transactionId,
    value,
    currency: 'ILS',
    ...(gclid && { gclid }),
    items_count: items.reduce((sum, i) => sum + i.quantity, 0),
  })
}

/** Push a custom event to dataLayer for GTM/Zapier consumption */
function pushDataLayerEvent(event: string, data: Record<string, any>) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...data })
}

export function sendMetaLeadEvent() {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Lead')
  }
}

export function sendMetaPurchaseEvent(value = 1.0, orderId?: string) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Purchase', {
      value,
      currency: 'ILS',
      ...(orderId && { order_id: orderId }),
    })
  }
}

export function trackWhatsAppClick(source: string) {
  if (typeof window === 'undefined') return
  sendGoogleAdsConversion()
  sendGenerateLeadEvent(`whatsapp_${source}`)
  gtagSafe('event', 'click_whatsapp', { source })
  window.fbq?.('track', 'Contact')
}

export function trackPhoneClick() {
  if (typeof window === 'undefined') return
  gtagSafe('event', 'click_phone')
  window.fbq?.('track', 'Contact')
}

/** Get stored GCLID from localStorage, cookie, or URL */
export function getGclid(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const fromStorage = localStorage.getItem('gclid')
    if (fromStorage) return fromStorage

    const fromUrl = new URLSearchParams(window.location.search).get('gclid')
    if (fromUrl) return fromUrl

    // Fallback: read from cookie (survives localStorage clearing)
    const match = document.cookie.match(/(?:^|; )gclid=([^;]+)/)
    return match ? decodeURIComponent(match[1]) : undefined
  } catch {
    return new URLSearchParams(window.location.search).get('gclid') || undefined
  }
}
