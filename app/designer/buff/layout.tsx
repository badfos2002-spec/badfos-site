import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/designer/buff' },
  title: 'עיצוב באף אישי | בדפוס',
  description: 'עצבו באף (buff) בעיצוב אישי. העלו תמונה, בחרו צבע והזמינו. הדפסה איכותית ומשלוח מהיר.',
}

export default function BuffLayout({ children }: { children: React.ReactNode }) {
  return children
}
