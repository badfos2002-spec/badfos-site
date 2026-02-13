'use client'

import { useState } from 'react'
import { Trash2, ShoppingCart, ArrowLeft, Tag, Check, Mail, Phone, User, MapPin, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'

export default function CartPage() {
  const [cartItems, setCartItems] = useState([
    {
      id: '1',
      type: 'חולצה',
      fabric: 'כותנה',
      color: 'שחור',
      sizes: { M: 5, L: 10, XL: 5 },
      designAreas: ['קידמי מלא', 'גב'],
      pricePerUnit: 65,
    },
  ])

  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery')
  
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phone2: '',
    notes: '',
  })

  const [addressForm, setAddressForm] = useState({
    street: '',
    number: '',
    city: '',
    zipCode: '',
    entrance: '',
  })

  const removeItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id))
  }

  const applyCoupon = () => {
    // Mock coupon validation
    if (couponCode.toUpperCase() === 'WELCOME10') {
      setAppliedCoupon({ code: couponCode, discount: 10 })
      alert('קופון הופעל בהצלחה! 10% הנחה')
    } else {
      alert('קופון לא תקין')
    }
  }

  const calculateTotals = () => {
    let itemsTotal = 0
    cartItems.forEach(item => {
      const qty = Object.values(item.sizes).reduce((sum, q) => sum + q, 0)
      itemsTotal += qty * item.pricePerUnit
    })

    const discount = appliedCoupon ? (itemsTotal * appliedCoupon.discount) / 100 : 0
    const shipping = deliveryMethod === 'delivery' ? 35 : 0
    const total = itemsTotal - discount + shipping

    return { itemsTotal, discount, shipping, total }
  }

  const totals = calculateTotals()

  const handleCheckout = () => {
    // Validate required fields
    if (!contactForm.firstName || !contactForm.lastName || !contactForm.email || !contactForm.phone) {
      alert('יש למלא את כל שדות החובה בפרטי קשר')
      return
    }

    if (deliveryMethod === 'delivery' && (!addressForm.street || !addressForm.number || !addressForm.city)) {
      alert('יש למלא את כתובת המשלוח')
      return
    }

    // Build WhatsApp message
    let message = 'היי, אני רוצה להזמין:\n\n'
    
    cartItems.forEach((item, idx) => {
      const qty = Object.values(item.sizes).reduce((sum, q) => sum + q, 0)
      message += `${idx + 1}. ${item.type} - ${item.fabric} - ${item.color}\n`
      message += `   מידות: ${Object.entries(item.sizes).filter(([_, q]) => q > 0).map(([s, q]) => `${s}:${q}`).join(', ')}\n`
      message += `   אזורי עיצוב: ${item.designAreas.join(', ')}\n`
      message += `   כמות: ${qty}, מחיר: ₪${qty * item.pricePerUnit}\n\n`
    })

    message += `סה"כ מוצרים: ₪${totals.itemsTotal}\n`
    if (totals.discount > 0) message += `הנחה: -₪${totals.discount}\n`
    message += `משלוח: ₪${totals.shipping}\n`
    message += `*סה"כ לתשלום: ₪${totals.total}*\n\n`

    message += `פרטי התקשרות:\n`
    message += `שם: ${contactForm.firstName} ${contactForm.lastName}\n`
    message += `טלפון: ${contactForm.phone}\n`
    message += `אימייל: ${contactForm.email}\n\n`

    if (deliveryMethod === 'delivery') {
      message += `כתובת משלוח:\n${addressForm.street} ${addressForm.number}, ${addressForm.city}\n`
    } else {
      message += `אופן קבלה: איסוף עצמי\n`
    }

    const whatsappUrl = `https://wa.me/9720507794277?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <ShoppingCart className="w-24 h-24 text-gray-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">העגלה ריקה</h1>
          <p className="text-gray-600 mb-8">עדיין לא הוספתם מוצרים לעגלה</p>
          <Link href="/designer">
            <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white font-bold h-12 px-8 rounded-xl">
              התחילו לעצב
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 py-20" dir="rtl">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12" dir="rtl">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">עגלת קניות</h1>
          <p className="text-xl text-gray-600">השלימו את ההזמנה שלכם</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Cart Items */}
            <div className="bg-white rounded-3xl shadow-xl p-8" dir="rtl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">המוצרים שלי</h2>
              <div className="space-y-4">
                {cartItems.map(item => {
                  const qty = Object.values(item.sizes).reduce((sum, q) => sum + q, 0)
                  return (
                    <div key={item.id} className="border-2 border-gray-200 rounded-2xl p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-xl text-gray-900">{item.type}</h3>
                          <p className="text-gray-600">{item.fabric} • {item.color}</p>
                          <p className="text-sm text-gray-500 mt-1">אזורי עיצוב: {item.designAreas.join(', ')}</p>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {Object.entries(item.sizes).filter(([_, q]) => q > 0).map(([size, quantity]) => (
                          <span key={size} className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-medium">
                            {size}: {quantity}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t-2 border-gray-100">
                        <span className="text-gray-600">כמות: {qty} יחידות</span>
                        <span className="text-2xl font-bold text-yellow-600">₪{qty * item.pricePerUnit}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-3xl shadow-xl p-8" dir="rtl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">פרטי יצירת קשר</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">שם פרטי *</label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    <Input value={contactForm.firstName} onChange={(e) => setContactForm({...contactForm, firstName: e.target.value})} className="pr-10" placeholder="הזינו שם פרטי" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">שם משפחה *</label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    <Input value={contactForm.lastName} onChange={(e) => setContactForm({...contactForm, lastName: e.target.value})} className="pr-10" placeholder="הזינו שם משפחה" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">אימייל *</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    <Input type="email" value={contactForm.email} onChange={(e) => setContactForm({...contactForm, email: e.target.value})} className="pr-10" placeholder="example@email.com" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">טלפון *</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    <Input type="tel" value={contactForm.phone} onChange={(e) => setContactForm({...contactForm, phone: e.target.value})} className="pr-10" placeholder="050-1234567" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">טלפון נוסף</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    <Input type="tel" value={contactForm.phone2} onChange={(e) => setContactForm({...contactForm, phone2: e.target.value})} className="pr-10" placeholder="050-1234567" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">הערות</label>
                  <Textarea value={contactForm.notes} onChange={(e) => setContactForm({...contactForm, notes: e.target.value})} placeholder="הערות נוספות..." rows={3} />
                </div>
              </div>
            </div>

            {/* Delivery Method */}
            <div className="bg-white rounded-3xl shadow-xl p-8" dir="rtl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">אופן קבלה</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button onClick={() => setDeliveryMethod('delivery')} className={`p-6 rounded-2xl border-2 ${deliveryMethod === 'delivery' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'}`}>
                  <MapPin className="w-8 h-8 mx-auto mb-3 text-yellow-600" />
                  <h3 className="font-bold text-lg mb-1">משלוח עד הבית</h3>
                  <p className="text-yellow-600 font-bold">₪35</p>
                </button>
                <button onClick={() => setDeliveryMethod('pickup')} className={`p-6 rounded-2xl border-2 ${deliveryMethod === 'pickup' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <Home className="w-8 h-8 mx-auto mb-3 text-green-600" />
                  <h3 className="font-bold text-lg mb-1">איסוף עצמי</h3>
                  <p className="text-green-600 font-bold">חינם</p>
                </button>
              </div>

              {deliveryMethod === 'delivery' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t-2 border-gray-200">
                  <div>
                    <label className="block text-sm font-medium mb-2">רחוב *</label>
                    <Input value={addressForm.street} onChange={(e) => setAddressForm({...addressForm, street: e.target.value})} placeholder="שם הרחוב" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">מספר *</label>
                    <Input value={addressForm.number} onChange={(e) => setAddressForm({...addressForm, number: e.target.value})} placeholder="מספר בית" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">עיר *</label>
                    <Input value={addressForm.city} onChange={(e) => setAddressForm({...addressForm, city: e.target.value})} placeholder="שם העיר" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">מיקוד</label>
                    <Input value={addressForm.zipCode} onChange={(e) => setAddressForm({...addressForm, zipCode: e.target.value})} placeholder="מיקוד" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">כניסה</label>
                    <Input value={addressForm.entrance} onChange={(e) => setAddressForm({...addressForm, entrance: e.target.value})} placeholder="כניסה/דירה" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl p-8 sticky top-8" dir="rtl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">סיכום הזמנה</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">סה"כ מוצרים:</span>
                  <span className="font-bold">₪{totals.itemsTotal}</span>
                </div>
                
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span>הנחה ({appliedCoupon.discount}%):</span>
                    <span className="font-bold">-₪{totals.discount}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">משלוח:</span>
                  <span className="font-bold">{totals.shipping === 0 ? 'חינם' : `₪${totals.shipping}`}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">קוד קופון</label>
                <div className="flex gap-2">
                  <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="הזינו קוד" className="flex-1" />
                  <Button onClick={applyCoupon} variant="outline" className="border-yellow-500 text-yellow-600 hover:bg-yellow-50">
                    <Tag className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="border-t-2 border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">סה"כ לתשלום:</span>
                  <span className="text-3xl font-bold text-yellow-600">₪{totals.total}</span>
                </div>
              </div>

              <Button onClick={handleCheckout} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-14 rounded-xl shadow-lg hover:shadow-xl">
                <ShoppingCart className="w-5 h-5 ml-2" />
                המשך לתשלום
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                התשלום יתבצע באמצעות WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
