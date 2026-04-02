'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getSharedDesign, SharedDesignData } from '@/lib/db'
import { tshirtMockups, tshirtMockupsBack, colorFallback, DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

function MockupView({ view, color, designs }: {
  view: 'front' | 'back'
  color: string
  designs: { area: string; areaName: string; imageBase64: string }[]
}) {
  const resolvedColor = colorFallback[color] || color
  const mockupSrc = view === 'front'
    ? (tshirtMockups[resolvedColor] || tshirtMockups['black'])
    : (tshirtMockupsBack[resolvedColor] || tshirtMockupsBack['black'])

  const viewDesigns = designs.filter(d => {
    const overlay = DESIGN_AREA_OVERLAYS[d.area]
    return overlay && overlay.view === view
  })

  return (
    // Same approach as the designer: w-full, height determined by image (h-auto).
    // This ensures overlay % positions match exactly what the user sees while designing.
    <div className="relative w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mockupSrc} alt={view === 'front' ? 'קדמי' : 'אחורי'} className="w-full h-auto block" />
      {viewDesigns.map((design) => {
        const overlay = DESIGN_AREA_OVERLAYS[design.area]
        if (!overlay) return null
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={design.area}
            src={design.imageBase64}
            alt={design.areaName}
            className="absolute object-contain"
            style={overlay.style as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}

export default function SharePage() {
  const params = useParams()
  const id = params?.id as string
  const [design, setDesign] = useState<(SharedDesignData & { id: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    getSharedDesign(id)
      .then(data => {
        if (!data) setNotFound(true)
        else setDesign(data)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffdf5]">
        <Loader2 className="w-12 h-12 animate-spin text-yellow-400" />
      </div>
    )
  }

  if (notFound || !design) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fffdf5] text-center px-4">
        <p className="text-2xl font-bold text-gray-700">העיצוב לא נמצא</p>
        <p className="text-gray-500">הקישור אינו תקין או שהעיצוב הוסר</p>
        <Link href="/designer">
          <Button className="mt-2 rounded-full px-8 font-bold text-white" style={{ backgroundColor: 'rgb(255, 195, 46)' }}>
            התחל לעצב
          </Button>
        </Link>
      </div>
    )
  }

  const hasFront = design.designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'front')
  const hasBack = design.designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'back')
  const hasBoth = hasFront && hasBack

  return (
    <div className="min-h-screen bg-[#fffdf5] relative overflow-hidden" dir="rtl">
      {/* Background blobs */}
      <div className="absolute -top-32 -right-32 w-[250px] h-[250px] md:w-[500px] md:h-[500px] bg-gradient-radial from-[#fef08a]/60 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-48 -left-48 w-[250px] h-[250px] md:w-[600px] md:h-[600px] bg-gradient-radial from-[#fdba74]/40 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[350px] h-[200px] md:w-[800px] md:h-[400px] bg-gradient-radial from-[#fef08a]/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8 gap-6">

        {/* Mockups — large on desktop */}
        {hasBoth ? (
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs sm:max-w-sm md:max-w-2xl lg:max-w-4xl">
            <MockupView view="front" color={design.color} designs={design.designs} />
            <MockupView view="back" color={design.color} designs={design.designs} />
          </div>
        ) : (
          <div className="w-full max-w-[260px] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl">
            <MockupView
              view={hasFront ? 'front' : 'back'}
              color={design.color}
              designs={design.designs}
            />
          </div>
        )}

        {/* CTA */}
        <div className="text-center space-y-4">
          <p className="text-2xl md:text-3xl font-black text-gray-900">רוצים גם אתם?</p>
          <Link href="/designer">
            <Button
              size="lg"
              className="rounded-full px-10 py-3 text-base md:text-lg font-bold shadow-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'rgb(255, 195, 46)' }}
            >
              <span className="text-white drop-shadow">התחל לעצב</span>
            </Button>
          </Link>
        </div>

      </div>
    </div>
  )
}
