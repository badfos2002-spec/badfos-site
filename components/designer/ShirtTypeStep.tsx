import { useState, useSyncExternalStore } from 'react'
import { FABRIC_TYPES, getFabricType, subscribePricing, getPricingVersion } from '@/lib/constants'
import type { FabricType } from '@/lib/types'

interface ShirtTypeStepProps {
  selectedType?: string
  onSelect: (type: string) => void
  /** Called right after a cotton sleeve is picked — moves on to step 2. */
  onAdvance?: () => void
}

// «כותנה» is two shirts: short sleeve (cotton) and long sleeve. Its card opens
// a sleeve sub-view instead of selecting; the other fabrics select directly.
const SLEEVES: { id: FabricType; label: string }[] = [
  { id: 'cotton', label: 'שרוול קצר' },
  { id: 'long-sleeve', label: 'שרוול ארוך' },
]

const cardClass = (isSelected: boolean) =>
  `items-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors border shadow-sm px-4 py-2 h-16 text-sm lg:h-24 lg:text-lg flex flex-col justify-center ${
    isSelected
      ? 'border-yellow-500 bg-yellow-50 text-yellow-800'
      : 'border-yellow-200 bg-white hover:bg-yellow-50 text-gray-700'
  }`

const surchargeOf = (id: FabricType) =>
  getFabricType(id)?.surcharge ?? FABRIC_TYPES.find(f => f.id === id)?.surcharge ?? 0

export default function ShirtTypeStep({ selectedType, onSelect, onAdvance }: ShirtTypeStepProps) {
  useSyncExternalStore(subscribePricing, getPricingVersion, getPricingVersion)
  const [showSleeves, setShowSleeves] = useState(false)
  const selectedSleeve = SLEEVES.find(s => s.id === selectedType)

  if (showSleeves) {
    return (
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3 lg:text-lg">כותנה — איזה שרוול?</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
          {SLEEVES.map((sleeve) => {
            const surcharge = surchargeOf(sleeve.id)
            return (
              <button
                key={sleeve.id}
                type="button"
                onClick={() => { onSelect(sleeve.id); onAdvance?.() }}
                aria-pressed={selectedType === sleeve.id}
                className={cardClass(selectedType === sleeve.id)}
              >
                <span>{sleeve.label}</span>
                {surcharge > 0 && <span className="text-xs mt-1 opacity-80">+₪{surcharge}</span>}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowSleeves(false)}
          className="mt-4 min-h-[44px] px-2 text-sm font-medium text-gray-600 hover:text-gray-900 underline-offset-4 hover:underline"
        >
          ‹ חזרה לסוגי הבד
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-4">
        {FABRIC_TYPES.filter(f => !f.parent).map((fabric) => {
          const isCotton = fabric.id === 'cotton'
          const isSelected = isCotton ? !!selectedSleeve : selectedType === fabric.id
          const surcharge = surchargeOf(fabric.id)
          return (
            <button
              key={fabric.id}
              type="button"
              onClick={() => (isCotton ? setShowSleeves(true) : onSelect(fabric.id))}
              aria-pressed={isSelected}
              className={cardClass(isSelected)}
            >
              <span>{fabric.name}</span>
              {isCotton && selectedSleeve && (
                <span className="text-xs mt-1 opacity-80">{selectedSleeve.label}</span>
              )}
              {surcharge > 0 && (
                <span className="text-xs mt-1 opacity-80">+₪{surcharge}</span>
              )}
            </button>
          )
        })}
      </div>

      {!selectedType && (
        <p role="alert" className="text-sm text-red-500 mt-4">יש לבחור סוג חולצה כדי להמשיך.</p>
      )}
    </div>
  )
}
