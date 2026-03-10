'use client'

import Link from 'next/link'
import { ShoppingCart, Menu, Home, Shirt, Package, Star, Info, Phone, HelpCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import MobileMenu from './MobileMenu'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const itemCount = useCart((state) => state.getCartItemCount())

  useEffect(() => { setMounted(true) }, [])
  const pathname = usePathname()

  const navLinkClass = (href: string) => {
    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
    return isActive
      ? 'flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg transition-all duration-200 hover-lift bg-yellow-100 text-yellow-600'
      : 'flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg transition-all duration-200 hover-lift text-gray-700 hover:text-yellow-600 hover:bg-yellow-50'
  }

  return (
    <>
      <header className="sticky top-0 z-[100] w-full border-b border-gray-200 bg-white/90 backdrop-blur-[20px] shadow-sm" dir="rtl">
        <div className="mx-auto max-w-[1536px] px-4 md:px-0">

          {/* Mobile Row */}
          <div className="grid grid-cols-3 items-center h-20 lg:hidden">
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="פתח תפריט"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
            <div className="flex justify-center">
              <Link href="/">
                <img src="/logo.png" alt="בדפוס - הדפסת חולצות" className="h-12 w-auto" />
              </Link>
            </div>
            <div className="flex justify-end">
              <Link href="/cart">
                <Button variant="outline" size="icon" className="relative hover-lift border-yellow-200 hover:border-yellow-300 h-12 w-12" aria-label={`עגלת קניות - ${itemCount} פריטים`}>
                  <ShoppingCart className="w-5 h-5" />
                  {mounted && itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#ffc32e] text-xs font-bold text-white flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>

          {/* Desktop Row */}
          <div className="hidden lg:flex justify-between items-center h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center">
              <img src="/logo.png" alt="בדפוס - הדפסת חולצות" className="h-12 w-auto" />
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-8 space-x-reverse" role="navigation">
              <Link href="/" className={navLinkClass('/')}>
                <Home className="w-4 h-4" />
                <span className="font-medium">בית</span>
              </Link>
              <Link href="/designer" className={navLinkClass('/designer')}>
                <Shirt className="w-4 h-4" />
                <span className="font-medium">עיצוב אישי</span>
              </Link>
              <Link href="/packages" className={navLinkClass('/packages')}>
                <Package className="w-4 h-4" />
                <span className="font-medium">חבילות ומבצעים</span>
              </Link>
              <Link href="/about" className={navLinkClass('/about')}>
                <Info className="w-4 h-4" />
                <span className="font-medium">אודות</span>
              </Link>
              <Link href="/reviews" className={navLinkClass('/reviews')}>
                <Star className="w-4 h-4" />
                <span className="font-medium">ביקורות</span>
              </Link>
              <Link href="/faq" className={navLinkClass('/faq')}>
                <HelpCircle className="w-4 h-4" />
                <span className="font-medium">שאלות</span>
              </Link>
              <Link href="/contact" className={navLinkClass('/contact')}>
                <Phone className="w-4 h-4" />
                <span className="font-medium">יצירת קשר</span>
              </Link>
            </nav>

            {/* Cart Button */}
            <Link href="/cart">
              <Button variant="outline" size="icon" className="h-9 w-9 relative hover-lift border-yellow-200 hover:border-yellow-300" aria-label={`עגלת קניות - ${itemCount} פריטים`}>
                <ShoppingCart className="w-4 h-4" />
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#ffc32e] text-xs font-bold text-white flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>

          </div>
        </div>
      </header>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  )
}
