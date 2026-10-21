'use client'

/**
 * כפתור "סקיצה" — קישור /share/<id> מוכן בלחיצה אחת משורת הזמנה עם עיצוב.
 * לא מוצג כשאין לשורה מה להציג (מוצר "אחר", בלי עיצוב שמור, צבע לא מוכר).
 * הקישור מוצג בלבד ולא נשמר על ההזמנה; הסקיצה עצמה מופיעה בהיסטוריה של /admin/sketches.
 */
import { useMemo, useState } from 'react'
import { Loader2, Copy, Check, ExternalLink, Paintbrush, MessageCircle } from 'lucide-react'
import { orderItemToSketch, sketchWhatsAppUrl, type SketchSourceItem } from '@/lib/sketch-products'
import { createSketchFromSpec, type CreatedSketch } from '@/lib/sketch-create'

export default function SketchLinkButton({ item, phone, label, className = '', fullWidth = false }: { item: SketchSourceItem; phone?: string; label?: string; className?: string; fullWidth?: boolean }) {
  const spec = useMemo(
    () => orderItemToSketch(item, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    [item],
  )
  const sig = spec ? JSON.stringify(spec) : ''
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  // הקישור שייך לשורה כפי שהייתה ביצירה — שינוי צבע/עיצוב מסתיר אותו
  const [made, setMade] = useState<(CreatedSketch & { sig: string }) | null>(null)
  if (!spec) return null
  const result = made?.sig === sig ? made : null

  const create = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    setCopied(false)
    try {
      setMade({ ...(await createSketchFromSpec(spec, { phone, label })), sig })
    } catch (e) {
      console.error('One-click sketch failed:', e)
      const m = e instanceof Error ? e.message : ''
      setError(m === 'not_signed_in' ? 'נדרשת התחברות מחדש' : m === 'source_missing' ? 'קובץ העיצוב כבר נמחק' : 'יצירת הסקיצה נכשלה, נסו שוב')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!result) return
    try { await navigator.clipboard.writeText(result.url) } catch {
      const ta = document.createElement('textarea')
      ta.value = result.url
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const btn = 'inline-flex min-h-[44px] items-center gap-1 rounded-lg border px-3 text-sm font-semibold'
  return (
    <div className={`space-y-2 ${className}`} onClick={e => e.stopPropagation()}>
      {!result && (
        <button type="button" onClick={create} disabled={busy} className={`${btn} ${fullWidth ? 'w-full justify-center' : ''} border-purple-600 bg-white text-purple-700 hover:bg-purple-50 disabled:opacity-60`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paintbrush className="h-4 w-4" />}
          {busy ? 'יוצר סקיצה…' : 'סקיצה ללקוח'}
        </button>
      )}
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      {result && (
        <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50 p-2">
          <input readOnly dir="ltr" value={result.url} onFocus={e => e.target.select()} aria-label="קישור לסקיצה"
            className="w-full rounded-md border border-purple-200 bg-white px-2 py-1.5 text-sm text-gray-800" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={`${btn} border-gray-300 bg-white text-gray-800`}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'הועתק' : 'העתק'}
            </button>
            <a href={sketchWhatsAppUrl(result.url, phone)} target="_blank" rel="noopener noreferrer" className={`${btn} border-green-600 bg-green-600 text-white`}>
              <MessageCircle className="h-4 w-4" /> שלח בוואטסאפ
            </a>
            <a href={result.url} target="_blank" rel="noopener noreferrer" className={`${btn} border-gray-300 bg-white text-gray-800`}>
              <ExternalLink className="h-4 w-4" /> פתח
            </a>
          </div>
          {result.previewMissing && (
            <p className="text-xs font-semibold text-amber-700">הקישור תקין, אבל בוואטסאפ תופיע תמונת הלוגו במקום הסקיצה</p>
          )}
        </div>
      )}
    </div>
  )
}
