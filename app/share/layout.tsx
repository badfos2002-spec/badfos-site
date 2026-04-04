import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'העיצוב שלי | בדפוס',
  description: 'צפו בעיצוב שנוצר בבדפוס — הדפסת חולצות בעיצוב אישי',
  robots: 'noindex',
  openGraph: {
    title: 'העיצוב שלי | בדפוס',
    description: 'צפו בעיצוב שנוצר בבדפוס — הדפסת חולצות בעיצוב אישי',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512, alt: 'בדפוס' }],
  },
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children
}
