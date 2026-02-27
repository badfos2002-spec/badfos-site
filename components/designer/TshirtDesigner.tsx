'use client'

import { useState } from 'react'
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

const tshirtMockups: Record<string, string> = {
  white: '/assets/חולצה לבנה קדימה.png',
  black: '/assets/חולצה שחורה קדימה.png',
  gray: '/assets/חולצה אפורה קדימה.png',
  blue: '/assets/חולצה כחולה קדימה.png',
  red: '/assets/חולצה אדומה קדימה.png',
  burgundy: '/assets/חולצה קדימה בורדו.png',
  olive: '/assets/חולצה קדימה ירוק זית.png',
}

const colorFallback: Record<string, string> = {
  white: 'white', black: 'black', gray: 'gray', red: 'red',
  navy: 'blue', beige: 'white', burgundy: 'burgundy', olive: 'olive',
}

const tshirtMockupsBack: Record<string, string> = {
  white: '/assets/חולצה לבנה אחורה.png',
  black: '/assets/חולצה שחורה אחורה.png',
  gray: '/assets/חולצה אפורה אחורה.png',
  blue: '/assets/חולצה כחולה אחורה.png',
  red: '/assets/חולצה אדומה אחורה.png',
  burgundy: '/assets/חולצה אחורה בורדו.png',
  olive: '/assets/חולצה אחורה ירוק זית.png',
}

const DESIGN_AREA_OVERLAYS: Record<string, {
  view: 'front' | 'back'
  label: string
  style: { [key: string]: string }
}> = {
  front_full: {
    view: 'front',
    label: 'הדפסה קדמית',
    style: { width: '40%', aspectRatio: '140 / 120', top: '35%', left: '50%', transform: 'translateX(-50%)', borderRadius: '10px' },
  },
  back: {
    view: 'back',
    label: 'הדפסה אחורית',
    style: { width: '45%', aspectRatio: '180 / 200', top: '25%', left: '50%', transform: 'translateX(-50%)', borderRadius: '12px' },
  },
  chest_logo: {
    view: 'front',
    label: 'סמל שמאל',
    style: { width: '60px', height: '60px', top: '30%', right: '30%', borderRadius: '6px' },
  },
  chest_logo_right: {
    view: 'front',
    label: 'סמל ימין',
    style: { width: '60px', height: '60px', top: '30%', left: '30%', borderRadius: '6px' },
  },
}

const stepConfig = [
  { title: 'בחר סוג חולצה', icon: Shirt },
  { title: 'בחר צבע', icon: Palette },
  { title: 'העלה עיצוב', icon: ImagePlus },
  { title: 'בחר מידות וכמויות', icon: Ruler },
]

export default function TshirtDesigner() {
  const router = useRouter()
  const addItem = useCart((state) => state.addItem)

  const [currentStep, setCurrentStep] = useState(1)
  const [activeDesignArea, setActiveDesignArea] = useState<string>('front_full')
  const [config, setConfig] = useState<Partial<ProductConfig>>({
    productType: 'tshirt',
    fabricType: undefined,
    color: '',
    designs: [],
    sizes: [],
  })

  const totalSteps = 4

  const updateConfig = (updates: Partial<ProductConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
  }

  const goToNextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const resetDesign = () => {
    setCurrentStep(1)
    setConfig({ productType: 'tshirt', fabricType: undefined, color: '', designs: [], sizes: [] })
  }

  const handleAddToCart = () => {
    if (config.productType && config.fabricType && config.color && config.designs && config.sizes && config.sizes.length > 0) {
      addItem(config as ProductConfig)
      router.push('/cart')
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
  const isBackView = activeDesignArea === 'back'
  const mockupSrc = isBackView
    ? (tshirtMockupsBack[resolvedColor] || tshirtMockupsBack['black'])
    : (tshirtMockups[resolvedColor] || tshirtMockups['black'])

  const StepIcon = stepConfig[currentStep - 1].icon
  const stepTitle = stepConfig[currentStep - 1].title

  const stepContent = (() => {
    switch (currentStep) {
      case 1:
        return <ShirtTypeStep selectedType={config.fabricType} onSelect={(type) => updateConfig({ fabricType: type })} />
      case 2:
        return <ColorStep selectedColor={config.color} onSelect={(color) => updateConfig({ color })} />
      case 3:
        return <DesignStep designs={config.designs || []} onUpdate={(designs) => updateConfig({ designs })} onAreaFocus={setActiveDesignArea} />
      case 4:
        return <SizeQuantityStep sizes={config.sizes || []} onUpdate={(sizes) => updateConfig({ sizes })} config={config as ProductConfig} />
      default:
        return null
    }
  })()

  const MockupImage = () => {
    const currentView = isBackView ? 'back' : 'front'
    const designs = config.designs || []
    const visibleAreas = Object.entries(DESIGN_AREA_OVERLAYS).filter(([areaId, overlay]) => {
      if (overlay.view !== currentView) return false
      const hasDesign = designs.some(d => d.area === areaId)
      return currentStep === 3 || hasDesign
    })
    return (
      <div className="relative w-full">
        {mockupSrc ? (
          <Image
            src={mockupSrc}
            alt="תצוגה מקדימה"
            width={0}
            height={0}
            sizes="100vw"
            className="w-full h-auto block"
          />
        ) : (
          <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center text-7xl">👕</div>
        )}
        {visibleAreas.map(([areaId, overlay]) => {
          const design = designs.find(d => d.area === areaId)
          // When design uploaded: show just the image, no box
          if (design) {
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={areaId}
                src={design.imageUrl}
                alt={overlay.label}
                className="absolute object-contain"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                style={overlay.style as any}
              />
            )
          }
          // No design yet: show dashed placeholder box (green when this area is active)
          const isActive = areaId === activeDesignArea && currentStep === 3
          return (
            <div
              key={areaId}
              className={`absolute border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors duration-200 ${
                isActive
                  ? 'border-green-400 bg-green-100/70'
                  : 'border-gray-400 bg-gray-200/50'
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
  }

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
          disabled={!canProceed()}
          className={`gradient-yellow text-white ${fullWidth ? 'flex-1 h-10 rounded-md px-8' : ''}`}
        >
          הוסף לעגלה 🛒
        </Button>
      )}
    </>
  )

  return (
    <div className="bg-gray-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

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
                disabled={!canProceed()}
                className="gradient-yellow text-white"
              >
                הוסף לעגלה 🛒
              </Button>
            )}
          </div>
        </div>

        {/* ── MOBILE LAYOUT ── */}
        <div className="lg:hidden space-y-6 pb-8">
          {/* Sticky mockup */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pt-2 pb-4 border-b border-gray-100 -mx-4 px-4 shadow-sm">
            <div className="relative mx-auto max-w-sm">
              <MockupImage />
              {config.designs && config.designs.length > 0 && (
                <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  ✓ {config.designs.length} עיצובים
                </span>
              )}
            </div>
          </div>

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

          {/* Price summary on mobile */}
          <PriceSummary config={config as ProductConfig} />

          {/* Mobile bottom nav */}
          <div className="bg-white border-t border-gray-200 p-4 shadow-sm flex justify-between items-center gap-3 rounded-lg border">
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
                  <MockupImage />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
