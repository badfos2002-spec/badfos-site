'use client'

import { TrendingUp, DollarSign, ShoppingBag, Users, BarChart3 } from 'lucide-react'

export default function AdminAnalyticsPage() {
  const stats = [
    { icon: DollarSign, label: 'הכנסות חודש זה', value: '₪42,350', change: '+23%', color: 'from-green-500 to-emerald-600' },
    { icon: ShoppingBag, label: 'הזמנות חודש זה', value: '156', change: '+18%', color: 'from-blue-500 to-indigo-600' },
    { icon: Users, label: 'לקוחות חדשים', value: '89', change: '+12%', color: 'from-purple-500 to-pink-600' },
    { icon: TrendingUp, label: 'שיעור המרה', value: '3.2%', change: '+0.5%', color: 'from-yellow-500 to-orange-500' },
  ]

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">אנליטיקה ודוחות</h1>
        <p className="text-gray-600">נתונים סטטיסטיים ומדדי ביצועים</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-green-600">{stat.change}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">מכירות לפי חודש</h2>
        <div className="h-64 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">גרף מכירות - יושלם בשלב הבא</p>
          </div>
        </div>
      </div>
    </div>
  )
}
