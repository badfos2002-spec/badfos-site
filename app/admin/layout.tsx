'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { onAuthChange, signOut, isAdmin } from '@/lib/auth'
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  Star,
  Tag,
  Percent,
  Image as ImageIcon,
  DollarSign,
  Gift,
  BarChart3,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { User } from 'firebase/auth'

const navigation = [
  { name: 'לוח בקרה', href: '/admin', icon: LayoutDashboard },
  { name: 'הזמנות', href: '/admin/orders', icon: ShoppingBag },
  { name: 'לידים', href: '/admin/leads', icon: Users },
  { name: 'מלאי', href: '/admin/inventory', icon: Package },
  { name: 'ביקורות', href: '/admin/reviews', icon: Star },
  { name: 'קופונים', href: '/admin/coupons', icon: Tag },
  { name: 'הנחות', href: '/admin/discounts', icon: Percent },
  { name: 'תמונות', href: '/admin/images', icon: ImageIcon },
  { name: 'תמחור', href: '/admin/pricing', icon: DollarSign },
  { name: 'חבילות', href: '/admin/packages', icon: Gift },
  { name: 'אנליטיקה', href: '/admin/analytics', icon: BarChart3 },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser)
      setLoading(false)

      // Redirect if not logged in or not admin
      if (pathname !== '/admin/login') {
        if (!currentUser || !isAdmin(currentUser)) {
          router.push('/admin/login')
        }
      }
    })

    return () => unsubscribe()
  }, [pathname, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/admin/login')
  }

  // Don't show layout on login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-text-gray">טוען...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin(user)) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-xl font-bold">דשבורד אדמין</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-red-600"
        >
          <LogOut size={20} />
        </Button>
      </div>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-0 right-0 h-screen w-64 bg-white border-l
            flex flex-col z-50 transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Logo */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-secondary bg-clip-text text-transparent">
              בדפוס אדמין
            </h1>
            <p className="text-sm text-text-gray mt-1">
              {user.email?.split('@')[0]}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                        ${
                          isActive
                            ? 'bg-primary text-white font-bold'
                            : 'hover:bg-gray-100 text-text-dark'
                        }
                      `}
                    >
                      <item.icon size={20} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Sign out button (desktop) */}
          <div className="p-4 border-t hidden lg:block">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut size={20} className="ml-2" />
              התנתק
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
