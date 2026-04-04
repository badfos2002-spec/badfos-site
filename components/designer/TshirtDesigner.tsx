'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { ProductConfig, SizeQuantity, DesignArea } from '@/lib/types'
import StepIndicator from './StepIndicator'
import ShirtTypeStep from './ShirtTypeStep'
import ColorStep from './ColorStep'
import DesignStep from './DesignStep'
import SizeQuantityStep from './SizeQuantityStep'
import PriceSummary from './PriceSummary'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, RefreshCw, Shirt, Palette, ImagePlus, Ruler, Eye } from 'lucide-react'
import { tshirtMockups, tshirtMockupsBack, colorFallback, DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'
import { FABRIC_COLOR_FILTER } from '@/lib/constants'

/** Convert blob URL to base64 so it survives localStorage persistence.
 *  Uses XMLHttpRequest instead of fetch() for Safari compatibility with blob: URLs. */
async function blobToBase64(blobUrl: string): Promise<string> {
  if (!blobUrl.startsWith('blob:')) return blobUrl

  // Safari doesn't support fetch() on blob: URLs — use XHR instead
  const blob = await new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', blobUrl, true)
    xhr.responseType = 'blob'
    xhr.onload = () => resolve(xhr.response as Blob)
    xhr.onerror = () => reject(new Error('Failed to read blob URL'))
    xhr.send()
  })
  const isPng = blob.type === 'image/png'

  const img = new window.Image()
  img.src = blobUrl
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Image load failed'))
  })

  const MAX = 1000
  const scale = Math.min(1, MAX / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  if (isPng) {
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/png')
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.85)
}

const sweatshirtMockupsFront: Record<string, string> = {
  white: '/assets/סווטשרט חזית לבן.webp',
  black: '/assets/סווטשרט חזית.webp',
  red: '/assets/סווטשרט חזית אדום.webp',
  blue: '/assets/סווטשרט חזית כחול.webp',
  gray: '/assets/סווטשרט חזית אפור.webp',
  burgundy: '/assets/סווטשרט חזית בורדו.webp',
}
const sweatshirtMockupsBack: Record<string, string> = {
  white: '/assets/סווטשירט גב לבן.webp',
  black: '/assets/סווטשירט גב.webp',
  red: '/assets/סווטשירט גב אדום.webp',
  blue: '/assets/סווטשירט גב כחול.webp',
  gray: '/assets/סווטשירט גב אפור.webp',
  burgundy: '/assets/סווטשירט גב בורדו.webp',
}

const stepConfig = [
  { title: 'בחר סוג חולצה', icon: Shirt },
  { title: 'בחר צבע', icon: Palette },
  { title: 'העלה עיצוב', icon: ImagePlus },
  { title: 'בחר מידות וכמויות', icon: Ruler },
]

const DESIGNER_SESSION_KEY = 'designer_session'

function saveDesignerSession(step: number, config: Partial<ProductConfig>) {
  try {
    const data = { step, config, timestamp: Date.now() }
    sessionStorage.setItem(DESIGNER_SESSION_KEY, JSON.stringify(data))
  } catch {
    // Quota exceeded — clear old data and retry once
    try {
      sessionStorage.removeItem(DESIGNER_SESSION_KEY)
      sessionStorage.setItem(DESIGNER_SESSION_KEY, JSON.stringify({ step, config, timestamp: Date.now() }))
    } catch { /* truly full — nothing we can do */ }
  }
}

function loadDesignerSession(): { step: number; config: Partial<ProductConfig> } | null {
  try {
    const raw = sessionStorage.getItem(DESIGNER_SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    // Expire after 30 minutes
    if (Date.now() - data.timestamp > 30 * 60 * 1000) {
      sessionStorage.removeItem(DESIGNER_SESSION_KEY)
      return null
    }
    return { step: data.step, config: data.config }
  } catch { return null }
}

function clearDesignerSession() {
  try { sessionStorage.removeItem(DESIGNER_SESSION_KEY) } catch { /* ignore */ }
}

export default function TshirtDesigner({ breadcrumbs }: { breadcrumbs?: React.ReactNode } = {}) {
  const router = useRouter()
  const addItem = useCart((state) => state.addItem)
  const replaceItem = useCart((state) => state.replaceItem)
  const setEditingItem = useCart((state) => state.setEditingItem)
  const editingItemId = useCart((state) => state.editingItemId)

  const totalSteps = 4

  // Read editing item synchronously from Zustand store (getState = no re-render needed)
  const editingItem = editingItemId
    ? useCart.getState().items.find((i) => i.id === editingItemId) ?? null
    : null

  const savedSession = useRef(editingItem ? null : loadDesignerSession())

  const [currentStep, setCurrentStep] = useState(() =>
    editingItem ? totalSteps : (savedSession.current?.step || 1)
  )
  const [activeDesignArea, setActiveDesignArea] = useState<string>('front_full')
  const [previewView, setPreviewView] = useState<'front' | 'back'>('front')
  const [config, setConfig] = useState<Partial<ProductConfig>>(() =>
    editingItem
      ? {
          productType: editingItem.productType,
          fabricType: editingItem.fabricType,
          color: editingItem.color,
          designs: editingItem.designs,
          sizes: editingItem.sizes,
        }
      : savedSession.current?.config
        ? { ...savedSession.current.config }
        : {
            productType: 'tshirt',
            fabricType: undefined,
            color: '',
            designs: [],
            sizes: [],
          }
  )

  // Persist step + config to sessionStorage on every change
  // Designs are already base64 (converted at upload time), so no async needed
  useEffect(() => {
    if (editingItemId) return
    saveDesignerSession(currentStep, config)
  }, [currentStep, config, editingItemId])

  const updateConfig = (updates: Partial<ProductConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates }
      // Reset color if it's no longer valid for the new fabric type
      if (updates.fabricType && prev.color) {
        const allowed = FABRIC_COLOR_FILTER[updates.fabricType]
        if (allowed && !allowed.includes(prev.color)) {
          next.color = ''
        }
      }
      return next
    })
  }

  const scrollToTopMobile = () => {
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      scrollToTopMobile()
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      scrollToTopMobile()
    }
  }

  const resetDesign = () => {
    setCurrentStep(1)
    setConfig({ productType: 'tshirt', fabricType: undefined, color: '', designs: [], sizes: [] })
    setEditingItem(null)
    clearDesignerSession()
  }

  const [addingToCart, setAddingToCart] = useState(false)

  const handleAddToCart = async () => {
    if (addingToCart) return
    if (config.productType && config.fabricType && config.color && config.designs && config.sizes && config.sizes.length > 0) {
      setAddingToCart(true)
      try {
        // Convert blob URLs to base64 NOW — blob URLs expire after page navigation
        const persistedDesigns = await Promise.all(
          config.designs.map(async (d) => ({
            ...d,
            imageUrl: await blobToBase64(d.imageUrl),
          }))
        )
        const persistedConfig = { ...config, designs: persistedDesigns } as ProductConfig

        if (editingItemId) {
          replaceItem(editingItemId, persistedConfig)
        } else {
          addItem(persistedConfig)
        }
        clearDesignerSession()
        router.push('/cart')
      } catch (err) {
        console.error('Add to cart failed:', err)
        alert('אירעה שגיאה. אנא נסו שוב.')
        setAddingToCart(false)
      }
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!config.fabricType
      case 2: return !!config.color
      case 3: return !!(config.designs && config.designs.length > 0)
      case 4: return !!(config.sizes && config.sizes.length > 0 && config.sizes.some(s => s.quantity > 0))
      default: return false
    }
  }

  const resolvedColor = config.color ? (colorFallback[config.color] || config.color) : 'black'
  const isSweatshirt = config.productType === 'sweatshirt'
  const mockupSrc = previewView === 'back'
    ? isSweatshirt
      ? (sweatshirtMockupsBack[resolvedColor] || sweatshirtMockupsBack['black'])
      : (tshirtMockupsBack[resolvedColor] || tshirtMockupsBack['black'])
    : isSweatshirt
      ? (sweatshirtMockupsFront[resolvedColor] || sweatshirtMockupsFront['black'])
      : (tshirtMockups[resolvedColor] || tshirtMockups['black'])

  const StepIcon = stepConfig[currentStep - 1].icon
  const stepTitle = stepConfig[currentStep - 1].title

  const stepContent = (() => {
    switch (currentStep) {
      case 1:
        return <ShirtTypeStep selectedType={config.fabricType} onSelect={(type) => updateConfig({ fabricType: type })} />
      case 2:
        return <ColorStep selectedColor={config.color} onSelect={(color) => updateConfig({ color })} fabricType={config.fabricType} />
      case 3:
        return <DesignStep designs={config.designs || []} onUpdate={(designs) => updateConfig({ designs })} onAreaFocus={(area) => {
          setActiveDesignArea(area)
          const overlay = DESIGN_AREA_OVERLAYS[area]
          if (overlay) setPreviewView(overlay.view as 'front' | 'back')
        }} />
      case 4:
        return <SizeQuantityStep sizes={config.sizes || []} onUpdate={(sizes) => updateConfig({ sizes })} config={config as ProductConfig} />
      default:
        return null
    }
  })()

  const ViewTabs = () => currentStep >= 3 ? (
    <div className="flex justify-center gap-2 mt-3">
      <button
        onClick={() => setPreviewView('front')}
        className={`px-5 py-1.5 text-sm font-semibold rounded-full transition-colors ${previewView === 'front' ? 'text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        style={previewView === 'front' ? { backgroundColor: 'rgb(255, 195, 46)' } : {}}
      >
        חזית
      </button>
      <button
        onClick={() => setPreviewView('back')}
        className={`px-5 py-1.5 text-sm font-semibold rounded-full transition-colors ${previewView === 'back' ? 'text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        style={previewView === 'back' ? { backgroundColor: 'rgb(255, 195, 46)' } : {}}
      >
        גב
      </button>
    </div>
  ) : null

  const mockupDesigns = config.designs || []
  const tshirtAreaIds = ['front_full', 'back', 'chest_logo', 'chest_logo_right']
  const visibleAreas = Object.entries(DESIGN_AREA_OVERLAYS).filter(([areaId, overlay]) => {
    if (!tshirtAreaIds.includes(areaId)) return false
    if (overlay.view !== previewView) return false
    const hasDesign = mockupDesigns.some(d => d.area === areaId)
    return currentStep === 3 || hasDesign
  })
  const mockupElement = (
    <div className="relative w-full" style={{ aspectRatio: '3/4' }}>
      {mockupSrc ? (
        <Image
          src={mockupSrc}
          alt="תצוגה מקדימה"
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain"
        />
      ) : (
        <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center text-7xl">👕</div>
      )}
      {visibleAreas.map(([areaId, overlay]) => {
        const design = mockupDesigns.find(d => d.area === areaId)
        if (design) {
          return (
            <div
              key={areaId}
              className="absolute overflow-hidden"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              style={overlay.style as any}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={design.imageUrl}
                alt={overlay.label}
                className="w-full h-full object-contain"
              />
            </div>
          )
        }
        const isActive = areaId === activeDesignArea && currentStep === 3
        return (
          <div
            key={areaId}
            className={`absolute border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors duration-200 ${
              isActive
                ? 'border-green-400 bg-green-100/70'
                : 'border-gray-300 bg-gray-200/75'
            }`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style={overlay.style as any}
          >
            <span className={`text-xs font-medium text-center leading-tight px-1 ${isActive ? 'text-green-700' : 'text-gray-600'}`}>
              {overlay.label}
            </span>
          </div>
        )
      })}
    </div>
  )

  const NavButtons = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <>
      <Button
        variant="outline"
        onClick={goToPreviousStep}
        disabled={currentStep === 1}
        className={`flex items-center justify-center gap-2 ${fullWidth ? 'flex-1 h-10 rounded-md px-8' : ''}`}
      >
        <ArrowRight className="w-4 h-4" />
        הקודם
      </Button>
      {currentStep < totalSteps ? (
        <Button
          onClick={goToNextStep}
          disabled={!canProceed()}
          className={`gradient-yellow text-white flex items-center justify-center gap-2 ${fullWidth ? 'flex-1 h-10 rounded-md px-8' : ''}`}
        >
          הבא
          <ArrowLeft className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          onClick={handleAddToCart}
          disabled={!canProceed() || addingToCart}
          className={`gradient-yellow text-white ${fullWidth ? 'flex-1 h-10 rounded-md px-8' : ''}`}
        >
          {addingToCart ? 'מוסיף...' : editingItemId ? 'עדכן בעגלה ✓' : 'הוסף לעגלה 🛒'}
        </Button>
      )}
    </>
  )

  return (
    <div className="bg-gray-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {breadcrumbs}

        {/* ── Header ── */}
        <div className="text-center mb-6">
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

          {/* Desktop nav row */}
          <div className="hidden lg:flex justify-between items-center max-w-md mx-auto mt-6">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              הקודם
            </Button>
            <Button
              variant="outline"
              onClick={resetDesign}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 border-gray-300 hover:border-red-400 text-xs h-8 px-3"
            >
              <RefreshCw className="w-4 h-4" />
              התחל מחדש
            </Button>
            {currentStep < totalSteps ? (
              <Button
                onClick={goToNextStep}
                disabled={!canProceed()}
                className="gradient-yellow text-white flex items-center gap-2"
              >
                הבא
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleAddToCart}
                disabled={!canProceed() || addingToCart}
                className="gradient-yellow text-white"
              >
                {addingToCart ? 'מוסיף...' : editingItemId ? 'עדכן בעגלה ✓' : 'הוסף לעגלה 🛒'}
              </Button>
            )}
          </div>
        </div>

        {/* ── MOBILE LAYOUT ── */}
        <div className="lg:hidden space-y-6 pb-8 overflow-x-hidden">
          {/* Step 3 (design): mockup ABOVE step content so user sees preview */}
          {currentStep === 3 && (
            <div className="bg-white/95 pt-2 pb-4 -mx-4 px-4">
              <div className="relative mx-auto max-w-sm">
                {mockupElement}
                {config.designs && config.designs.length > 0 && (
                  <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    ✓ {config.designs.length} עיצובים
                  </span>
                )}
              </div>
              <ViewTabs />
            </div>
          )}

          {/* Step content card */}
          <div className="rounded-xl border bg-white border-yellow-200 shadow-sm">
            <div className="p-6">
              <div className="font-semibold leading-none tracking-tight flex items-center mb-6 text-[#1e293b]">
                <StepIcon className="w-5 h-5 ml-2 text-yellow-500" />
                {stepTitle}
              </div>
              {stepContent}
            </div>
          </div>

          {/* Steps 1,2,4: mockup BELOW step content */}
          {currentStep !== 3 && (
            <div className="bg-white/95 pt-2 pb-4 -mx-4 px-4">
              <div className="relative mx-auto max-w-sm">
                {mockupElement}
                {config.designs && config.designs.length > 0 && (
                  <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    ✓ {config.designs.length} עיצובים
                  </span>
                )}
              </div>
              <ViewTabs />
            </div>
          )}

          {/* Price summary on mobile */}
          <PriceSummary config={config as ProductConfig} />

          {/* Mobile bottom nav */}
          <div className="bg-white border-t border-gray-200 p-4 shadow-sm flex justify-between items-center gap-3 rounded-lg border relative z-20">
            <NavButtons fullWidth />
          </div>
        </div>

        {/* ── DESKTOP LAYOUT ── */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-12">

          {/* Left: step content + price summary */}
          <div className="lg:order-first space-y-6">
            <div className="rounded-xl border bg-white border-yellow-200 shadow-lg">
              <div className="p-6">
                <div className="font-semibold leading-none tracking-tight flex items-center mb-6 text-[#1e293b]">
                  <StepIcon className="w-5 h-5 ml-2 text-yellow-500" />
                  {stepTitle}
                </div>
                {stepContent}
              </div>
            </div>
            <PriceSummary config={config as ProductConfig} />
          </div>

          {/* Right: sticky preview */}
          <div className="lg:order-last sticky top-24 self-start">
            <div className="rounded-xl border bg-white shadow border-yellow-200 hover-lift">
              <div className="flex flex-col space-y-1.5 p-6">
                <div className="font-semibold leading-none tracking-tight flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-yellow-500" />
                    <span>תצוגה מקדימה</span>
                  </div>
                  {config.designs && config.designs.length > 0 && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      ✓ {config.designs.length} עיצובים
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="relative mx-auto max-w-md">
                  {mockupElement}
                </div>
                <ViewTabs />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
