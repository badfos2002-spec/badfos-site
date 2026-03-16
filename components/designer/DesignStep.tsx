'use client'

import { useState, useRef } from 'react'
import { TSHIRT_DESIGN_AREAS } from '@/lib/constants'
import type { DesignArea } from '@/lib/types'
import { ImagePlus, CheckCircle, X } from 'lucide-react'

interface DesignStepProps {
  designs: DesignArea[]
  onUpdate: (designs: DesignArea[]) => void
  onAreaFocus?: (areaId: string) => void
}

export default function DesignStep({ designs, onUpdate, onAreaFocus }: DesignStepProps) {
  const [selectedAreaId, setSelectedAreaId] = useState<string>(TSHIRT_DESIGN_AREAS[0].id)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const selectedArea = TSHIRT_DESIGN_AREAS.find(a => a.id === selectedAreaId)!
  const getDesign = (areaId: string) => designs.find(d => d.area === areaId)
  const hasDesign = (areaId: string) => designs.some(d => d.area === areaId)

  const handleAreaSelect = (areaId: string) => {
    setSelectedAreaId(areaId)
    onAreaFocus?.(areaId)
  }

  const handleFileSelectForArea = (areaId: string, file: File) => {
    const area = TSHIRT_DESIGN_AREAS.find(a => a.id === areaId)!

    // Convert to base64 immediately — avoids blob URL issues on Safari/iOS
    const reader = new FileReader()
    reader.onload = () => {
      const imageUrl = reader.result as string
      const newDesign: DesignArea = {
        area: areaId as DesignArea['area'],
        areaName: area.name,
        imageUrl,
        fileName: file.name,
      }
      const existingIndex = designs.findIndex(d => d.area === areaId)
      if (existingIndex >= 0) {
        const updated = [...designs]
        updated[existingIndex] = newDesign
        onUpdate(updated)
      } else {
        onUpdate([...designs, newDesign])
      }
      setSelectedAreaId(areaId)
      onAreaFocus?.(areaId)
    }
    reader.readAsDataURL(file)
  }

  const handleFileSelect = (file: File) => {
    handleFileSelectForArea(selectedAreaId, file)
  }

  const removeDesign = (areaId: string) => onUpdate(designs.filter(d => d.area !== areaId))

  const currentDesign = getDesign(selectedAreaId)

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">בחר אזור לעיצוב, ואז העלה את התמונה שלך.</p>

      {/* ── MOBILE: merged area + upload buttons ── */}
      <div className="lg:hidden grid gap-3 mb-4 grid-cols-2">
        {TSHIRT_DESIGN_AREAS.map((area) => {
          const uploaded = hasDesign(area.id)
          return (
            <div key={area.id} className="relative">
              <label
                className={`cursor-pointer block border-2 border-dashed rounded-xl p-3 text-center transition-all ${
                  uploaded
                    ? 'border-green-400 bg-green-50'
                    : 'border-yellow-300 bg-white hover:border-yellow-400 hover:bg-yellow-50'
                }`}
                onClick={() => handleAreaSelect(area.id)}
              >
                {uploaded ? (
                  <>
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="text-xs font-medium text-green-700">{area.name}</p>
                    <p className="text-[10px] text-yellow-600 mt-1">לחץ להחלפה</p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 gradient-yellow rounded-full flex items-center justify-center mx-auto mb-2">
                      <ImagePlus className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-gray-900">{area.name}</p>
                    <p className="text-[10px] text-gray-500">+₪{area.price}</p>
                    <p className="text-[10px] text-yellow-600 mt-1">לחץ להעלאה</p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                  ref={(el) => { fileInputRefs.current[area.id] = el }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelectForArea(area.id, f); if (e.target) e.target.value = '' }}
                />
              </label>
              {uploaded && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeDesign(area.id) }}
                  className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── DESKTOP: original area selector + upload area ── */}
      <div className="hidden lg:block">
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
            <label className="cursor-pointer block">
              <div className="border-2 border-dashed border-yellow-300 rounded-lg p-6 text-center hover:border-yellow-400 hover:bg-yellow-50 transition-all mx-auto max-w-xs">
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
        </div>
      </div>

      {designs.length === 0 && (
        <p className="text-sm text-red-500 mt-4">יש להעלות לפחות קובץ אחד כדי להמשיך.</p>
      )}

      {/* Uploaded areas summary — desktop only (mobile shows inline) */}
      {designs.length > 0 && (
        <div className="mt-4 space-y-1 hidden lg:block">
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
