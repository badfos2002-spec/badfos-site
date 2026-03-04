'use client'

import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PaymentFailurePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-16" dir="rtl">
      <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-xl">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">התשלום לא הושלם</h1>
        <p className="text-lg text-gray-600 mb-8">
          משהו השתבש בתהליך התשלום. ההזמנה שלך נשמרה ותוכל לנסות שוב.
        </p>
        <div className="space-y-3">
          <Link href="/cart" className="block">
            <Button className="gradient-yellow text-white hover-lift w-full h-12">
              חזרה לעגלה — נסה שוב
            </Button>
          </Link>
          <Link href="/" className="block">
            <Button variant="outline" className="w-full h-12">חזור לדף הבית</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
