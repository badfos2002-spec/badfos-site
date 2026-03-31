'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import Footer from './Footer'
import WhatsAppButton from './WhatsAppButton'

const CookieConsent = dynamic(() => import('@/components/common/CookieConsent'), { ssr: false })

export default function ConditionalFooter() {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/share') || pathname?.startsWith('/landing')) return null
  return (
    <>
      <Footer />
      <WhatsAppButton />
      <CookieConsent />
    </>
  )
}
