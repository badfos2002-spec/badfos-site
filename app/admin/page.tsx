'use client'

import { useState, useEffect } from 'react'
import {
  ShoppingCart,
  PhoneIncoming,
  Package,
  Star,
  Gift,
  Percent,
  Image,
  DollarSign,
  ChartColumn,
  Tag,
  Megaphone,
  PanelTop,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAllOrders, getAllLeads, getAllDocuments } from '@/lib/db'
import type { Order, Lead, Review } from '@/lib/types'

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [couponsCount, setCouponsCount] = useState(0)
  const [discountsCount, setDiscountsCount] = useState(0)
  const [imagesCount, setImagesCount] = useState(0)
  const [inventoryCount, setInventoryCount] = useState(0)

  useEffect(() => {
    Promise.all([
      getAllOrders(),
      getAllLeads(),
      getAllDocuments<Review>('reviews'),
      getAllDocuments('coupons'),
      getAllDocuments('discounts'),
      getAllDocuments('siteImages'),
      getAllDocuments('inventory'),
    ])
      .then(([o, l, r, c, d, img, inv]) => {
        setOrders(o)
        setLeads(l)
        setReviews(r)
        setCouponsCount(c.length)
        setDiscountsCount(d.length)
        setImagesCount(img.length)
        setInventoryCount(inv.length)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const paidOrders = orders.filter(o => o.status !== 'pending_payment')
  const newOrders = paidOrders.filter(o => o.status === 'new')
  const newLeads = leads.filter(l => l.status === 'new')
  const pendingReviews = reviews.filter(r => r.status === 'pending')
  const activeCoupons = couponsCount

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    )
  }

  const statCards = [
    {
      icon: ShoppingCart,
      label: 'הזמנות',
      value: paidOrders.length,
      sub: `${newOrders.length} חדשות`,
      color: 'bg-blue-100 text-blue-600',
      href: '/admin/orders',
    },
    {
      icon: PhoneIncoming,
      label: 'לידים חדשים',
      value: newLeads.length,
      sub: `${leads.length} סה״כ פניות`,
      color: 'bg-orange-100 text-orange-600',
      href: '/admin/leads',
    },
    {
      icon: Package,
      label: 'מלאי',
      value: inventoryCount,
      sub: 'קיים מלאי',
      color: 'bg-purple-100 text-purple-600',
      href: '/admin/inventory',
    },
    {
      icon: Star,
      label: 'ביקורות',
      value: reviews.length,
      sub: `${pendingReviews.length} ממתינות`,
      color: 'bg-yellow-100 text-yellow-600',
      href: '/admin/reviews',
    },
    {
      icon: Tag,
      label: 'קופונים',
      value: activeCoupons,
      sub: `${activeCoupons} פעילים`,
      color: 'bg-green-100 text-green-600',
      href: '/admin/coupons',
    },
    {
      icon: Percent,
      label: 'הנחות',
      value: discountsCount,
      sub: `${discountsCount} פעילות`,
      color: 'bg-red-100 text-red-600',
      href: '/admin/discounts',
    },
    {
      icon: Image,
      label: 'תמונות',
      value: imagesCount,
      sub: `${imagesCount} פעילות`,
      color: 'bg-indigo-100 text-indigo-600',
      href: '/admin/images',
    },
    {
      icon: DollarSign,
      label: 'התמחרות',
      value: '₪',
      sub: 'נהל תמחור',
      color: 'bg-emerald-100 text-emerald-600',
      href: '/admin/pricing',
    },
    {
      icon: ChartColumn,
      label: 'אנליטיקה',
      value: 'נתונים',
      sub: 'דוחות ומגמות',
      color: 'bg-pink-100 text-pink-600',
      href: '/admin/analytics',
    },
  ]

  const managementCards = [
    {
      icon: PhoneIncoming,
      iconColor: 'text-orange-600',
      title: 'ניהול לידים',
      titleSub: `${newLeads.length} חדשים`,
      description: 'נהל פניות מלקוחות, פופ-אפים וטפסי צור קשר',
      alert: newLeads.length > 0 ? `📞 ${newLeads.length} פניות חדשות דורשות טיפול` : undefined,
      alertColor: 'text-orange-600',
      buttonText: 'צפה בפניות',
      buttonColor: 'bg-orange-600 hover:bg-orange-700',
      borderColor: 'border-orange-100 bg-orange-50/30',
      href: '/admin/leads',
    },
    {
      icon: ShoppingCart,
      iconColor: 'text-blue-600',
      title: 'ניהול הזמנות',
      titleSub: `${paidOrders.length} הזמנות`,
      description: 'צפה ונהל את כל ההזמנות שהתקבלו מהלקוחות',
      alert: newOrders.length > 0 ? `🔔 ${newOrders.length} הזמנות חדשות ממתינות` : undefined,
      alertColor: 'text-orange-600',
      buttonText: 'צפה בהזמנות',
      href: '/admin/orders',
    },
    {
      icon: Package,
      iconColor: 'text-green-600',
      title: 'ניהול מלאי',
      titleSub: '0 מלאי נמוך',
      description: 'עדכן כמויות זמינות ופרטי מוצרים במלאי',
      buttonText: 'נהל מלאי',
      href: '/admin/inventory',
    },
    {
      icon: Star,
      iconColor: 'text-yellow-600',
      title: 'ניהול ביקורות',
      titleSub: `${pendingReviews.length} ממתינות`,
      description: 'אשר, ערוך או מחק ביקורות לקוחות',
      buttonText: 'נהל ביקורות',
      href: '/admin/reviews',
    },
    {
      icon: Tag,
      iconColor: 'text-purple-600',
      title: 'ניהול קופונים',
      titleSub: `${activeCoupons} פעילים`,
      description: 'צור וערוך קודי הנחה ללקוחות',
      buttonText: 'נהל קופונים',
      href: '/admin/coupons',
    },
    {
      icon: Percent,
      iconColor: 'text-red-600',
      title: 'ניהול הנחות',
      titleSub: `${discountsCount} פעילות`,
      description: 'הגדר הנחות אוטומטיות ומבצעים',
      buttonText: 'נהל הנחות',
      href: '/admin/discounts',
    },
    {
      icon: Image,
      iconColor: 'text-indigo-600',
      title: 'ניהול תמונות האתר',
      titleSub: `${imagesCount} תמונות`,
      description: 'החלף תמונות וסרטונים שמופיעים באתר',
      buttonText: 'נהל תמונות',
      href: '/admin/images',
    },
    {
      icon: DollarSign,
      iconColor: 'text-green-600',
      title: 'ניהול מחירים',
      titleSub: 'נהל תמחור',
      description: 'הגדר מחירי מוצרים, אפשרויות ותמחור עיצוב',
      buttonText: 'נהל מחירים',
      href: '/admin/pricing',
    },
    {
      icon: ChartColumn,
      iconColor: 'text-teal-600',
      title: 'אנליטיקות',
      description: 'צפה בנתונים סטטיסטיים וביצועי האתר',
      buttonText: 'צפה באנליטיקות',
      href: '/admin/analytics',
    },
    {
      icon: Gift,
      iconColor: 'text-yellow-600',
      title: 'ניהול חבילות ומבצעים',
      titleSub: 'יצירה, עריכה וסידור',
      description: 'נהל תמונות, מחירים, טווחי כמויות וסטטוס חבילות.',
      buttonText: 'עבור לניהול חבילות',
      href: '/admin/packages',
    },
    {
      icon: PanelTop,
      iconColor: 'text-cyan-600',
      title: 'Top Bar',
      titleSub: 'הודעה עליונה',
      description: 'ערוך את ההודעה שמופיעה בראש האתר',
      buttonText: 'ערוך Top Bar',
      href: '/admin/topbar',
    },
    {
      icon: Megaphone,
      iconColor: 'text-rose-600',
      title: 'הגדרות מבצעים',
      titleSub: 'באנרים ודילים',
      description: 'הגדר מבצעים, באנרים ודילים מיוחדים',
      buttonText: 'נהל מבצעים',
      href: '/admin/deals',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto" dir="rtl">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Link key={idx} href={stat.href} className="block hover:scale-105 transition-transform">
              <Card className="cursor-pointer hover:shadow-lg transition-all h-full">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className={`${stat.color.split(' ')[0]} p-3 rounded-lg`}>
                      <Icon className={`w-6 h-6 ${stat.color.split(' ')[1]}`} />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-sm text-gray-500">{stat.sub}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Management Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {managementCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <Card key={idx} className={`hover:shadow-lg transition-shadow ${card.borderColor || ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Icon className={`w-6 h-6 ml-2 ${card.iconColor}`} />
                    {card.title}
                  </div>
                  {card.titleSub && (
                    <span className="text-sm text-gray-500">{card.titleSub}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{card.description}</p>
                {card.alert && (
                  <p className={`${card.alertColor || 'text-orange-600'} text-sm mb-2 font-medium`}>
                    {card.alert}
                  </p>
                )}
                <Link href={card.href}>
                  <Button className={`w-full ${card.buttonColor || ''}`}>
                    {card.buttonText}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
