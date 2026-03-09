/**
 * Google Ads & Meta Pixel conversion tracking helpers
 */

export function sendGoogleAdsConversion(value = 1.0, transactionId?: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: 'AW-17871272500/cEpjCIyrqOobELT018lC',
      value,
      currency: 'ILS',
      ...(transactionId && { transaction_id: transactionId }),
    })
  }
}

export function sendGenerateLeadEvent(source: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'generate_lead', {
      currency: 'ILS',
      value: 1.0,
      source,
    })
  }
}

export function sendPurchaseEvent(transactionId: string, value: number, items: Array<{ id: string; name: string; category: string; price: number; quantity: number }>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
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
  // Google Ads conversion
  sendGoogleAdsConversion()
  // GA4 generate_lead event
  sendGenerateLeadEvent(`whatsapp_${source}`)
  // GA4 event
  window.gtag?.('event', 'click_whatsapp', { source })
  // Meta Contact event
  window.fbq?.('track', 'Contact')
}

export function trackPhoneClick() {
  if (typeof window === 'undefined') return
  window.gtag?.('event', 'click_phone')
  window.fbq?.('track', 'Contact')
}
