import { FABRIC_TYPES } from '@/lib/constants'

interface ShirtTypeStepProps {
  selectedType?: string
  onSelect: (type: string) => void
}

export default function ShirtTypeStep({ selectedType, onSelect }: ShirtTypeStepProps) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-4">
        {FABRIC_TYPES.map((fabric) => {
          const isSelected = selectedType === fabric.id
          return (
            <button
              key={fabric.id}
              onClick={() => onSelect(fabric.id)}
              className={`items-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors border shadow-sm px-4 py-2 h-16 text-sm lg:h-24 lg:text-lg flex flex-col justify-center ${
                isSelected
                  ? 'border-yellow-500 bg-yellow-50 text-yellow-800'
                  : 'border-yellow-200 bg-white hover:bg-yellow-50 text-gray-700'
              }`}
            >
              <span>{fabric.name}</span>
              {fabric.surcharge > 0 && (
                <span className="text-xs mt-1 opacity-80">+₪{fabric.surcharge}</span>
              )}
            </button>
          )
        })}
      </div>

      {!selectedType && (
        <p className="text-sm text-red-500 mt-4">יש לבחור סוג חולצה כדי להמשיך.</p>
      )}
    </div>
  )
}
