'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, PauseCircle, PlayCircle } from 'lucide-react'
import { getOrdersPaused, setOrdersPaused } from '@/lib/db'

/**
 * The owner's "are we taking orders?" switch (settings/orders).
 *
 * The stored flag is `paused`, but the switch is labelled by the SHOP's state,
 * because that is what you actually flip: ON = the shop takes orders (green,
 * knob at the end), OFF = orders are paused (red, knob at the start). Label,
 * colour and knob position always tell the same story.
 *
 * Turning it OFF stops revenue, so it asks for a confirmation first and the
 * knob does not move until the write actually succeeded. Turning it back ON
 * is a single tap.
 */
export default function OrdersPauseToggle() {
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  useEffect(() => {
    getOrdersPaused()
      .then(setPaused)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  /** What the switch shows: ON = the shop is taking orders. */
  const accepting = !paused

  const toggle = async () => {
    // A ref, not the `saving` state: two taps in the same tick would both get
    // past a state check (and past `disabled`) before React re-renders.
    if (savingRef.current) return
    const next = accepting // the next value of `paused`
    if (next && !confirm('לעצור את קבלת ההזמנות? לקוחות לא יוכלו להזמין ולא יבוצעו חיובים עד שתפעילו מחדש.')) return
    savingRef.current = true
    setSaving(true)
    try {
      await setOrdersPaused(next)
      setPaused(next) // the knob moves only once the write succeeded
    } catch (e) {
      console.error(e)
      alert('שגיאה בשמירה — ההגדרה לא השתנתה')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white shadow p-6 mb-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl border-2 shadow p-5 sm:p-6 mb-6 transition-colors ${
        paused ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3">
          {paused ? (
            <PauseCircle className="w-8 h-8 text-red-600 shrink-0" />
          ) : (
            <PlayCircle className="w-8 h-8 text-green-600 shrink-0" />
          )}
          <div>
            <p id="orders-switch-label" className="text-lg font-bold text-gray-900">
              קבלת הזמנות באתר
            </p>
            <p className="text-sm text-gray-600">
              {paused
                ? 'הלקוחות רואים הודעה בעגלה, לא נוצרות הזמנות ולא מתבצעים חיובים. שאר האתר פעיל.'
                : 'האתר מקבל הזמנות ומבצע חיובים כרגיל.'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
          <span className={`text-lg font-bold ${paused ? 'text-red-700' : 'text-green-700'}`}>
            {paused ? 'הזמנות מושהות' : 'מקבלים הזמנות'}
          </span>

          <button
            type="button"
            role="switch"
            aria-checked={accepting}
            aria-labelledby="orders-switch-label"
            aria-busy={saving}
            disabled={saving}
            onClick={toggle}
            className={`relative shrink-0 h-11 w-20 rounded-full p-1 transition-colors duration-200 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
              accepting
                ? 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-400'
                : 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-400'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
                accepting ? 'translate-x-9 rtl:-translate-x-9' : 'translate-x-0'
              }`}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
