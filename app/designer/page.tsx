import { Metadata } from 'next'
import ProductSelector from '@/components/designer/ProductSelector'
import PageViewTracker from '@/components/common/PageViewTracker'

export const metadata: Metadata = {
  alternates: { canonical: '/designer' },
  title: 'מעצב חולצות | בדפוס',
  description: 'עצבו את החולצה המושלמת בעצמכם — בחרו בד, צבע, העלו עיצוב והזמינו. חולצות, סווטשירטים, באפים וסינרים.',
  keywords: 'הדפסה על חולצות, הדפסת DTF, הדפסה אישית, חולצות ממותגות, הדפסה על ביגוד, עיצוב חולצה, מעצב חולצות אונליין',
  openGraph: {
    title: 'מעצב חולצות | בדפוס',
    description: 'עצבו חולצה בעיצוב אישי — הדפסה איכותית בישראל',
    url: 'https://badfos.co.il/designer',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512, alt: 'בדפוס - מעצב חולצות' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'מעצב חולצות | בדפוס',
    description: 'עצבו חולצה בעיצוב אישי — הדפסה איכותית בישראל',
    images: ['https://badfos.co.il/logo.png'],
  },
}

export default function DesignerPage() {
  return (
    <div className="container-rtl py-8">
      <div className="text-center mb-8">
        <h1 className="text-[1.7rem] md:text-[2.8rem] font-bold mb-4">
          עצבו חולצה בעיצוב אישי
        </h1>
        <p className="text-xl text-text-gray max-w-2xl mx-auto mb-4">
          בחרו את המוצר שברצונכם לעצב
        </p>
        <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
          העלו תמונה או עיצוב, בחרו סוג בד וצבע, והדפיסו על חולצות כותנה, דרייפיט, פולו, אוברסייז, סווטשירטים, באפים וסינרים. הדפסת DTF איכותית בישראל עם משלוח מהיר לכל הארץ.
        </p>
      </div>

      <ProductSelector />
      <PageViewTracker pageName="designer" />
    </div>
  )
}
