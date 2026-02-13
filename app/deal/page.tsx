'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ShoppingCart, Check, ArrowLeft, Gift, Mail, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'

function DealPageContent() {
  const searchParams = useSearchParams()
  const packageId = searchParams.get('package')

  const [selectedFabric, setSelectedFabric] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({
    XS: 0,
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0,
    '3XL': 0,
    '4XL': 0,
  })
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    notes: '',
  })

  const packages = [
    {
      id: 1,
      name: '10-20 חולצות',
      tag: 'מתחילים',
      minQuantity: 10,
      maxQuantity: 20,
      pricePerUnit: 45,
      designerCost: 150,
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      id: 2,
      name: '21-50 חולצות',
      tag: 'הכי פופולרי',
      minQuantity: 21,
      maxQuantity: 50,
      pricePerUnit: 40,
      designerCost: 0,
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      id: 3,
      name: '51-100 חולצות',
      tag: 'עסקים',
      minQuantity: 51,
      maxQuantity: 100,
      pricePerUnit: 35,
      designerCost: 0,
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      id: 4,
      name: '100+ חולצות',
      tag: 'ארגונים',
      minQuantity: 100,
      maxQuantity: 1000,
      pricePerUnit: 30,
      designerCost: 0,
      gradient: 'from-green-500 to-emerald-600',
    },
  ]

  const selectedPackage = packages.find((p) => p.id === Number(packageId))

  const fabricTypes = [
    { id: 'cotton', name: 'כותנה', price: 0 },
    { id: 'dryfit', name: 'דרייפיט', price: 0 },
    { id: 'polo', name: 'פולו', price: 10 },
    { id: 'oversize', name: 'אוברסייז', price: 10 },
  ]

  const colors = [
    { id: 'white', name: 'לבן', hex: '#FFFFFF' },
    { id: 'black', name: 'שחור', hex: '#000000' },
    { id: 'gray', name: 'אפור', hex: '#9CA3AF' },
    { id: 'red', name: 'אדום', hex: '#EF4444' },
    { id: 'navy', name: 'נייבי', hex: '#1E3A8A' },
    { id: 'beige', name: 'בז\'', hex: '#D4C5B9' },
    { id: 'burgundy', name: 'בורדו', hex: '#7C2D12' },
    { id: 'olive', name: 'זית', hex: '#65A30D' },
  ]

  const getTotalQuantity = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
  }

  const calculateTotal = () => {
    if (!selectedPackage) return 0
    const totalQty = getTotalQuantity()
    const fabricSurcharge = fabricTypes.find((f) => f.id === selectedFabric)?.price || 0
    const itemsTotal = totalQty * (selectedPackage.pricePerUnit + fabricSurcharge)
    return itemsTotal + selectedPackage.designerCost
  }

  const handleQuantityChange = (size: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [size]: Math.max(0, prev[size] + delta),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const totalQty = getTotalQuantity()
    if (!selectedPackage) {
      alert('החבילה לא נמצאה')
      return
    }
    if (totalQty < selectedPackage.minQuantity) {
      alert(`יש להזמין לפחות ${selectedPackage.minQuantity} חולצות`)
      return
    }
    if (totalQty > selectedPackage.maxQuantity) {
      alert(`ניתן להזמין עד ${selectedPackage.maxQuantity} חולצות בחבילה זו`)
      return
    }
    if (!selectedFabric || !selectedColor) {
      alert('יש לבחור סוג בד וצבע')
      return
    }
    if (!formData.fullName || !formData.email || !formData.phone) {
      alert('יש למלא את כל השדות החובה')
      return
    }

    // TODO: Save to database / send to WhatsApp
    alert('ההזמנה נשלחה בהצלחה! ניצור איתך קשר בהקדם.')
  }

  if (!selectedPackage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">החבילה לא נמצאה</h1>
          <Link href="/packages">
            <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white font-bold">
              חזרה לחבילות
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const totalQty = getTotalQuantity()
  const isValidQuantity = totalQty >= selectedPackage.minQuantity && totalQty <= selectedPackage.maxQuantity

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 py-20" dir="rtl">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/packages" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5 rotate-180" />
          <span>חזרה לחבילות</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-12" dir="rtl">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-4">
            <Gift className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-600">{selectedPackage.tag}</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {selectedPackage.name}
          </h1>
          <p className="text-xl text-gray-600">
            מלאו את הפרטים להזמנת החבילה
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Fabric Selection */}
            <div className="bg-white rounded-3xl shadow-xl p-8" dir="rtl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">1. בחרו סוג בד</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {fabricTypes.map((fabric) => (
                  <button
                    key={fabric.id}
                    onClick={() => setSelectedFabric(fabric.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedFabric === fabric.id
                        ? 'border-yellow-500 bg-yellow-50 shadow-lg scale-105'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-gray-900 mb-1">{fabric.name}</div>
                    {fabric.price > 0 && (
                      <div className="text-sm text-gray-600">+₪{fabric.price}</div>
                    )}
                    {selectedFabric === fabric.id && (
                      <Check className="w-5 h-5 text-yellow-600 mx-auto mt-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div className="bg-white rounded-3xl shadow-xl p-8" dir="rtl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">2. בחרו צבע</h2>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                {colors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className={`aspect-square rounded-xl border-2 transition-all ${
                      selectedColor === color.id
                        ? 'border-yellow-500 shadow-lg scale-110'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {selectedColor === color.id && (
                      <Check className={`w-6 h-6 mx-auto ${color.id === 'white' ? 'text-gray-800' : 'text-white'}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Size & Quantity Selection */}
            <div className="bg-white rounded-3xl shadow-xl p-8" dir="rtl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">3. בחרו מידות וכמויות</h2>
              
              {!isValidQuantity && totalQty > 0 && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                  <p className="text-red-800 font-medium text-center">
                    יש להזמין בין {selectedPackage.minQuantity} ל-{selectedPackage.maxQuantity} חולצות
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.keys(quantities).map((size) => (
                  <div key={size} className="border-2 border-gray-200 rounded-xl p-4">
                    <div className="text-center font-bold text-gray-900 mb-3">{size}</div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleQuantityChange(size, -1)}
                        className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold"
                      >
                        -
                      </button>
                      <span className="text-lg font-bold">{quantities[size]}</span>
                      <button
                        onClick={() => handleQuantityChange(size, 1)}
                        className="w-8 h-8 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <p className="text-lg">
                  <span className="text-gray-600">סה"כ: </span>
                  <span className={`font-bold ${isValidQuantity ? 'text-green-600' : 'text-gray-900'}`}>
                    {totalQty} חולצות
                  </span>
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-3xl shadow-xl p-8" dir="rtl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">4. פרטי יצירת קשר</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שם מלא *
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="pr-10"
                      placeholder="הזינו שם מלא"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    אימייל *
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pr-10"
                      placeholder="example@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    טלפון *
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pr-10"
                      placeholder="050-1234567"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    הערות (אופציונלי)
                  </label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="הערות נוספות להזמנה..."
                    rows={4}
                  />
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl p-8 sticky top-8" dir="rtl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">סיכום הזמנה</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">חבילה:</span>
                  <span className="font-bold">{selectedPackage.name}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">מחיר ליחידה:</span>
                  <span className="font-bold">₪{selectedPackage.pricePerUnit}</span>
                </div>

                {selectedFabric && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">סוג בד:</span>
                    <span className="font-medium">
                      {fabricTypes.find((f) => f.id === selectedFabric)?.name}
                    </span>
                  </div>
                )}

                {selectedColor && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">צבע:</span>
                    <span className="font-medium">
                      {colors.find((c) => c.id === selectedColor)?.name}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">כמות:</span>
                  <span className="font-bold text-lg">{totalQty}</span>
                </div>

                {selectedPackage.designerCost > 0 ? (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">גרפיקאי:</span>
                    <span className="font-bold">₪{selectedPackage.designerCost}</span>
                  </div>
                ) : (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-green-700 font-medium text-sm text-center">
                      🎁 גרפיקאי חינם!
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">סה"כ:</span>
                  <span className={`text-3xl font-bold bg-gradient-to-r ${selectedPackage.gradient} bg-clip-text text-transparent`}>
                    ₪{calculateTotal()}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!isValidQuantity || !selectedFabric || !selectedColor || !formData.fullName || !formData.email || !formData.phone}
                className={`w-full bg-gradient-to-r ${selectedPackage.gradient} hover:opacity-90 text-white font-bold h-14 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ShoppingCart className="w-5 h-5 ml-2" />
                שליחת הזמנה
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                ניצור איתך קשר לאישור ההזמנה ופרטי תשלום
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DealPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען...</div>}>
      <DealPageContent />
    </Suspense>
  )
}
