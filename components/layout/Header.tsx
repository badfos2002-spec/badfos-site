'use client'

import Link from 'next/link'
import { ShoppingCart, Menu } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import MobileMenu from './MobileMenu'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const itemCount = useCart((state) => state.getCartItemCount())

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="container-rtl flex h-20 items-center justify-between">
          {/* Mobile Menu Button (Right in RTL) */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">פתח תפריט</span>
          </Button>

          {/* Desktop Navigation (Right in RTL) */}
          <nav className="hidden md:flex gap-6">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              דף הבית
            </Link>
            <Link
              href="/designer"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              מעצב חולצות
            </Link>
            <Link
              href="/packages"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              חבילות ומבצעים
            </Link>
            <Link
              href="/reviews"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              ביקורות
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              אודות
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              צור קשר
            </Link>
          </nav>

          {/* Logo (Center) */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <img
              src="/logo.png"
              alt="בדפוס - הדפסת חולצות"
              className="h-12 w-auto"
            />
          </Link>

          {/* Cart Button (Left in RTL) */}
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs font-bold text-white flex items-center justify-center">
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
