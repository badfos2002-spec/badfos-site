'use client'

import { useState, useMemo, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import StepIndicator from '@/components/designer/StepIndicator'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, RefreshCw, Palette, ImagePlus, Package, Eye, Check, CheckCircle, X, Plus, Minus, Loader2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { confirmDesignReplace } from '@/lib/utils'
import { uploadDesignFile, generateUniqueFileName } from '@/lib/storage'
import { VEST_COLORS, VEST_DESIGN_AREAS, VEST_MIN_QUANTITY, getBasePrice, getDesignAreasByProductType, getModel3D, subscribePricing, getPricingVersion } from '@/lib/constants'
import type { DesignAreaType } from '@/lib/types'
import Breadcrumbs from '@/components/common/Breadcrumbs'
import nextDynamic from 'next/dynamic'
import ThreeErrorBoundary from '@/components/designer/three/ThreeErrorBoundary'
import Preview3DLoading from '@/components/designer/three/Preview3DLoading'

const Preview3DStage = nextDynamic(() => import('@/components/designer/three/Preview3DStage'), {
  ssr: false,
  loading: () => <Preview3DLoading />,
})

const stepConfig = [
  { title: 'בחר צבע', icon: Palette },
  { title: 'העלה עיצוב', icon: ImagePlus },
  { title: 'בחרו כמות', icon: Package },
]

const STEP_NAMES = ['צבע', 'עיצוב', 'כמות']
const totalSteps = 3

// Light-fill swatches need a dark check icon for contrast.
const LIGHT_COLOR_IDS = ['neonyellow']

export default function VestDesignerPage() {
  const router = useRouter()
  const { addItem } = useCart()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedArea, setSelectedArea] = useState<DesignAreaType>('back')
  // One design file per area — all print together.
  const [designFiles, setDesignFiles] = useState<Partial<Record<DesignAreaType, File>>>({})
  const [quantity, setQuantity] = useState(VEST_MIN_QUANTITY)
  const sessionId = useState(() => `vest-${Date.now()}`)[0]
  const [addingToCart, setAddingToCart] = useState(false)

  // Re-render when admin pricing overrides load so the numbers below stay live.
  useSyncExternalStore(subscribePricing, getPricingVersion, getPricingVersion)

  const basePrice = getBasePrice('vest')
  const vestDesignAreas = getDesignAreasByProductType('vest')
  const designCost = vestDesignAreas
    .filter(a => !!designFiles[a.id])
    .reduce((sum, a) => sum + (a.price ?? 0), 0)

  const pricePerUnit = basePrice + designCost
  const total = quantity * pricePerUnit

  const designPreviews = useMemo(() => {
    const map: Partial<Record<DesignAreaType, string>> = {}
    for (const [area, file] of Object.entries(designFiles)) {
      if (file) map[area as DesignAreaType] = URL.createObjectURL(file)
    }
    return map
  }, [designFiles])

  useEffect(() => {
    return () => { Object.values(designPreviews).forEach(u => { if (u) URL.revokeObjectURL(u) }) }
  }, [designPreviews])

  const uploadedCount = Object.keys(designFiles).length
  const currentFile = designFiles[selectedArea] ?? null
  const currentPreview = designPreviews[selectedArea] ?? null

  const handleAddToCart = async () => {
    if (uploadedCount === 0 || quantity < VEST_MIN_QUANTITY || addingToCart) return
    setAddingToCart(true)
    try {
      const designs = []
      for (const [area, file] of Object.entries(designFiles)) {
        if (!file) continue
        const uniqueName = generateUniqueFileName(file.name)
        const imageUrl = await uploadDesignFile(file, sessionId, uniqueName)
        const areaConfig = VEST_DESIGN_AREAS.find(a => a.id === area)
        designs.push({ area: area as DesignAreaType, areaName: areaConfig?.name || 'גב', imageUrl, fileName: file.name })
      }
      addItem({
        productType: 'vest',
        color: selectedColor,
        sizes: [{ size: 'ONE_SIZE', quantity }],
        designs,
      })
      router.push('/cart')
    } catch (err) {
      console.error('Design upload failed:', err)
      alert('העלאת קובץ העיצוב נכשלה. נסה/י שוב בעוד רגע.')
    } finally {
      setAddingToCart(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedColor
      case 2: return uploadedCount > 0
      case 3: return quantity >= VEST_MIN_QUANTITY
      default: return false
    }
  }

  const goToNextStep = () => { if (currentStep < totalSteps) setCurrentStep(s => s + 1) }
  const goToPreviousStep = () => { if (currentStep > 1) setCurrentStep(s => s - 1) }
  const resetDesign = () => {
    setCurrentStep(1)
    setSelectedColor('')
    setSelectedArea('back')
    setDesignFiles({})
    setQuantity(VEST_MIN_QUANTITY)
  }

  const StepIcon = stepConfig[currentStep - 1].icon
  const stepTitle = stepConfig[currentStep - 1].title

  const stepContent = (() => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              {selectedColor ? `נבחר: ${VEST_COLORS.find(c => c.id === selectedColor)?.name}` : 'בחרו את צבע הווסט'}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
              {VEST_COLORS.map(color => {
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
                      {isSelected && <Check className={`w-5 h-5 ${LIGHT_COLOR_IDS.includes(color.id) ? 'text-gray-800' : 'text-white'}`} strokeWidth={3} />}
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

      case 2: {
        const areaName = VEST_DESIGN_AREAS.find(a => a.id === selectedArea)?.name || 'גב'
        const setAreaFile = (f: File) =>
          setDesignFiles(prev => ({ ...prev, [selectedArea]: f }))
        const removeAreaFile = (area: DesignAreaType) =>
          setDesignFiles(prev => { const u = { ...prev }; delete u[area]; return u })
        return (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              בחר אזור, ואז העלה את התמונה שלך. אפשר להעלות עיצוב לכל אזור.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {VEST_DESIGN_AREAS.map(area => {
                const isSelected = selectedArea === area.id
                const hasFile = !!designFiles[area.id]
                return (
                  <button
                    key={area.id}
                    onClick={() => setSelectedArea(area.id as DesignAreaType)}
                    className={`relative text-xs h-16 px-2 py-2 rounded-md font-medium border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'gradient-yellow text-white border-transparent shadow'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-yellow-400'
                    }`}
                  >
                    {hasFile && (
                      <span className="absolute top-1 left-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                    <div className="flex flex-col items-center">
                      <span>{area.name}</span>
                      <span className="text-[10px] opacity-80">+₪{area.price}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="space-y-3">
              {currentFile ? (
                <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                      <span className="text-sm font-medium text-green-700 truncate max-w-[180px]">{currentFile.name}</span>
                    </div>
                    <button onClick={() => removeAreaFile(selectedArea)} className="text-red-400 hover:text-red-600 shrink-0 mr-1" aria-label={`הסרת העיצוב מ${areaName}`}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-full aspect-video bg-white rounded-lg overflow-hidden border border-green-200 mb-3">
                    {currentPreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={currentPreview} alt={`עיצוב ${areaName}`} className="w-full h-full object-contain" />
                    )}
                  </div>
                  <label
                    role="button"
                    tabIndex={0}
                    aria-label={`החלפת עיצוב לאזור ${areaName}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click() } }}
                    className="cursor-pointer block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded-lg"
                  >
                    <div className="w-full text-center py-2 px-3 border border-dashed border-yellow-300 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-all text-xs text-gray-500 font-medium">
                      החלף קובץ
                    </div>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f && (!currentFile || confirmDesignReplace(areaName))) setAreaFile(f); e.target.value = '' }}
                    />
                  </label>
                </div>
              ) : (
                <label
                  role="button"
                  tabIndex={0}
                  aria-label={`העלאת עיצוב לאזור ${areaName}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click() } }}
                  className="cursor-pointer block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded-lg"
                >
                  <div className="border-2 border-dashed border-yellow-300 rounded-lg p-4 sm:p-6 text-center hover:border-yellow-400 hover:bg-yellow-50 transition-all mx-auto w-full sm:max-w-xs">
                    <div className="w-12 h-12 gradient-yellow rounded-full flex items-center justify-center mx-auto mb-3">
                      <ImagePlus className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">לחץ להעלאת תמונה</p>
                    <p className="text-xs text-gray-600 mb-2">JPG, PNG, JPEG עד 10MB</p>
                    <p className="text-xs text-blue-600 font-medium">יועלה לאזור: {areaName}</p>
                  </div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setAreaFile(f); e.target.value = '' }}
                  />
                </label>
              )}
            </div>

            {uploadedCount === 0 && <p className="text-sm text-red-500 mt-4">יש להעלות עיצוב כדי להמשיך.</p>}
          </div>
        )
      }

      case 3:
        return (
          <div>
            <p className="text-sm text-gray-500 mb-4">בחרו כמות וסטים — מיחידה אחת ומעלה.</p>

            <div className="bg-yellow-50 border-2 border-[#fbbf24]/30 rounded-xl p-6">
              <label className="block text-sm font-bold text-[#1e293b] mb-3 text-center">
                כמות וסטים
              </label>
              <div className="flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuantity(q => Math.max(VEST_MIN_QUANTITY, q - 1))}
                  disabled={quantity <= VEST_MIN_QUANTITY}
                  className="h-12 w-12 rounded-full p-0"
                  aria-label="הקטן כמות"
                >
                  <Minus className="w-5 h-5" />
                </Button>
                <input
                  type="number"
                  min={VEST_MIN_QUANTITY}
                  value={quantity}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10)
                    if (Number.isFinite(v)) setQuantity(Math.max(VEST_MIN_QUANTITY, v))
                    else setQuantity(VEST_MIN_QUANTITY)
                  }}
                  className="w-24 h-12 text-center text-2xl font-bold border-2 border-[#fbbf24] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#fbbf24]"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuantity(q => q + 1)}
                  className="h-12 w-12 rounded-full p-0"
                  aria-label="הגדל כמות"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              <div className="text-center mt-4">
                <div className="text-sm font-bold text-[#f59e0b]">{pricePerUnit}₪ ליחידה</div>
                <div className="text-xs text-gray-500 mt-1">סה&quot;כ {total}₪ עבור {quantity} {quantity === 1 ? 'וסט' : 'וסטים'}</div>
              </div>
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
            <span className="font-medium">{basePrice}₪</span>
          </div>
          {designCost > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>הדפסה ({uploadedCount} {uploadedCount === 1 ? 'אזור' : 'אזורים'})</span>
              <span className="font-medium">+{designCost}₪</span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">מחיר ליחידה</span>
          <span className="font-bold text-[#f59e0b]">{pricePerUnit}₪</span>
        </div>
        {currentStep >= 3 && (
          <>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>כמות</span>
              <span className="font-medium">×{quantity}</span>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-[#1e293b]">סה&quot;כ</span>
              <span className="text-2xl font-bold text-[#f59e0b]">{total}₪</span>
            </div>
            <p className="text-xs text-gray-400 text-center pt-1">* לא כולל משלוח</p>
          </>
        )}
      </div>
    </div>
  )

  // No dedicated 2D vest photo — if WebGL fails, show the uploaded design on a
  // neutral card so the user still sees their artwork.
  const MockupImage = () => (
    <div
      className="relative w-full flex items-center justify-center rounded-2xl border border-gray-200 bg-lime-50 p-6"
      style={{ aspectRatio: '3/4' }}
    >
      {currentPreview || Object.values(designPreviews)[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentPreview || Object.values(designPreviews)[0]} alt="עיצוב הווסט" className="max-w-[70%] max-h-[70%] object-contain" />
      ) : (
        <span className="text-sm text-gray-400">תצוגת הווסט</span>
      )}
    </div>
  )

  const vestColorHex = VEST_COLORS.find(c => c.id === selectedColor)?.hex ?? '#CCFF00'
  const vestDesigns = (Object.entries(designPreviews) as [string, string][])
    .filter(([, url]) => !!url)
    .map(([area, url]) => ({ area, url }))
  const vestModel = getModel3D('vest') ?? { variant: 'vest', url: '/models/vest-web.glb' }
  const previewElement = (
    <ThreeErrorBoundary fallback={<MockupImage />}>
      <div className="relative w-full" style={{ aspectRatio: '3/4' }}>
        <Preview3DStage
          warmAll
          colorHex={vestColorHex}
          designs={vestDesigns}
          showGuides={currentStep === 2}
          activeArea={currentStep === 2 ? selectedArea : undefined}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          variant={vestModel.variant as any}
          modelUrl={vestModel.url}
        />
      </div>
    </ThreeErrorBoundary>
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
          className={`gradient-yellow text-white disabled:opacity-60 ${fullWidth ? 'flex-1 h-10 rounded-md px-8' : ''}`}
        >
          {addingToCart ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />מעלה...</span> : 'הוסף לעגלה 🛒'}
        </Button>
      )}
    </>
  )

  return (
    <div className="bg-gray-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={[
          { label: 'בית', href: '/home' },
          { label: 'עיצוב אישי', href: '/designer' },
          { label: 'וסט זוהר' },
        ]} />

        <div className="text-center mb-6">
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} stepNames={STEP_NAMES} />

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
                className="gradient-yellow text-white disabled:opacity-60"
              >
                {addingToCart ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />מעלה...</span> : 'הוסף לעגלה 🛒'}
              </Button>
            )}
          </div>
        </div>

        <div className="lg:hidden space-y-6 pb-8 overflow-x-hidden">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pt-2 pb-4 border-b border-gray-100 -mx-4 px-4 shadow-sm">
            <div className="relative mx-auto max-w-sm">
              {previewElement}
              {uploadedCount > 0 && (
                <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  ✓ עיצוב הועלה
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-white border-yellow-200 shadow-sm">
            <div className="p-6">
              <div className="font-semibold leading-none tracking-tight flex items-center mb-6 text-[#1e293b]">
                <StepIcon className="w-5 h-5 ml-2 text-yellow-500" />
                {stepTitle}
              </div>
              {stepContent}
            </div>
          </div>

          <div className="bg-white border-t border-gray-200 p-4 shadow-sm flex justify-between items-center gap-3 rounded-lg border">
            <NavButtons fullWidth />
          </div>
        </div>

        <div className="hidden lg:grid lg:grid-cols-2 gap-12">
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

          <div className="lg:order-last sticky top-24 self-start">
            <div className="rounded-xl border bg-white shadow border-yellow-200 hover-lift">
              <div className="flex flex-col space-y-1.5 p-6">
                <div className="font-semibold leading-none tracking-tight flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-yellow-500" />
                    <span>תצוגה מקדימה</span>
                  </div>
                  {uploadedCount > 0 && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      ✓ עיצוב הועלה
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="relative mx-auto max-w-md">
                  {previewElement}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
