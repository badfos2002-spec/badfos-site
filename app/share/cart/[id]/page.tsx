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
      <img src={mockupSrc} alt={view === 'front' ? 'קדימה' : 'אחורה'} className="w-full h-auto block rounded-xl group-hover:scale-[1.02] transition-transform duration-200" />
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
    <div className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-shadow duration-300">
      {/* Mockups */}
      <div className="p-6 sm:p-8">
        {hasFront && hasBack ? (
          <div className="grid grid-cols-2 gap-4">
            <MockupView view="front" color={item.color} designs={item.designs} onClick={() => onClickMockup('front', item.color, item.designs)} />
            <MockupView view="back" color={item.color} designs={item.designs} onClick={() => onClickMockup('back', item.color, item.designs)} />
          </div>
        ) : (
          <div className="max-w-[280px] mx-auto">
            <MockupView
              view={hasFront ? 'front' : 'back'}
              color={item.color}
              designs={item.designs}
              onClick={() => onClickMockup(hasFront ? 'front' : 'back', item.color, item.designs)}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-6 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{productIcon}</span>
          <span className="text-sm font-semibold text-[#1e293b]">{productLabel}</span>
          {item.fabricType && (
            <span className="text-xs text-[#94a3b8]">{getFabricLabel(item.fabricType)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full border-2 border-white shadow-md"
            style={{ backgroundColor: colorHex }}
          />
          <span className="text-sm text-[#64748b]">{colorLabel}</span>
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
      <div className="min-h-screen flex items-center justify-center bg-[#fffdf5]">
        <Loader2 className="w-12 h-12 animate-spin text-[#f59e0b]" />
      </div>
    )
  }

  if (notFound || !cart) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fffdf5] text-center px-4">
        <Image src="/logo.png" alt="בדפוס" width={80} height={80} className="mb-2" />
        <p className="text-2xl font-bold text-[#1e293b]">העיצובים לא נמצאו</p>
        <p className="text-[#94a3b8]">הקישור אינו תקין או שהעיצובים הוסרו</p>
        <Link href="/designer">
          <Button className="mt-2 bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-bold rounded-full px-8 shadow-lg">
            התחל לעצב
          </Button>
        </Link>
      </div>
    )
  }

  const visibleItems = showAll ? cart.items : cart.items.slice(0, INITIAL_SHOW)
  const hasMore = !showAll && cart.items.length > INITIAL_SHOW

  return (
    <div className="min-h-screen bg-[#fffdf5] relative overflow-hidden" dir="rtl">
      {/* Background blobs - matching the site */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-radial from-[#fef08a]/60 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-gradient-radial from-[#fdba74]/40 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/90 backdrop-blur-[20px] shadow-sm">
        <div className="mx-auto max-w-[1536px] px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="בדפוס" className="h-10 w-auto" />
          </Link>
          <Link href="/designer">
            <Button className="bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-bold rounded-full px-6 shadow-md hover:shadow-lg transition-all hover:scale-105 duration-200">
              התחל לעצב
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10 text-center pt-12 sm:pt-16 pb-8 px-4">
        <div className="inline-flex items-center gap-2 px-5 py-1.5 bg-[#fef9c3] rounded-full text-[#854d0e] text-sm font-medium border border-[#fef08a] mb-5">
          {cart.items.length} עיצובים שותפו איתך
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1e293b] leading-tight">
          עיצובים מותאמים אישית
        </h1>
        <p className="text-lg text-[#94a3b8] mt-3">לחץ על עיצוב כדי להגדיל</p>
      </div>

      {/* Designs grid */}
      <div className="relative z-10 mx-auto max-w-[1100px] px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
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
          <div className="text-center mt-8">
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#854d0e] bg-[#fef9c3] hover:bg-[#fef08a] border border-[#fef08a] rounded-full px-6 py-2.5 transition-colors"
            >
              הצג עוד {cart.items.length - INITIAL_SHOW} עיצובים
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Coupon section */}
      <div className="relative z-10 mx-auto max-w-xl px-4 sm:px-6 mt-16 mb-6">
        <div className="bg-white rounded-2xl border border-[#fef08a] shadow-md px-6 py-5 text-center">
          {!couponCode ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-right">
                <p className="text-base font-bold text-[#1e293b]">5% הנחה על ההזמנה הראשונה</p>
                <p className="text-xs text-[#94a3b8] mt-0.5">קופון חד פעמי · תקף ל-7 ימים</p>
              </div>
              <Button
                onClick={handleGetCoupon}
                disabled={couponLoading}
                className="rounded-full px-6 py-2 text-sm font-bold bg-[#1e293b] hover:bg-[#334155] text-white flex-shrink-0"
              >
                {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'קבל קופון'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-xl tracking-widest text-[#1e293b]">{couponCode}</span>
                <button
                  onClick={handleCopyCoupon}
                  className="p-1.5 rounded-lg hover:bg-[#fef9c3] transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-[#94a3b8]" />}
                </button>
              </div>
              <p className="text-xs text-[#94a3b8]">הזן בעמוד התשלום · תקף 7 ימים</p>
            </div>
          )}
        </div>
      </div>

      {/* Final CTA - matching site style */}
      <div className="relative z-10 mt-10">
        <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white py-16 sm:py-20 relative overflow-hidden">
          <div className="absolute top-10 right-10 w-40 h-40 bg-yellow-500/30 rounded-full blur-2xl" />
          <div className="absolute bottom-10 left-10 w-52 h-52 bg-pink-500/20 rounded-full blur-2xl" />
          <div className="relative z-10 text-center px-4">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">רוצה גם? עצב חולצה תוך דקות</h2>
            <p className="text-purple-200 text-base sm:text-lg mb-8">העלה תמונה, בחר עיצוב, וקבל חולצה איכותית עד הבית</p>
            <Link href="/designer">
              <Button className="bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-bold px-10 py-5 h-auto text-lg rounded-full shadow-2xl hover:scale-105 transition-all duration-200">
                התחל לעצב עכשיו
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
