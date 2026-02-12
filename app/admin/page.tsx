'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
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
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { getAllDocuments } from '@/lib/db'
import type { Order, Lead, Review, InventoryItem } from '@/lib/types'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    orders: 0,
    leads: 0,
    reviews: 0,
    lowStock: 0,
    todayOrders: 0,
    todayLeads: 0,
    pendingReviews: 0,
    totalRevenue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Fetch all data
      const [orders, leads, reviews, inventory] = await Promise.all([
        getAllDocuments<Order>('orders'),
        getAllDocuments<Lead>('leads'),
        getAllDocuments<Review>('reviews'),
        getAllDocuments<InventoryItem>('inventory'),
      ])

      // Calculate stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayOrders = orders.filter((order) => {
        const orderDate = order.createdAt?.toDate()
        return orderDate && orderDate >= today
      })

      const todayLeads = leads.filter((lead) => {
        const leadDate = lead.createdAt?.toDate()
        return leadDate && leadDate >= today
      })

      const pendingReviews = reviews.filter(
        (review) => review.status === 'pending'
      )

      const lowStock = inventory.filter(
        (item) => item.quantity <= item.lowStockThreshold
      )

      const totalRevenue = orders
        .filter((order) => order.status !== 'cancelled')
        .reduce((sum, order) => sum + order.total, 0)

      setStats({
        orders: orders.length,
        leads: leads.length,
        reviews: reviews.length,
        lowStock: lowStock.length,
        todayOrders: todayOrders.length,
        todayLeads: todayLeads.length,
        pendingReviews: pendingReviews.length,
        totalRevenue,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'הזמנות',
      value: stats.orders,
      change: `+${stats.todayOrders} היום`,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'לידים',
      value: stats.leads,
      change: `+${stats.todayLeads} היום`,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'ביקורות',
      value: stats.reviews,
      change: `${stats.pendingReviews} ממתינות`,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'מלאי נמוך',
      value: stats.lowStock,
      change: 'דורש תשומת לב',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ]

  const modules = [
    {
      title: 'ניהול הזמנות',
      description: 'עקוב ועדכן סטטוס הזמנות',
      href: '/admin/orders',
      icon: ShoppingBag,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'ניהול לידים',
      description: 'עקוב אחר לקוחות פוטנציאליים',
      href: '/admin/leads',
      icon: Users,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'ניהול מלאי',
      description: 'עדכן ועקוב אחר המלאי',
      href: '/admin/inventory',
      icon: Package,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'ביקורות לקוחות',
      description: 'אשר ונהל ביקורות',
      href: '/admin/reviews',
      icon: Star,
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      title: 'קופונים והנחות',
      description: 'צור וניהל קופונים',
      href: '/admin/coupons',
      icon: Tag,
      color: 'from-pink-500 to-pink-600',
    },
    {
      title: 'כללי הנחה',
      description: 'הגדר הנחות כמותיות',
      href: '/admin/discounts',
      icon: Percent,
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      title: 'ניהול תמונות',
      description: 'העלה ונהל מוקאפים ותמונות',
      href: '/admin/images',
      icon: ImageIcon,
      color: 'from-teal-500 to-teal-600',
    },
    {
      title: 'ניהול מחירים',
      description: 'עדכן מחירי בסיס ותוספות',
      href: '/admin/pricing',
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      title: 'חבילות ומבצעים',
      description: 'צור וניהל חבילות מוצרים',
      href: '/admin/packages',
      icon: Gift,
      color: 'from-rose-500 to-rose-600',
    },
    {
      title: 'אנליטיקה ודוחות',
      description: 'צפה בנתונים וסטטיסטיקות',
      href: '/admin/analytics',
      icon: BarChart3,
      color: 'from-orange-500 to-orange-600',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-text-gray">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">לוח בקרה</h1>
        <p className="text-text-gray">סקירה כללית של המערכת</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-text-gray mb-1">{stat.title}</p>
              <p className="text-xs text-primary font-medium">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Card */}
      <Card className="mb-8 bg-gradient-to-l from-primary to-secondary text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 mb-1">סה"כ הכנסות</p>
              <h2 className="text-4xl font-bold">
                ₪{stats.totalRevenue.toLocaleString()}
              </h2>
            </div>
            <div className="p-4 bg-white/20 rounded-full">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-6">מודולי ניהול</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <Link key={module.title} href={module.href}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${module.color} rounded-lg flex items-center justify-center mb-3`}
                >
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">{module.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-gray text-sm">{module.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
