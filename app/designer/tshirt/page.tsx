import { Metadata } from 'next'
import TshirtDesigner from '@/components/designer/TshirtDesigner'
import Breadcrumbs from '@/components/common/Breadcrumbs'

export const metadata: Metadata = {
  title: 'עיצוב חולצה | בדפוס',
  description: 'עצבו חולצה מותאמת אישית - בחרו סוג בד, צבע, העלו עיצוב ובחרו מידות',
}

export default function TshirtDesignerPage() {
  return <TshirtDesigner breadcrumbs={<Breadcrumbs items={[
    { label: 'בית', href: '/home' },
    { label: 'עיצוב אישי', href: '/designer' },
    { label: 'חולצה' },
  ]} />} />
}
