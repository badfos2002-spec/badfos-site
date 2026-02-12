import { FABRIC_TYPES } from '@/lib/constants'
import { Card, CardContent } from '@/components/ui/card'

interface ShirtTypeStepProps {
  selectedType?: string
  onSelect: (type: string) => void
}

export default function ShirtTypeStep({ selectedType, onSelect }: ShirtTypeStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">שלב 1: בחרו סוג חולצה</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FABRIC_TYPES.map((fabric) => (
          <Card
            key={fabric.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedType === fabric.id
                ? 'border-2 border-primary ring-2 ring-primary/20'
                : 'border'
            }`}
            onClick={() => onSelect(fabric.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-bold">{fabric.name}</h3>
                {fabric.surcharge > 0 && (
                  <span className="bg-primary text-white px-2 py-1 rounded text-sm font-bold">
                    +{fabric.surcharge}₪
                  </span>
                )}
              </div>
              <p className="text-text-gray">{fabric.description}</p>
              {selectedType === fabric.id && (
                <div className="mt-4 text-primary font-bold">✓ נבחר</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-text-gray mt-6 text-center">
        לחצו על סוג החולצה כדי להמשיך לשלב הבא
      </p>
    </div>
  )
}
