import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'התשלום בוטל | בדפוס',
  description: 'ביטלת את התשלום. ההזמנה נשמרה וניתן לנסות שוב בכל עת.',
  robots: 'noindex',
}

export default function CancelLayout({ children }: { children: React.ReactNode }) {
  return children
}
