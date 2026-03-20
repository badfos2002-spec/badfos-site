import Link from 'next/link'
import Image from 'next/image'
import { Home, Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fffdf5] py-16" dir="rtl">
      <div className="max-w-md mx-auto text-center p-8">
        <Image src="/logo.png" alt="בדפוס" width={80} height={80} className="mx-auto mb-6" />
        <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] mb-4">
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
            <Button className="w-full h-12 bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] text-white font-bold rounded-full shadow-lg">
              <Home className="w-5 h-5 ml-2" />
              חזרה לדף הבית
            </Button>
          </Link>
          <Link href="/designer" className="block">
            <Button variant="outline" className="w-full h-12 rounded-full border-[#fbbf24] text-[#d97706] hover:bg-[#fef9c3]">
              <Shirt className="w-5 h-5 ml-2" />
              התחל לעצב חולצה
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
