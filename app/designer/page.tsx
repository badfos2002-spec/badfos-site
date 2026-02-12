import { Metadata } from 'next'
import ProductSelector from '@/components/designer/ProductSelector'

export const metadata: Metadata = {
  title: 'מעצב חולצות | בדפוס',
  description: 'עצבו את החולצה המושלמת בעצמכם - בחרו בד, צבע, העלו עיצוב והזמינו',
}

export default function DesignerPage() {
  return (
    <div className="container-rtl py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          עצבו את החולצה שלכם 🎨
        </h1>
        <p className="text-xl text-text-gray max-w-2xl mx-auto">
          בחרו מוצר, התאימו אישית, והפכו את הרעיון למציאות
        </p>
      </div>

      <ProductSelector />
    </div>
  )
}
