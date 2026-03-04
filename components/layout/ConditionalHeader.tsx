'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import Header from './Header'

const AnnouncementBar = dynamic(() => import('@/components/common/AnnouncementBar'), { ssr: false })

export default function ConditionalHeader() {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/share')) return null
  return (
    <>
      <AnnouncementBar placement="header" />
      <Header />
    </>
  )
}
