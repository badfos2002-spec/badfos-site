'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getSharedDesign, SharedDesignData } from '@/lib/db'
import { tshirtMockups, tshirtMockupsBack, capMockups, colorFallback, DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import ThreeErrorBoundary from '@/components/designer/three/ThreeErrorBoundary'
import { getColorHex, getModel3D } from '@/lib/constants'

const Preview3DStage = dynamic(() => import('@/components/designer/three/Preview3DStage'), { ssr: false })

function MockupView({ view, color, designs, productType, fabricType }: {
  view: 'front' | 'back'
  color: string
  designs: { area: string; areaName: string; imageBase64: string }[]
  productType?: string
  fabricType?: string
}) {
  const resolvedColor = colorFallback[color] || color

  // Product-aware 2D mockup photo. Caps have a dedicated photo set; buff/apron/
  // baby have none → we render the raw uploaded design(s) on a neutral card
  // instead of showing a t-shirt photo. tshirt/sweatshirt keep the t-shirt set.
  let mockupSrc: string | undefined
  if (productType === 'cap') {
    const set = fabricType ? capMockups[fabricType] : undefined
    mockupSrc = set?.[color] || set?.['black']
  } else if (productType === 'buff' || productType === 'apron' || productType === 'baby' || productType === 'tote' || productType === 'vest') {
    mockupSrc = undefined
  } else {
    mockupSrc = view === 'front'
      ? (tshirtMockups[resolvedColor] || tshirtMockups['black'])
      : (tshirtMockupsBack[resolvedColor] || tshirtMockupsBack['black'])
  }

  const viewDesigns = designs.filter(d => {
    const overlay = DESIGN_AREA_OVERLAYS[d.area]
    return overlay && overlay.view === view
  })

  // No product photo (buff / apron / baby) → neutral card with the raw design(s).
  if (!mockupSrc) {
    return (
      <div
        className="relative w-full flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-6"
        style={{ aspectRatio: '3/4' }}
      >
        {viewDesigns.length > 0 ? (
          viewDesigns.map((design) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={design.area}
              src={design.imageBase64}
              alt={design.areaName}
              className="max-w-[70%] max-h-[70%] object-contain"
            />
          ))
        ) : (
          <span className="text-sm text-gray-400">אין עיצוב להצגה</span>
        )}
      </div>
    )
  }

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

export default function ShareClient() {
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
  const m3d = getModel3D(design.productType, design.fabricType)
  // On phones, a product that HAS a 3D model turns the whole screen into the
  // stage, so the page must hug it — a 100vh floor under a 100dvh stage is
  // exactly the URL-bar-sized scroll we are trying to remove. Everything else
  // (the 2D mockup paths) keeps the old centred-card page untouched.
  const fullScreen3D = !!m3d

  return (
    <div className={`bg-[#fffdf5] relative overflow-hidden ${fullScreen3D ? 'sm:min-h-screen' : 'min-h-screen'}`} dir="rtl">
      {/* Background blobs */}
      <div className="absolute -top-32 -right-32 w-[250px] h-[250px] md:w-[500px] md:h-[500px] bg-gradient-radial from-[#fef08a]/60 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-48 -left-48 w-[250px] h-[250px] md:w-[600px] md:h-[600px] bg-gradient-radial from-[#fdba74]/40 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[350px] h-[200px] md:w-[800px] md:h-[400px] bg-gradient-radial from-[#fef08a]/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className={`relative z-10 flex flex-col items-center justify-center gap-6 ${fullScreen3D ? 'sm:min-h-screen sm:px-4 sm:py-8' : 'min-h-screen px-4 py-8'}`}>

        {/* Preview — 3D for products with a model, else the 2D mockup */}
        {m3d ? (
          // Full-bleed on phones: the container drops its padding below sm, so
          // w-full already reaches both device edges — no 100vw, which would add
          // a scrollbar's width of overflow.
          <div className="w-full sm:max-w-sm md:max-w-md lg:max-w-lg">
            <ThreeErrorBoundary fallback={<MockupView view="front" color={design.color} designs={design.designs} />}>
              {/* Phone: the stage IS the screen — full dynamic viewport, and a
                  band rather than a card, so no corners and no shadow. From sm up
                  it goes back to being an inset 3:4 card, unchanged. */}
              <div className="share-stage-fullbleed relative w-full overflow-hidden sm:aspect-[3/4] sm:rounded-2xl sm:shadow-lg">
                <Preview3DStage
                  colorHex={getColorHex(design.color)}
                  designs={design.designs.map(d => ({ area: d.area, url: d.imageBase64, transform: d.transform }))}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  variant={m3d.variant as any}
                  modelUrl={m3d.url}
                />
              </div>
            </ThreeErrorBoundary>
          </div>
        ) : hasBoth ? (
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs sm:max-w-sm md:max-w-2xl lg:max-w-4xl">
            <MockupView view="front" color={design.color} designs={design.designs} productType={design.productType} fabricType={design.fabricType} />
            <MockupView view="back" color={design.color} designs={design.designs} productType={design.productType} fabricType={design.fabricType} />
          </div>
        ) : (
          <div className="w-full max-w-[260px] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl">
            <MockupView
              view={hasFront ? 'front' : 'back'}
              color={design.color}
              designs={design.designs}
              productType={design.productType}
              fabricType={design.fabricType}
            />
          </div>
        )}

      </div>
    </div>
  )
}
