import { TSHIRT_COLORS } from '@/lib/constants'
import { Check } from 'lucide-react'

interface ColorStepProps {
  selectedColor?: string
  onSelect: (color: string) => void
}

export default function ColorStep({ selectedColor, onSelect }: ColorStepProps) {
  const selectedColorData = TSHIRT_COLORS.find(c => c.id === selectedColor)

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        {selectedColorData ? `נבחר: ${selectedColorData.name}` : 'בחרו את צבע החולצה'}
      </p>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
        {TSHIRT_COLORS.map((color) => {
          const isSelected = selectedColor === color.id
          return (
            <button
              key={color.id}
              onClick={() => onSelect(color.id)}
              className="flex flex-col items-center gap-2 group"
              aria-label={color.name}
            >
              <div
                className={`w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center ${'border' in color && color.border ? 'border-2 border-gray-300' : ''} ${
                  isSelected ? 'ring-4 ring-[#fbbf24] ring-offset-2 scale-110' : 'hover:scale-105 hover:shadow-md'
                }`}
                style={{ backgroundColor: color.hex }}
              >
                {isSelected && (
                  <Check className={`w-5 h-5 ${color.id === 'white' ? 'text-gray-700' : 'text-white'}`} strokeWidth={3} />
                )}
              </div>
              <span className={`text-xs text-center leading-none ${isSelected ? 'font-bold text-[#f59e0b]' : 'text-gray-500'}`}>
                {color.name}
              </span>
            </button>
          )
        })}
      </div>

      {!selectedColor && (
        <p className="text-sm text-red-500 mt-4">יש לבחור צבע כדי להמשיך.</p>
      )}
    </div>
  )
}
