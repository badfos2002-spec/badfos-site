'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  COST_SETTINGS_COLLECTION,
  COST_SETTINGS_DOC,
  WEEKS_PER_MONTH,
  isEmailLike,
  parseCostSettings,
} from '@/lib/cost-digest'

interface SubRow {
  name: string
  monthly: string
  active: boolean
}

export default function AdminCostsPage() {
  const [subs, setSubs] = useState<SubRow[]>([])
  const [recipients, setRecipients] = useState<[string, string]>(['', ''])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    getDoc(doc(db, COST_SETTINGS_COLLECTION, COST_SETTINGS_DOC))
      .then((snap) => {
        const parsed = parseCostSettings(snap.exists() ? snap.data() : {})
        setSubs(
          parsed.subscriptions.map((s) => ({
            name: s.name,
            monthly: String(s.monthlyIls),
            active: s.active,
          }))
        )
        setRecipients([parsed.recipients[0] || '', parsed.recipients[1] || ''])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const updateSub = (index: number, patch: Partial<SubRow>) =>
    setSubs((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const addSub = () => setSubs((prev) => [...prev, { name: '', monthly: '', active: true }])
  const removeSub = (index: number) => setSubs((prev) => prev.filter((_, i) => i !== index))

  const updateRecipient = (index: 0 | 1, value: string) =>
    setRecipients((prev) => (index === 0 ? [value, prev[1]] : [prev[0], value]))

  const monthlyTotal = subs
    .filter((s) => s.active)
    .reduce((sum, s) => {
      const n = Number(s.monthly)
      return sum + (Number.isFinite(n) && n > 0 ? n : 0)
    }, 0)

  const handleSave = async () => {
    if (!db) return

    const subscriptions: { name: string; monthlyIls: number; active: boolean }[] = []
    for (const row of subs) {
      const name = row.name.trim()
      if (!name && !row.monthly.trim()) continue // שורה ריקה — פשוט נזרקת
      if (!name) {
        alert('לכל מנוי צריך שם')
        return
      }
      const monthlyIls = Number(row.monthly)
      if (!Number.isFinite(monthlyIls) || monthlyIls < 0) {
        alert(`סכום לא תקין עבור "${name}" — נא להזין מספר`)
        return
      }
      subscriptions.push({ name, monthlyIls, active: row.active })
    }

    const cleanRecipients: string[] = []
    for (const raw of recipients) {
      const value = raw.trim()
      if (!value) continue
      if (!isEmailLike(value)) {
        alert(`כתובת מייל לא תקינה: ${value}`)
        return
      }
      cleanRecipients.push(value.toLowerCase())
    }

    setSaving(true)
    try {
      await setDoc(doc(db, COST_SETTINGS_COLLECTION, COST_SETTINGS_DOC), {
        subscriptions,
        recipients: cleanRecipients,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error(e)
      alert('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">עלויות מערכות</h1>
        <p className="text-gray-600">
          מנויים חודשיים קבועים והנמענים לדוח השבועי. הדוח נשלח בכל יום ראשון בבוקר.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* ── מנויים קבועים ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 space-y-4">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">מנויים חודשיים</h2>
              <p className="text-sm text-gray-500">
                Vercel, ManyChat, Make, דומיין, תקציב גוגל אדס — כל מה שמתחדש כל חודש
              </p>
            </div>

            {subs.length === 0 && (
              <p className="text-sm text-gray-400 py-4">עדיין לא הוזנו מנויים.</p>
            )}

            <div className="space-y-3">
              {subs.map((row, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3">
                  <Input
                    value={row.name}
                    onChange={(e) => updateSub(i, { name: e.target.value })}
                    placeholder="שם המערכת"
                    className="flex-1 min-w-0"
                  />
                  <Input
                    value={row.monthly}
                    onChange={(e) => updateSub(i, { monthly: e.target.value })}
                    placeholder="₪ לחודש"
                    inputMode="decimal"
                    className="w-24 sm:w-32 shrink-0"
                  />
                  <button
                    dir="ltr"
                    type="button"
                    aria-label={row.active ? 'פעיל' : 'לא פעיל'}
                    onClick={() => updateSub(i, { active: !row.active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      row.active ? 'bg-yellow-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        row.active ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label="מחיקה"
                    onClick={() => removeSub(i)}
                    className="text-gray-400 hover:text-red-600 shrink-0 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={addSub} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 ml-2" />
              הוסף מנוי
            </Button>

            <div className="pt-4 border-t text-sm text-gray-600">
              סה"כ חודשי פעיל:{' '}
              <span className="font-bold text-gray-900">₪{Math.round(monthlyTotal).toLocaleString('he-IL')}</span>
              <span className="text-gray-400">
                {' '}
                · חלק שבועי בדוח: ₪{Math.round(monthlyTotal / WEEKS_PER_MONTH).toLocaleString('he-IL')}
              </span>
            </div>
          </div>

          {/* ── נמענים ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 space-y-4">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">נמעני הדוח</h2>
              <p className="text-sm text-gray-500">
                עד שתי כתובות. כל עוד השדות ריקים — הדוח פשוט לא נשלח.
              </p>
            </div>

            <Input
              value={recipients[0]}
              onChange={(e) => updateRecipient(0, e.target.value)}
              placeholder="כתובת מייל ראשונה"
              type="email"
              dir="ltr"
              className="text-left"
            />
            <Input
              value={recipients[1]}
              onChange={(e) => updateRecipient(1, e.target.value)}
              placeholder="כתובת מייל שנייה (אופציונלי)"
              type="email"
              dir="ltr"
              className="text-left"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className={`px-10 text-white ${saved ? 'bg-green-500 hover:bg-green-500' : 'bg-yellow-500 hover:bg-yellow-600'}`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
            {saved ? 'נשמר!' : 'שמור'}
          </Button>
        </div>
      )}
    </div>
  )
}
