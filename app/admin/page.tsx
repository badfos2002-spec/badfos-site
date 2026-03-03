'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag, Users, Star, TrendingUp, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getAllOrders, getAllLeads, getAllDocuments } from '@/lib/db'
import type { Order, Lead, Review } from '@/lib/types'

const statusLabels: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'ממתין לתשלום', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'שולם', color: 'bg-green-100 text-green-700' },
  in_production: { label: 'בייצור', color: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'נשלח', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'הושלם', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'בוטל', color: 'bg-red-100 text-red-700' },
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [pendingReviews, setPendingReviews] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getAllOrders(),
      getAllLeads(),
      getAllDocuments<Review>('reviews'),
    ])
      .then(([o, l, r]) => {
        setOrders(o)
        setLeads(l)
        setPendingReviews(r.filter(rev => rev.status === 'pending').length)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const ordersToday = orders.filter(o => {
    const d = o.createdAt?.toDate?.()
    return d && d >= today
  })

  const leadsToday = leads.filter(l => {
    const d = l.createdAt?.toDate?.()
    return d && d >= today
  })

  const revenueThisMonth = orders
    .filter(o => {
      const d = o.createdAt?.toDate?.()
      return d && d >= startOfMonth && o.status !== 'cancelled'
    })
    .reduce((sum, o) => sum + (o.total ?? 0), 0)

  const recentOrders = [...orders]
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
    .slice(0, 5)

  const stats = [
    {
      icon: ShoppingBag,
      label: 'הזמנות היום',
      value: String(ordersToday.length),
      color: 'from-blue-500 to-indigo-600',
      href: '/admin/orders',
    },
    {
      icon: Users,
      label: 'לידים היום',
      value: String(leadsToday.length),
      color: 'from-green-500 to-emerald-600',
      href: '/admin/leads',
    },
    {
      icon: TrendingUp,
      label: 'הכנסות החודש',
      value: `₪${revenueThisMonth.toLocaleString()}`,
      color: 'from-yellow-500 to-orange-500',
      href: '/admin/analytics',
    },
    {
      icon: Star,
      label: 'ביקורות ממתינות',
      value: String(pendingReviews),
      color: 'from-red-500 to-rose-600',
      href: '/admin/reviews',
    },
  ]

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">לוח בקרה</h1>
        <p className="text-gray-600">סקירה כללית של המערכת</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, idx) => {
              const Icon = stat.icon
              return (
                <Link key={idx} href={stat.href}>
                  <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">הזמנות אחרונות</h2>
              <Link href="/admin/orders" className="text-yellow-600 hover:text-yellow-700 font-medium text-sm">
                צפה בהכל ←
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>אין הזמנות עדיין</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => {
                  const statusInfo = statusLabels[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' }
                  return (
                    <div key={order.id} className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-yellow-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold">
                          {order.customer.firstName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{order.customer.firstName} {order.customer.lastName}</p>
                          <p className="text-sm text-gray-500">#{order.orderNumber} • {order.createdAt?.toDate?.()?.toLocaleDateString('he-IL') ?? ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg text-gray-900">₪{order.total}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
