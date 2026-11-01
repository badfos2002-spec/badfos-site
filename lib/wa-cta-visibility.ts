// Tiny client store: how many in-page WhatsApp CTAs (components/seo/WhatsAppCta)
// are currently on screen. The floating bubble (components/layout/WhatsAppButton)
// subscribes and hides while any is visible. Each CTA registers itself, so this
// works on direct loads and after client-side navigation alike.

const visible = new Set<object>()
const listeners = new Set<() => void>()

export function setWaCtaVisible(key: object, isVisible: boolean) {
  const had = visible.has(key)
  if (isVisible === had) return
  if (isVisible) visible.add(key)
  else visible.delete(key)
  listeners.forEach(l => l())
}

export function subscribeWaCta(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export const getWaCtaVisible = () => visible.size > 0
export const getWaCtaVisibleServer = () => false
