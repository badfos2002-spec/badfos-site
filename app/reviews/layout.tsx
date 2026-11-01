import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/reviews' },
  title: 'ביקורות לקוחות | בדפוס',
  description: 'קראו ביקורות אמיתיות של לקוחות בדפוס בגוגל — איכות ההדפסה, השירות והזמנים, מפי הלקוחות עצמם.',
  keywords: 'ביקורות בדפוס, חוות דעת לקוחות, דירוג בדפוס, המלצות הדפסת חולצות',
  openGraph: {
    title: 'ביקורות לקוחות | בדפוס',
    description: 'קראו ביקורות אמיתיות של לקוחות בדפוס בגוגל',
    url: 'https://badfos.co.il/reviews',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512, alt: 'בדפוס - ביקורות לקוחות' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ביקורות לקוחות | בדפוס',
    description: 'קראו ביקורות אמיתיות של לקוחות בדפוס בגוגל',
    images: ['https://badfos.co.il/logo.png'],
  },
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'בדפוס',
            url: 'https://badfos.co.il',
          }),
        }}
      />
      {children}
    </>
  )
}
