'use client'

/**
 * ניקוי אחסון — התצוגה של app/api/admin/storage-cleanup.
 *
 * הכלל שמעצב את המסך: **תצוגה מקדימה היא ברירת המחדל, מחיקה היא מעשה נפרד.**
 * הכפתור שנטען עם המסך רק סורק. כדי למחוק צריך לפתוח חלון נפרד, לקרוא כמה
 * קבצים וכמה נפח, ולהקליד ביד את משפט האישור. קליק בודד לא מוחק כלום.
 *
 * גיל המחיקה לא נמצא כאן ואי אפשר לשנות אותו מהמסך — הוא קבוע בשרת
 * (lib/storage-cleanup.ts, ORPHAN_MIN_AGE_DAYS).
 */

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  HardDrive,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { auth } from '@/lib/firebase'
import { formatBytes, type CleanupMode } from '@/lib/storage-cleanup'

const CONFIRM_PHRASE = 'מחק לצמיתות'

interface PrefixGroup {
  prefix: string
  files: number
  bytes: number
  oldestAgeDays: number | null
  matched?: string
  ambiguous?: boolean
  sample: string[]
}

interface AgeBuckets {
  under7d: number
  d7to30: number
  d30to90: number
  d90to180: number
  over180d: number
  unknown: number
}

interface PreviewPayload {
  mode: CleanupMode
  planToken: string
  scan: { docsScanned: number; prefixesProtected: number; byCollection: Record<string, number> }
  minAgeDays: number
  scanned: number
  scannedBytes: number
  skipped: Record<string, number>
  ageBuckets: AgeBuckets
  totalFiles: number
  totalBytes: number
  groups: PrefixGroup[]
  candidates: { path: string; sizeBytes: number; ageDays: number | null }[]
}

interface AuditRow {
  id: string
  at: string | null
  by: string
  action: string
  mode?: string
  filesDeleted?: number
  bytesFreed?: number
  docsDeleted?: number
  collection?: string
  errors: number
}

const MODE_LABEL: Record<CleanupMode, string> = {
  orphans: 'קבצים יתומים',
  'test-junk': 'שאריות בדיקות',
}

async function callApi(body: Record<string, unknown>) {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error('נדרשת התחברות מחדש')
  const res = await fetch('/api/admin/storage-cleanup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.message || messageForStatus(res.status))
  }
  return json
}

function messageForStatus(status: number): string {
  if (status === 401 || status === 403) return 'אין הרשאה — יש להתחבר מחדש'
  if (status === 409) return 'התמונה השתנתה — יש לסרוק מחדש'
  return 'הפעולה נכשלה. אפשר לנסות שוב בעוד רגע.'
}

export default function StorageCleanupPanel() {
  const [mode, setMode] = useState<CleanupMode>('orphans')
  const [data, setData] = useState<PreviewPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [outcome, setOutcome] = useState<string | null>(null)
  const [log, setLog] = useState<AuditRow[]>([])

  const loadLog = useCallback(async () => {
    try {
      const json = await callApi({ action: 'log' })
      setLog(json.entries || [])
    } catch {
      /* היומן הוא נתון משני — כישלון בקריאתו לא מפיל את המסך */
    }
  }, [])

  const preview = useCallback(
    async (nextMode: CleanupMode) => {
      setLoading(true)
      setError(null)
      setOutcome(null)
      setData(null)
      setSelected(new Set())
      try {
        const json = (await callApi({ action: 'preview', mode: nextMode })) as PreviewPayload
        setData(json)
        // ברירת המחדל לבחירה: הכל ביתומים, ורק התבניות החד-משמעיות בשאריות
        // הבדיקות. תבנית ששמה זהה לשמות שהאתר החי מייצר ללקוחות אמיתיים
        // נשארת לא מסומנת עד שאדם מסמן אותה בעצמו.
        const auto = new Set<string>()
        for (const g of json.groups) {
          if (nextMode === 'orphans' || !g.ambiguous) auto.add(g.prefix)
        }
        setSelected(auto)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'הסריקה נכשלה')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    void loadLog()
  }, [loadLog])

  const switchMode = (next: CleanupMode) => {
    setMode(next)
    setData(null)
    setSelected(new Set())
    setOutcome(null)
    setError(null)
  }

  const toggleGroup = (prefix: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(prefix) ? next.delete(prefix) : next.add(prefix)
      return next
    })

  const selectedPaths = data
    ? data.candidates.filter((c) => {
        const prefix = c.path.slice(0, c.path.lastIndexOf('/') + 1)
        return selected.has(prefix)
      })
    : []
  const selectedBytes = selectedPaths.reduce((sum, c) => sum + c.sizeBytes, 0)

  const handleDelete = async () => {
    if (!data || confirmText !== CONFIRM_PHRASE) return
    setDeleting(true)
    setError(null)
    try {
      const json = await callApi({
        action: 'delete',
        mode: data.mode,
        planToken: data.planToken,
        paths: selectedPaths.map((c) => c.path),
        confirm: CONFIRM_PHRASE,
      })
      setOutcome(
        `נמחקו ${json.deleted} קבצים · שוחררו ${formatBytes(json.bytesFreed)}` +
          (json.rejected?.length ? ` · ${json.rejected.length} נדחו ולא נמחקו` : '') +
          (json.errors ? ` · ${json.errors} שגיאות` : '') +
          (json.logged === false ? ' · רישום ביומן נכשל' : '')
      )
      setConfirmOpen(false)
      setConfirmText('')
      setData(null)
      setSelected(new Set())
      void loadLog()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'המחיקה נכשלה')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div dir="rtl" className="space-y-5">
      {/* ── בורר מצב ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(MODE_LABEL) as CleanupMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-300'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
        <Button
          onClick={() => void preview(mode)}
          disabled={loading}
          className="bg-gray-900 hover:bg-gray-800 text-white mr-auto"
          size="sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin ml-2" />
          ) : (
            <Search className="w-4 h-4 ml-2" />
          )}
          {data ? 'סרוק מחדש' : 'סרוק'}
        </Button>
      </div>

      <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
        {mode === 'orphans' ? (
          <>
            קבצים תחת <code className="text-[11px] bg-gray-100 px-1 rounded">designs/</code> שאף הזמנה,
            סקיצה או עגלה משותפת לא מפנה אליהם, ושעברו יותר מ־90 יום. עגלה פתוחה של לקוח לא נוגעים
            בה: הסף ארוך בהרבה מכל חלון נטישה במערכת, כי העגלה יושבת אצל הלקוח בדפדפן ואי אפשר
            לראות אותה מהשרת.
          </>
        ) : (
          <>
            שאריות מהרצות אימות, לפי רשימת תבניות סגורה בקוד. גם כאן קובץ שמישהו מפנה אליו לא נבחר
            אף פעם.
          </>
        )}
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {outcome && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl p-4 text-sm font-medium">
          {outcome}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-yellow-500" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── מספרים ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat
              icon={<HardDrive className="w-4 h-4" />}
              label="סה״כ באחסון העיצובים"
              value={formatBytes(data.scannedBytes)}
              sub={`${data.scanned.toLocaleString('he-IL')} קבצים`}
            />
            <Stat
              icon={<ShieldCheck className="w-4 h-4 text-green-600" />}
              label="מוגנים מהפניה"
              value={data.skipped.referenced?.toLocaleString('he-IL') ?? '0'}
              sub={`${data.scan.docsScanned.toLocaleString('he-IL')} מסמכים נסרקו`}
            />
            <Stat
              icon={<Trash2 className="w-4 h-4 text-red-600" />}
              label="מועמדים למחיקה"
              value={data.totalFiles.toLocaleString('he-IL')}
              sub={formatBytes(data.totalBytes)}
            />
            <Stat
              icon={<Trash2 className="w-4 h-4" />}
              label="נבחרו כעת"
              value={selectedPaths.length.toLocaleString('he-IL')}
              sub={formatBytes(selectedBytes)}
              highlight
            />
          </div>

          {/* ── פילוח גילאים ───────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              פילוח גילאים — כל הקבצים תחת designs/
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <AgeCell label="עד 7 ימים" value={data.ageBuckets.under7d} />
              <AgeCell label="7–30 ימים" value={data.ageBuckets.d7to30} />
              <AgeCell label="30–90 ימים" value={data.ageBuckets.d30to90} />
              <AgeCell label="90–180 ימים" value={data.ageBuckets.d90to180} />
              <AgeCell label="מעל 180 יום" value={data.ageBuckets.over180d} />
              <AgeCell label="גיל לא ידוע" value={data.ageBuckets.unknown} />
            </div>
            {mode === 'orphans' && (
              <p className="text-[11px] text-gray-500 mt-3">
                רק קבצים מעל {data.minAgeDays} יום נכנסים לרשימה. קובץ שאין לו תאריך יצירה תקין לא
                נבחר אף פעם ({data.skipped['unknown-age'] ?? 0} כאלה).
              </p>
            )}
          </div>

          {/* ── הרשימה ─────────────────────────────────────────────── */}
          {data.groups.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-600">
              אין מה לנקות כרגע.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800">
                {data.groups.length.toLocaleString('he-IL')} תיקיות מועמדות
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
                {data.groups.map((g) => (
                  <label
                    key={g.prefix}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(g.prefix)}
                      onChange={() => toggleGroup(g.prefix)}
                      className="mt-1 w-4 h-4 accent-red-600 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="text-xs text-gray-900 break-all" dir="ltr">
                          {g.prefix}
                        </code>
                        {g.ambiguous && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            שם בתבנית של לקוח אמיתי
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {g.files} קבצים · {formatBytes(g.bytes)}
                        {g.oldestAgeDays !== null && ` · עד ${g.oldestAgeDays} ימים`}
                        {g.matched && ` · תבנית ${g.matched}`}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 break-all" dir="ltr">
                        {g.sample.join(' · ')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedPaths.length > 0 && (
            <Button
              onClick={() => setConfirmOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחק {selectedPaths.length.toLocaleString('he-IL')} קבצים ({formatBytes(selectedBytes)})
            </Button>
          )}
        </>
      )}

      {/* ── אישור מחיקה ────────────────────────────────────────────── */}
      {confirmOpen && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div dir="rtl" className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base">מחיקה לצמיתות</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              עומדים להימחק <strong>{selectedPaths.length.toLocaleString('he-IL')}</strong> קבצים
              בנפח <strong>{formatBytes(selectedBytes)}</strong>. אין שחזור.
            </p>
            {data.groups.some((g) => g.ambiguous && selected.has(g.prefix)) && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 leading-relaxed">
                בבחירה יש תיקיות ששמן בתבנית שהאתר החי מייצר גם ללקוחות אמיתיים. ודא שאתה מזהה
                אותן כהרצות בדיקה שלך.
              </p>
            )}
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">
                להקליד <span className="font-bold">{CONFIRM_PHRASE}</span> כדי לאשר
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirmOpen(false)
                  setConfirmText('')
                }}
                disabled={deleting}
              >
                ביטול
              </Button>
              <Button
                onClick={() => void handleDelete()}
                disabled={deleting || confirmText !== CONFIRM_PHRASE}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                מחק לצמיתות
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── מסמכי בדיקה ב-Firestore ────────────────────────────────── */}
      <TestDocSection onDone={() => void loadLog()} />

      {/* ── יומן ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">יומן מחיקות</h4>
          <button
            onClick={() => void loadLog()}
            className="text-gray-400 hover:text-gray-700"
            aria-label="רענן יומן"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {log.length === 0 ? (
          <p className="px-4 py-5 text-sm text-gray-500">עדיין לא נמחק כלום.</p>
        ) : (
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {log.map((row) => (
              <div key={row.id} className="px-4 py-3 text-xs text-gray-700 flex flex-wrap gap-x-3 gap-y-1">
                <span className="text-gray-500">
                  {row.at ? new Date(row.at).toLocaleString('he-IL') : '—'}
                </span>
                <span className="font-medium">
                  {row.action === 'delete-docs'
                    ? `${row.docsDeleted ?? 0} מסמכים · ${row.collection ?? ''}`
                    : `${row.filesDeleted ?? 0} קבצים · ${formatBytes(row.bytesFreed ?? 0)}`}
                </span>
                {row.mode && <span className="text-gray-500">{MODE_LABEL[row.mode as CleanupMode]}</span>}
                <span className="text-gray-400" dir="ltr">
                  {row.by}
                </span>
                {row.errors > 0 && <span className="text-red-600">{row.errors} שגיאות</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── מחיקת מסמכי בדיקה ב-Firestore ────────────────────────────────────────

/**
 * `shared_designs` ו-`shared_carts` הם admin-delete-only ב-firestore.rules,
 * ולכן אי אפשר למחוק מהם מסמך מהדפדפן. כאן זה נעשה דרך ה-Admin SDK.
 * גם כאן: בודקים קודם מה יש שם, ואז מוחקים במעשה נפרד עם הקלדת אישור.
 */
function TestDocSection({ onDone }: { onDone: () => void }) {
  const [collection, setCollection] = useState<'shared_designs' | 'shared_carts'>('shared_designs')
  const [raw, setRaw] = useState('')
  const [docs, setDocs] = useState<
    { id: string; exists: boolean; storageRefs: number; createdAt: string | null; summary: string }[]
  >([])
  const [busy, setBusy] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const ids = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const run = async (action: 'docs-preview' | 'docs-delete') => {
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const json = await callApi({
        action,
        collection,
        ids,
        ...(action === 'docs-delete' ? { confirm: CONFIRM_PHRASE } : {}),
      })
      if (action === 'docs-preview') {
        setDocs(json.docs || [])
      } else {
        setMsg(
          `נמחקו ${json.deleted.length} מסמכים` +
            (json.missing.length ? ` · ${json.missing.length} לא נמצאו` : '') +
            (json.errors ? ` · ${json.errors} שגיאות` : '')
        )
        setDocs([])
        setRaw('')
        setConfirmText('')
        onDone()
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'הפעולה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const existing = docs.filter((d) => d.exists)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-gray-800">מחיקת מסמכי בדיקה</h4>
        <p className="text-[11px] text-gray-500 mt-0.5">
          מזהי מסמכים מופרדים ברווח או בפסיק. בודקים קודם מה יש שם.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['shared_designs', 'shared_carts'] as const).map((c) => (
          <button
            key={c}
            onClick={() => {
              setCollection(c)
              setDocs([])
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${
              collection === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
            }`}
            dir="ltr"
          >
            {c}
          </button>
        ))}
      </div>

      <Input
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value)
          setDocs([])
        }}
        placeholder="zzz-retention-swept-proof"
        dir="ltr"
        className="text-left text-xs"
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" disabled={busy || ids.length === 0} onClick={() => void run('docs-preview')}>
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin ml-2" />}
          בדוק
        </Button>
      </div>

      {docs.length > 0 && (
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 text-xs">
          {docs.map((d) => (
            <div key={d.id} className="px-3 py-2 flex flex-wrap gap-x-3 gap-y-1">
              <code dir="ltr" className="text-gray-900 break-all">
                {d.id}
              </code>
              {d.exists ? (
                <>
                  <span className="text-gray-500">{d.summary}</span>
                  <span className="text-gray-400">{d.storageRefs} קבצים מקושרים</span>
                  {d.createdAt && (
                    <span className="text-gray-400">{new Date(d.createdAt).toLocaleDateString('he-IL')}</span>
                  )}
                </>
              ) : (
                <span className="text-gray-400">לא קיים</span>
              )}
            </div>
          ))}
        </div>
      )}

      {existing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            className="max-w-[180px] text-xs"
          />
          <Button
            size="sm"
            disabled={busy || confirmText !== CONFIRM_PHRASE}
            onClick={() => void run('docs-delete')}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5 ml-2" />
            מחק {existing.length} מסמכים
          </Button>
        </div>
      )}

      {msg && <p className="text-xs text-green-700 font-medium">{msg}</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  )
}

// ── חלקים קטנים ─────────────────────────────────────────────────────────

function Stat({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-3 sm:p-4 ${
        highlight ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 mb-1">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-base sm:text-xl font-bold text-gray-900 truncate">{value}</div>
      <div className="text-[11px] text-gray-500 truncate">{sub}</div>
    </div>
  )
}

function AgeCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
      <div className="font-bold text-gray-900">{value.toLocaleString('he-IL')}</div>
      <div className="text-gray-500 text-[10px] leading-tight">{label}</div>
    </div>
  )
}
