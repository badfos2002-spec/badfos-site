'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  DollarSign,
  Star,
  Image,
  Tag,
  Percent,
  Gift,
  Users,
  BarChart3,
  Menu,
  X,
  LogOut,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { User } from 'firebase/auth'

const menuItems = [
  { icon: LayoutDashboard, label: 'לוח בקרה', href: '/admin' },
  { icon: ShoppingBag, label: 'הזמנות', href: '/admin/orders' },
  { icon: Users, label: 'לידים', href: '/admin/leads' },
  { icon: Package, label: 'מלאי', href: '/admin/inventory' },
  { icon: DollarSign, label: 'תמחור', href: '/admin/pricing' },
  { icon: Star, label: 'ביקורות', href: '/admin/reviews' },
  { icon: Image, label: 'תמונות', href: '/admin/images' },
  { icon: Tag, label: 'קופונים', href: '/admin/coupons' },
  { icon: Percent, label: 'הנחות ומבצעים', href: '/admin/discounts' },
  { icon: Gift, label: 'חבילות', href: '/admin/packages' },
  { icon: BarChart3, label: 'אנליטיקה', href: '/admin/analytics' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    import('@/lib/auth').then(({ onAuthChange, isAdmin }) => {
      unsubscribe = onAuthChange((currentUser) => {
        setUser(currentUser)
        setLoading(false)
        if (!currentUser || !isAdmin(currentUser)) {
          router.replace('/admin/login')
        }
      })
    })
    return () => unsubscribe?.()
  }, [router])

  const handleSignOut = async () => {
    const { signOut } = await import('@/lib/auth')
    await signOut()
    router.replace('/admin/login')
  }

  // Allow login page without auth
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    )
  }

  if (!user || user.email !== 'badfos2002@gmail.com') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">🎨 פאנל ניהול - בדפוס</h1>
          </div>
          <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleSignOut}>
            <LogOut className="w-5 h-5 ml-2" />
            התנתק
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-0 right-0 h-screen bg-white border-l border-gray-200 
          transition-transform duration-300 z-50 lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          w-64
        `}>
          <div className="p-4 border-b border-gray-200 lg:hidden flex justify-between items-center">
            <h2 className="font-bold text-lg">תפריט ניהול</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-yellow-50 text-yellow-700 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
