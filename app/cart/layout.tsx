import { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/cart' },
  title: 'עגלת קניות | בדפוס',
  description: 'עגלת הקניות שלכם בבדפוס. השלימו את ההזמנה ותקבלו חולצות מודפסות באיכות גבוהה.',
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
