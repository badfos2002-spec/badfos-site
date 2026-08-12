/**
 * URL validation utility — prevents Open Redirect attacks
 * by restricting redirects to a whitelist of trusted domains.
 */

import type { Shipping } from './types'

const ALLOWED_DOMAINS = [
  'badfos.co.il',
  'waze.com',
  'make.com',
  'grow.business',
  'grow.link',
  'cardcom.solutions',
  'meshulam.co.il',
  'hyp.co.il',
  'pay.google.com',
  'checkout.stripe.com',
  'payplus.co.il',
  'tranzila.com',
  'icount.co.il',
]

/**
 * Checks whether a URL is safe to redirect to.
 * - Must be a valid https:// URL
 * - Hostname must match or be a subdomain of a whitelisted domain
 */
export function isAuthorizedRedirect(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false

    const hostname = parsed.hostname.toLowerCase()
    return ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith('.' + domain)
    )
  } catch {
    return false
  }
}

/**
 * Builds a Waze deep link ("universal link" — opens the app on mobile, the web
 * app on desktop) for a delivery order's address.
 * Returns null when there is nothing a navigator can use: pickup orders, a
 * missing address, or an address without a city.
 * Apartment / floor / entrance are deliberately left out — Waze can't use them.
 */
export function buildWazeLink(shipping?: Shipping | null): { url: string; address: string } | null {
  if (shipping?.method !== 'delivery' || !shipping.address) return null

  const city = (shipping.address.city || '').trim()
  if (!city) return null

  const street = (shipping.address.street || '').trim()
  // Old orders stored "building/apartment" in `number` (e.g. "1/59") — keep the building only
  const number = (shipping.address.number || '').split('/')[0].trim()

  const streetLine = street ? [street, number].filter(Boolean).join(' ') : ''
  const address = [streetLine, city].filter(Boolean).join(', ')

  return {
    url: `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`,
    address,
  }
}
