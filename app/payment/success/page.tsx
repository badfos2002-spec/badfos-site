'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'

export default function PaymentSuccessPage() {
  const clearCart = useCart((state) => state.clearCart)
  const didClear = useRef(false)

  useEffect(() => {
    if (didClear.current) return
    didClear.current = true
    clearCart()
    sessionStorage.removeItem('badfos_pending_order')
  }, [clearCart])

  const handleShare = async () => {
    const url = 'https://badfos.co.il/designer'
    const text = 'עצבתי חולצה ב-בדפוס! גם אתם יכולים 👕'
    if (navigator.share) {
      try { await navigator.share({ title: 'בדפוס', text, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      alert('הקישור הועתק!')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-16" dir="rtl">
      <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-xl">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">התשלום בוצע בהצלחה!</h1>
        <p className="text-lg text-gray-600 mb-8">
          תודה על הזמנתך! נעדכן אותך במייל לגבי סטטוס ההזמנה.
        </p>
        <div className="space-y-3">
          <Button className="gradient-yellow text-white hover-lift w-full h-12" onClick={handleShare}>
            <Share2 className="w-5 h-5 ml-2" />
            שתף את העיצוב עם חברים
          </Button>
          <Link href="/" className="block">
            <Button variant="outline" className="w-full h-12">חזור לדף הבית</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
