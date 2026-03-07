'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getSharedCart, SharedDesignData } from '@/lib/db'
import { tshirtMockups, tshirtMockupsBack, colorFallback, DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'
import { TSHIRT_COLORS, SWEATSHIRT_COLORS, BUFF_COLORS, PRODUCT_CATEGORIES, FABRIC_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Loader2, X } from 'lucide-react'

const ALL_COLORS = [...TSHIRT_COLORS, ...SWEATSHIRT_COLORS, ...BUFF_COLORS]

function getColorLabel(colorId: string) {
  return ALL_COLORS.find(c => c.id === colorId)?.name || colorId
}

function getColorHex(colorId: string) {
  return ALL_COLORS.find(c => c.id === colorId)?.hex || '#000'
}

function getProductLabel(productType: string) {
  return PRODUCT_CATEGORIES.find(c => c.id === productType)?.name || productType
}

function getProductIcon(productType: string) {
  return PRODUCT_CATEGORIES.find(c => c.id === productType)?.icon || '👕'
}

function getFabricLabel(fabricType: string) {
  return FABRIC_TYPES.find(f => f.id === fabricType)?.name || fabricType
}

function Lightbox({ view, color, designs, onClose }: {
  view: 'front' | 'back'
  color: string
  designs: { area: string; areaName: string; imageBase64: string }[]
  onClose: () => void
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 left-4 md:top-6 md:left-6 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors z-10"
      >
        <X className="w-6 h-6 text-gray-700" />
      </button>
      <div
        className="relative max-w-[90vw] max-h-[85vh] w-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mockupSrc}
          alt={view === 'front' ? 'קדימה' : 'אחורה'}
          className="max-w-full max-h-[85vh] w-auto h-auto rounded-2xl shadow-2xl"
        />
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
    </div>
  )
}

function MockupView({ view, color, designs, onClick }: {
  view: 'front' | 'back'
  color: string
  designs: { area: string; areaName: string; imageBase64: string }[]
  onClick?: () => void
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
    <div className={`relative w-full ${onClick ? 'cursor-pointer group' : ''}`} onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mockupSrc} alt={view === 'front' ? 'קדימה' : 'אחורה'} className="w-full h-auto block rounded-xl group-hover:brightness-95 transition-all duration-200" />
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
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <span className="bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
          {view === 'front' ? 'קדימה' : 'אחורה'}
        </span>
      </div>
    </div>
  )
}

function DesignCard({ item, index, onClickMockup }: { item: SharedDesignData; index: number; onClickMockup: (view: 'front' | 'back', color: string, designs: SharedDesignData['designs']) => void }) {
  const hasFront = item.designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'front')
  const hasBack = item.designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'back')
  const colorLabel = getColorLabel(item.color)
  const colorHex = getColorHex(item.color)
  const productLabel = getProductLabel(item.productType)
  const productIcon = getProductIcon(item.productType)

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100">
      {/* Card header */}
      <div className="bg-gradient-to-l from-gray-50 to-white px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{productIcon}</span>
          <span className="font-bold text-gray-800 text-sm">{productLabel}</span>
          {item.fabricType && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500">{getFabricLabel(item.fabricType)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded-full border border-gray-300 shadow-inner"
            style={{ backgroundColor: colorHex }}
          />
          <span className="text-xs text-gray-500">{colorLabel}</span>
        </div>
      </div>

      {/* Mockup images */}
      <div className="p-4">
        {hasFront && hasBack ? (
          <div className="grid grid-cols-2 gap-3">
            <MockupView view="front" color={item.color} designs={item.designs} onClick={() => onClickMockup('front', item.color, item.designs)} />
            <MockupView view="back" color={item.color} designs={item.designs} onClick={() => onClickMockup('back', item.color, item.designs)} />
          </div>
        ) : (
          <div className="max-w-[220px] mx-auto">
            <MockupView
              view={hasFront ? 'front' : 'back'}
              color={item.color}
              designs={item.designs}
              onClick={() => onClickMockup(hasFront ? 'front' : 'back', item.color, item.designs)}
            />
          </div>
        )}
      </div>

      {/* Design areas info */}
      <div className="px-5 pb-4">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {item.designs.map((d) => (
            <span
              key={d.area}
              className="inline-block bg-yellow-50 text-yellow-700 text-[11px] font-medium px-2 py-0.5 rounded-full border border-yellow-200"
            >
              {d.areaName}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ShareCartPage() {
  const params = useParams()
  const id = params?.id as string
  const [cart, setCart] = useState<{ id: string; items: SharedDesignData[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [lightbox, setLightbox] = useState<{ view: 'front' | 'back'; color: string; designs: SharedDesignData['designs'] } | null>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

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
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf7]">
        <Loader2 className="w-12 h-12 animate-spin text-yellow-400" />
      </div>
    )
  }

  if (notFound || !cart) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fafaf7] text-center px-4">
        <Image src="/logo.png" alt="בדפוס" width={80} height={80} className="mb-2" />
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
    <div className="min-h-screen bg-[#fafaf7] relative overflow-hidden" dir="rtl">
      {/* Subtle background decoration */}
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-yellow-50/80 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-yellow-100/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-60 -left-60 w-[600px] h-[600px] bg-orange-100/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="pt-8 pb-10 text-center">
          <Link href="/" className="inline-block mb-5">
            <Image src="/logo.png" alt="בדפוס" width={72} height={72} className="mx-auto drop-shadow-sm" />
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
            {cart.items.length} עיצובים שנוצרו ב-בדפוס
          </h1>
          <p className="text-gray-400 text-sm">שותפו איתך עיצובים מותאמים אישית</p>
        </header>

        {/* Designs grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-14">
          {cart.items.map((item, i) => (
            <DesignCard
              key={i}
              item={item}
              index={i}
              onClickMockup={(view, color, designs) => setLightbox({ view, color, designs })}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center pb-16">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 max-w-md mx-auto py-8 px-6">
            <p className="text-xl font-bold text-gray-900 mb-1">אהבת? גם אתה יכול לעצב</p>
            <p className="text-gray-400 text-sm mb-5">עצב חולצה מותאמת אישית תוך דקות</p>
            <Link href="/designer">
              <Button
                size="lg"
                className="rounded-full px-10 py-3 text-base font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                style={{ backgroundColor: 'rgb(255, 195, 46)' }}
              >
                <span className="text-white drop-shadow">התחל לעצב עכשיו</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          view={lightbox.view}
          color={lightbox.color}
          designs={lightbox.designs}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
