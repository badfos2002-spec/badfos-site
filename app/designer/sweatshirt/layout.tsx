import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'עיצוב סווטשירט אישי | בדפוס',
  description: 'עצבו סווטשירט בעיצוב אישי. העלו תמונה, בחרו צבע וגודל והזמינו. הדפסה איכותית ומשלוח מהיר.',
}

export default function SweatshirtLayout({ children }: { children: React.ReactNode }) {
  return children
}
