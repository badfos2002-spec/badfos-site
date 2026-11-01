import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/designer/vest' },
  title: 'עיצוב וסט זוהר בהדפסה אישית | בדפוס',
  description: 'עצבו וסט זוהר בהדפסה אישית — שם החברה על הגב וסמל על החזה, בצהוב או כתום זוהר. לצוותי שטח, הפקה ומתנדבים. מעצבים אונליין, גם ביחידה אחת.',
  keywords: 'וסט זוהר מודפס, וסטים זוהרים בהדפסה, אפוד זוהר ממותג, וסט בעיצוב אישי, וסט זוהר עם לוגו',
  openGraph: {
    title: 'עיצוב וסט זוהר בהדפסה אישית | בדפוס',
    description: 'עצבו וסט זוהר בהדפסה אישית — וואן סייז',
    url: 'https://badfos.co.il/designer/vest',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/assets/vest-category.jpg', width: 1000, height: 750, alt: 'בדפוס - וסט זוהר מודפס' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'עיצוב וסט זוהר בהדפסה אישית | בדפוס',
    description: 'עצבו וסט זוהר בהדפסה אישית',
    images: ['https://badfos.co.il/assets/vest-category.jpg'],
  },
}

export default function VestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'וסט זוהר בעיצוב אישי',
            description: 'עצבו וסט זוהר בהדפסה אישית — שם החברה על הגב וסמל על החזה, בצהוב או כתום זוהר. לצוותי שטח, הפקה ומתנדבים. מעצבים אונליין, גם ביחידה אחת.',
            image: 'https://badfos.co.il/assets/vest-category.jpg',
            brand: { '@type': 'Brand', name: 'בדפוס' },
            offers: {
              '@type': 'Offer',
              price: '30',
              priceCurrency: 'ILS',
              availability: 'https://schema.org/InStock',
              url: 'https://badfos.co.il/designer/vest',
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
