'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getSharedCart, SharedDesignData, createShareCoupon } from '@/lib/db'
import { tshirtMockups, tshirtMockupsBack, colorFallback, DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'
import { TSHIRT_COLORS, SWEATSHIRT_COLORS, BUFF_COLORS, PRODUCT_CATEGORIES, FABRIC_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Loader2, X, Copy, Check, ChevronDown } from 'lucide-react'

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
      <img src={mockupSrc} alt={view === 'front' ? 'קדימה' : 'אחורה'} className="w-full h-auto block rounded-xl group-hover:brightness-[0.97] transition-all duration-200" />
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

function DesignCard({ item, onClickMockup }: { item: SharedDesignData; onClickMockup: (view: 'front' | 'back', color: string, designs: SharedDesignData['designs']) => void }) {
  const hasFront = item.designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'front')
  const hasBack = item.designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'back')
  const colorLabel = getColorLabel(item.color)
  const colorHex = getColorHex(item.color)
  const productLabel = getProductLabel(item.productType)
  const productIcon = getProductIcon(item.productType)

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Mockups - big and prominent */}
      <div className="bg-gray-50/50 p-5 sm:p-6">
        {hasFront && hasBack ? (
          <div className="grid grid-cols-2 gap-3">
            <MockupView view="front" color={item.color} designs={item.designs} onClick={() => onClickMockup('front', item.color, item.designs)} />
            <MockupView view="back" color={item.color} designs={item.designs} onClick={() => onClickMockup('back', item.color, item.designs)} />
          </div>
        ) : (
          <div className="max-w-[260px] mx-auto">
            <MockupView
              view={hasFront ? 'front' : 'back'}
              color={item.color}
              designs={item.designs}
              onClick={() => onClickMockup(hasFront ? 'front' : 'back', item.color, item.designs)}
            />
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="px-5 py-3 flex items-center justify-between border-t border-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{productIcon}</span>
          <span className="font-medium">{productLabel}</span>
          {item.fabricType && (
            <span className="text-gray-400 text-xs">({getFabricLabel(item.fabricType)})</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded-full border border-gray-200 shadow-sm"
            style={{ backgroundColor: colorHex }}
          />
          <span className="text-sm text-gray-500">{colorLabel}</span>
        </div>
      </div>
    </div>
  )
}

const INITIAL_SHOW = 6

export default function ShareCartPage() {
  const params = useParams()
  const id = params?.id as string
  const [cart, setCart] = useState<{ id: string; items: SharedDesignData[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [lightbox, setLightbox] = useState<{ view: 'front' | 'back'; color: string; designs: SharedDesignData['designs'] } | null>(null)
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showAll, setShowAll] = useState(false)

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

  const handleGetCoupon = async () => {
    if (couponCode || couponLoading) return
    setCouponLoading(true)
    try {
      const code = await createShareCoupon(id)
      setCouponCode(code)
    } catch {
      alert('שגיאה ביצירת קופון, נסה שוב')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleCopyCoupon = async () => {
    if (!couponCode) return
    await navigator.clipboard.writeText(couponCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

  const visibleItems = showAll ? cart.items : cart.items.slice(0, INITIAL_SHOW)
  const hasMore = !showAll && cart.items.length > INITIAL_SHOW

  return (
    <div className="min-h-screen bg-[#fafaf7]" dir="rtl">

      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png" alt="בדפוס" width={40} height={40} />
          </Link>
          <Link href="/designer">
            <Button
              size="sm"
              className="rounded-full px-6 text-sm font-bold"
              style={{ backgroundColor: 'rgb(255, 195, 46)' }}
            >
              <span className="text-white">התחל לעצב</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Title */}
        <div className="pt-10 pb-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            {cart.items.length} עיצובים מותאמים אישית
          </h1>
        </div>

        {/* Inline coupon banner */}
        <div className="my-6 mx-auto max-w-xl">
          {!couponCode ? (
            <div className="flex items-center justify-between gap-4 bg-white rounded-xl border border-yellow-200 px-5 py-3">
              <div>
                <p className="text-sm font-bold text-gray-900">5% הנחה על ההזמנה הראשונה</p>
                <p className="text-xs text-gray-400">חד פעמי · 7 ימים</p>
              </div>
              <Button
                onClick={handleGetCoupon}
                disabled={couponLoading}
                size="sm"
                className="rounded-full px-5 text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white flex-shrink-0"
              >
                {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'קבל קופון'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 bg-white rounded-xl border border-green-200 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-lg tracking-wider text-gray-900">{couponCode}</span>
                <button
                  onClick={handleCopyCoupon}
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0">הזן בעמוד התשלום</p>
            </div>
          )}
        </div>

        {/* Designs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 pb-6">
          {visibleItems.map((item, i) => (
            <DesignCard
              key={i}
              item={item}
              onClickMockup={(view, color, designs) => setLightbox({ view, color, designs })}
            />
          ))}
        </div>

        {/* Show more */}
        {hasMore && (
          <div className="text-center pb-6">
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors py-2 px-4 rounded-full border border-gray-200 hover:border-gray-300 bg-white"
            >
              הצג עוד {cart.items.length - INITIAL_SHOW} עיצובים
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center py-12 border-t border-gray-100 mt-6">
          <p className="text-lg font-bold text-gray-900 mb-1">רוצה גם? עצב חולצה תוך דקות</p>
          <p className="text-sm text-gray-400 mb-5">איכות מעולה · משלוח מהיר · מחיר הוגן</p>
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

      </main>

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
