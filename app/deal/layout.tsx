import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'מבצעים וחבילות | בדפוס',
  description: 'מבצעים מיוחדים על הדפסת חולצות. חבילות לאירועים, קבוצות וחברות במחירים משתלמים. הזמינו עכשיו!',
  alternates: { canonical: '/deal' },
}

export default function DealLayout({ children }: { children: React.ReactNode }) {
  return children
}
