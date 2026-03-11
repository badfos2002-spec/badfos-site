/**
 * URL validation utility — prevents Open Redirect attacks
 * by restricting redirects to a whitelist of trusted domains.
 */

const ALLOWED_DOMAINS = [
  'badfos.co.il',
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
