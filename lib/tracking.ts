/**
 * Google Ads & Meta Pixel conversion tracking helpers
 */

/** Push to dataLayer even if gtag not loaded yet — GTM will pick it up */
function gtagSafe(...args: any[]) {
  if (typeof window === 'undefined') return
  if (window.gtag) {
    window.gtag(...args)
  } else {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(args)
  }
}

export function sendGoogleAdsConversion(value = 1.0, transactionId?: string) {
  gtagSafe('event', 'conversion', {
    send_to: 'AW-17871272500/cEpjCIyrqOobELT018lC',
    value,
    currency: 'ILS',
    ...(transactionId && { transaction_id: transactionId }),
  })
}

export function sendGenerateLeadEvent(source: string) {
  gtagSafe('event', 'generate_lead', {
    currency: 'ILS',
    value: 1.0,
    source,
  })
}

export function sendPurchaseEvent(transactionId: string, value: number, items: Array<{ id: string; name: string; category: string; price: number; quantity: number }>) {
  gtagSafe('event', 'purchase', {
    transaction_id: transactionId,
    value,
    currency: 'ILS',
    items: items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.price,
      quantity: item.quantity,
    })),
  })
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

/** Get stored GCLID from localStorage or URL */
export function getGclid(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return (
    localStorage.getItem('gclid') ||
    new URLSearchParams(window.location.search).get('gclid') ||
    undefined
  )
}

/** Send lead data to Zapier webhook */
export async function sendToZapier(data: {
  name: string
  phone: string
  email?: string
  source: string
  gclid?: string
  message?: string
}): Promise<boolean> {
  try {
    const res = await fetch('https://hooks.zapier.com/hooks/catch/26080632/ulxg2e6/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.ok
  } catch (e) {
    console.error('Zapier webhook error:', e)
    return false
  }
}
