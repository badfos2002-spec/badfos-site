'use client'

import { useState, useEffect } from 'react'
import { Loader2, PauseCircle, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getOrdersPaused, setOrdersPaused } from '@/lib/db'

/**
 * The owner's "stop taking orders" switch (settings/orders).
 * Turning orders OFF stops revenue, so it asks for a confirmation first.
 * Turning them back ON is a single click.
 */
export default function OrdersPauseToggle() {
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getOrdersPaused()
      .then(setPaused)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (next: boolean) => {
    if (next && !confirm('לעצור את קבלת ההזמנות? לקוחות לא יוכלו להזמין ולא יבוצעו חיובים עד שתפעילו מחדש.')) return
    setSaving(true)
    try {
      await setOrdersPaused(next)
      setPaused(next)
    } catch (e) {
      console.error(e)
      alert('שגיאה בשמירה — ההגדרה לא השתנתה')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-white shadow p-6 mb-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border-2 shadow p-6 mb-6 ${
        paused ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {paused ? (
            <PauseCircle className="w-8 h-8 text-red-600 shrink-0" />
          ) : (
            <PlayCircle className="w-8 h-8 text-green-600 shrink-0" />
          )}
          <div>
            <p className={`text-lg font-bold ${paused ? 'text-red-700' : 'text-green-700'}`}>
              {paused ? 'הזמנות מושהות' : 'מקבלים הזמנות'}
            </p>
            <p className="text-sm text-gray-600">
              {paused
                ? 'הלקוחות רואים הודעה בעגלה, לא נוצרות הזמנות ולא מתבצעים חיובים. שאר האתר פעיל.'
                : 'האתר מקבל הזמנות ומבצע חיובים כרגיל.'}
            </p>
          </div>
        </div>
        <Button
          onClick={() => toggle(!paused)}
          disabled={saving}
          className={`shrink-0 ${paused ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : paused ? 'הפעל הזמנות מחדש' : 'עצור קבלת הזמנות'}
        </Button>
      </div>
    </div>
  )
}
