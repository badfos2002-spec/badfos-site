'use client'

import { useState } from 'react'
import { Search, Phone, Mail, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function AdminLeadsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const leads = [
    { id: 1, name: 'אבי כהן', phone: '050-1111111', email: 'avi@example.com', source: 'popup', status: 'new', date: '13/02/2026' },
    { id: 2, name: 'רונית לוי', phone: '052-2222222', email: 'ronit@example.com', source: 'contact_form', status: 'answered', date: '13/02/2026' },
    { id: 3, name: 'משה דוד', phone: '054-3333333', email: 'moshe@example.com', source: 'bottom_form', status: 'called_no_answer', date: '12/02/2026' },
  ]

  const statusLabels: Record<string, { label: string; color: string }> = {
    new: { label: 'חדש', color: 'bg-blue-100 text-blue-700' },
    answered: { label: 'נענה', color: 'bg-green-100 text-green-700' },
    called_no_answer: { label: 'התקשרו - לא ענה', color: 'bg-yellow-100 text-yellow-700' },
    not_relevant: { label: 'לא רלוונטי', color: 'bg-gray-100 text-gray-700' },
    closed_deal: { label: 'עסקה סגורה', color: 'bg-purple-100 text-purple-700' },
  }

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול לידים</h1>
        <p className="text-gray-600">ניהול פניות לקוחות</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            placeholder="חיפוש לפי שם, טלפון..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leads.map((lead) => (
          <div key={lead.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{lead.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusLabels[lead.status].color}`}>
                {statusLabels[lead.status].label}
              </span>
            </div>
            
            <div className="space-y-3 mb-4">
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-gray-700 hover:text-yellow-600">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{lead.phone}</span>
              </a>
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-gray-700 hover:text-yellow-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{lead.email}</span>
              </a>
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{lead.date}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <select className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option>שנה סטטוס</option>
                <option value="answered">נענה</option>
                <option value="called_no_answer">התקשרו - לא ענה</option>
                <option value="not_relevant">לא רלוונטי</option>
                <option value="closed_deal">עסקה סגורה</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
