'use client'

import Link from 'next/link'
import { ShoppingCart, Menu, Home, Shirt, Package, Star, Info, Phone } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import MobileMenu from './MobileMenu'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const itemCount = useCart((state) => state.getCartItemCount())

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/90 backdrop-blur-[20px] shadow-sm">
        <div className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 flex h-20 md:h-16 items-center justify-between relative">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">פתח תפריט</span>
          </Button>

          {/* Logo (Right) */}
          <Link href="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="בדפוס - הדפסת חולצות"
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation (Center) */}
          <nav className="hidden md:flex gap-8 absolute left-1/2 -translate-x-1/2">
            <Link
              href="/"
              className="text-sm font-medium text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              דף הבית
            </Link>
            <Link
              href="/designer"
              className="text-sm font-medium text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <Shirt className="w-4 h-4" />
              מעצב חולצות
            </Link>
            <Link
              href="/packages"
              className="text-sm font-medium text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              חבילות ומבצעים
            </Link>
            <Link
              href="/reviews"
              className="text-sm font-medium text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <Star className="w-4 h-4" />
              ביקורות
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <Info className="w-4 h-4" />
              אודות
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              צור קשר
            </Link>
          </nav>

          {/* Cart Button (Left) */}
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative border-2 border-yellow-200 hover:border-yellow-300 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 rounded-lg">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#ffc32e] text-xs font-bold text-white flex items-center justify-center">
                  {itemCount}
                </span>
              )}
              <span className="sr-only">עגלת קניות</span>
            </Button>
          </Link>
        </div>
      </header>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  )
}
