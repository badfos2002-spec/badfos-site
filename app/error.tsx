'use client'

import { useEffect } from 'react'
import { RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Auto-reload on ChunkLoadError (happens after deploy when old chunks are gone)
    if (
      error?.message?.includes('ChunkLoadError') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed')
    ) {
      // Only auto-reload once to prevent infinite loops
      const key = 'chunk_error_reload'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
        return
      }
      // Clear after successful load on next navigation
      sessionStorage.removeItem(key)
    }
  }, [error])

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
            onClick={() => window.location.reload()}
            className="w-full h-12 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl"
          >
            <RefreshCw className="w-5 h-5 ml-2" />
            רענן את הדף
          </Button>
          <Link href="/home" className="block">
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
