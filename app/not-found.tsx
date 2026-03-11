import Link from 'next/link'
import { Home, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-16" dir="rtl">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
          404
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          העמוד לא נמצא
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          מצטערים, העמוד שחיפשת לא קיים או שהוסר.
        </p>
        <div className="space-y-3">
          <Link href="/home" className="block">
            <Button className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl">
              <Home className="w-5 h-5 ml-2" />
              חזרה לדף הבית
            </Button>
          </Link>
          <Link href="/designer" className="block">
            <Button variant="outline" className="w-full h-12 rounded-xl">
              <ArrowRight className="w-5 h-5 ml-2" />
              לעמוד העיצוב
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
