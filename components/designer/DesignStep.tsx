import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TSHIRT_DESIGN_AREAS } from '@/lib/constants'
import type { DesignArea } from '@/lib/types'
import { Upload, Sparkles } from 'lucide-react'

interface DesignStepProps {
  designs: DesignArea[]
  onUpdate: (designs: DesignArea[]) => void
  onBack: () => void
  onNext: () => void
}

export default function DesignStep({ designs, onUpdate, onBack, onNext }: DesignStepProps) {
  const handleFileSelect = (areaId: string, file: File) => {
    // Create a temporary URL for preview
    const imageUrl = URL.createObjectURL(file)

    const newDesign: DesignArea = {
      area: areaId as any,
      areaName: TSHIRT_DESIGN_AREAS.find(a => a.id === areaId)?.name || '',
      imageUrl,
      fileName: file.name,
    }

    // Check if this area already has a design
    const existingIndex = designs.findIndex(d => d.area === areaId)

    if (existingIndex >= 0) {
      const updated = [...designs]
      updated[existingIndex] = newDesign
      onUpdate(updated)
    } else {
      onUpdate([...designs, newDesign])
    }
  }

  const removeDesign = (areaId: string) => {
    onUpdate(designs.filter(d => d.area !== areaId))
  }

  const hasDesign = (areaId: string) => {
    return designs.some(d => d.area === areaId)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">שלב 3: העלאת עיצוב</h2>
      <p className="text-text-gray mb-6">
        בחרו את אזורי ההדפסה והעלו את הקבצים שלכם (JPG, PNG)
      </p>

      <div className="space-y-4">
        {TSHIRT_DESIGN_AREAS.map((area) => (
          <Card key={area.id} className={hasDesign(area.id) ? 'border-green-500 border-2' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{area.name}</h3>
                  <p className="text-sm text-text-gray">{area.description}</p>
                </div>
                <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-bold">
                  +{area.price}₪
                </span>
              </div>

              {hasDesign(area.id) ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <span className="text-2xl">✓</span>
                    <span className="font-bold">קובץ הועלה בהצלחה</span>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect(area.id, file)
                        }}
                        className="hidden"
                      />
                      <Button variant="outline" className="w-full" asChild>
                        <span>
                          <Upload className="w-4 h-4 ml-2" />
                          החלף קובץ
                        </span>
                      </Button>
                    </label>
                    <Button
                      variant="outline"
                      onClick={() => removeDesign(area.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      הסר
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileSelect(area.id, file)
                      }}
                      className="hidden"
                    />
                    <Button variant="outline" className="w-full" asChild>
                      <span>
                        <Upload className="w-4 h-4 ml-2" />
                        העלה קובץ
                      </span>
                    </Button>
                  </label>
                  <Button variant="ghost" className="w-full text-primary">
                    <Sparkles className="w-4 h-4 ml-2" />
                    עוזר עיצוב AI (בקרוב)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4 justify-between mt-8">
        <Button variant="outline" onClick={onBack}>
          חזור
        </Button>
        <Button
          onClick={onNext}
          disabled={designs.length === 0}
          className="btn-cta"
        >
          המשך
        </Button>
      </div>

      <p className="text-sm text-text-gray mt-4 text-center">
        * עליכם להעלות לפחות קובץ אחד כדי להמשיך
      </p>
    </div>
  )
}
