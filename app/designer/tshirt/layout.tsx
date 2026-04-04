import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/designer/tshirt' },
  title: 'עיצוב חולצה אישית | בדפוס',
  description: 'עצבו חולצה מותאמת אישית - בחרו סוג בד (כותנה, דרייפיט, פולו, אוברסייז), צבע, העלו עיצוב ובחרו מידות. הדפסה איכותית בישראל.',
  keywords: 'חולצה מודפסת, חולצה אישית, הדפסה על חולצה, עיצוב חולצה, חולצת כותנה מודפסת, הדפסת DTF',
  openGraph: {
    title: 'עיצוב חולצה אישית | בדפוס',
    description: 'עצבו חולצה מותאמת אישית — כותנה, דרייפיט, פולו או אוברסייז. הדפסה איכותית בישראל.',
    url: 'https://badfos.co.il/designer/tshirt',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512, alt: 'בדפוס - חולצה מודפסת' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'עיצוב חולצה אישית | בדפוס',
    description: 'עצבו חולצה מותאמת אישית — הדפסה איכותית בישראל',
    images: ['https://badfos.co.il/logo.png'],
  },
}

export default function TshirtLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'חולצה בעיצוב אישי',
            description: 'חולצה מודפסת בהתאמה אישית — בחרו בד (כותנה, דרייפיט, פולו, אוברסייז), צבע ועיצוב.',
            image: 'https://badfos.co.il/logo.png',
            brand: { '@type': 'Brand', name: 'בדפוס' },
            offers: {
              '@type': 'Offer',
              price: '37',
              priceCurrency: 'ILS',
              availability: 'https://schema.org/InStock',
              url: 'https://badfos.co.il/designer/tshirt',
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
            review: [
              {
                '@type': 'Review',
                author: { '@type': 'Person', name: 'תומר ישראלי' },
                reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
                reviewBody: 'שירות ברמה גבוהה, הכי טובים בתחום! מקצוענים והכי מהירים שיש.',
              },
              {
                '@type': 'Review',
                author: { '@type': 'Person', name: 'הדר פדידה' },
                reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
                reviewBody: 'שירות מושלם! יחס אישי ומקצועי! ממליצה בחום.',
              },
            ],
          }),
        }}
      />
      {children}
    </>
  )
}
