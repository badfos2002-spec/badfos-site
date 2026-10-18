'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { adminFetch } from '@/lib/admin-fetch'
import { jerusalemDateKey } from '@/lib/cost-digest'
import type { DailySummary, VoiceItem } from '@/lib/daily-orders'
import VoiceOrderPanel from '@/components/admin/VoiceOrderPanel'
import DailySummaryView, { type SavedVoiceOrder } from '@/components/admin/DailySummaryView'

export default function AdminDailyOrdersPage() {
  const [date, setDate] = useState(() => jerusalemDateKey())
  const [summary, setSummary] = useState<DailySummary | null>(null)
  // היום שאליו שייך ה-summary שנטען (date מתחלף לפני שהנתונים מגיעים)
  const [summaryDate, setSummaryDate] = useState(date)
  const [voiceOrders, setVoiceOrders] = useState<SavedVoiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // מונה בקשות: תשובה של תאריך ישן שמגיעה מאוחר לא דורסת תאריך חדש יותר
  const seqRef = useRef(0)

  const load = useCallback(async () => {
    const seq = ++seqRef.current
    setLoading(true)
    setError('')
    try {
      const res = await adminFetch(`/api/admin/daily-orders?date=${encodeURIComponent(date)}`)
      const data = await res.json().catch(() => ({}))
      if (seq !== seqRef.current) return
      if (!res.ok) throw new Error(data?.error || 'load_failed')
      setSummary(data.summary)
      setSummaryDate(date)
      setVoiceOrders(data.voiceOrders ?? [])
    } catch (e) {
      if (seq !== seqRef.current) return
      setError(e instanceof Error && e.message === 'not_signed_in' ? 'נדרשת התחברות מחדש' : 'טעינת הנתונים נכשלה, נסו לרענן')
      setSummary(null)
      setVoiceOrders([])
    } finally {
      if (seq === seqRef.current) setLoading(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  const deleteVoiceOrder = async (id: string) => {
    if (!confirm('למחוק את ההזמנה הקולית הזו?')) return
    try {
      const res = await adminFetch(`/api/admin/daily-orders?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      await load()
    } catch {
      alert('המחיקה נכשלה, נסו שוב')
    }
  }

  const saveVoiceOrder = async (saveDate: string, items: VoiceItem[], transcript: string) => {
    const res = await adminFetch('/api/admin/daily-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: saveDate, items, transcript }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.problem ? `שורה ${Number(data.index) + 1}: ${data.problem}` : 'השמירה נכשלה, נסו שוב')
    }
    if (saveDate === date) await load()
    else setDate(saveDate)
  }

  return (
    <div dir="rtl" className="max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1">הזמנות יומיות</h1>
        <p className="text-gray-600 text-sm">הזמנות קוליות + סיכום יומי של כל מה שהוזמן (אתר ששולם + קולי)</p>
      </div>

      <VoiceOrderPanel onSave={saveVoiceOrder} />

      <div className="flex items-center gap-2 flex-wrap mt-8 mb-4">
        <label htmlFor="daily-date" className="font-bold text-gray-900">סיכום ליום</label>
        <input
          id="daily-date"
          type="date"
          value={date}
          onChange={e => e.target.value && setDate(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2.5 text-base bg-white"
        />
        <Button variant="ghost" size="sm" onClick={() => setDate(jerusalemDateKey())}>היום</Button>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading} aria-label="רענון">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading && !summary ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-yellow-500" /></div>
      ) : error ? (
        <p className="text-red-600 bg-red-50 rounded-xl p-4">{error}</p>
      ) : summary ? (
        <DailySummaryView summary={summary} date={summaryDate} voiceOrders={voiceOrders} onDelete={deleteVoiceOrder} />
      ) : null}
    </div>
  )
}
