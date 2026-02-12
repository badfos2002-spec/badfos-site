'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAllDocuments, updateDocument } from '@/lib/db'
import type { Lead } from '@/lib/types'
import { Search, Phone, Mail } from 'lucide-react'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    loadLeads()
  }, [])

  useEffect(() => {
    filterLeads()
  }, [leads, searchQuery, statusFilter, sourceFilter, dateFilter])

  const loadLeads = async () => {
    try {
      const data = await getAllDocuments<Lead>('leads')
      // Sort by date descending
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0)
        const dateB = b.createdAt?.toDate() || new Date(0)
        return dateB.getTime() - dateA.getTime()
      })
      setLeads(data)
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterLeads = () => {
    let filtered = [...leads]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.phone.includes(searchQuery) ||
          lead.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.status === statusFilter)
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.source === sourceFilter)
    }

    // Date filter
    if (dateFilter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      filtered = filtered.filter((lead) => {
        const leadDate = lead.createdAt?.toDate()
        return leadDate && leadDate >= today
      })
    }

    setFilteredLeads(filtered)
  }

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateDocument<Lead>('leads', leadId, { status: newStatus } as any)
      setLeads(
        leads.map((lead) =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      )
    } catch (error) {
      console.error('Error updating status:', error)
      alert('שגיאה בעדכון סטטוס')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      new: { label: 'חדש', className: 'bg-blue-100 text-blue-800' },
      answered: { label: 'נענה', className: 'bg-green-100 text-green-800' },
      called_no_answer: {
        label: 'התקשרו - לא ענה',
        className: 'bg-yellow-100 text-yellow-800',
      },
      not_relevant: {
        label: 'לא רלוונטי',
        className: 'bg-gray-100 text-gray-800',
      },
      closed_deal: {
        label: 'עסקה סגורה',
        className: 'bg-purple-100 text-purple-800',
      },
    }

    const variant = variants[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-800',
    }
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  const getSourceBadge = (source: string) => {
    const labels: Record<string, string> = {
      popup: 'פופ-אפ',
      bottom_form: 'טופס תחתון',
      contact_form: 'טופס יצירת קשר',
    }

    return (
      <Badge className="bg-primary/10 text-primary">
        {labels[source] || source}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-text-gray">טוען לידים...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ניהול לידים</h1>
        <p className="text-text-gray">עקוב אחר לקוחות פוטנציאליים</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="חיפוש לפי שם/טלפון/אימייל"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="כל הסטטוסים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="new">חדש</SelectItem>
                <SelectItem value="answered">נענה</SelectItem>
                <SelectItem value="called_no_answer">
                  התקשרו - לא ענה
                </SelectItem>
                <SelectItem value="not_relevant">לא רלוונטי</SelectItem>
                <SelectItem value="closed_deal">עסקה סגורה</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="כל המקורות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המקורות</SelectItem>
                <SelectItem value="popup">פופ-אפ</SelectItem>
                <SelectItem value="bottom_form">טופס תחתון</SelectItem>
                <SelectItem value="contact_form">טופס יצירת קשר</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="כל התקופה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התקופה</SelectItem>
                <SelectItem value="today">היום</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-text-gray flex items-center">
              <strong className="ml-2">{filteredLeads.length}</strong>
              לידים
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-text-gray">לא נמצאו לידים</p>
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map((lead) => (
            <Card key={lead.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{lead.name}</h3>
                    <div className="flex gap-2 mb-2">
                      {getStatusBadge(lead.status)}
                      {getSourceBadge(lead.source)}
                    </div>
                    <p className="text-sm text-text-gray">
                      {lead.createdAt?.toDate().toLocaleDateString('he-IL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {lead.phone}
                    </a>
                    <a
                      href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                    >
                      WhatsApp
                    </a>
                  </div>

                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {lead.email}
                      </a>
                    </div>
                  )}
                </div>

                {lead.subject && (
                  <div className="mb-4">
                    <p className="text-sm text-text-gray mb-1">נושא:</p>
                    <p className="font-medium">{lead.subject}</p>
                  </div>
                )}

                {lead.message && (
                  <div className="mb-4">
                    <p className="text-sm text-text-gray mb-1">הודעה:</p>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">
                      {lead.message}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-gray">עדכן סטטוס:</span>
                  <Select
                    value={lead.status}
                    onValueChange={(value) => handleStatusChange(lead.id, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">חדש</SelectItem>
                      <SelectItem value="answered">נענה</SelectItem>
                      <SelectItem value="called_no_answer">
                        התקשרו - לא ענה
                      </SelectItem>
                      <SelectItem value="not_relevant">לא רלוונטי</SelectItem>
                      <SelectItem value="closed_deal">עסקה סגורה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
