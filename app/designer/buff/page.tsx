'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Upload, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function BuffDesignerPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedColor, setSelectedColor] = useState('')
  const [designFile, setDesignFile] = useState<File | null>(null)
  const [quantity, setQuantity] = useState<50 | 100>(50)

  const colors = [
    { id: 'white', name: 'לבן', hex: '#FFFFFF' },
    { id: 'black', name: 'שחור', hex: '#000000' },
    { id: 'red', name: 'אדום', hex: '#EF4444' },
    { id: 'blue', name: 'כחול', hex: '#3B82F6' },
    { id: 'green', name: 'ירוק', hex: '#10B981' },
    { id: 'yellow', name: 'צהוב', hex: '#F59E0B' },
  ]

  const basePrice = 8
  const designCost = 8
  const total = quantity * (basePrice + designCost)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-20" dir="rtl">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-8">
        <Link href="/designer" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5 rotate-180" />
          <span>חזרה למעצב</span>
        </Link>

        <div className="text-center mb-12" dir="rtl">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">עיצוב באף</h1>
          <p className="text-xl text-gray-600">עצבו את הבאף שלכם ב-3 שלבים</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl p-8" dir="rtl">
            {currentStep === 1 && (
              <div>
                <h2 className="text-3xl font-bold mb-8">בחרו צבע</h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {colors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      className={`aspect-square rounded-xl border-2 ${selectedColor === color.id ? 'border-green-500 scale-110 ring-4 ring-green-200' : 'border-gray-200'}`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {selectedColor === color.id && <Check className={`w-8 h-8 mx-auto ${color.id === 'white' || color.id === 'yellow' ? 'text-gray-800' : 'text-white'}`} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h2 className="text-3xl font-bold mb-8">העלאת עיצוב מרכזי</h2>
                <div className="border-2 rounded-2xl p-6 border-green-500 bg-green-50">
                  <h3 className="font-bold text-xl mb-4">הדפסה מרכזית (+₪8)</h3>
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-green-500 hover:bg-white">
                      <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="font-medium text-lg mb-2">העלאת עיצוב</p>
                      <p className="text-sm text-gray-500">JPG, PNG עד 10MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setDesignFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  </label>
                  {designFile && (
                    <p className="mt-4 text-green-600 font-medium text-center">
                      ✓ הועלה: {designFile.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h2 className="text-3xl font-bold mb-8">בחרו כמות</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => setQuantity(50)}
                    className={`p-8 rounded-2xl border-2 ${quantity === 50 ? 'border-green-500 bg-green-50 scale-105 shadow-lg' : 'border-gray-200'}`}
                  >
                    <div className="text-5xl font-bold text-gray-900 mb-2">50</div>
                    <div className="text-xl font-bold text-green-600 mb-1">₪8 ליחידה</div>
                    <div className="text-gray-600">מתאים לאירועים קטנים</div>
                    {quantity === 50 && <Check className="w-6 h-6 text-green-600 mx-auto mt-4" />}
                  </button>
                  <button
                    onClick={() => setQuantity(100)}
                    className={`p-8 rounded-2xl border-2 ${quantity === 100 ? 'border-green-500 bg-green-50 scale-105 shadow-lg' : 'border-gray-200'}`}
                  >
                    <div className="text-5xl font-bold text-gray-900 mb-2">100</div>
                    <div className="text-xl font-bold text-green-600 mb-1">₪8 ליחידה</div>
                    <div className="text-gray-600">מתאים לאירועים גדולים</div>
                    {quantity === 100 && <Check className="w-6 h-6 text-green-600 mx-auto mt-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t-2">
              {currentStep > 1 && <Button onClick={() => setCurrentStep(prev => prev - 1)} variant="outline"><ArrowRight className="w-5 h-5 ml-2" />חזרה</Button>}
              {currentStep < 3 ? (
                <Button onClick={() => setCurrentStep(prev => prev + 1)} disabled={currentStep === 1 ? !selectedColor : !designFile} className="bg-green-500 hover:bg-green-600 text-white mr-auto">המשך<ArrowLeft className="w-5 h-5 mr-2 rotate-180" /></Button>
              ) : (
                <Button className="bg-green-500 hover:bg-green-600 text-white mr-auto"><ShoppingCart className="w-5 h-5 ml-2" />הוסף לעגלה</Button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl p-6 sticky top-8" dir="rtl">
              <h3 className="text-2xl font-bold mb-6">סיכום</h3>
              <div className="space-y-4 mb-6 text-sm">
                {selectedColor && <div className="flex justify-between"><span>צבע:</span><span className="font-medium">{colors.find(c => c.id === selectedColor)?.name}</span></div>}
                {designFile && <div className="flex justify-between"><span>עיצוב:</span><span className="text-green-600">✓ הועלה</span></div>}
                <div className="flex justify-between"><span>כמות:</span><span className="font-bold">{quantity}</span></div>
              </div>
              <div className="border-t-2 pt-4 space-y-2">
                <div className="flex justify-between"><span>מחיר ליחידה:</span><span>₪{basePrice + designCost}</span></div>
                <div className="border-t-2 pt-2 flex justify-between"><span className="text-xl font-bold">סה"כ:</span><span className="text-3xl font-bold text-green-600">₪{total}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
