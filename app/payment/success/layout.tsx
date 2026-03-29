import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'התשלום בוצע בהצלחה | בדפוס',
  description: 'תודה על הזמנתך! נעדכן אותך במייל לגבי סטטוס ההזמנה.',
  robots: 'noindex',
}

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
