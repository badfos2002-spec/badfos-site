'use client'

import { RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 py-16" dir="rtl">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">!</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          משהו השתבש
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          אירעה שגיאה בלתי צפויה. אנא נסו שוב או חזרו לדף הבית.
        </p>
        <div className="space-y-3">
          <Button
            onClick={reset}
            className="w-full h-12 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl"
          >
            <RefreshCw className="w-5 h-5 ml-2" />
            נסה שוב
          </Button>
          <Link href="/" className="block">
            <Button variant="outline" className="w-full h-12 rounded-xl">
              <Home className="w-5 h-5 ml-2" />
              חזרה לדף הבית
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
