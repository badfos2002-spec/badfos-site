import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/landing' },
  title: 'בדפוס - הדפסת חולצות במחיר שתאהבו',
  description: 'השאירו פרטים וקבלו הצעת מחיר מותאמת אישית להדפסת חולצות. איכות גבוהה, מחיר תחרותי, מענה מהיר.',
  robots: { index: true, follow: true },
  keywords: 'הדפסת חולצות, הצעת מחיר חולצות, חולצות מותאמות, הדפסה על חולצות מחיר',
  openGraph: {
    title: 'בדפוס - הדפסת חולצות במחיר שתאהבו',
    description: 'השאירו פרטים וקבלו הצעת מחיר מותאמת אישית להדפסת חולצות',
    url: 'https://badfos.co.il/landing',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512, alt: 'בדפוס - הדפסת חולצות' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'בדפוס - הדפסת חולצות במחיר שתאהבו',
    description: 'השאירו פרטים וקבלו הצעת מחיר מותאמת אישית',
    images: ['https://badfos.co.il/logo.png'],
  },
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
