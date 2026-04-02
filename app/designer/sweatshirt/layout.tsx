import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/designer/sweatshirt' },
  title: 'עיצוב סווטשירט אישי | בדפוס',
  description: 'עצבו סווטשירט בעיצוב אישי. העלו תמונה, בחרו צבע וגודל והזמינו. הדפסה איכותית בישראל ומשלוח מהיר.',
  keywords: 'סווטשירט מודפס, סווטשירט אישי, הדפסה על סווטשירט, קפוצון מודפס, סווטשירט מותאם',
  openGraph: {
    title: 'עיצוב סווטשירט אישי | בדפוס',
    description: 'עצבו סווטשירט בעיצוב אישי — הדפסה איכותית בישראל',
    url: 'https://badfos.co.il/designer/sweatshirt',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512, alt: 'בדפוס - סווטשירט מודפס' }],
  },
}

export default function SweatshirtLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'סווטשירט בעיצוב אישי',
            description: 'סווטשירט מודפס בהתאמה אישית — העלו עיצוב, בחרו מידה והזמינו.',
            image: 'https://badfos.co.il/logo.png',
            brand: { '@type': 'Brand', name: 'בדפוס' },
            offers: {
              '@type': 'Offer',
              price: '53',
              priceCurrency: 'ILS',
              availability: 'https://schema.org/InStock',
              url: 'https://badfos.co.il/designer/sweatshirt',
            },
          }),
        }}
      />
      {children}
    </>
  )
}
