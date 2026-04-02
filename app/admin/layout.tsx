import type { Metadata } from 'next'
import AdminLayout from './AdminLayout'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'מערכת ניהול - בדפוס',
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayout>{children}</AdminLayout>
}
