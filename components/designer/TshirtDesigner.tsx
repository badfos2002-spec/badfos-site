'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductConfig, SizeQuantity, DesignArea } from '@/lib/types'
import StepIndicator from './StepIndicator'
import ShirtTypeStep from './ShirtTypeStep'
import ColorStep from './ColorStep'
import DesignStep from './DesignStep'
import SizeQuantityStep from './SizeQuantityStep'
import MockupPreview from './MockupPreview'
import PriceSummary from './PriceSummary'
import { useCart } from '@/hooks/useCart'

export default function TshirtDesigner() {
  const router = useRouter()
  const addItem = useCart((state) => state.addItem)

  const [currentStep, setCurrentStep] = useState(1)
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
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleAddToCart = () => {
    if (
      config.productType &&
      config.fabricType &&
      config.color &&
      config.designs &&
      config.sizes &&
      config.sizes.length > 0
    ) {
      addItem(config as ProductConfig)
      router.push('/cart')
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!config.fabricType
      case 2:
        return !!config.color
      case 3:
        return config.designs && config.designs.length > 0
      case 4:
        return config.sizes && config.sizes.length > 0 &&
               config.sizes.some(s => s.quantity > 0)
      default:
        return false
    }
  }

  return (
    <div className="container-rtl py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">עיצוב חולצה</h1>

      <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Main Content - Steps */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {currentStep === 1 && (
              <ShirtTypeStep
                selectedType={config.fabricType}
                onSelect={(type) => {
                  updateConfig({ fabricType: type })
                  goToNextStep()
                }}
              />
            )}
            {currentStep === 2 && (
              <ColorStep
                selectedColor={config.color}
                onSelect={(color) => {
                  updateConfig({ color })
                  goToNextStep()
                }}
                onBack={goToPreviousStep}
              />
            )}
            {currentStep === 3 && (
              <DesignStep
                designs={config.designs || []}
                onUpdate={(designs) => updateConfig({ designs })}
                onBack={goToPreviousStep}
                onNext={goToNextStep}
              />
            )}
            {currentStep === 4 && (
              <SizeQuantityStep
                sizes={config.sizes || []}
                onUpdate={(sizes) => updateConfig({ sizes })}
                onBack={goToPreviousStep}
                onAddToCart={handleAddToCart}
                config={config as ProductConfig}
              />
            )}
          </div>
        </div>

        {/* Sidebar - Preview & Price */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <MockupPreview config={config as ProductConfig} />
            <PriceSummary config={config as ProductConfig} />
          </div>
        </div>
      </div>
    </div>
  )
}
