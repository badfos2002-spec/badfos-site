import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/contact' },
  title: 'יצירת קשר | בדפוס',
  description: 'צרו קשר עם בדפוס - טלפון, וואטסאפ, אימייל. שעות פעילות ראשון-חמישי 9:00-23:00. מענה מהיר תוך 24 שעות.',
  keywords: 'יצירת קשר בדפוס, טלפון בדפוס, וואטסאפ בדפוס, כתובת בדפוס',
  openGraph: {
    title: 'יצירת קשר | בדפוס',
    description: 'צרו קשר עם בדפוס - טלפון, וואטסאפ, אימייל. מענה מהיר תוך 24 שעות.',
    url: 'https://badfos.co.il/contact',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512, alt: 'בדפוס - יצירת קשר' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'יצירת קשר | בדפוס',
    description: 'צרו קשר עם בדפוס - טלפון, וואטסאפ, אימייל',
    images: ['https://badfos.co.il/logo.png'],
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            mainEntity: {
              '@type': 'LocalBusiness',
              name: 'בדפוס',
              telephone: '+972559885954',
              email: 'badfos2002@gmail.com',
              url: 'https://badfos.co.il',
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+972559885954',
                contactType: 'customer service',
                availableLanguage: 'Hebrew',
                areaServed: 'IL',
              },
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'דובנוב 10',
                addressLocality: 'ראשון לציון',
                postalCode: '7520501',
                addressCountry: 'IL',
              },
            },
          }),
        }}
      />
      {children}
    </>
  )
}
