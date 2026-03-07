'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getSharedCart, SharedDesignData, createShareCoupon } from '@/lib/db'
import { tshirtMockups, tshirtMockupsBack, colorFallback, DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'
import { TSHIRT_COLORS, SWEATSHIRT_COLORS, BUFF_COLORS, PRODUCT_CATEGORIES, FABRIC_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Loader2, X, Truck, Star, ShieldCheck, Copy, Check } from 'lucide-react'

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

function DesignCard({ item, onClickMockup }: { item: SharedDesignData; onClickMockup: (view: 'front' | 'back', color: string, designs: SharedDesignData['designs']) => void }) {
  const hasFront = item.designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'front')
  const hasBack = item.designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'back')
  const colorLabel = getColorLabel(item.color)
  const colorHex = getColorHex(item.color)
  const productLabel = getProductLabel(item.productType)
  const productIcon = getProductIcon(item.productType)

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
      {/* Mockup images */}
      <div className="p-3">
        {hasFront && hasBack ? (
          <div className="grid grid-cols-2 gap-2">
            <MockupView view="front" color={item.color} designs={item.designs} onClick={() => onClickMockup('front', item.color, item.designs)} />
            <MockupView view="back" color={item.color} designs={item.designs} onClick={() => onClickMockup('back', item.color, item.designs)} />
          </div>
        ) : (
          <div className="max-w-[200px] mx-auto">
            <MockupView
              view={hasFront ? 'front' : 'back'}
              color={item.color}
              designs={item.designs}
              onClick={() => onClickMockup(hasFront ? 'front' : 'back', item.color, item.designs)}
            />
          </div>
        )}
      </div>

      {/* Card footer - compact info */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>{productIcon}</span>
          <span className="font-medium text-gray-700">{productLabel}</span>
          {item.fabricType && (
            <>
              <span className="text-gray-300">·</span>
              <span>{getFabricLabel(item.fabricType)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3.5 h-3.5 rounded-full border border-gray-200"
            style={{ backgroundColor: colorHex }}
          />
          <span className="text-xs text-gray-400">{colorLabel}</span>
        </div>
      </div>
    </div>
  )
}

const BENEFITS = [
  { icon: Star, text: 'איכות מעולה' },
  { icon: Truck, text: 'משלוח מהיר' },
  { icon: ShieldCheck, text: 'מחיר הוגן' },
]

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

  return (
    <div className="min-h-screen bg-[#fafaf7] relative" dir="rtl">
      {/* Top bar */}
      <div className="border-b border-gray-100 bg-white/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="בדפוס" width={36} height={36} />
            <span className="font-bold text-gray-800 text-sm hidden sm:inline">בדפוס</span>
          </Link>
          <Link href="/designer">
            <Button
              size="sm"
              className="rounded-full px-5 text-xs font-bold"
              style={{ backgroundColor: 'rgb(255, 195, 46)' }}
            >
              <span className="text-white">התחל לעצב</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero title */}
      <div className="text-center pt-10 pb-8 px-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-1.5">
          {cart.items.length} עיצובים שנוצרו ב-בדפוס
        </h1>
        <p className="text-gray-400 text-sm">לחץ על עיצוב כדי להגדיל</p>
      </div>

      {/* Designs grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-16">
          {cart.items.map((item, i) => (
            <DesignCard
              key={i}
              item={item}
              onClickMockup={(view, color, designs) => setLightbox({ view, color, designs })}
            />
          ))}
        </div>
      </div>

      {/* Bottom section - one unified block */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

            {/* Right side (RTL) - Benefits + CTA */}
            <div className="text-center md:text-right">
              <h2 className="text-xl font-bold text-gray-900 mb-4">למה בדפוס?</h2>
              <div className="flex flex-col gap-3 mb-6">
                {BENEFITS.map((b) => (
                  <div key={b.text} className="flex items-center gap-3 md:justify-start justify-center">
                    <div className="w-8 h-8 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center flex-shrink-0">
                      <b.icon className="w-4 h-4 text-yellow-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{b.text}</span>
                  </div>
                ))}
              </div>
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

            {/* Left side (RTL) - Coupon */}
            <div className="bg-gradient-to-bl from-yellow-50 to-gray-50 rounded-2xl border border-yellow-100/80 p-6 text-center">
              {!couponCode ? (
                <>
                  <p className="text-lg font-bold text-gray-900 mb-1">5% הנחה על ההזמנה הראשונה</p>
                  <p className="text-xs text-gray-400 mb-4">קופון חד פעמי, תקף ל-7 ימים</p>
                  <Button
                    onClick={handleGetCoupon}
                    disabled={couponLoading}
                    className="rounded-full px-8 py-2.5 text-sm font-bold bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'קבל קופון'}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-2">הקופון שלך:</p>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl font-mono font-black tracking-wider text-gray-900">{couponCode}</span>
                    <button
                      onClick={handleCopyCoupon}
                      className="p-1.5 rounded-lg hover:bg-white/80 transition-colors"
                      title="העתק"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">הזן את הקוד בעמוד התשלום</p>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link href="/designer" className="w-full">
            <Button
              className="w-full rounded-full py-2.5 text-sm font-bold shadow-md"
              style={{ backgroundColor: 'rgb(255, 195, 46)' }}
            >
              <span className="text-white drop-shadow">התחל לעצב</span>
            </Button>
          </Link>
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
