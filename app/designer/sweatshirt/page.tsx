'use client'

import { useState } from 'react'
import Image from 'next/image'
import StepIndicator from '@/components/designer/StepIndicator'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, RefreshCw, Palette, ImagePlus, Package, Eye, Check, Upload, Minus, Plus } from 'lucide-react'

const sweatshirtMockups: Record<string, string> = {
  white: '/assets/סווטשרט חזית לבן.png',
  gray: '/assets/סווטשרט חזית אפור.png',
  navy: '/assets/סווטשרט חזית כחול.png',
  red: '/assets/סווטשרט חזית אדום.png',
}

const colors = [
  { id: 'white', name: 'לבן', hex: '#FFFFFF', border: true },
  { id: 'black', name: 'שחור', hex: '#000000' },
  { id: 'gray', name: 'אפור', hex: '#9CA3AF' },
  { id: 'navy', name: 'נייבי', hex: '#1E3A8A' },
  { id: 'burgundy', name: 'בורדו', hex: '#7C2D12' },
  { id: 'red', name: 'אדום', hex: '#EF4444' },
]

const designAreas = [
  { id: 'front', name: 'קידמי מלא', price: 12 },
  { id: 'back', name: 'גב', price: 12 },
]

const SIZES = ['S', 'M', 'L', 'XL', 'XXL']

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
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 })

  const totalQuantity = Object.values(quantities).reduce((sum, q) => sum + q, 0)
  const designCost = selectedAreas.reduce((sum, id) => {
    const area = designAreas.find(a => a.id === id)
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
      case 2: return selectedAreas.length > 0
      case 3: return totalQuantity > 0
      default: return false
    }
  }

  const goToNextStep = () => { if (currentStep < totalSteps) setCurrentStep(s => s + 1) }
  const goToPreviousStep = () => { if (currentStep > 1) setCurrentStep(s => s - 1) }
  const resetDesign = () => {
    setCurrentStep(1)
    setSelectedColor('')
    setSelectedAreas([])
    setQuantities({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 })
  }

  const toggleArea = (id: string) => {
    setSelectedAreas(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  const updateQuantity = (size: string, delta: number) => {
    setQuantities(prev => ({ ...prev, [size]: Math.max(0, prev[size] + delta) }))
  }

  const mockupSrc = sweatshirtMockups[selectedColor] || '/assets/סווטשרט חזית.png'
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
          <div className="space-y-4">
            {designAreas.map(area => {
              const isSelected = selectedAreas.includes(area.id)
              return (
                <div
                  key={area.id}
                  className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${isSelected ? 'border-[#fbbf24] bg-yellow-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  onClick={() => toggleArea(area.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#fbbf24] border-[#fbbf24]' : 'border-gray-300'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-[#1e293b]">{area.name}</span>
                      <span className="text-sm text-[#f59e0b] font-bold mr-2">+{area.price}₪</span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-3">
                      <label className="block cursor-pointer" onClick={e => e.stopPropagation()}>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#fbbf24] transition-colors">
                          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm font-medium text-gray-600">העלאת עיצוב</p>
                          <p className="text-xs text-gray-400 mt-1">JPG, PNG עד 10MB</p>
                          <input type="file" accept="image/*" className="hidden" />
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )
            })}
            {selectedAreas.length === 0 && <p className="text-sm text-red-500 mt-2">יש לבחור לפחות אזור עיצוב אחד.</p>}
          </div>
        )

      case 3:
        return (
          <div>
            <div className={`rounded-xl p-3 mb-5 flex justify-between items-center ${
              hasDiscount ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
            }`}>
              <span className="text-sm font-medium text-gray-600">סה&quot;כ יחידות</span>
              <div className="text-left">
                <span className={`text-2xl font-bold ${hasDiscount ? 'text-green-600' : 'text-[#1e293b]'}`}>{totalQuantity}</span>
                {hasDiscount && <p className="text-xs text-green-600 font-bold">✓ {DISCOUNT_PERCENT}% הנחה!</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {SIZES.map(size => {
                const qty = quantities[size]
                const isSelected = qty > 0
                return (
                  <div key={size} className={`rounded-xl border-2 p-3 transition-all ${isSelected ? 'border-[#fbbf24] bg-yellow-50' : 'border-gray-200 bg-white'}`}>
                    <div className="text-center mb-2">
                      <span className="font-bold text-[#1e293b]">{size}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => updateQuantity(size, -1)}
                        disabled={qty === 0}
                        className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold text-[#1e293b]">{qty}</span>
                      <button
                        onClick={() => updateQuantity(size, 1)}
                        className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
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
                  <span>עיצובים ({selectedAreas.length})</span>
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

  const MockupImage = () => (
    <Image
      src={mockupSrc}
      alt="תצוגה מקדימה"
      width={0}
      height={0}
      sizes="100vw"
      className="w-full h-auto"
    />
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
              {selectedAreas.length > 0 && (
                <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  ✓ {selectedAreas.length} אזורים
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
                  {selectedAreas.length > 0 && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      ✓ {selectedAreas.length} אזורים
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
