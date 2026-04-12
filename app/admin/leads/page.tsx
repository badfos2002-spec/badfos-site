'use client'

import { useState, useEffect } from 'react'
import { Search, Phone, Mail, Calendar, Loader2, Users, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getAllLeads, updateLeadStatus, deleteDocument } from '@/lib/db'
import type { Lead } from '@/lib/types'

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: 'חדש', color: 'bg-blue-100 text-blue-700' },
  answered: { label: 'נענה', color: 'bg-green-100 text-green-700' },
  called_no_answer: { label: 'התקשרו - לא ענה', color: 'bg-yellow-100 text-yellow-700' },
  not_relevant: { label: 'לא רלוונטי', color: 'bg-gray-100 text-gray-700' },
  closed_deal: { label: 'עסקה סגורה', color: 'bg-purple-100 text-purple-700' },
}

const sourceLabels: Record<string, string> = {
  popup: '🔔 פופאפ',
  bottom_form: '📋 טופס תחתון',
  contact_form: '📞 יצירת קשר',
  landing: '🎯 דף נחיתה',
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    getAllLeads()
      .then(setLeads)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateLeadStatus(leadId, newStatus)
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus as any } : l))
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון סטטוס ליד')
    }
  }

  const handleDelete = async (leadId: string) => {
    if (!confirm('למחוק את הליד?')) return
    try {
      await deleteDocument('leads', leadId)
      setLeads(prev => prev.filter(l => l.id !== leadId))
    } catch (e) {
      console.error(e)
      alert('שגיאה במחיקת ליד')
    }
  }

  const filtered = leads.filter(l =>
    !searchTerm ||
    l.name.includes(searchTerm) ||
    l.phone.includes(searchTerm) ||
    (l.email ?? '').includes(searchTerm)
  )

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול לידים</h1>
        <p className="text-gray-600">ניהול פניות לקוחות</p>
      </div>

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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">אין לידים</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((lead) => {
            const date = lead.createdAt?.toDate?.()?.toLocaleDateString('he-IL') ?? ''
            return (
              <div
                key={lead.id}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl hover:border-yellow-200 border-2 border-transparent transition-all cursor-pointer"
                onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{lead.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusLabels[lead.status]?.color ?? 'bg-gray-100 text-gray-700'}`}>
                    {statusLabels[lead.status]?.label ?? lead.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-gray-700 hover:text-yellow-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{lead.phone}</span>
                  </a>
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-gray-700 hover:text-yellow-600">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{lead.email}</span>
                    </a>
                  )}
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{date}</span>
                  </div>
                  {lead.source && (
                    <div className="text-xs text-gray-400">מקור: {sourceLabels[lead.source] ?? lead.source}</div>
                  )}
                  {lead.message && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2">{lead.message}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <select
                    className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                  >
                    {Object.entries(statusLabels).map(([val, { label }]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400"
                    onClick={() => handleDelete(lead.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
