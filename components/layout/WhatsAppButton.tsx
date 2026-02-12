'use client'

import { MessageCircle } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/constants'

export default function WhatsAppButton() {
  const whatsappUrl = `https://wa.me/${CONTACT_INFO.whatsapp}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent-whatsapp text-white shadow-lg hover:scale-110 transition-transform pulse-green"
      aria-label="פתח WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  )
}
