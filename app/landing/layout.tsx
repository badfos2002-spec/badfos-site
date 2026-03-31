import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'בדפוס - הדפסת חולצות במחיר שתאהבו',
  description: 'השאירו פרטים וקבלו הצעת מחיר מותאמת אישית להדפסת חולצות. איכות גבוהה, מחיר תחרותי, מענה מהיר.',
  robots: { index: true, follow: true },
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
