'use client'

import { ShoppingBag, Users, Package, TrendingUp, DollarSign, Star } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const stats = [
    { icon: ShoppingBag, label: 'הזמנות היום', value: '12', change: '+8%', color: 'from-blue-500 to-indigo-600' },
    { icon: Users, label: 'לידים חדשים', value: '23', change: '+15%', color: 'from-green-500 to-emerald-600' },
    { icon: Package, label: 'מוצרים במלאי', value: '1,247', change: '-3%', color: 'from-purple-500 to-pink-600' },
    { icon: DollarSign, label: 'הכנסות היום', value: '₪8,420', change: '+12%', color: 'from-yellow-500 to-orange-500' },
    { icon: Star, label: 'ביקורות ממתינות', value: '5', change: '0%', color: 'from-red-500 to-rose-600' },
    { icon: TrendingUp, label: 'שיעור המרה', value: '24%', change: '+5%', color: 'from-cyan-500 to-blue-600' },
  ]

  const recentOrders = [
    { id: '#1234', customer: 'יוסי כהן', amount: '₪450', status: 'pending', time: 'לפני 10 דקות' },
    { id: '#1233', customer: 'שרה לוי', amount: '₪680', status: 'paid', time: 'לפני 25 דקות' },
    { id: '#1232', customer: 'דוד אברהם', amount: '₪1,200', status: 'in_production', time: 'לפני שעה' },
  ]

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">לוח בקרה</h1>
        <p className="text-gray-600">סקירה כללית של המערכת</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">הזמנות אחרונות</h2>
          <Link href="/admin/orders" className="text-yellow-600 hover:text-yellow-700 font-medium text-sm">
            צפה בהכל ←
          </Link>
        </div>
        <div className="space-y-4">
          {recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-yellow-200 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold">
                  {order.customer.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{order.customer}</p>
                  <p className="text-sm text-gray-500">{order.id} • {order.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg text-gray-900">{order.amount}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  order.status === 'paid' ? 'bg-green-100 text-green-700' :
                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {order.status === 'paid' ? 'שולם' : order.status === 'pending' ? 'ממתין' : 'בייצור'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
