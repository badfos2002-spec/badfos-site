'use client'

import { useEffect, useRef } from 'react'
import { MessageCircle, Phone } from 'lucide-react'
import { dealPhoneLink, dealWhatsAppLink } from '@/lib/deals'
import { trackPhoneClick, trackWhatsAppClick } from '@/lib/tracking'
import { setFixedBottomBar, setWaCtaVisible } from '@/lib/wa-cta-visibility'
import type { Deal } from '@/lib/types'

/** Mobile-only bottom bar (WhatsApp + call) on the deal page; hides the floating bubble while mounted. */
export default function DealStickyBar({ deal }: { deal: Pick<Deal, 'title' | 'slug'> }) {
  const key = useRef({})
  useEffect(() => {
    const k = key.current
    setWaCtaVisible(k, true)
    setFixedBottomBar(k, true)
    return () => {
      setWaCtaVisible(k, false)
      setFixedBottomBar(k, false)
    }
  }, [])

  return (
    <div
      data-testid="deal-sticky-bar"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 pt-3 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      dir="rtl"
    >
      <div className="mx-auto grid max-w-md grid-cols-[2fr_1fr] gap-2">
        <a
          href={dealWhatsAppLink(deal)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackWhatsAppClick('deal_sticky')}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#25D366] text-base font-bold text-white"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          וואטסאפ
        </a>
        <a
          href={dealPhoneLink()}
          onClick={() => trackPhoneClick()}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-base font-bold text-gray-800"
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
          חיוג
        </a>
      </div>
    </div>
  )
}
