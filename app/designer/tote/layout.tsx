import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/designer/tote' },
  title: 'עיצוב תיק בד בהדפסה אישית | בדפוס',
  description: 'עצבו תיק בד בהדפסה אישית — תיק קנבס עם תחתית מתרחבת או תיק שרוכים, בבז׳, לבן או שחור. מעלים ציור, שם או לוגו ורואים תצוגה מקדימה. גם ביחידה אחת.',
  keywords: 'תיק בד מודפס, תיקי בד בהדפסה, תיק קנבס מודפס, תיק שרוכים מודפס, תיק בעיצוב אישי',
  openGraph: {
    title: 'עיצוב תיק בד בהדפסה אישית | בדפוס',
    description: 'עצבו תיק בד בהדפסה אישית — קנבס או שרוכים',
    url: 'https://badfos.co.il/designer/tote',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/assets/tote-category.jpg', width: 1000, height: 792, alt: 'בדפוס - תיק בד מודפס' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'עיצוב תיק בד בהדפסה אישית | בדפוס',
    description: 'עצבו תיק בד בהדפסה אישית',
    images: ['https://badfos.co.il/assets/tote-category.jpg'],
  },
}

export default function ToteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'תיק בד בעיצוב אישי',
            description: 'עצבו תיק בד בהדפסה אישית — תיק קנבס עם תחתית מתרחבת או תיק שרוכים, בבז׳, לבן או שחור. מעלים ציור, שם או לוגו ורואים תצוגה מקדימה. גם ביחידה אחת.',
            image: 'https://badfos.co.il/assets/tote-category.jpg',
            brand: { '@type': 'Brand', name: 'בדפוס' },
            offers: {
              '@type': 'Offer',
              price: '35',
              priceCurrency: 'ILS',
              availability: 'https://schema.org/InStock',
              url: 'https://badfos.co.il/designer/tote',
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
          }),
        }}
      />
      {children}
    </>
  )
}
