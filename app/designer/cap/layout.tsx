import { Metadata } from 'next'
import { CAP_COLOR_FILTER, CAP_MIN_QUANTITY } from '@/lib/constants'

const CAP_DESCRIPTION = `עצבו כובע טמבל או כובע רשת בהדפסה אישית: מעלים לוגו או עיצוב, בוחרים צבע ורואים תצוגה מקדימה חיה. וואן סייז, ${CAP_COLOR_FILTER.tembel.length} צבעים בטמבל ו־${CAP_COLOR_FILTER.mesh.length} ברשת, מינימום הזמנה ${CAP_MIN_QUANTITY} כובעים.`

export const metadata: Metadata = {
  alternates: { canonical: '/designer/cap' },
  title: 'עיצוב כובע טמבל וכובע רשת בהדפסה אישית | בדפוס',
  description: CAP_DESCRIPTION,
  keywords: 'כובע טמבל, כובע רשת, כובעים בהדפסה, כובעים מודפסים, כובע בעיצוב אישי, כובעים ממותגים',
  openGraph: {
    title: 'עיצוב כובע טמבל וכובע רשת בהדפסה אישית | בדפוס',
    description: 'עצבו כובע טמבל או כובע רשת בהדפסה אישית — מגוון צבעים, מינ׳ הזמנה 10',
    url: 'https://badfos.co.il/designer/cap',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/assets/כובע טמבל שחור.png', width: 800, height: 800, alt: 'בדפוס - כובע טמבל' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'עיצוב כובע טמבל וכובע רשת בהדפסה אישית | בדפוס',
    description: 'עצבו כובע טמבל או כובע רשת בהדפסה אישית',
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
            name: 'כובע טמבל או כובע רשת בעיצוב אישי',
            description: CAP_DESCRIPTION,
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
