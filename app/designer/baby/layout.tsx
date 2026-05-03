import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/designer/baby' },
  title: 'בגדי תינוקות בעיצוב אישי | בדפוס',
  description: 'עצבו בגד גוף לתינוק בעיצוב אישי. מידות מנולד עכשיו עד 24 חודשים, צבעים: לבן, תכלת, ורוד. הדפסה איכותית, מתנה מושלמת ליולדת.',
  keywords: 'בגד גוף תינוק, בגדי תינוקות בהדפסה, מתנה ליולדת, בגד גוף מודפס, בגדי תינוקות בעיצוב אישי',
  openGraph: {
    title: 'בגדי תינוקות בעיצוב אישי | בדפוס',
    description: 'עצבו בגד גוף לתינוק בעיצוב אישי — לבן, תכלת, ורוד',
    url: 'https://badfos.co.il/designer/baby',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/assets/baby-white.webp', width: 800, height: 800, alt: 'בדפוס - בגדי תינוקות' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'בגדי תינוקות בעיצוב אישי | בדפוס',
    description: 'עצבו בגד גוף לתינוק בעיצוב אישי',
    images: ['https://badfos.co.il/assets/baby-white.webp'],
  },
}

export default function BabyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'בגד גוף לתינוק בעיצוב אישי',
            description: 'בגד גוף לתינוק בהדפסה אישית — מידות מנולד עכשיו עד 24 חודשים. מתנה מושלמת ליולדת.',
            image: 'https://badfos.co.il/assets/baby-white.webp',
            brand: { '@type': 'Brand', name: 'בדפוס' },
            offers: {
              '@type': 'Offer',
              price: '35',
              priceCurrency: 'ILS',
              availability: 'https://schema.org/InStock',
              url: 'https://badfos.co.il/designer/baby',
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
