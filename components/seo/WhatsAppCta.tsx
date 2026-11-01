'use client'

// Primary WhatsApp CTA for the SEO landing pages. The only client piece of the
// otherwise server-rendered layouts: tracks every click as `seo_<slug>` via the
// existing trackWhatsAppClick (no new tag loads), then lets the link open as usual.

import { useEffect, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import { trackWhatsAppClick } from '@/lib/tracking'
import { setWaCtaVisible } from '@/lib/wa-cta-visibility'

export default function WhatsAppCta({ href, slug }: { href: string; slug: string }) {
  const ref = useRef<HTMLAnchorElement>(null)

  // Report on-screen state so the floating WhatsApp bubble can step aside
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries =>
      setWaCtaVisible(el, entries[entries.length - 1].isIntersecting),
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      setWaCtaVisible(el, false)
    }
  }, [])

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      ref={ref}
      onClick={() => trackWhatsAppClick(`seo_${slug}`)}
      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#15803d] hover:bg-[#166534] px-8 py-4 text-lg font-extrabold text-white shadow-[0_15px_35px_-10px_rgba(21,128,61,0.6)] transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-[#15803d]"
    >
      <MessageCircle className="w-5 h-5" />
      דברו איתנו בוואטסאפ
    </a>
  )
}
