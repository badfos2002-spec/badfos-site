'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Phone, ShoppingBag, Copy, Check } from 'lucide-react'
import { dealPhoneLink, dealWhatsAppLink } from '@/lib/deals'
import { trackPhoneClick, trackWhatsAppClick } from '@/lib/tracking'
import type { Deal } from '@/lib/types'

type Props = {
  deal: Pick<Deal, 'title' | 'slug' | 'order'>
  /** Admin preview: links do nothing. */
  inert?: boolean
}

const btn = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-base font-bold transition-colors'

export default function DealActions({ deal, inert }: Props) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const codeRef = useRef<HTMLSpanElement>(null)
  const order = deal.order
  const block = inert ? (e: React.MouseEvent) => e.preventDefault() : undefined

  const copy = async () => {
    if (!order?.couponCode) return
    try {
      if (!navigator.clipboard) throw new Error('no clipboard')
      await navigator.clipboard.writeText(order.couponCode)
      setCopyFailed(false)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked/unavailable: select the code so it can be copied by hand.
      setCopyFailed(true)
      const el = codeRef.current
      const sel = typeof window !== 'undefined' ? window.getSelection() : null
      if (el && sel) {
        const range = document.createRange()
        range.selectNodeContents(el)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[2fr_1fr] gap-2">
        <a
          href={dealWhatsAppLink(deal)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={block ?? (() => trackWhatsAppClick('deal'))}
          className={`${btn} bg-[#25D366] text-white hover:bg-[#1ebe5b]`}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          וואטסאפ
        </a>
        <a
          href={dealPhoneLink()}
          onClick={block ?? (() => trackPhoneClick())}
          className={`${btn} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50`}
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
          חיוג
        </a>
      </div>
      {order && (
        <Link
          href={order.href}
          onClick={block}
          className={`${btn} w-full bg-[#ffc32e] text-[#3b2600] hover:bg-[#f5b51c]`}
        >
          <ShoppingBag className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span className="truncate">{order.label || 'להזמנה'}</span>
        </Link>
      )}
      {order?.couponCode && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-yellow-400 bg-yellow-50 px-3 py-1.5 text-sm">
          <span className="text-gray-700">
            קוד קופון: <span ref={codeRef} dir="ltr" className="select-all font-mono font-bold text-gray-900">{order.couponCode}</span>
          </span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 font-medium text-yellow-700 hover:bg-yellow-100"
          >
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? 'הועתק' : 'העתק'}
          </button>
        </div>
      )}
      {order?.couponCode && copyFailed && (
        <p role="status" className="text-sm text-gray-600">לא ניתן להעתיק — סמנו את הקוד</p>
      )}
    </div>
  )
}
