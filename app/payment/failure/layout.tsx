import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'התשלום לא הושלם | בדפוס',
  description: 'משהו השתבש בתהליך התשלום. ניתן לנסות שוב.',
  robots: 'noindex',
}

export default function FailureLayout({ children }: { children: React.ReactNode }) {
  return children
}
