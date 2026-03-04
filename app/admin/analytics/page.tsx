'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, ShoppingBag, Users, BarChart3, Loader2 } from 'lucide-react'
import { getAllOrders, getAllLeads } from '@/lib/db'
import type { Order, Lead } from '@/lib/types'

export default function AdminAnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAllOrders(), getAllLeads()])
      .then(([o, l]) => { setOrders(o); setLeads(l) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total ?? 0), 0)

  const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'in_production' || o.status === 'shipped' || o.status === 'completed')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const ordersThisMonth = orders.filter(o => o.createdAt?.toDate?.() >= startOfMonth)
  const leadsThisMonth = leads.filter(l => l.createdAt?.toDate?.() >= startOfMonth)
  const revenueThisMonth = ordersThisMonth
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total ?? 0), 0)

  const conversionRate = leadsThisMonth.length > 0
    ? ((ordersThisMonth.filter(o => o.status !== 'cancelled').length / leadsThisMonth.length) * 100).toFixed(1)
    : '0'

  const stats = [
    {
      icon: DollarSign,
      label: 'הכנסות חודש זה',
      value: `₪${revenueThisMonth.toLocaleString('he-IL')}`,
      color: 'from-green-500 to-emerald-600',
    },
    {
      icon: ShoppingBag,
      label: 'הזמנות חודש זה',
      value: String(ordersThisMonth.length),
      color: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Users,
      label: 'לידים חודש זה',
      value: String(leadsThisMonth.length),
      color: 'from-purple-500 to-pink-600',
    },
    {
      icon: TrendingUp,
      label: 'שיעור המרה',
      value: `${conversionRate}%`,
      color: 'from-yellow-500 to-orange-500',
    },
  ]

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  const statusLabels: Record<string, string> = {
    pending_payment: 'ממתין לתשלום',
    paid: 'שולם',
    in_production: 'בייצור',
    shipped: 'נשלח',
    completed: 'הושלם',
    cancelled: 'בוטל',
  }

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">אנליטיקה ודוחות</h1>
        <p className="text-gray-600">נתונים סטטיסטיים ומדדי ביצועים</p>
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
                <div key={idx} className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">סטטוס הזמנות</h2>
              {Object.keys(statusCounts).length === 0 ? (
                <p className="text-gray-500 text-center py-8">אין הזמנות</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-gray-700">{statusLabels[status] ?? status}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-gray-100 rounded-full">
                          <div
                            className="h-2 bg-yellow-400 rounded-full"
                            style={{ width: `${(count / orders.length) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-900 w-8 text-left">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">סיכום כולל</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">סה"כ הזמנות</span>
                  <span className="font-bold text-gray-900">{orders.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">סה"כ לידים</span>
                  <span className="font-bold text-gray-900">{leads.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">הכנסות כוללות</span>
                  <span className="font-bold text-green-600">₪{totalRevenue.toLocaleString('he-IL')}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">הזמנות ששולמו</span>
                  <span className="font-bold text-gray-900">{paidOrders.length}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
