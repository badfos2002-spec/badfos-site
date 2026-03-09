'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import StepIndicator from '@/components/designer/StepIndicator'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, RefreshCw, Palette, ImagePlus, Package, Eye, Check, Minus, Plus, CheckCircle, X, Sparkles } from 'lucide-react'
import { SWEATSHIRT_DESIGN_AREAS, STANDARD_SIZES } from '@/lib/constants'
import type { DesignArea } from '@/lib/types'
import { DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'
import { uploadDesignFile, generateUniqueFileName } from '@/lib/storage'
import { useCart } from '@/hooks/useCart'

const SWEATSHIRT_AREA_OVERRIDES: Record<string, { [key: string]: string }> = {
  back: { width: '36%', aspectRatio: '180 / 200', top: '33%', left: '50%', transform: 'translateX(-50%)', borderRadius: '12px' },
}

const sweatshirtMockups: Record<string, string> = {
  white: '/assets/סווטשרט חזית לבן.png',
  black: '/assets/סווטשרט חזית.png',
  gray: '/assets/סווטשרט חזית אפור.png',
  navy: '/assets/סווטשרט חזית כחול.png',
  red: '/assets/סווטשרט חזית אדום.png',
  burgundy: '/assets/סווטשרט חזית בורדו.png',
}

const sweatshirtMockupsBack: Record<string, string> = {
  white: '/assets/סווטשירט גב לבן.png',
  black: '/assets/סווטשירט גב.png',
  gray: '/assets/סווטשירט גב אפור.png',
  navy: '/assets/סווטשירט גב כחול.png',
  red: '/assets/סווטשירט גב אדום.png',
  burgundy: '/assets/סווטשירט גב בורדו.png',
}

const colors = [
  { id: 'white', name: 'לבן', hex: '#FFFFFF', border: true },
  { id: 'black', name: 'שחור', hex: '#000000' },
  { id: 'gray', name: 'אפור', hex: '#9CA3AF' },
  { id: 'navy', name: 'נייבי', hex: '#1E3A8A' },
  { id: 'burgundy', name: 'בורדו', hex: '#7C2D12' },
  { id: 'red', name: 'אדום', hex: '#EF4444' },
]

const stepConfig = [
  { title: 'בחר צבע', icon: Palette },
  { title: 'העלה עיצוב', icon: ImagePlus },
  { title: 'מידות וכמויות', icon: Package },
]

const STEP_NAMES = ['צבע', 'עיצוב', 'מידות']
const totalSteps = 3
const BASE_PRICE = 53
const MIN_DISCOUNT_QTY = 15
const DISCOUNT_PERCENT = 5

export default function SweatshirtDesignerPage() {
  const router = useRouter()
  const { addItem } = useCart()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedColor, setSelectedColor] = useState('')
  const [designs, setDesigns] = useState<DesignArea[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState<string>(SWEATSHIRT_DESIGN_AREAS[0].id)
  const [uploadingArea, setUploadingArea] = useState<string | null>(null)
  const sessionId = useState(() => `sweatshirt-${Date.now()}`)[0]
  const [quantities, setQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries(STANDARD_SIZES.map(s => [s.id, 0]))
  )

  const totalQuantity = Object.values(quantities).reduce((sum, q) => sum + q, 0)
  const designCost = designs.reduce((sum, d) => {
    const area = SWEATSHIRT_DESIGN_AREAS.find(a => a.id === d.area)
    return sum + (area?.price || 0)
  }, 0)
  const pricePerUnit = BASE_PRICE + designCost
  const subtotal = totalQuantity * pricePerUnit
  const hasDiscount = totalQuantity >= MIN_DISCOUNT_QTY
  const discount = hasDiscount ? subtotal * (DISCOUNT_PERCENT / 100) : 0
  const total = subtotal - discount

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedColor
      case 2: return true
      case 3: return totalQuantity > 0
      default: return false
    }
  }

  const handleAddToCart = () => {
    addItem({
      productType: 'sweatshirt',
      color: selectedColor,
      sizes: Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([size, quantity]) => ({ size, quantity })),
      designs,
    })
    router.push('/cart')
  }

  const goToNextStep = () => { if (currentStep < totalSteps) setCurrentStep(s => s + 1) }
  const goToPreviousStep = () => { if (currentStep > 1) setCurrentStep(s => s - 1) }
  const resetDesign = () => {
    setCurrentStep(1)
    setSelectedColor('')
    setDesigns([])
    setSelectedAreaId(SWEATSHIRT_DESIGN_AREAS[0].id)
    setQuantities(Object.fromEntries(STANDARD_SIZES.map(s => [s.id, 0])))
  }

  const selectedArea = SWEATSHIRT_DESIGN_AREAS.find(a => a.id === selectedAreaId)!
  const getDesign = (areaId: string) => designs.find(d => d.area === areaId)
  const hasDesign = (areaId: string) => designs.some(d => d.area === areaId)

  const handleFileSelect = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      alert('הקובץ גדול מ-100MB. אנא בחר קובץ קטן יותר.')
      return
    }

    // Show preview immediately with blob URL
    const previewUrl = URL.createObjectURL(file)
    const areaId = selectedAreaId as DesignArea['area']
    const tempDesign: DesignArea = {
      area: areaId,
      areaName: selectedArea.name,
      imageUrl: previewUrl,
      fileName: file.name,
    }
    setDesigns(prev => {
      const idx = prev.findIndex(d => d.area === areaId)
      if (idx >= 0) { const u = [...prev]; u[idx] = tempDesign; return u }
      return [...prev, tempDesign]
    })

    // Upload to Firebase Storage for permanent high-quality URL
    setUploadingArea(selectedAreaId)
    try {
      const uniqueName = generateUniqueFileName(file.name)
      const permanentUrl = await uploadDesignFile(file, sessionId, uniqueName)
      setDesigns(prev => prev.map(d =>
        d.area === areaId ? { ...d, imageUrl: permanentUrl } : d
      ))
    } catch (err) {
      console.error('Upload failed, keeping local preview:', err)
      // Keep blob URL as fallback if Firebase not configured
    } finally {
      setUploadingArea(null)
    }
  }

  const removeDesign = (areaId: string) => setDesigns(designs.filter(d => d.area !== areaId))

  const currentDesign = getDesign(selectedAreaId)

  const updateQuantity = (size: string, delta: number) => {
    setQuantities(prev => ({ ...prev, [size]: Math.max(0, (prev[size] || 0) + delta) }))
  }

  const setQuantityDirect = (size: string, value: number) => {
    setQuantities(prev => ({ ...prev, [size]: Math.max(0, value) }))
  }

  const isBackView = selectedAreaId === 'back'
  const mockupSrc = isBackView
    ? (sweatshirtMockupsBack[selectedColor] || '/assets/סווטשירט גב.png')
    : (sweatshirtMockups[selectedColor] || '/assets/סווטשרט חזית.png')
  const StepIcon = stepConfig[currentStep - 1].icon
  const stepTitle = stepConfig[currentStep - 1].title

  const stepContent = (() => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              {selectedColor ? `נבחר: ${colors.find(c => c.id === selectedColor)?.name}` : 'בחרו את צבע הסווטשרט'}
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
                      className={`w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center ${'border' in color ? 'border-2 border-gray-300' : ''} ${
                        isSelected ? 'ring-4 ring-[#fbbf24] ring-offset-2 scale-110' : 'hover:scale-105 hover:shadow-md'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {isSelected && (
                        <Check className={`w-5 h-5 ${color.id === 'white' ? 'text-gray-700' : 'text-white'}`} strokeWidth={3} />
                      )}
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

            {/* Area selector tabs */}
            <div className="grid gap-2 mb-4 grid-cols-2">
              {SWEATSHIRT_DESIGN_AREAS.map((area) => {
                const isActive = selectedAreaId === area.id
                const uploaded = hasDesign(area.id)
                return (
                  <button
                    key={area.id}
                    onClick={() => setSelectedAreaId(area.id)}
                    className={`relative text-xs h-16 px-2 py-2 rounded-md border font-medium transition-all flex items-center justify-center ${
                      isActive
                        ? 'gradient-yellow text-white border-transparent shadow'
                        : 'bg-background shadow-sm border-yellow-200 hover:bg-yellow-50 hover:text-accent-foreground'
                    }`}
                  >
                    {uploaded && !isActive && (
                      <span className="absolute top-1 right-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      </span>
                    )}
                    <div className="flex flex-col items-center">
                      <span>{area.name}</span>
                      {uploadingArea === area.id
                        ? <span className="text-[10px] opacity-80">מעלה...</span>
                        : <span className="text-[10px] opacity-80">+₪{area.price}</span>
                      }
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Upload area */}
            <div className="space-y-3">
              {currentDesign ? (
                <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                      <span className="text-sm font-medium text-green-700 truncate max-w-[180px]">{currentDesign.fileName}</span>
                    </div>
                    <button onClick={() => removeDesign(selectedAreaId)} className="text-red-400 hover:text-red-600 shrink-0 mr-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-full aspect-video bg-white rounded-lg overflow-hidden border border-green-200 mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentDesign.imageUrl} alt="עיצוב" className="w-full h-full object-contain" />
                  </div>
                  <label className="cursor-pointer block">
                    <div className="w-full text-center py-2 px-3 border border-dashed border-yellow-300 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-all text-xs text-gray-500 font-medium">
                      החלף קובץ
                    </div>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
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
                    <p className="text-xs text-gray-600 mb-2">JPG, PNG, JPEG עד 100MB</p>
                    <p className="text-xs text-blue-600 font-medium">יועלה לאזור: {selectedArea.name}</p>
                  </div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                  />
                </label>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400">או</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                type="button"
                disabled
              >
                <Sparkles className="w-4 h-4 ml-2" />
                עוזר עיצוב AI
              </Button>
            </div>

            {designs.length === 0 && (
              <p className="text-sm text-gray-400 mt-4 text-center">ניתן להמשיך גם ללא העלאת עיצוב</p>
            )}

            {designs.length > 0 && (
              <div className="mt-4 space-y-1">
                {designs.map(d => (
                  <div key={d.area} className="flex items-center justify-between text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      <span className="font-medium text-green-700">{d.areaName}</span>
                      <span className="text-gray-400 truncate max-w-[100px]">{d.fileName}</span>
                    </div>
                    <button onClick={() => removeDesign(d.area)} className="text-red-400 hover:text-red-600 mr-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 3:
        return (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {STANDARD_SIZES.map((size) => {
                const qty = quantities[size.id] || 0
                return (
                  <div
                    key={size.id}
                    className="p-2 sm:p-4 border rounded-lg flex flex-col items-center justify-center space-y-2 sm:space-y-3"
                  >
                    <div className="text-center">
                      <span className="font-semibold text-lg">{size.name}</span>
                      {size.surcharge > 0 && (
                        <div className="text-xs text-orange-600 font-medium">+₪{size.surcharge}</div>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={qty || ''}
                      onChange={(e) => setQuantityDirect(size.id, parseInt(e.target.value) || 0)}
                      className="w-16 sm:w-20 text-center font-bold h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        disabled={qty === 0}
                        onClick={() => updateQuantity(size.id, -1)}
                        className="h-8 w-8"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => updateQuantity(size.id, 1)}
                        className="h-8 w-8"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
            {totalQuantity === 0 && <p className="text-sm text-red-500 mt-4 text-center">* בחרו לפחות יחידה אחת להמשך</p>}
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
        {totalQuantity === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">המחיר יוצג לאחר בחירת מידות</p>
        ) : (
          <>
            <div className="space-y-1.5 pb-3 border-b border-gray-100 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>מחיר בסיס</span>
                <span className="font-medium">{BASE_PRICE}₪</span>
              </div>
              {designCost > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>עיצובים ({designs.length})</span>
                  <span className="font-medium">+{designCost}₪</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">מחיר ליחידה</span>
              <span className="font-bold text-[#f59e0b]">{pricePerUnit}₪</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>כמות</span>
              <span className="font-medium">×{totalQuantity}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between items-center text-sm text-green-600">
                <span>הנחה ({DISCOUNT_PERCENT}%)</span>
                <span className="font-medium">-{Math.round(discount)}₪</span>
              </div>
            )}
            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-[#1e293b]">סה&quot;כ</span>
              <span className="text-2xl font-bold text-[#f59e0b]">{Math.round(total)}₪</span>
            </div>
            <p className="text-xs text-gray-400 text-center pt-1">* לא כולל משלוח</p>
          </>
        )}
      </div>
    </div>
  )

  const MockupImage = () => {
    const currentView = isBackView ? 'back' : 'front'
    const sweatshirtAreaIds = ['front_full', 'back', 'chest_logo', 'chest_logo_right']
    const visibleAreas = Object.entries(DESIGN_AREA_OVERLAYS).filter(([areaId, overlay]) => sweatshirtAreaIds.includes(areaId) && overlay.view === currentView)
    const showAreas = currentStep === 2
    return (
      <div className="relative w-full">
        <Image
          src={mockupSrc}
          alt="תצוגה מקדימה"
          width={0}
          height={0}
          sizes="100vw"
          className="w-full h-auto block"
        />
        {visibleAreas.map(([areaId, overlay]) => {
          const areaStyle = SWEATSHIRT_AREA_OVERRIDES[areaId] ?? overlay.style
          const design = designs.find(d => d.area === areaId)
          if (design) {
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={areaId}
                src={design.imageUrl}
                alt={overlay.label}
                className="absolute object-contain"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                style={areaStyle as any}
              />
            )
          }
          if (!showAreas) return null
          const isActive = areaId === selectedAreaId
          return (
            <div
              key={areaId}
              className={`absolute border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors duration-200 ${
                isActive ? 'border-green-400 bg-green-100/70' : 'border-gray-300 bg-gray-200/75'
              }`}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              style={areaStyle as any}
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
              {designs.length > 0 && (
                <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  ✓ {designs.length} אזורים
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
                  {designs.length > 0 && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      ✓ {designs.length} אזורים
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="relative mx-auto max-w-md">
                  <MockupImage />
                </div>
                <p className="text-xs text-center text-gray-400 mt-3">* סקיצה להמחשה בלבד</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
