import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'חבילות ומבצעים | בדפוס',
  description: 'חבילות הדפסת חולצות במחירים מיוחדים. חבילות לאירועים, קבוצות, חברות ועסקים. משלוח מהיר לכל הארץ.',
}

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return children
}
