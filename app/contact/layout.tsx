import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'יצירת קשר | בדפוס',
  description: 'צרו קשר עם בדפוס - טלפון, וואטסאפ, אימייל. שעות פעילות ראשון-חמישי 9:00-23:00. מענה מהיר תוך 24 שעות.',
  openGraph: {
    title: 'יצירת קשר | בדפוס',
    description: 'צרו קשר עם בדפוס - טלפון, וואטסאפ, אימייל',
    images: [{ url: 'https://badfos.co.il/logo.png', width: 512, height: 512 }],
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
