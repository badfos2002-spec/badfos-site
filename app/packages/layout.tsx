import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/packages' },
  title: 'חבילות ומבצעים | בדפוס',
  description: 'חבילות הדפסת חולצות במחירים מיוחדים. חבילות לאירועים, קבוצות, חברות ועסקים. משלוח מהיר לכל הארץ.',
  keywords: 'חבילות הדפסה, מבצע חולצות, חולצות לאירועים, הדפסה בכמויות, חולצות לעסקים',
  openGraph: {
    title: 'חבילות ומבצעים | בדפוס',
    description: 'חבילות הדפסה במחירים מיוחדים לאירועים, קבוצות ועסקים',
    url: 'https://badfos.co.il/packages',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512, alt: 'בדפוס - חבילות הדפסה' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'חבילות ומבצעים | בדפוס',
    description: 'חבילות הדפסה במחירים מיוחדים לאירועים, קבוצות ועסקים',
    images: ['https://badfos.co.il/logo.png'],
  },
}

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return children
}
