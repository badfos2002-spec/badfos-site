import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/lion-roar' },
  title: 'חולצת שאגת הארי | בדפוס',
  description: 'חולצת שאגת הארי — "עם ישראל חי וקיים". חולצת כותנה איכותית ב-₪50 בלבד. 10% מההכנסות נתרם לעמותת האגודה למען החייל.',
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
            image: 'https://badfos.co.il/assets/lion-roar-shirt.png',
            brand: { '@type': 'Brand', name: 'בדפוס' },
            offers: {
              '@type': 'Offer',
              price: '50',
              priceCurrency: 'ILS',
              availability: 'https://schema.org/InStock',
              url: 'https://badfos.co.il/lion-roar',
            },
          }),
        }}
      />
      {children}
    </>
  )
}
