import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/designer/cap' },
  title: 'כובעים בעיצוב אישי | בדפוס',
  description: 'עצבו כובע טמבל בהדפסה אישית. וואן סייז, 9 צבעים: לבן, שחור, אפור, בורדו, זית, חאקי, כחול רויל, כתום, צהוב. מינימום הזמנה 10 כובעים.',
  keywords: 'כובע טמבל, כובעים בהדפסה, כובעים מודפסים, כובע בעיצוב אישי, כובעים ממותגים',
  openGraph: {
    title: 'כובעים בעיצוב אישי | בדפוס',
    description: 'עצבו כובע טמבל בהדפסה אישית — 9 צבעים, מינ׳ הזמנה 10',
    url: 'https://badfos.co.il/designer/cap',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/assets/כובע טמבל שחור.png', width: 800, height: 800, alt: 'בדפוס - כובע טמבל' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'כובעים בעיצוב אישי | בדפוס',
    description: 'עצבו כובע טמבל בהדפסה אישית',
    images: ['https://badfos.co.il/assets/כובע טמבל שחור.png'],
  },
}

export default function CapLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'כובע טמבל בעיצוב אישי',
            description: 'כובע טמבל בהדפסה אישית — וואן סייז, 9 צבעים. מינימום הזמנה 10 כובעים.',
            image: 'https://badfos.co.il/assets/כובע טמבל שחור.png',
            brand: { '@type': 'Brand', name: 'בדפוס' },
            offers: {
              '@type': 'Offer',
              price: '30',
              priceCurrency: 'ILS',
              availability: 'https://schema.org/InStock',
              url: 'https://badfos.co.il/designer/cap',
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
