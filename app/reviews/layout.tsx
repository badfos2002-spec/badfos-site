import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/reviews' },
  title: 'ביקורות לקוחות | בדפוס',
  description: 'קראו ביקורות אמיתיות מלקוחות מרוצים של בדפוס. דירוג 5 כוכבים בגוגל. איכות הדפסה מעולה ושירות מהיר.',
  keywords: 'ביקורות בדפוס, חוות דעת לקוחות, דירוג בדפוס, המלצות הדפסת חולצות',
  openGraph: {
    title: 'ביקורות לקוחות | בדפוס',
    description: 'דירוג 5 כוכבים בגוגל - קראו מה הלקוחות שלנו אומרים',
    url: 'https://badfos.co.il/reviews',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512, alt: 'בדפוס - ביקורות לקוחות' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ביקורות לקוחות | בדפוס',
    description: 'דירוג 5 כוכבים בגוגל - קראו מה הלקוחות שלנו אומרים',
    images: ['https://badfos.co.il/logo.png'],
  },
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'בדפוס',
            url: 'https://badfos.co.il',
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '5.0',
              reviewCount: '30',
              bestRating: '5',
            },
            review: [
              { '@type': 'Review', author: { '@type': 'Person', name: 'תומר ישראלי' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: 'שירות ברמה גבוהה, הכי טובים בתחום! מקצוענים והכי מהירים שיש.' },
              { '@type': 'Review', author: { '@type': 'Person', name: 'הדר פדידה' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: 'שירות מושלם! יחס אישי ומקצועי! ממליצה בחום.' },
              { '@type': 'Review', author: { '@type': 'Person', name: 'יוסי כהן' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: 'חולצות באיכות מעולה, הדפסה חדה ומדויקת. ממליץ!' },
              { '@type': 'Review', author: { '@type': 'Person', name: 'שירה לוי' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: 'הזמנו חולצות לצוות, יצא מושלם! שירות מהיר ואדיב.' },
            ],
          }),
        }}
      />
      {children}
    </>
  )
}
