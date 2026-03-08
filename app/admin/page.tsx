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
  Loader2
} from 'lucide-react'
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

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatCard[]>([])

  useEffect(() => {
    async function fetchStats() {
      try {
        const [orders, leads, inventory, reviews, coupons, discounts, images, pricing] = await Promise.all([
          getAllDocuments<Order>('orders'),
          getAllDocuments<Lead>('leads'),
          getAllDocuments<any>('inventory'),
          getAllDocuments<any>('reviews'),
          getAllDocuments<any>('coupons'),
          getAllDocuments<any>('discounts'),
          getAllDocuments<any>('images'),
          getAllDocuments<any>('pricing'),
        ])

        const newOrders = orders.filter(o => o.status === 'new' || o.status === 'paid').length
        const newLeads = leads.filter(l => l.status === 'new').length
        const activeCoupons = coupons.filter((c: any) => c.active !== false).length
        const activeDiscounts = discounts.filter((d: any) => d.active !== false).length
        const activeImages = images.filter((i: any) => i.active !== false).length
        const activePricing = pricing.filter((p: any) => p.active !== false).length

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
            subtitle: `${activeImages} פעילות`,
          },
          {
            label: 'תמחור',
            href: '/admin/pricing',
            icon: DollarSign,
            bgColor: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
            count: pricing.length,
            subtitle: `${activePricing} פעילים`,
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
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
    </div>
  )
}
