'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Upload, Sparkles, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function SweatshirtDesignerPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedDesignAreas, setSelectedDesignAreas] = useState<string[]>([])
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({
    S: 0, M: 0, L: 0, XL: 0, XXL: 0,
  })

  const colors = [
    { id: 'white', name: 'לבן', hex: '#FFFFFF' },
    { id: 'black', name: 'שחור', hex: '#000000' },
    { id: 'gray', name: 'אפור', hex: '#9CA3AF' },
    { id: 'navy', name: 'נייבי', hex: '#1E3A8A' },
    { id: 'burgundy', name: 'בורדו', hex: '#7C2D12' },
  ]

  const designAreas = [
    { id: 'front', name: 'קידמי מלא', price: 12 },
    { id: 'back', name: 'גב', price: 12 },
  ]

  const basePrice = 53

  const calculatePrice = () => {
    const totalQty = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
    let designCost = 0
    selectedDesignAreas.forEach((areaId) => {
      const area = designAreas.find((a) => a.id === areaId)
      if (area) designCost += area.price
    })
    const pricePerItem = basePrice + designCost
    const subtotal = totalQty * pricePerItem
    const discount = totalQty >= 15 ? subtotal * 0.05 : 0
    return { totalQty, pricePerItem, subtotal, discount, total: subtotal - discount }
  }

  const price = calculatePrice()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-20" dir="rtl">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-8">
        <Link href="/designer" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5 rotate-180" />
          <span>חזרה למעצב</span>
        </Link>

        <div className="text-center mb-12" dir="rtl">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">עיצוב סווטשרט</h1>
          <p className="text-xl text-gray-600">עצבו את הסווטשרט שלכם ב-3 שלבים</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl p-8" dir="rtl">
            {currentStep === 1 && (
              <div>
                <h2 className="text-3xl font-bold mb-8">בחרו צבע</h2>
                <div className="grid grid-cols-5 gap-4">
                  {colors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      className={`aspect-square rounded-xl border-2 ${selectedColor === color.id ? 'border-purple-500 scale-110 ring-4 ring-purple-200' : 'border-gray-200'}`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {selectedColor === color.id && <Check className={`w-8 h-8 mx-auto ${color.id === 'white' ? 'text-gray-800' : 'text-white'}`} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h2 className="text-3xl font-bold mb-8">אזורי עיצוב</h2>
                <div className="space-y-6">
                  {designAreas.map((area) => (
                    <div key={area.id} className={`border-2 rounded-2xl p-6 ${selectedDesignAreas.includes(area.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                      <div className="flex items-center gap-4 mb-4">
                        <input type="checkbox" checked={selectedDesignAreas.includes(area.id)} onChange={() => setSelectedDesignAreas(prev => prev.includes(area.id) ? prev.filter(id => id !== area.id) : [...prev, area.id])} className="w-6 h-6" />
                        <div>
                          <h3 className="font-bold text-xl">{area.name}</h3>
                          <p className="text-purple-600 font-bold">+₪{area.price}</p>
                        </div>
                      </div>
                      {selectedDesignAreas.includes(area.id) && (
                        <label className="block cursor-pointer">
                          <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-purple-500">
                            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                            <p className="font-medium">העלאת עיצוב</p>
                            <input type="file" accept="image/*" className="hidden" />
                          </div>
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h2 className="text-3xl font-bold mb-8">מידות וכמויות</h2>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  {Object.keys(quantities).map((size) => (
                    <div key={size} className="border-2 rounded-xl p-4">
                      <div className="text-center font-bold mb-3">{size}</div>
                      <div className="flex items-center justify-between gap-2">
                        <button onClick={() => setQuantities(prev => ({ ...prev, [size]: Math.max(0, prev[size] - 1) }))} className="w-8 h-8 bg-gray-200 rounded-lg font-bold">-</button>
                        <span className="font-bold">{quantities[size]}</span>
                        <button onClick={() => setQuantities(prev => ({ ...prev, [size]: prev[size] + 1 }))} className="w-8 h-8 bg-purple-500 text-white rounded-lg font-bold">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t-2">
              {currentStep > 1 && <Button onClick={() => setCurrentStep(prev => prev - 1)} variant="outline"><ArrowRight className="w-5 h-5 ml-2" />חזרה</Button>}
              {currentStep < 3 ? (
                <Button onClick={() => setCurrentStep(prev => prev + 1)} disabled={currentStep === 1 ? !selectedColor : currentStep === 2 ? selectedDesignAreas.length === 0 : false} className="bg-purple-500 hover:bg-purple-600 text-white mr-auto">המשך<ArrowLeft className="w-5 h-5 mr-2 rotate-180" /></Button>
              ) : (
                <Button disabled={price.totalQty === 0} className="bg-green-500 hover:bg-green-600 text-white mr-auto"><ShoppingCart className="w-5 h-5 ml-2" />הוסף לעגלה</Button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl p-6 sticky top-8" dir="rtl">
              <h3 className="text-2xl font-bold mb-6">סיכום</h3>
              <div className="space-y-4 mb-6 text-sm">
                {selectedColor && <div className="flex justify-between"><span>צבע:</span><span className="font-medium">{colors.find(c => c.id === selectedColor)?.name}</span></div>}
                <div className="flex justify-between"><span>כמות:</span><span className="font-bold">{price.totalQty}</span></div>
              </div>
              <div className="border-t-2 pt-4 space-y-2">
                <div className="flex justify-between"><span>מחיר ליחידה:</span><span>₪{price.pricePerItem}</span></div>
                {price.discount > 0 && <div className="flex justify-between text-green-600"><span>הנחה:</span><span>-₪{price.discount.toFixed(2)}</span></div>}
                <div className="border-t-2 pt-2 flex justify-between"><span className="text-xl font-bold">סה"כ:</span><span className="text-3xl font-bold text-purple-600">₪{price.total}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
