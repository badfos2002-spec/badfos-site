import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'שאגת הארי - קולקציה | בדפוס',
  description: 'קולקציית שאגת הארי של בדפוס. חולצות בעיצוב ייחודי עם הדפסה איכותית. הזמינו עכשיו!',
}

export default function LionRoarLayout({ children }: { children: React.ReactNode }) {
  return children
}
