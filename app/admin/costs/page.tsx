'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import SystemStatusBoard from '@/components/admin/SystemStatusBoard'
import StorageCleanupPanel from '@/components/admin/StorageCleanupPanel'
import { PROVIDER_REGISTRY, PROVIDER_BY_ID } from '@/lib/system-status'
import {
  COST_SETTINGS_COLLECTION,
  COST_SETTINGS_DOC,
  WEEKS_PER_MONTH,
  isEmailLike,
  parseCostSettings,
  type Subscription,
} from '@/lib/cost-digest'

interface SubRow {
  providerId: string
  name: string
  plan: string
  monthly: string
  quota: string
  active: boolean
}

/** ערך ה-select כשהשורה לא משויכת לאף מערכת מוכרת. */
const UNLINKED = ''

const selectClass =
  'flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 disabled:opacity-50'

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
            providerId: s.providerId || UNLINKED,
            name: s.name,
            plan: s.plan || '',
            monthly: String(s.monthlyIls),
            quota: s.quota === undefined ? '' : String(s.quota),
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

  /**
   * בחירת מערכת מהרשימה קובעת גם את השם — כך הדוח השבועי, שמציג את `name`,
   * ממשיך לקרוא נכון בלי שהבעלים יצטרך להקליד את השם פעמיים.
   */
  const selectProvider = (index: number, providerId: string) =>
    updateSub(index, {
      providerId,
      name: providerId ? PROVIDER_BY_ID[providerId]?.name || '' : '',
    })

  const addSub = () =>
    setSubs((prev) => [
      ...prev,
      { providerId: UNLINKED, name: '', plan: '', monthly: '', quota: '', active: true },
    ])
  const removeSub = (index: number) => setSubs((prev) => prev.filter((_, i) => i !== index))

  const updateRecipient = (index: 0 | 1, value: string) =>
    setRecipients((prev) => (index === 0 ? [value, prev[1]] : [prev[0], value]))

  const monthlyTotal = subs
    .filter((s) => s.active)
    .reduce((sum, s) => {
      const n = Number(s.monthly)
      return sum + (Number.isFinite(n) && n > 0 ? n : 0)
    }, 0)

  /** מערכות שכבר תפוסות בשורה אחרת — כדי לא לשייך שתי שורות לאותו כרטיס. */
  const takenProviderIds = (exceptIndex: number) =>
    new Set(subs.filter((s, i) => i !== exceptIndex && s.providerId).map((s) => s.providerId))

  const handleSave = async () => {
    if (!db) return

    const subscriptions: Subscription[] = []
    for (const row of subs) {
      const name = row.name.trim()
      if (!name && !row.monthly.trim() && !row.providerId) continue // שורה ריקה — נזרקת
      if (!name) {
        alert('לכל מנוי צריך שם, או בחירת מערכת מהרשימה')
        return
      }
      const monthlyIls = Number(row.monthly)
      if (!Number.isFinite(monthlyIls) || monthlyIls < 0) {
        alert(`סכום לא תקין עבור "${name}" — נא להזין מספר`)
        return
      }

      const entry: Subscription = { name, monthlyIls, active: row.active }
      if (row.providerId) entry.providerId = row.providerId
      if (row.plan.trim()) entry.plan = row.plan.trim()

      const quotaRaw = row.quota.trim()
      if (quotaRaw) {
        const quota = Number(quotaRaw)
        if (!Number.isFinite(quota) || quota <= 0) {
          alert(`מכסה לא תקינה עבור "${name}" — נא להזין מספר חיובי`)
          return
        }
        entry.quota = quota
      }

      subscriptions.push(entry)
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
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">עלויות מערכות</h1>
        <p className="text-sm sm:text-base text-gray-600">
          מצב כל המערכות במקום אחד, והמנויים הקבועים שמזינים אותו. הדוח השבועי נשלח בכל יום ראשון בבוקר.
        </p>
      </div>

      {/* ── לוח המצב ────────────────────────────────────────────────────── */}
      <SystemStatusBoard />

      {/* ── ניקוי אחסון ─────────────────────────────────────────────────── */}
      <div className="mt-10 pt-8 border-t border-gray-200">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">ניקוי אחסון</h2>
        <p className="text-xs sm:text-sm text-gray-500 mb-6">
          קבצי עיצוב שכבר אף אחד לא צריך תופסים מכסה ועולים כסף. כאן רואים בדיוק מה יימחק —
          ומוחקים רק אחרי שרואים.
        </p>
        <StorageCleanupPanel />
      </div>

      {/* ── הגדרות ──────────────────────────────────────────────────────── */}
      <div className="mt-10 pt-8 border-t border-gray-200">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">הגדרות</h2>
        <p className="text-xs sm:text-sm text-gray-500 mb-6">
          מה שמוזן כאן מופיע בלוח כ<span className="font-medium">ידני</span> — המקור היחיד לעלות ולמכסה
          של מערכת שאין לה API.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">
            {/* ── מנויים קבועים ───────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg">מנויים חודשיים</h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  שיוך שורה למערכת מהרשימה מצמיד את הסכום לכרטיס שלה בלוח. שורה בלי שיוך מקבלת כרטיס
                  משלה — כלום לא נעלם.
                </p>
              </div>

              {subs.length === 0 && <p className="text-sm text-gray-400 py-4">עדיין לא הוזנו מנויים.</p>}

              <div className="space-y-3">
                {subs.map((row, i) => {
                  const taken = takenProviderIds(i)
                  return (
                    <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <select
                          value={row.providerId}
                          onChange={(e) => selectProvider(i, e.target.value)}
                          className={`${selectClass} flex-1 min-w-0`}
                          aria-label="שיוך למערכת"
                        >
                          <option value={UNLINKED}>מערכת אחרת (ללא שיוך)</option>
                          {PROVIDER_REGISTRY.map((p) => (
                            <option key={p.id} value={p.id} disabled={taken.has(p.id)}>
                              {p.name}
                            </option>
                          ))}
                        </select>
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

                      {/* שם חופשי רק כשאין שיוך — עם שיוך השם נגזר מהמערכת */}
                      {!row.providerId && (
                        <Input
                          value={row.name}
                          onChange={(e) => updateSub(i, { name: e.target.value })}
                          placeholder="שם המערכת"
                        />
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                          value={row.monthly}
                          onChange={(e) => updateSub(i, { monthly: e.target.value })}
                          placeholder="₪ לחודש"
                          inputMode="decimal"
                        />
                        <Input
                          value={row.plan}
                          onChange={(e) => updateSub(i, { plan: e.target.value })}
                          placeholder="מסלול (לא חובה)"
                        />
                        <Input
                          value={row.quota}
                          onChange={(e) => updateSub(i, { quota: e.target.value })}
                          placeholder="מכסה חודשית (לא חובה)"
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <Button type="button" variant="outline" onClick={addSub} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 ml-2" />
                הוסף מנוי
              </Button>

              <div className="pt-4 border-t text-sm text-gray-600">
                סה"כ חודשי פעיל:{' '}
                <span className="font-bold text-gray-900">
                  ₪{Math.round(monthlyTotal).toLocaleString('he-IL')}
                </span>
                <span className="text-gray-400">
                  {' '}
                  · חלק שבועי בדוח: ₪
                  {Math.round(monthlyTotal / WEEKS_PER_MONTH).toLocaleString('he-IL')}
                </span>
              </div>
            </div>

            {/* ── נמענים ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg">נמעני הדוח</h3>
                <p className="text-xs sm:text-sm text-gray-500">
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
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              {saved ? 'נשמר!' : 'שמור'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
