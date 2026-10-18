'use client'

import { useEffect, useRef, useState } from 'react'
import { jerusalemDateKey } from '@/lib/cost-digest'
import { Mic, Square, Upload, Loader2, Plus, Trash2, AlertTriangle, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { adminFetch } from '@/lib/admin-fetch'
import {
  PRODUCT_OPTIONS,
  colorOptions,
  itemIssue,
  itemProblem,
  sizeLabel,
  sizeOptions,
  typeOptions,
  type ItemField,
  type VoiceItem,
} from '@/lib/daily-orders'

/** גוף בקשה ב-Vercel מוגבל ל-~4.5MB. */
const MAX_BYTES = 4 * 1024 * 1024
/** עצירה אוטומטית קצת לפני התקרה, כדי שההקלטה תמיד תעבור. */
const RECORDING_BYTE_CAP = 3.8 * 1024 * 1024
const MAX_RECORDING_SECONDS = 8 * 60

const TOO_LARGE_MSG = 'הקובץ גדול מדי (מעל 4MB). שלחו הקלטה קצרה יותר או פצלו לשתי הקלטות.'

const ERROR_MESSAGES: Record<string, string> = {
  no_api_key: 'התמלול לא זמין כרגע — פנו לבעל האתר',
  transcription_failed: 'התמלול נכשל. נסו שוב או הקליטו מחדש.',
  extraction_failed: 'התמלול הצליח אבל זיהוי הפריטים נכשל. נסו שוב.',
  too_large: TOO_LARGE_MSG,
  unsupported_format: 'פורמט קובץ לא נתמך. אפשר: הודעה קולית מוואטסאפ, m4a, mp3, ogg, webm, wav.',
  no_audio: 'לא התקבל קובץ שמע.',
  admin_sdk_unavailable: 'תקלה בשרת (אימות אדמין). נסו שוב בעוד רגע.',
  unauthorized: 'נדרשת התחברות מחדש.',
  forbidden: 'אין הרשאה.',
}

interface Row extends VoiceItem {
  key: number
  phrase?: string
}

interface Unclear {
  phrase: string
  reason: string
}

function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

function extForMime(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('mp4') || mime.includes('aac')) return 'm4a'
  return 'webm'
}

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

/** ממלא אוטומטית שדה שיש לו אפשרות אחת בלבד (למשל "מידה אחת"). */
function autoFill(row: Row): Row {
  const r = { ...row }
  const types = typeOptions(r.productType)
  if (types.length === 0) r.fabricType = ''
  const colors = colorOptions(r.productType, r.fabricType)
  if (r.color && !colors.some(c => c.id === r.color)) r.color = ''
  if (!r.color && colors.length === 1) r.color = colors[0].id
  const sizes = sizeOptions(r.productType, r.fabricType, r.color)
  // מידה לא חוקית לא מתרוקנת — היא נשארת גלויה עם "(לבדוק)" עד שמתקנים.
  // רק כשיש אפשרות אחת בלבד (מידה אחת) ממלאים אותה.
  if (sizes.length === 1 && r.size !== sizes[0].id) r.size = sizes[0].id
  return r
}

let rowKey = 0
const emptyRow = (): Row => ({ key: ++rowKey, productType: '', fabricType: '', color: '', size: '', quantity: 1 })

export default function VoiceOrderPanel({
  onSave,
}: {
  onSave: (date: string, items: VoiceItem[], transcript: string) => Promise<void>
}) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [review, setReview] = useState<{ transcript: string; rows: Row[]; unclear: Unclear[]; date: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const bytesRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current?.stream.getTracks().forEach(t => t.stop())
  }, [])

  const send = async (file: File) => {
    if (file.size > MAX_BYTES) { setError(TOO_LARGE_MSG); return }
    if (file.size === 0) { setError(ERROR_MESSAGES.no_audio); return }
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('audio', file, file.name)
      const res = await adminFetch('/api/admin/voice-order', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(ERROR_MESSAGES[data?.error] ?? (res.status === 413 ? TOO_LARGE_MSG : 'העיבוד נכשל, נסו שוב.'))
        return
      }
      const rows: Row[] = (data.items ?? []).map((it: VoiceItem & { phrase?: string }) => ({ ...it, key: ++rowKey }))
      setReview({ transcript: data.transcript ?? '', rows, unclear: data.unclear ?? [], date: jerusalemDateKey() })
    } catch (e) {
      setError(e instanceof Error && e.message === 'not_signed_in' ? ERROR_MESSAGES.unauthorized : 'העיבוד נכשל, נסו שוב.')
    } finally {
      setBusy(false)
    }
  }

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }

  const startRecording = async () => {
    setError('')
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('הדפדפן לא תומך בהקלטה. אפשר להעלות קובץ שמע במקום.')
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('אין גישה למיקרופון. אשרו הרשאת מיקרופון בדפדפן ונסו שוב.')
      return
    }
    const mimeType = pickRecorderMime()
    const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 })
    chunksRef.current = []
    bytesRef.current = 0
    rec.ondataavailable = e => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
        bytesRef.current += e.data.size
        if (bytesRef.current > RECORDING_BYTE_CAP) stopRecording()
      }
    }
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      setRecording(false)
      const type = rec.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type })
      chunksRef.current = []
      send(new File([blob], `recording.${extForMime(type)}`, { type }))
    }
    recorderRef.current = rec
    rec.start(1000)
    setRecording(true)
    setSeconds(0)
    const startedAt = Date.now()
    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000)
      setSeconds(s)
      if (s >= MAX_RECORDING_SECONDS) stopRecording()
    }, 250)
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    // .opus של וואטסאפ → .ogg ממופה בשרת (apiFileName)
    if (f) send(f)
  }

  const updateRow = (key: number, patch: Partial<VoiceItem>) => {
    setReview(r => r && {
      ...r,
      rows: r.rows.map(row => {
        if (row.key !== key) return row
        let next: Row = { ...row, ...patch }
        if (patch.productType !== undefined) next = { ...next, fabricType: '', color: '', size: '' }
        return autoFill(next)
      }),
    })
  }

  const save = async () => {
    if (!review) return
    if (review.rows.length === 0) { setError('אין שורות לשמירה'); return }
    const bad = review.rows.findIndex(r => itemProblem(r) !== null)
    if (bad !== -1) {
      setError(`שורה ${bad + 1}: ${itemProblem(review.rows[bad])}`)
      document.getElementById(`voice-row-${review.rows[bad].key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSaving(true)
    setError('')
    try {
      const items: VoiceItem[] = review.rows.map(({ productType, fabricType, color, size, quantity }) => ({ productType, fabricType, color, size, quantity }))
      await onSave(review.date, items, review.transcript)
      setReview(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'השמירה נכשלה, נסו שוב')
    } finally {
      setSaving(false)
    }
  }

  // text-base (16px) — מונע זום אוטומטי ב-iOS; py-2.5 → גובה ≥44px למגע
  const fieldCls = (bad: boolean) =>
    `w-full border rounded-lg px-2 py-2.5 text-base bg-white disabled:bg-gray-100 ${bad ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
      <h2 className="font-bold text-lg text-gray-900 mb-1">הזמנה קולית</h2>
      <p className="text-sm text-gray-600 mb-4">הקליטו או העלו הודעה קולית (מוצר, סוג, צבע, מידות וכמויות). אחרי העיבוד בודקים, מתקנים ושומרים.</p>

      {!review && (
        <div className="flex flex-col sm:flex-row gap-3">
          {recording ? (
            <Button onClick={stopRecording} className="bg-red-600 hover:bg-red-700 text-white h-14 text-base flex-1">
              <Square className="w-5 h-5 ml-2" />
              סיים · {fmtTime(seconds)}
              <span className="text-xs opacity-80 mr-2">(עד {MAX_RECORDING_SECONDS / 60} דק׳)</span>
            </Button>
          ) : (
            <Button onClick={startRecording} disabled={busy} className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold h-14 text-base flex-1">
              <Mic className="w-5 h-5 ml-2" />
              הקלט
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || recording}
            className="h-14 text-base flex-1"
          >
            <Upload className="w-5 h-5 ml-2" />
            העלאת קובץ שמע
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.opus,.ogg,.oga,.m4a,.mp3,.webm,.wav,.mp4"
            className="hidden"
            onChange={onFile}
          />
        </div>
      )}

      {busy && (
        <div className="flex items-center gap-2 text-gray-700 mt-4">
          <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
          מתמלל ומזהה פריטים…
        </div>
      )}

      {error && !review && (
        <p className="mt-4 text-red-700 bg-red-50 rounded-xl p-3 text-sm flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {review && (
        <div className="mt-2 space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-1">תמלול</h3>
            <p className="bg-gray-50 rounded-xl p-3 text-sm text-gray-800 whitespace-pre-wrap">{review.transcript || '(ריק)'}</p>
          </div>

          {review.unclear.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
              <h3 className="font-semibold text-sm text-amber-900 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> לא זוהה — להוסיף ידנית אם צריך
              </h3>
              <ul className="text-sm text-amber-900 space-y-1">
                {review.unclear.map((u, i) => (
                  <li key={i}><mark className="bg-amber-200 rounded px-1">״{u.phrase}״</mark>{u.reason ? ` — ${u.reason}` : ''}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            {review.rows.map((row, idx) => {
              const types = typeOptions(row.productType)
              const colors = row.productType ? colorOptions(row.productType, row.fabricType) : []
              const sizes = row.productType ? sizeOptions(row.productType, row.fabricType, row.color) : []
              const issue = itemIssue(row)
              const problem = issue?.message
              const bad = (f: ItemField) => issue?.field === f
              const sizeKnown = !row.size || sizes.some(s => s.id === row.size)
              return (
                <div key={row.key} id={`voice-row-${row.key}`} className={`rounded-xl border p-3 ${problem ? 'border-red-300 bg-red-50/40' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                    <span>שורה {idx + 1}{row.phrase ? ` · ״${row.phrase}״` : ''}</span>
                    <button
                      type="button"
                      onClick={() => setReview(r => r && { ...r, rows: r.rows.filter(x => x.key !== row.key) })}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg"
                      aria-label="מחיקת שורה"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <select className={fieldCls(bad('productType'))} value={row.productType} onChange={e => updateRow(row.key, { productType: e.target.value })} aria-label="מוצר">
                      <option value="">מוצר…</option>
                      {PRODUCT_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select className={fieldCls(bad('fabricType'))} value={row.fabricType} disabled={types.length === 0} onChange={e => updateRow(row.key, { fabricType: e.target.value })} aria-label="סוג">
                      <option value="">{types.length === 0 ? '—' : 'סוג…'}</option>
                      {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <select className={fieldCls(bad('color'))} value={row.color} disabled={!row.productType} onChange={e => updateRow(row.key, { color: e.target.value })} aria-label="צבע">
                      <option value="">צבע…</option>
                      {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className={fieldCls(bad('size'))} value={row.size} disabled={!row.productType} onChange={e => updateRow(row.key, { size: e.target.value })} aria-label="מידה">
                      <option value="">מידה…</option>
                      {!sizeKnown && <option value={row.size}>{sizeLabel(row.size)} (לבדוק)</option>}
                      {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={row.quantity || ''}
                      onChange={e => updateRow(row.key, { quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                      className={fieldCls(bad('quantity'))}
                      aria-label="כמות"
                      placeholder="כמות"
                    />
                  </div>
                  {problem && <p className="text-xs text-red-700 mt-2">{problem}</p>}
                </div>
              )
            })}
            <Button variant="outline" size="sm" onClick={() => setReview(r => r && { ...r, rows: [...r.rows, emptyRow()] })}>
              <Plus className="w-4 h-4 ml-1" /> הוסף שורה
            </Button>
          </div>

          {error && (
            <p role="alert" className="text-red-700 bg-red-50 rounded-xl p-3 text-sm flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              תאריך
              <input
                type="date"
                value={review.date}
                onChange={e => e.target.value && setReview(r => r && { ...r, date: e.target.value })}
                className="border border-gray-300 rounded-lg px-2 py-2.5 text-base"
              />
            </label>
            {review.date !== jerusalemDateKey() && <span className="text-xs text-amber-700">לא היום</span>}
            <div className="flex gap-2 mr-auto">
              <Button variant="ghost" onClick={() => { setReview(null); setError('') }} disabled={saving}>
                <X className="w-4 h-4 ml-1" /> ביטול
              </Button>
              <Button onClick={save} disabled={saving || review.rows.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
                שמור הזמנה
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
