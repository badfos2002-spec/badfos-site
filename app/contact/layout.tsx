import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'יצירת קשר | בדפוס',
  description: 'צרו קשר עם בדפוס - טלפון, וואטסאפ, אימייל. שעות פעילות ראשון-חמישי 9:00-23:00. מענה מהיר תוך 24 שעות.',
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
