import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import './globals.css'
import TrackingScripts from '@/components/common/TrackingScripts'
import PricingLoader from '@/components/common/PricingLoader'

const ConditionalHeader = dynamic(() => import('@/components/layout/ConditionalHeader'), { ssr: false })
const ConditionalFooter = dynamic(() => import('@/components/layout/ConditionalFooter'), { ssr: false })

export const metadata: Metadata = {
  title: 'בדפוס - הדפסת חולצות בעיצוב אישי',
  description: 'עצבו חולצות מותאמות אישית עם הדפסה איכותית. משלוח מהיר, מחירים משתלמים, עיצוב קל ונוח.',
  keywords: 'הדפסת חולצות, עיצוב חולצות, חולצות מודפסות, הדפסה על חולצות, חולצות בהתאמה אישית',
  openGraph: {
    title: 'בדפוס - הדפסת חולצות בעיצוב אישי',
    description: 'עצבו חולצות מותאמות אישית עם הדפסה איכותית',
    locale: 'he_IL',
    type: 'website',
    url: 'https://badfos.co.il',
    siteName: 'בדפוס',
    images: [
      {
        url: 'https://badfos.co.il/logo.png',
        width: 512,
        height: 512,
        alt: 'בדפוס - הדפסת חולצות בעיצוב אישי',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'בדפוס - הדפסת חולצות בעיצוב אישי',
    description: 'עצבו חולצות מותאמות אישית עם הדפסה איכותית',
    images: ['https://badfos.co.il/logo.png'],
  },
  verification: {
    other: {
      'facebook-domain-verification': 'geeq14rohskfx37jq8rwknrn167zkg',
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              name: 'בדפוס',
              image: 'https://badfos.co.il/logo.png',
              url: 'https://badfos.co.il',
              telephone: '+972507794277',
              email: 'badfos2002@gmail.com',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'ראשון לציון',
                addressCountry: 'IL',
              },
              description: 'הדפסת חולצות בעיצוב אישי – חולצות, סווטשירטים, באפים ועוד. משלוח מהיר לכל הארץ.',
              priceRange: '₪₪',
              openingHoursSpecification: [
                { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], opens: '09:00', closes: '23:00' },
              ],
              sameAs: [
                'https://www.instagram.com/badfos_il/',
              ],
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '5.0',
                reviewCount: '30',
                bestRating: '5',
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-W677BNL4"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        {/* Meta Pixel NoScript */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=877576361459806&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        <TrackingScripts />
        <PricingLoader />
        <ConditionalHeader />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <ConditionalFooter />
      </body>
    </html>
  )
}
