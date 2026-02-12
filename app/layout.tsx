import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import WhatsAppButton from '@/components/layout/WhatsAppButton'

export const metadata: Metadata = {
  title: 'בדפוס - הדפסת חולצות בעיצוב אישי',
  description: 'עצבו חולצות מותאמות אישית עם הדפסה איכותית. משלוח מהיר, מחירים משתלמים, עיצוב קל ונוח.',
  keywords: 'הדפסת חולצות, עיצוב חולצות, חולצות מודפסות, הדפסה על חולצות, חולצות בהתאמה אישית',
  openGraph: {
    title: 'בדפוס - הדפסת חולצות בעיצוב אישי',
    description: 'עצבו חולצות מותאמות אישית עם הדפסה איכותית',
    locale: 'he_IL',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  )
}
