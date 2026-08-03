import { Metadata } from 'next'
import TshirtDesigner from '@/components/designer/TshirtDesigner'
import Breadcrumbs from '@/components/common/Breadcrumbs'

// Metadata is defined in layout.tsx

export default function TshirtDesignerPage() {
  return <TshirtDesigner use3DPreview breadcrumbs={<Breadcrumbs items={[
    { label: 'בית', href: '/home' },
    { label: 'עיצוב אישי', href: '/designer' },
    { label: 'חולצה' },
  ]} />} />
}
