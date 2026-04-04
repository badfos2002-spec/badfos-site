'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
}

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Menu Panel (slides from right in RTL) */}
      <div className="fixed top-0 right-0 z-[110] h-full w-80 max-w-full bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-bold">תפריט</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-6 w-6" />
              <span className="sr-only">סגור תפריט</span>
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-2">
              <Link
                href="/home"
                className="rounded-lg px-4 py-3 text-right text-base font-medium hover:bg-gray-100 transition-colors"
                onClick={onClose}
              >
                דף הבית
              </Link>
              <Link
                href="/designer"
                className="rounded-lg px-4 py-3 text-right text-base font-medium hover:bg-gray-100 transition-colors"
                onClick={onClose}
              >
                עיצוב אישי
              </Link>
              <Link
                href="/packages"
                className="rounded-lg px-4 py-3 text-right text-base font-medium hover:bg-gray-100 transition-colors"
                onClick={onClose}
              >
                חבילות ומבצעים
              </Link>
              <Link
                href="/lion-roar"
                className="rounded-lg px-4 py-3 text-right text-base font-medium hover:bg-gray-100 transition-colors"
                onClick={onClose}
              >
                🇮🇱 שאגת הארי
              </Link>
              <Link
                href="/reviews"
                className="rounded-lg px-4 py-3 text-right text-base font-medium hover:bg-gray-100 transition-colors"
                onClick={onClose}
              >
                ביקורות לקוחות
              </Link>
              <Link
                href="/faq"
                className="rounded-lg px-4 py-3 text-right text-base font-medium hover:bg-gray-100 transition-colors"
                onClick={onClose}
              >
                שאלות נפוצות
              </Link>
              <Link
                href="/about"
                className="rounded-lg px-4 py-3 text-right text-base font-medium hover:bg-gray-100 transition-colors"
                onClick={onClose}
              >
                אודות
              </Link>
              <Link
                href="/contact"
                className="rounded-lg px-4 py-3 text-right text-base font-medium hover:bg-gray-100 transition-colors"
                onClick={onClose}
              >
                צור קשר
              </Link>
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <Link href="/cart" onClick={onClose}>
              <Button className="w-full btn-cta">
                עגלת קניות
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
