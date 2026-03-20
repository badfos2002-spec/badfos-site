import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'שאלות נפוצות | בדפוס',
  description: 'תשובות לשאלות נפוצות על הדפסת חולצות בעיצוב אישי - מחירים, זמני אספקה, סוגי בדים, מינימום הזמנה ועוד.',
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
