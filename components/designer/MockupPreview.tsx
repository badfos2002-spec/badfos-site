import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProductConfig } from '@/lib/types'

interface MockupPreviewProps {
  config: ProductConfig
}

const sweatshirtMockups: Record<string, { front: string; back: string }> = {
  white: { front: '/images/mockups/sweatshirt-white-front.png', back: '/images/mockups/sweatshirt-white-back.png' },
  red: { front: '/images/mockups/sweatshirt-red-front.png', back: '/images/mockups/sweatshirt-red-back.png' },
  blue: { front: '/images/mockups/sweatshirt-blue-front.png', back: '/images/mockups/sweatshirt-blue-back.png' },
  gray: { front: '/images/mockups/sweatshirt-gray-front.png', back: '/images/mockups/sweatshirt-gray-back.png' },
}

// Colors that don't have their own mockup fall back to the closest available
const colorFallback: Record<string, string> = {
  white: 'white', black: 'gray', gray: 'gray', red: 'red',
  navy: 'blue', beige: 'white', burgundy: 'red', olive: 'gray',
  blue: 'blue', green: 'blue', purple: 'blue', orange: 'red',
  turquoise: 'blue',
}

const mockupImages: Record<string, Record<string, { front: string; back: string }>> = {
  tshirt: sweatshirtMockups,
  sweatshirt: sweatshirtMockups,
  buff: sweatshirtMockups,
}

export default function MockupPreview({ config }: MockupPreviewProps) {
  const { productType, fabricType, color, designs } = config

  const defaultColor = 'gray' // black falls back to gray mockup
  const resolvedColor = color ? (colorFallback[color] || color) : defaultColor
  const mockup = productType ? mockupImages[productType]?.[resolvedColor] : sweatshirtMockups[defaultColor]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">תצוגה מקדימה</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
          {mockup ? (
            <Image
              src={mockup.front}
              alt={`${productType} ${color}`}
              fill
              className="object-contain p-4"
            />
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">👕</div>
              {fabricType && (
                <p className="text-sm font-bold">{fabricType}</p>
              )}
              {color && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-sm">צבע:</span>
                  <span className="text-sm font-bold">{color}</span>
                </div>
              )}
            </div>
          )}
          {mockup && designs && designs.length > 0 && (
            <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              ✓ {designs.length} עיצובים
            </div>
          )}
        </div>
        <p className="text-xs text-center text-text-gray mt-4">
          * סקיצה להמחשה בלבד
        </p>
      </CardContent>
    </Card>
  )
}
