'use client'

import { useEffect } from 'react'

export default function PricingLoader() {
  useEffect(() => {
    // Load the price overrides ASAP so pages never show the hardcoded default
    // price for long. Dynamic imports keep Firebase out of the initial bundle.
    //
    // Same-origin /api/pricing FIRST: content blockers kill the Firestore
    // SDK's requests to firestore.googleapis.com, and those customers used to
    // silently see code-default prices — then get refused at checkout by the
    // server, which DOES see the overrides ("Price mismatch"). Same-origin
    // requests are never blocked. The SDK read stays as a fallback only.
    let cancelled = false

    const applyViaSdk = () =>
      Promise.all([import('@/lib/db'), import('@/lib/constants')]).then(
        ([{ getDocument }, { applyPricingOverrides }]) =>
          getDocument<Record<string, any>>('settings', 'pricing').then(data => {
            if (data && !cancelled) applyPricingOverrides(data as any)
          })
      )

    fetch('/api/pricing')
      .then(r => {
        if (!r.ok) throw new Error(`/api/pricing responded ${r.status}`)
        return r.json()
      })
      .then(data =>
        import('@/lib/constants').then(({ applyPricingOverrides }) => {
          if (data && !cancelled) applyPricingOverrides(data)
        })
      )
      .catch(() => applyViaSdk())
      .catch(error => {
        // Both paths failed — never swallow this silently again: the customer
        // is now looking at code-default prices, and if the admin has
        // overridden them, the server will refuse the charge at checkout.
        console.error(
          '[PRICING_LOAD_FAILED] מחירי ברירת מחדל מוצגים — גם /api/pricing וגם Firestore SDK נכשלו. ' +
          'אם קיימות דריסות מחירים באדמין, הלקוח רואה מחיר שגוי והשרת עלול לדחות את התשלום:',
          error
        )
      })

    return () => {
      cancelled = true
    }
  }, [])
  return null
}
