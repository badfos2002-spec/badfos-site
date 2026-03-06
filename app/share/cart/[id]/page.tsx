'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getSharedCart, SharedDesignData } from '@/lib/db'
import { tshirtMockups, tshirtMockupsBack, colorFallback, DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'
import { TSHIRT_COLORS } from '@/lib/constants'
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
    <div className="relative w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mockupSrc} alt={view === 'front' ? 'front' : 'back'} className="w-full h-auto block" />
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

function DesignCard({ item, index }: { item: SharedDesignData; index: number }) {
  const hasFront = item.designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'front')
  const hasBack = item.designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'back')
  const colorLabel = TSHIRT_COLORS.find(c => c.id === item.color)?.name || item.color

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
      <div className="text-center mb-3">
        <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
        <span className="mx-2 text-gray-300">|</span>
        <span className="text-sm text-gray-600">{colorLabel}</span>
      </div>
      {hasFront && hasBack ? (
        <div className="grid grid-cols-2 gap-2">
          <MockupView view="front" color={item.color} designs={item.designs} />
          <MockupView view="back" color={item.color} designs={item.designs} />
        </div>
      ) : (
        <div className="max-w-[200px] mx-auto">
          <MockupView
            view={hasFront ? 'front' : 'back'}
            color={item.color}
            designs={item.designs}
          />
        </div>
      )}
    </div>
  )
}

export default function ShareCartPage() {
  const params = useParams()
  const id = params?.id as string
  const [cart, setCart] = useState<{ id: string; items: SharedDesignData[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    getSharedCart(id)
      .then(data => {
        if (!data) setNotFound(true)
        else setCart(data)
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

  if (notFound || !cart) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fffdf5] text-center px-4">
        <p className="text-2xl font-bold text-gray-700">העיצובים לא נמצאו</p>
        <p className="text-gray-500">הקישור אינו תקין או שהעיצובים הוסרו</p>
        <Link href="/designer">
          <Button className="mt-2 rounded-full px-8 font-bold text-white" style={{ backgroundColor: 'rgb(255, 195, 46)' }}>
            התחל לעצב
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fffdf5] relative overflow-hidden" dir="rtl">
      {/* Background blobs */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-radial from-[#fef08a]/60 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-gradient-radial from-[#fdba74]/40 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 px-4 py-12 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
            {cart.items.length} עיצובים מדהימים
          </p>
          <p className="text-gray-500">נוצרו ב-בדפוס</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {cart.items.map((item, i) => (
            <DesignCard key={i} item={item} index={i} />
          ))}
        </div>

        <div className="text-center space-y-4">
          <p className="text-2xl font-bold text-gray-900">רוצים גם אתם?</p>
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
