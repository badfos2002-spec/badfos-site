import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/designer/apron' },
  title: 'עיצוב סינר אישי | בדפוס',
  description: 'עצבו סינר בעיצוב אישי. העלו תמונה, בחרו צבע והזמינו. מושלם למטבח, ברביקיו או מתנה. הדפסה איכותית בישראל.',
  keywords: 'סינר מודפס, סינר אישי, הדפסה על סינר, סינר מתנה, עיצוב סינר',
  openGraph: {
    title: 'עיצוב סינר אישי | בדפוס',
    description: 'עצבו סינר בעיצוב אישי — הדפסה איכותית בישראל',
    url: 'https://badfos.co.il/designer/apron',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512, alt: 'בדפוס - סינר מודפס' }],
  },
}

export default function ApronLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'סינר בעיצוב אישי',
            description: 'סינר מודפס בהתאמה אישית — העלו עיצוב והדפיסו. מושלם למטבח או כמתנה.',
            image: 'https://badfos.co.il/logo.png',
            brand: { '@type': 'Brand', name: 'בדפוס' },
            offers: {
              '@type': 'Offer',
              price: '37',
              priceCurrency: 'ILS',
              availability: 'https://schema.org/InStock',
              url: 'https://badfos.co.il/designer/apron',
            },
          }),
        }}
      />
      {children}
    </>
  )
}
