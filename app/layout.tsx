import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import WhatsAppButton from '@/components/layout/WhatsAppButton'

// Configure Rubik font
const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-rubik',
})

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
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className={`min-h-screen bg-background antialiased ${rubik.className}`}>
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  )
}
