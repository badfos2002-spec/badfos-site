'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TSHIRT_DESIGN_AREAS } from '@/lib/constants'
import type { DesignArea } from '@/lib/types'
import { ImagePlus, Sparkles, CheckCircle, X } from 'lucide-react'

interface DesignStepProps {
  designs: DesignArea[]
  onUpdate: (designs: DesignArea[]) => void
  onAreaFocus?: (areaId: string) => void
}

export default function DesignStep({ designs, onUpdate, onAreaFocus }: DesignStepProps) {
  const [selectedAreaId, setSelectedAreaId] = useState<string>(TSHIRT_DESIGN_AREAS[0].id)

  const selectedArea = TSHIRT_DESIGN_AREAS.find(a => a.id === selectedAreaId)!
  const getDesign = (areaId: string) => designs.find(d => d.area === areaId)
  const hasDesign = (areaId: string) => designs.some(d => d.area === areaId)

  const handleAreaSelect = (areaId: string) => {
    setSelectedAreaId(areaId)
    onAreaFocus?.(areaId)
  }

  const handleFileSelect = (file: File) => {
    const imageUrl = URL.createObjectURL(file)
    const newDesign: DesignArea = {
      area: selectedAreaId as DesignArea['area'],
      areaName: selectedArea.name,
      imageUrl,
      fileName: file.name,
    }
    const existingIndex = designs.findIndex(d => d.area === selectedAreaId)
    if (existingIndex >= 0) {
      const updated = [...designs]
      updated[existingIndex] = newDesign
      onUpdate(updated)
    } else {
      onUpdate([...designs, newDesign])
    }
    onAreaFocus?.(selectedAreaId)
  }

  const removeDesign = (areaId: string) => onUpdate(designs.filter(d => d.area !== areaId))

  const currentDesign = getDesign(selectedAreaId)

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">בחר אזור לעיצוב, ואז העלה את התמונה שלך.</p>

      {/* Area selector buttons */}
      <div className="grid gap-2 mb-4 grid-cols-2">
        {TSHIRT_DESIGN_AREAS.map((area) => {
          const isActive = selectedAreaId === area.id
          const uploaded = hasDesign(area.id)
          return (
            <button
              key={area.id}
              onClick={() => handleAreaSelect(area.id)}
              className={`relative text-xs h-16 px-2 py-2 rounded-md border font-medium transition-all flex items-center justify-center ${
                isActive
                  ? 'gradient-yellow text-white border-transparent shadow'
                  : 'bg-background shadow-sm border-yellow-200 hover:bg-yellow-50 hover:text-accent-foreground'
              }`}
            >
              {uploaded && !isActive && (
                <span className="absolute top-1 right-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                </span>
              )}
              <div className="flex flex-col items-center">
                <span>{area.name}</span>
                <span className="text-[10px] opacity-80">+₪{area.price}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Upload area */}
      <div className="space-y-3">
        {currentDesign ? (
          /* Uploaded state */
          <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm font-medium text-green-700 truncate max-w-[180px]">{currentDesign.fileName}</span>
              </div>
              <button onClick={() => removeDesign(selectedAreaId)} className="text-red-400 hover:text-red-600 shrink-0 mr-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Preview thumbnail */}
            <div className="w-full aspect-video bg-white rounded-lg overflow-hidden border border-green-200 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentDesign.imageUrl} alt="עיצוב" className="w-full h-full object-contain" />
            </div>
            <label className="cursor-pointer block">
              <div className="w-full text-center py-2 px-3 border border-dashed border-yellow-300 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-all text-xs text-gray-500 font-medium">
                החלף קובץ
              </div>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
              />
            </label>
          </div>
        ) : (
          /* Upload prompt */
          <label className="cursor-pointer block">
            <div className="border-2 border-dashed border-yellow-300 rounded-lg p-4 sm:p-6 text-center hover:border-yellow-400 hover:bg-yellow-50 transition-all mx-auto w-full sm:max-w-xs">
              <div className="w-12 h-12 gradient-yellow rounded-full flex items-center justify-center mx-auto mb-3">
                <ImagePlus className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">לחץ להעלאת תמונה</p>
              <p className="text-xs text-gray-600 mb-2">JPG, PNG, JPEG עד 10MB</p>
              <p className="text-xs text-blue-600 font-medium">יועלה לאזור: {selectedArea.name}</p>
            </div>
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
            />
          </label>
        )}

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-400">או</span>
          </div>
        </div>

        {/* AI button */}
        <Button
          variant="outline"
          className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
          type="button"
          disabled
        >
          <Sparkles className="w-4 h-4 ml-2" />
          עוזר עיצוב AI
        </Button>
      </div>

      {designs.length === 0 && (
        <p className="text-sm text-red-500 mt-4">יש להעלות לפחות קובץ אחד כדי להמשיך.</p>
      )}

      {/* Uploaded areas summary */}
      {designs.length > 0 && (
        <div className="mt-4 space-y-1">
          {designs.map(d => (
            <div key={d.area} className="flex items-center justify-between text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="font-medium text-green-700">{d.areaName}</span>
                <span className="text-gray-400 truncate max-w-[100px]">{d.fileName}</span>
              </div>
              <button onClick={() => removeDesign(d.area)} className="text-red-400 hover:text-red-600 mr-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
