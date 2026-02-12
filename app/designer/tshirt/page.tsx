import { Metadata } from 'next'
import TshirtDesigner from '@/components/designer/TshirtDesigner'

export const metadata: Metadata = {
  title: 'עיצוב חולצה | בדפוס',
  description: 'עצבו חולצה מותאמת אישית - בחרו סוג בד, צבע, העלו עיצוב ובחרו מידות',
}

export default function TshirtDesignerPage() {
  return <TshirtDesigner />
}
