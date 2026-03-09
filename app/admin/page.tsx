'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ShoppingCart,
  PhoneIncoming,
  Package,
  Star,
  Gift,
  Percent,
  Image,
  DollarSign,
  BarChart3,
  Tag,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAllDocuments } from '@/lib/db'
import type { Order, Lead } from '@/lib/types'

interface StatCard {
  label: string
  href: string
  icon: React.ElementType
  bgColor: string
  iconColor: string
  count: number | string
  subtitle: string
}

interface ManagementCard {
  title: string
  href: string
  icon: React.ElementType
  iconColor: string
  borderColor: string
  bgColor?: string
  description: string
  badge?: string
  alert?: string
  buttonLabel: string
  buttonColor?: string
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatCard[]>([])
  const [cards, setCards] = useState<ManagementCard[]>([])

  useEffect(() => {
    async function fetchStats() {
      const safe = async <T,>(fn: () => Promise<T[]>): Promise<T[]> => {
        try { return await fn() } catch { return [] }
      }

      const [orders, leads, inventory, reviews, coupons, discounts, images, pricing, packages] = await Promise.all([
        safe(() => getAllDocuments<Order>('orders')),
        safe(() => getAllDocuments<Lead>('leads')),
        safe(() => getAllDocuments<any>('inventory')),
        safe(() => getAllDocuments<any>('reviews')),
        safe(() => getAllDocuments<any>('coupons')),
        safe(() => getAllDocuments<any>('discounts')),
        safe(() => getAllDocuments<any>('siteImages')),
        safe(() => getAllDocuments<any>('pricing')),
        safe(() => getAllDocuments<any>('packages')),
      ])

      const newOrders = orders.filter(o => o.status === 'new' || o.status === 'paid').length
      const newLeads = leads.filter(l => l.status === 'new').length
      const activeCoupons = coupons.filter((c: any) => c.active !== false).length
      const activeDiscounts = discounts.filter((d: any) => d.active !== false).length
      const pendingReviews = reviews.filter((r: any) => !r.approved).length

      setStats([
        {
          label: 'הזמנות',
          href: '/admin/orders',
          icon: ShoppingCart,
          bgColor: 'bg-blue-100',
          iconColor: 'text-blue-600',
          count: orders.length,
          subtitle: newOrders > 0 ? `${newOrders} חדשות` : 'אין חדשות',
        },
        {
          label: 'לידים',
          href: '/admin/leads',
          icon: PhoneIncoming,
          bgColor: 'bg-orange-100',
          iconColor: 'text-orange-600',
          count: leads.length,
          subtitle: newLeads > 0 ? `${newLeads} חדשים` : 'אין חדשים',
        },
        {
          label: 'מלאי',
          href: '/admin/inventory',
          icon: Package,
          bgColor: 'bg-purple-100',
          iconColor: 'text-purple-600',
          count: inventory.length,
          subtitle: 'קיים מלאי',
        },
        {
          label: 'ביקורות',
          href: '/admin/reviews',
          icon: Star,
          bgColor: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          count: reviews.length,
          subtitle: 'כולל אישור',
        },
        {
          label: 'קופונים',
          href: '/admin/coupons',
          icon: Gift,
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600',
          count: coupons.length,
          subtitle: `${activeCoupons} פעילים`,
        },
        {
          label: 'הנחות',
          href: '/admin/discounts',
          icon: Percent,
          bgColor: 'bg-red-100',
          iconColor: 'text-red-600',
          count: discounts.length,
          subtitle: `${activeDiscounts} פעילות`,
        },
        {
          label: 'תמונות',
          href: '/admin/images',
          icon: Image,
          bgColor: 'bg-indigo-100',
          iconColor: 'text-indigo-600',
          count: images.length,
          subtitle: `${images.length} פעילות`,
        },
        {
          label: 'תמחור',
          href: '/admin/pricing',
          icon: DollarSign,
          bgColor: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
          count: pricing.length,
          subtitle: `${pricing.length} פעילים`,
        },
        {
          label: 'אנליטיקה',
          href: '/admin/analytics',
          icon: BarChart3,
          bgColor: 'bg-pink-100',
          iconColor: 'text-pink-600',
          count: 'נתונים',
          subtitle: 'דוחות ומגמות',
        },
      ])

      setCards([
        {
          title: 'ניהול לידים',
          href: '/admin/leads',
          icon: PhoneIncoming,
          iconColor: 'text-orange-600',
          borderColor: 'border-orange-100',
          bgColor: 'bg-orange-50/30',
          description: 'נהל פניות מלקוחות, פופ-אפים וטפסי צור קשר',
          badge: `${newLeads} חדשים`,
          alert: newLeads > 0 ? `${newLeads} פניות חדשות דורשות טיפול` : undefined,
          buttonLabel: 'צפה בפניות',
          buttonColor: 'bg-orange-600 hover:bg-orange-700',
        },
        {
          title: 'ניהול הזמנות',
          href: '/admin/orders',
          icon: ShoppingCart,
          iconColor: 'text-blue-600',
          borderColor: '',
          description: 'צפה ונהל את כל ההזמנות שהתקבלו מהלקוחות',
          badge: `${orders.length} הזמנות`,
          alert: newOrders > 0 ? `${newOrders} הזמנות חדשות ממתינות` : undefined,
          buttonLabel: 'צפה בהזמנות',
        },
        {
          title: 'ניהול מלאי',
          href: '/admin/inventory',
          icon: Package,
          iconColor: 'text-green-600',
          borderColor: '',
          description: 'עדכן כמויות זמינות ופרטי מוצרים במלאי',
          badge: `${inventory.filter((i: any) => (i.quantity || 0) < 5).length} מלאי נמוך`,
          buttonLabel: 'נהל מלאי',
        },
        {
          title: 'ניהול ביקורות',
          href: '/admin/reviews',
          icon: Star,
          iconColor: 'text-yellow-600',
          borderColor: '',
          description: 'אשר, ערוך או מחק ביקורות לקוחות',
          badge: `${pendingReviews} ממתינות`,
          buttonLabel: 'נהל ביקורות',
        },
        {
          title: 'ניהול קופונים',
          href: '/admin/coupons',
          icon: Tag,
          iconColor: 'text-purple-600',
          borderColor: '',
          description: 'צור וערוך קודי הנחה ללקוחות',
          badge: `${activeCoupons} פעילים`,
          buttonLabel: 'נהל קופונים',
        },
        {
          title: 'הנחות ומבצעים',
          href: '/admin/discounts',
          icon: Percent,
          iconColor: 'text-red-600',
          borderColor: '',
          description: 'הנחות כמות, באנר מבצעים ואזור מבצעים בדף הבית',
          badge: `${activeDiscounts} פעילות`,
          buttonLabel: 'נהל הנחות ומבצעים',
        },
        {
          title: 'ניהול תמונות האתר',
          href: '/admin/images',
          icon: Image,
          iconColor: 'text-indigo-600',
          borderColor: '',
          description: 'החלף תמונות וסרטונים שמופיעים באתר',
          badge: `${images.length} תמונות`,
          buttonLabel: 'נהל תמונות',
        },
        {
          title: 'ניהול מחירים',
          href: '/admin/pricing',
          icon: DollarSign,
          iconColor: 'text-green-600',
          borderColor: '',
          description: 'הגדר מחירי מוצרים, אפשרויות ותמחור עיצוב',
          badge: 'נהל תמחור',
          buttonLabel: 'נהל מחירים',
        },
        {
          title: 'אנליטיקות',
          href: '/admin/analytics',
          icon: BarChart3,
          iconColor: 'text-teal-600',
          borderColor: '',
          description: 'צפה בנתונים סטטיסטיים וביצועי האתר',
          buttonLabel: 'צפה באנליטיקות',
        },
        {
          title: 'ניהול חבילות ומבצעים',
          href: '/admin/packages',
          icon: Gift,
          iconColor: 'text-yellow-600',
          borderColor: '',
          description: 'נהל תמונות, מחירים, טווחי כמויות וסטטוס חבילות.',
          badge: 'יצירה, עריכה וסידור',
          buttonLabel: 'עבור לניהול חבילות',
        },
      ])

      setLoading(false)
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">לוח בקרה</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.href}
              href={stat.href}
              className="block hover:scale-105 transition-transform"
            >
              <div className="rounded-xl border bg-white shadow cursor-pointer hover:shadow-lg transition-all h-full">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className={`${stat.bgColor} p-3 rounded-lg`}>
                      <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                      <p className="text-sm text-gray-500">{stat.subtitle}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Management Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.href}
              className={`rounded-xl border bg-white shadow hover:shadow-lg transition-shadow ${card.borderColor} ${card.bgColor || ''}`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center font-semibold">
                    <Icon className={`w-6 h-6 ml-2 ${card.iconColor}`} />
                    {card.title}
                  </div>
                  {card.badge && (
                    <span className="text-sm text-gray-500">{card.badge}</span>
                  )}
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <p className="text-gray-600 mb-4">{card.description}</p>
                {card.alert && (
                  <p className="text-orange-600 text-sm mb-2 font-medium">{card.alert}</p>
                )}
                <Link href={card.href}>
                  <Button className={`w-full ${card.buttonColor || ''}`}>
                    {card.buttonLabel}
                  </Button>
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
