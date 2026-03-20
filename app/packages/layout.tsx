import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'חבילות ומבצעים | בדפוס',
  description: 'חבילות הדפסת חולצות במחירים מיוחדים. חבילות לאירועים, קבוצות, חברות ועסקים. משלוח מהיר לכל הארץ.',
  openGraph: {
    title: 'חבילות ומבצעים | בדפוס',
    description: 'חבילות הדפסה במחירים מיוחדים לאירועים, קבוצות ועסקים',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512 }],
  },
}

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return children
}
