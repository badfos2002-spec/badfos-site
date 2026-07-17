import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/designer/buff' },
  title: 'עיצוב באף אישי | בדפוס',
  description: 'עצבו באף (buff) בעיצוב אישי. העלו תמונה, בחרו צבע והזמינו. הדפסה איכותית בישראל ומשלוח מהיר.',
  keywords: 'באף מודפס, באף אישי, buff מותאם אישית, הדפסה על באף, באף צבאי',
  openGraph: {
    title: 'עיצוב באף אישי | בדפוס',
    description: 'עצבו באף בעיצוב אישי — הדפסה איכותית בישראל',
    url: 'https://badfos.co.il/designer/buff',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/og/designer.jpg', width: 1200, height: 630, alt: 'בדפוס - באף מודפס' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'עיצוב באף אישי | בדפוס',
    description: 'עצבו באף בעיצוב אישי — הדפסה איכותית בישראל',
    images: ['https://badfos.co.il/og/designer.jpg'],
  },
}

export default function BuffLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'באף בעיצוב אישי',
            description: 'באף מודפס בהתאמה אישית — העלו עיצוב והדפיסו. מתאים לצבא, ספורט ואירועים.',
            image: [
              'https://badfos.co.il' + encodeURI('/assets/באף אדום.webp'),
              'https://badfos.co.il' + encodeURI('/assets/באף כחול.webp'),
              'https://badfos.co.il' + encodeURI('/assets/באף ירוק.webp'),
            ],
            brand: { '@type': 'Brand', name: 'בדפוס' },
            offers: {
              '@type': 'Offer',
              price: '8',
              priceCurrency: 'ILS',
              availability: 'https://schema.org/InStock',
              url: 'https://badfos.co.il/designer/buff',
              shippingDetails: {
                '@type': 'OfferShippingDetails',
                shippingRate: { '@type': 'MonetaryAmount', value: '35', currency: 'ILS' },
                shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IL' },
                deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' }, transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' } },
              },
              hasMerchantReturnPolicy: {
                '@type': 'MerchantReturnPolicy',
                applicableCountry: 'IL',
                returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
                merchantReturnDays: 0,
              },
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '5.0',
              reviewCount: '30',
              bestRating: '5',
            },
          }),
        }}
      />
      {children}
    </>
  )
}
