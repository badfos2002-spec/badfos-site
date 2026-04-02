import { Metadata } from 'next'
import ProductSelector from '@/components/designer/ProductSelector'
import PageViewTracker from '@/components/common/PageViewTracker'

export const metadata: Metadata = {
  alternates: { canonical: '/designer' },
  title: 'מעצב חולצות | בדפוס',
  description: 'עצבו את החולצה המושלמת בעצמכם — בחרו בד, צבע, העלו עיצוב והזמינו. חולצות, סווטשירטים, באפים וסינרים.',
  keywords: 'עיצוב חולצה, מעצב חולצות, הדפסת חולצות אונליין, חולצה בעיצוב אישי, הדפסת חולצות',
  openGraph: {
    title: 'מעצב חולצות | בדפוס',
    description: 'עצבו חולצה בעיצוב אישי — הדפסה איכותית בישראל',
    url: 'https://badfos.co.il/designer',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512, alt: 'בדפוס - מעצב חולצות' }],
  },
}

export default function DesignerPage() {
  return (
    <div className="container-rtl py-8">
      <div className="text-center mb-8">
        <h1 className="text-[1.7rem] md:text-[2.8rem] font-bold mb-4">
          בואו ניצור משהו ביחד 🎨
        </h1>
        <p className="text-xl text-text-gray max-w-2xl mx-auto">
          בחר את המוצר שברצונך לעצב
        </p>
      </div>

      <ProductSelector />
      <PageViewTracker pageName="designer" />
    </div>
  )
}
