import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'עיצוב סינר אישי | בדפוס',
  description: 'עצבו סינר בעיצוב אישי. העלו תמונה, בחרו צבע והזמינו. מושלם למטבח, ברביקיו או מתנה.',
}

export default function ApronLayout({ children }: { children: React.ReactNode }) {
  return children
}
