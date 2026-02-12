import { TSHIRT_COLORS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface ColorStepProps {
  selectedColor?: string
  onSelect: (color: string) => void
  onBack: () => void
}

export default function ColorStep({ selectedColor, onSelect, onBack }: ColorStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">שלב 2: בחרו צבע</h2>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-4 mb-8">
        {TSHIRT_COLORS.map((color) => (
          <button
            key={color.id}
            onClick={() => onSelect(color.id)}
            className={`group relative aspect-square rounded-lg transition-all hover:scale-110 ${
              color.border ? 'border-2 border-gray-300' : ''
            } ${
              selectedColor === color.id
                ? 'ring-4 ring-primary scale-110'
                : ''
            }`}
            style={{ backgroundColor: color.hex }}
            aria-label={color.name}
          >
            {selectedColor === color.id && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className={`w-8 h-8 ${color.id === 'white' ? 'text-gray-800' : 'text-white'}`} />
              </div>
            )}
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {color.name}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-4 justify-between mt-12">
        <Button variant="outline" onClick={onBack}>
          חזור
        </Button>
        {selectedColor && (
          <Button onClick={() => onSelect(selectedColor)} className="btn-cta">
            המשך
          </Button>
        )}
      </div>
    </div>
  )
}
