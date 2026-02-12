import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProductConfig } from '@/lib/types'

interface MockupPreviewProps {
  config: ProductConfig
}

export default function MockupPreview({ config }: MockupPreviewProps) {
  const { fabricType, color, designs } = config

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">תצוגה מקדימה</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
          {/* Placeholder Mockup */}
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
            {designs && designs.length > 0 && (
              <p className="text-sm mt-2 text-green-600 font-bold">
                ✓ {designs.length} עיצובים
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-center text-text-gray mt-4">
          * סקיצה להמחשה בלבד
        </p>
      </CardContent>
    </Card>
  )
}
