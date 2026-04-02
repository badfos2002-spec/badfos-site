'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getSharedCart, SharedDesignData, createShareCoupon } from '@/lib/db'
import { tshirtMockups, tshirtMockupsBack, colorFallback, DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'
import { TSHIRT_COLORS, SWEATSHIRT_COLORS, BUFF_COLORS, APRON_COLORS, PRODUCT_CATEGORIES, FABRIC_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Loader2, X, Copy, Check, ChevronDown } from 'lucide-react'

const ALL_COLORS = [...TSHIRT_COLORS, ...SWEATSHIRT_COLORS, ...BUFF_COLORS, ...APRON_COLORS]

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
    <div className="rounded-2xl border border-gray-200/80 overflow-hidden bg-white/50 backdrop-blur-sm">
      {/* Mockups - always 2 columns for consistent size */}
      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-3">
          <MockupView view="front" color={item.color} designs={item.designs} onClick={() => onClickMockup('front', item.color, item.designs)} />
          {hasBack ? (
            <MockupView view="back" color={item.color} designs={item.designs} onClick={() => onClickMockup('back', item.color, item.designs)} />
          ) : (
            <div className="w-full" />
          )}
        </div>
      </div>

      {/* Info - thin strip */}
      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-[#64748b]">
        <span>{productIcon} {productLabel}{item.fabricType ? ` · ${getFabricLabel(item.fabricType)}` : ''}</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorHex }} />
          <span>{colorLabel}</span>
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
      <div className="absolute -top-32 -right-32 w-[250px] h-[250px] md:w-[500px] md:h-[500px] bg-gradient-radial from-[#fef08a]/60 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-48 -left-48 w-[250px] h-[250px] md:w-[600px] md:h-[600px] bg-gradient-radial from-[#fdba74]/40 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/90 backdrop-blur-[20px] shadow-sm">
        <div className="mx-auto max-w-[1536px] px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/home">
            <Image src="/logo.png" alt="בדפוס" width={40} height={40} className="h-10 w-auto" />
          </Link>
          <Link href="/designer">
            <Button className="bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-bold rounded-full px-6 shadow-md hover:shadow-lg transition-all hover:scale-105 duration-200">
              התחל לעצב
            </Button>
          </Link>
        </div>
      </header>

      {/* Title */}
      <div className="relative z-10 text-center pt-8 sm:pt-10 pb-6 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 bg-[#fef9c3] rounded-full text-[#854d0e] text-sm font-medium border border-[#fef08a] mb-3">
          {cart.items.length} עיצובים שותפו איתך
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1e293b]">
          עיצובים מותאמים אישית
        </h1>
      </div>

      {/* Designs grid */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
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
          <div className="text-center mt-6">
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#854d0e] bg-[#fef9c3] hover:bg-[#fef08a] border border-[#fef08a] rounded-full px-5 py-2 transition-colors"
            >
              הצג עוד {cart.items.length - INITIAL_SHOW} עיצובים
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Coupon */}
        <div className="mt-10 bg-gradient-to-r from-[#fef9c3] to-[#fef08a]/60 rounded-2xl border-2 border-[#fcd34d] px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          {!couponCode ? (
            <>
              <div className="text-center sm:text-right">
                <p className="text-lg font-bold text-[#1e293b]">5% הנחה על ההזמנה הראשונה</p>
                <p className="text-sm text-[#854d0e] mt-0.5">קופון חד פעמי · תקף ל-7 ימים</p>
              </div>
              <Button
                onClick={handleGetCoupon}
                disabled={couponLoading}
                className="rounded-full px-8 py-2.5 text-sm font-bold bg-[#1e293b] hover:bg-[#334155] text-white flex-shrink-0 shadow-md"
              >
                {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'קבל קופון'}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[#854d0e]">הקופון שלך:</span>
                <span className="font-mono font-black text-2xl tracking-widest text-[#1e293b]">{couponCode}</span>
                <button onClick={handleCopyCoupon} className="p-1.5 rounded-lg bg-white/60 hover:bg-white transition-colors">
                  {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-[#854d0e]" />}
                </button>
              </div>
              <p className="text-sm text-[#854d0e]">הזן בעמוד התשלום · תקף 7 ימים</p>
            </>
          )}
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative z-10 mt-12">
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
