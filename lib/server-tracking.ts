/**
 * Server-side conversion tracking for Google Analytics 4 (Measurement Protocol)
 * and Meta Conversions API.
 *
 * Used as a backup when the client-side (browser) tracking doesn't fire
 * (e.g., customer closes browser before returning to success page).
 *
 * Required env vars:
 *   GA4_API_SECRET          — from GA4 Admin → Data Streams → Measurement Protocol API secrets
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID — e.g. G-4P6F1YWVN5
 *   META_CONVERSIONS_TOKEN  — from Meta Events Manager → Settings → Generate access token
 *   NEXT_PUBLIC_META_PIXEL_ID     — e.g. 877576361459806
 */

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-4P6F1YWVN5'
const GA_API_SECRET = process.env.GA4_API_SECRET
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '877576361459806'
const META_TOKEN = process.env.META_CONVERSIONS_TOKEN

interface PurchaseData {
  orderId: string
  total: number
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  items?: Array<{ productType: string; totalQuantity: number; pricePerUnit: number }>
}

/**
 * Send purchase event to GA4 via Measurement Protocol (server-side).
 * Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */
async function sendGA4Purchase(data: PurchaseData): Promise<void> {
  if (!GA_API_SECRET) {
    console.log('Server tracking: GA4_API_SECRET not set, skipping GA4 purchase event')
    return
  }

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`

  const payload = {
    client_id: `server.${data.orderId}`,
    events: [
      {
        name: 'purchase',
        params: {
          transaction_id: data.orderId,
          value: data.total,
          currency: 'ILS',
          items: (data.items || []).map((item) => ({
            item_id: item.productType,
            item_name: item.productType,
            quantity: item.totalQuantity,
            price: item.pricePerUnit,
          })),
        },
      },
    ],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    console.error('Server tracking: GA4 purchase failed', res.status, await res.text())
  } else {
    console.log(`Server tracking: GA4 purchase sent for order ${data.orderId}`)
  }
}

/**
 * Send purchase event to Meta via Conversions API (server-side).
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */
async function sendMetaPurchase(data: PurchaseData): Promise<void> {
  if (!META_TOKEN) {
    console.log('Server tracking: META_CONVERSIONS_TOKEN not set, skipping Meta purchase event')
    return
  }

  const url = `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events?access_token=${META_TOKEN}`

  // Hash user data for Meta (SHA-256)
  const crypto = await import('crypto')
  const hash = (val: string) => crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex')

  const userData: Record<string, string> = {}
  if (data.email) userData.em = hash(data.email)
  if (data.phone) {
    let phone = data.phone.replace(/[\s\-()]/g, '')
    if (phone.startsWith('0')) phone = '+972' + phone.slice(1)
    else if (!phone.startsWith('+')) phone = '+972' + phone
    userData.ph = hash(phone)
  }
  if (data.firstName) userData.fn = hash(data.firstName)
  if (data.lastName) userData.ln = hash(data.lastName)
  userData.country = hash('il')

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: `purchase_${data.orderId}`,
        action_source: 'website',
        user_data: userData,
        custom_data: {
          value: data.total,
          currency: 'ILS',
          order_id: data.orderId,
          content_type: 'product',
          contents: (data.items || []).map((item) => ({
            id: item.productType,
            quantity: item.totalQuantity,
          })),
        },
      },
    ],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    console.error('Server tracking: Meta purchase failed', res.status, await res.text())
  } else {
    console.log(`Server tracking: Meta purchase sent for order ${data.orderId}`)
  }
}

/**
 * Send all server-side purchase conversions.
 * Call this from /api/payment/confirm after updating order to 'paid'.
 * Non-blocking — errors are logged but don't affect the response.
 */
export async function sendServerConversions(data: PurchaseData): Promise<void> {
  await Promise.allSettled([
    sendGA4Purchase(data),
    sendMetaPurchase(data),
  ])
}
