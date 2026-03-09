'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import StepIndicator from '@/components/designer/StepIndicator'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, RefreshCw, Palette, ImagePlus, Package, Eye, Check, Upload, CheckCircle, X } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'

const buffMockups: Record<string, string> = {
  red: '/assets/באף אדום.png',
  green: '/assets/באף ירוק.png',
  blue: '/assets/באף כחול.png',
  orange: '/assets/באף כתום.png',
  purple: '/assets/באף סגול.png',
  lightblue: '/assets/באף תכלת.png',
}

const colors = [
  { id: 'red', name: 'אדום', hex: '#EF4444' },
  { id: 'green', name: 'ירוק', hex: '#10B981' },
  { id: 'blue', name: 'כחול', hex: '#3B82F6' },
  { id: 'orange', name: 'כתום', hex: '#F97316' },
  { id: 'purple', name: 'סגול', hex: '#8B5CF6' },
  { id: 'lightblue', name: 'תכלת', hex: '#38BDF8' },
]

const stepConfig = [
  { title: 'בחר צבע', icon: Palette },
  { title: 'העלה עיצוב', icon: ImagePlus },
  { title: 'בחרו כמות', icon: Package },
]

const STEP_NAMES = ['צבע', 'עיצוב', 'כמות']
const totalSteps = 3
const BASE_PRICE = 8
const DESIGN_COST = 8
const PRICE_PER_UNIT = BASE_PRICE + DESIGN_COST

export default function BuffDesignerPage() {
  const router = useRouter()
  const { addItem } = useCart()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedColor, setSelectedColor] = useState('')
  const [designFile, setDesignFile] = useState<File | null>(null)
  const [quantity, setQuantity] = useState<50 | 100>(50)

  const total = quantity * PRICE_PER_UNIT

  const designPreviewUrl = useMemo(() => {
    if (!designFile) return null
    return URL.createObjectURL(designFile)
  }, [designFile])

  const handleAddToCart = () => {
    if (!designFile) return
    const imageUrl = URL.createObjectURL(designFile)
    addItem({
      productType: 'buff',
      color: selectedColor,
      sizes: [{ size: 'ONE_SIZE', quantity }],
      designs: [{ area: 'center', areaName: 'מרכזי', imageUrl, fileName: designFile.name }],
    })
    router.push('/cart')
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedColor
      case 2: return !!designFile
      case 3: return true
      default: return false
    }
  }

  const goToNextStep = () => { if (currentStep < totalSteps) setCurrentStep(s => s + 1) }
  const goToPreviousStep = () => { if (currentStep > 1) setCurrentStep(s => s - 1) }
  const resetDesign = () => {
    setCurrentStep(1)
    setSelectedColor('')
    setDesignFile(null)
    setQuantity(50)
  }

  const mockupSrc = buffMockups[selectedColor] || '/assets/באף כחול.png'
  const StepIcon = stepConfig[currentStep - 1].icon
  const stepTitle = stepConfig[currentStep - 1].title

  const stepContent = (() => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              {selectedColor ? `נבחר: ${colors.find(c => c.id === selectedColor)?.name}` : 'בחרו את צבע הבאף'}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
              {colors.map(color => {
                const isSelected = selectedColor === color.id
                return (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className="flex flex-col items-center gap-2 group"
                    aria-label={color.name}
                  >
                    <div
                      className={`w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center ${
                        isSelected ? 'ring-4 ring-[#fbbf24] ring-offset-2 scale-110' : 'hover:scale-105 hover:shadow-md'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {isSelected && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                    </div>
                    <span className={`text-xs text-center leading-none ${isSelected ? 'font-bold text-[#f59e0b]' : 'text-gray-500'}`}>
                      {color.name}
                    </span>
                  </button>
                )
              })}
            </div>
            {!selectedColor && <p className="text-sm text-red-500 mt-4">יש לבחור צבע כדי להמשיך.</p>}
          </div>
        )

      case 2:
        return (
          <div>
            <p className="text-sm text-gray-500 mb-4">בחר אזור לעיצוב, ואז העלה את התמונה שלך.</p>

            {/* Area selector - single area */}
            <div className="grid gap-2 mb-4 grid-cols-3">
              <button className="relative text-xs h-16 px-2 py-2 rounded-md font-medium gradient-yellow text-white border-transparent shadow flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <span>מרכזי</span>
                  <span className="text-[10px] opacity-80">+₪{DESIGN_COST}</span>
                </div>
              </button>
            </div>

            {/* Upload area */}
            <div className="space-y-3">
              {designFile ? (
                <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                      <span className="text-sm font-medium text-green-700 truncate max-w-[180px]">{designFile.name}</span>
                    </div>
                    <button onClick={() => setDesignFile(null)} className="text-red-400 hover:text-red-600 shrink-0 mr-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-full aspect-video bg-white rounded-lg overflow-hidden border border-green-200 mb-3">
                    {designPreviewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={designPreviewUrl} alt="עיצוב" className="w-full h-full object-contain" />
                    )}
                  </div>
                  <label className="cursor-pointer block">
                    <div className="w-full text-center py-2 px-3 border border-dashed border-yellow-300 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-all text-xs text-gray-500 font-medium">
                      החלף קובץ
                    </div>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      className="hidden"
                      onChange={e => setDesignFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="border-2 border-dashed border-yellow-300 rounded-lg p-4 sm:p-6 text-center hover:border-yellow-400 hover:bg-yellow-50 transition-all mx-auto w-full sm:max-w-xs">
                    <div className="w-12 h-12 gradient-yellow rounded-full flex items-center justify-center mx-auto mb-3">
                      <ImagePlus className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">לחץ להעלאת תמונה</p>
                    <p className="text-xs text-gray-600 mb-2">JPG, PNG, JPEG עד 10MB</p>
                    <p className="text-xs text-blue-600 font-medium">יועלה לאזור: מרכזי</p>
                  </div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    className="hidden"
                    onChange={e => setDesignFile(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>

            {!designFile && <p className="text-sm text-red-500 mt-4">יש להעלות עיצוב כדי להמשיך.</p>}
          </div>
        )

      case 3:
        return (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([50, 100] as const).map(qty => (
                <button
                  key={qty}
                  onClick={() => setQuantity(qty)}
                  className={`p-6 rounded-xl border-2 text-center transition-all ${
                    quantity === qty
                      ? 'border-[#fbbf24] bg-yellow-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl font-bold text-[#1e293b] mb-2">{qty}</div>
                  <div className="text-sm font-bold text-[#f59e0b] mb-1">{PRICE_PER_UNIT}₪ ליחידה</div>
                  <div className="text-xs text-gray-500">
                    {qty === 50 ? 'מתאים לאירועים קטנים' : 'מתאים לאירועים גדולים'}
                  </div>
                  {quantity === qty && (
                    <div className="mt-3 flex items-center justify-center gap-1 text-[#f59e0b]">
                      <Check className="w-4 h-4" />
                      <span className="text-xs font-bold">נבחר</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )

      default: return null
    }
  })()

  const PriceSummaryPanel = () => (
    <div className="bg-white rounded-2xl border-2 border-[#fbbf24]/30 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-yellow-50 border-b border-[#fbbf24]/20">
        <h3 className="font-bold text-[#1e293b] text-sm">סיכום מחיר</h3>
      </div>
      <div className="p-4 space-y-2">
        <div className="space-y-1.5 pb-3 border-b border-gray-100 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>מחיר בסיס</span>
            <span className="font-medium">{BASE_PRICE}₪</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>הדפסה מרכזית</span>
            <span className="font-medium">+{DESIGN_COST}₪</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">מחיר ליחידה</span>
          <span className="font-bold text-[#f59e0b]">{PRICE_PER_UNIT}₪</span>
        </div>
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>כמות</span>
          <span className="font-medium">×{quantity}</span>
        </div>
        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="font-bold text-[#1e293b]">סה&quot;כ</span>
          <span className="text-2xl font-bold text-[#f59e0b]">{total}₪</span>
        </div>
        <p className="text-xs text-gray-400 text-center pt-1">* לא כולל משלוח</p>
      </div>
    </div>
  )

  const buffOverlays = [DESIGN_AREA_OVERLAYS['buff_main'], DESIGN_AREA_OVERLAYS['buff_bottom']]

  const MockupImage = () => (
    <div className="relative w-full">
      <Image
        src={mockupSrc}
        alt="תצוגה מקדימה"
        width={0}
        height={0}
        sizes="100vw"
        className="w-full h-auto block"
      />
      {buffOverlays.map((overlay, i) =>
        designPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={designPreviewUrl}
            alt={overlay.label}
            className="absolute object-contain"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style={{
              ...overlay.style as any,
              ...(i === 0 ? { transform: 'rotate(134deg)', objectFit: 'cover' } : {}),
            } as any}
          />
        ) : (
          currentStep === 2 && (
            <div
              key={i}
              className="absolute border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors duration-200 border-green-400 bg-green-100/70"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              style={overlay.style as any}
            >
              <span className="text-xs font-medium text-center leading-tight px-1 text-green-700">
                {overlay.label}
              </span>
            </div>
          )
        )
      )}
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
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} stepNames={STEP_NAMES} />

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
              {designFile && (
                <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  ✓ עיצוב הועלה
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
            <PriceSummaryPanel />
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
                  {designFile && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      ✓ עיצוב הועלה
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
