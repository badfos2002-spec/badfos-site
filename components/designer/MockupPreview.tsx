import Image from 'next/image'
import { Truck, Tag } from 'lucide-react'
import type { ProductConfig } from '@/lib/types'

interface MockupPreviewProps {
  config: ProductConfig
}

const sweatshirtMockups: Record<string, { front: string; back: string }> = {
  white: { front: '/assets/סווטשרט חזית לבן.png', back: '/assets/סווטשירט גב לבן.png' },
  black: { front: '/assets/סווטשרט חזית.png', back: '/assets/סווטשירט גב.png' },
  red: { front: '/assets/סווטשרט חזית אדום.png', back: '/assets/סווטשירט גב אדום.png' },
  blue: { front: '/assets/סווטשרט חזית כחול.png', back: '/assets/סווטשירט גב כחול.png' },
  gray: { front: '/assets/סווטשרט חזית אפור.png', back: '/assets/סווטשירט גב אפור.png' },
  burgundy: { front: '/assets/סווטשרט חזית בורדו.png', back: '/assets/סווטשירט גב בורדו.png' },
}

const colorFallback: Record<string, string> = {
  white: 'white', black: 'black', gray: 'gray', red: 'red',
  navy: 'blue', beige: 'white', burgundy: 'burgundy', olive: 'olive',
  blue: 'blue', green: 'green', purple: 'purple', orange: 'orange',
  turquoise: 'turquoise',
}

const tshirtMockups: Record<string, { front: string; back: string }> = {
  white: { front: '/assets/חולצה לבנה קדימה.png', back: '/assets/חולצה לבנה אחורה.png' },
  black: { front: '/assets/חולצה שחורה קדימה.png', back: '/assets/חולצה שחורה אחורה.png' },
  gray: { front: '/assets/חולצה אפורה קדימה.png', back: '/assets/חולצה אפורה אחורה.png' },
  blue: { front: '/assets/חולצה כחולה קדימה.png', back: '/assets/חולצה כחולה אחורה.png' },
  red: { front: '/assets/חולצה אדומה קדימה.png', back: '/assets/חולצה אדומה אחורה.png' },
  burgundy: { front: '/assets/חולצה קדימה בורדו.png', back: '/assets/חולצה אחורה בורדו.png' },
  olive: { front: '/assets/חולצה קדימה ירוק זית.png', back: '/assets/חולצה אחורה ירוק זית.png' },
}

const buffMockups: Record<string, { front: string; back: string }> = {
  blue: { front: '/assets/באף כחול.png', back: '/assets/באף כחול.png' },
  red: { front: '/assets/באף אדום.png', back: '/assets/באף אדום.png' },
  orange: { front: '/assets/באף כתום.png', back: '/assets/באף כתום.png' },
  purple: { front: '/assets/באף סגול.png', back: '/assets/באף סגול.png' },
  green: { front: '/assets/באף ירוק.png', back: '/assets/באף ירוק.png' },
  turquoise: { front: '/assets/באף תכלת.png', back: '/assets/באף תכלת.png' },
}

const mockupImages: Record<string, Record<string, { front: string; back: string }>> = {
  tshirt: tshirtMockups,
  sweatshirt: sweatshirtMockups,
  buff: buffMockups,
}

export default function MockupPreview({ config }: MockupPreviewProps) {
  const { productType, fabricType, color, designs } = config

  const defaultColor = 'gray'
  const resolvedColor = color ? (colorFallback[color] || color) : defaultColor
  const mockup = productType ? mockupImages[productType]?.[resolvedColor] : sweatshirtMockups[defaultColor]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-[#1e293b] text-sm">תצוגה מקדימה</h3>
        {designs && designs.length > 0 && (
          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
            ✓ {designs.length} עיצובים
          </span>
        )}
      </div>

      {/* Mockup Image */}
      {mockup ? (
        <div className="relative w-full aspect-square">
          <Image
            src={mockup.front}
            alt={`${productType} ${color}`}
            fill
            className="object-contain p-4"
          />
        </div>
      ) : (
        <div className="aspect-square flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-8xl mb-3">👕</div>
            {fabricType && <p className="text-sm font-bold text-gray-600">{fabricType}</p>}
            {color && <p className="text-sm text-gray-500 mt-1">צבע: {color}</p>}
          </div>
        </div>
      )}

      {/* Trust Info */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Truck className="w-3.5 h-3.5 text-green-500 shrink-0" />
          <span>משלוח עד 5 ימי עסקים | איסוף עצמי ראשון לציון</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Tag className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" />
          <span>15+ חולצות = 5% הנחה אוטומטית</span>
        </div>
      </div>

      <p className="text-xs text-center text-gray-400 py-2">* סקיצה להמחשה בלבד</p>
    </div>
  )
}
