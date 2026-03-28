import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Rubik } from 'next/font/google'
import './globals.css'
import TrackingScripts from '@/components/common/TrackingScripts'
import PricingLoader from '@/components/common/PricingLoader'

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  variable: '--font-rubik',
})

const ConditionalHeader = dynamic(() => import('@/components/layout/ConditionalHeader'))
const ConditionalFooter = dynamic(() => import('@/components/layout/ConditionalFooter'))

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
  icons: {
    icon: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-144.png', sizes: '144x144', type: 'image/png' },
    ],
    apple: '/icon-144.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <head>
        {/* GCLID capture — runs immediately, no consent needed (first-party URL param) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var p = new URLSearchParams(window.location.search);
                var g = p.get('gclid');
                if (g) {
                  g = g.trim();
                  if (g) {
                    localStorage.setItem('gclid', g);
                    document.cookie = 'gclid=' + g + '; max-age=7776000; path=/; SameSite=Lax';
                  }
                }
              } catch(e) {}
            `,
          }}
        />
        {/* Auto-reload on ChunkLoadError — prevents stale JS after deploy */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.message && (
                  e.message.includes('ChunkLoadError') ||
                  e.message.includes('Loading chunk') ||
                  e.message.includes('Failed to fetch dynamically imported module') ||
                  e.message.includes('Importing a module script failed')
                )) {
                  if (!sessionStorage.getItem('chunk_reload')) {
                    sessionStorage.setItem('chunk_reload', '1');
                    window.location.reload();
                  }
                }
              });
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && e.reason.message && (
                  e.reason.message.includes('ChunkLoadError') ||
                  e.reason.message.includes('Loading chunk') ||
                  e.reason.message.includes('Failed to fetch dynamically imported module')
                )) {
                  if (!sessionStorage.getItem('chunk_reload')) {
                    sessionStorage.setItem('chunk_reload', '1');
                    window.location.reload();
                  }
                }
              });
              // Clear reload flag on successful page load
              if (sessionStorage.getItem('chunk_reload')) {
                sessionStorage.removeItem('chunk_reload');
              }
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              name: 'בדפוס',
              image: 'https://badfos.co.il/logo.png',
              url: 'https://badfos.co.il',
              telephone: '+972559885954',
              email: 'badfos2002@gmail.com',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'דובנוב 10',
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
