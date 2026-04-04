import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/lion-roar' },
  title: 'חולצת שאגת הארי | בדפוס',
  description: 'חולצת שאגת הארי — "עם ישראל חי וקיים". חולצת כותנה איכותית ב-₪50 בלבד. 10% מההכנסות נתרם לעמותת האגודה למען החייל.',
  keywords: 'חולצת שאגת הארי, עם ישראל חי, חולצה ישראלית, תרומה לחיילים, חולצת תמיכה',
  openGraph: {
    title: 'חולצת שאגת הארי | בדפוס',
    description: 'חולצת כותנה איכותית ב-₪50 — "עם ישראל חי וקיים". 10% נתרם לעמותת האגודה למען החייל.',
    url: 'https://badfos.co.il/lion-roar',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/assets/lion-roar-shirt.webp', width: 800, height: 800, alt: 'חולצת שאגת הארי - בדפוס' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'חולצת שאגת הארי | בדפוס',
    description: 'חולצת כותנה ב-₪50 — 10% נתרם לעמותת האגודה למען החייל',
    images: ['https://badfos.co.il/assets/lion-roar-shirt.webp'],
  },
}

export default function LionRoarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'חולצת שאגת הארי',
            description: 'חולצת כותנה איכותית עם הדפסת "עם ישראל חי וקיים". 10% מההכנסות נתרם לעמותת האגודה למען החייל.',
            image: 'https://badfos.co.il/assets/lion-roar-shirt.webp',
            brand: { '@type': 'Brand', name: 'בדפוס' },
            offers: {
              '@type': 'Offer',
              price: '50',
              priceCurrency: 'ILS',
              availability: 'https://schema.org/InStock',
              url: 'https://badfos.co.il/lion-roar',
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
