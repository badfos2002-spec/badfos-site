'use client'

/**
 * "איפה אני עומד" — לוח המצב של כל המערכות בתשלום.
 *
 * המסך מקבל כרטיסים מוכנים מ-/api/admin/system-status וכל תפקידו להציג.
 * כל חישוב יושב בצד השרת ובמודול הטהור, כדי ששני המקומות (המסך והמייל
 * השבועי) יראו את אותם מספרים.
 *
 * הכלל שמנחה את העיצוב: לכל מספר יש תג מקור גלוי. אין על המסך הזה מספר
 * אחד בלי שכתוב לידו מאיפה הוא הגיע.
 */

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/firebase'
import { isAuthorizedConsoleLink } from '@/lib/url-validation'
import { ils, ils1 } from '@/lib/cost-digest'
import {
  PROVENANCE_LABEL,
  PROVENANCE_MEANING,
  STATUS_LABEL,
  needsAttentionCount,
  ilsCard,
  num,
  pct,
  usageRatio,
  type ProviderCard,
  type Provenance,
  type StatusLevel,
  type StatusPayload,
} from '@/lib/system-status'

// ── סגנונות לפי מצב ──────────────────────────────────────────────────────

const PROVENANCE_STYLE: Record<Provenance, string> = {
  live: 'bg-green-50 text-green-700 border-green-200',
  counted: 'bg-blue-50 text-blue-700 border-blue-200',
  manual: 'bg-gray-100 text-gray-600 border-gray-200',
}

const PROVENANCE_DOT: Record<Provenance, string> = {
  live: 'bg-green-500',
  counted: 'bg-blue-500',
  manual: 'bg-gray-400',
}

const STATUS_STYLE: Record<StatusLevel, string> = {
  over: 'bg-red-100 text-red-700',
  approaching: 'bg-amber-100 text-amber-800',
  ok: 'bg-green-100 text-green-700',
  unknown: 'bg-gray-100 text-gray-500',
}

const BAR_STYLE: Record<StatusLevel, string> = {
  over: 'bg-red-500',
  approaching: 'bg-amber-500',
  ok: 'bg-green-500',
  unknown: 'bg-gray-300',
}

/** מסגרת הכרטיס מסמנת דחיפות עוד לפני שקוראים מילה. */
function cardBorder(card: ProviderCard): string {
  if (card.status === 'over') return 'border-red-300 ring-1 ring-red-100'
  if (card.status === 'approaching') return 'border-amber-300 ring-1 ring-amber-100'
  if (card.error) return 'border-orange-200'
  return 'border-gray-200'
}

/** "לפני 3 דקות" — כדי שיהיה ברור עד כמה הנתון טרי. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'עכשיו'
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'ממש עכשיו'
  if (minutes === 1) return 'לפני דקה'
  if (minutes < 60) return `לפני ${minutes} דקות`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return 'לפני שעה'
  if (hours < 24) return `לפני ${hours} שעות`
  return `לפני ${Math.floor(hours / 24)} ימים`
}

// ── רכיבי משנה ───────────────────────────────────────────────────────────

function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  return (
    <span
      title={PROVENANCE_MEANING[provenance]}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${PROVENANCE_STYLE[provenance]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${PROVENANCE_DOT[provenance]}`} />
      {PROVENANCE_LABEL[provenance]}
    </span>
  )
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5">
      <div className="text-xs sm:text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] sm:text-xs text-gray-400 mt-1 leading-snug">{hint}</div>}
    </div>
  )
}

function SystemCard({ card }: { card: ProviderCard }) {
  const ratio = usageRatio(card.usage)
  // הפס נחתך ב-100% ויזואלית, אבל האחוז המוצג הוא האמיתי (יכול לעבור 100).
  const barWidth = ratio === null ? 0 : Math.min(ratio, 1) * 100
  const linkable = card.consoleUrl !== null && isAuthorizedConsoleLink(card.consoleUrl)

  return (
    <div className={`bg-white rounded-2xl shadow-sm border p-4 sm:p-5 flex flex-col gap-3 ${cardBorder(card)}`}>
      {/* שורת תגים */}
      <div className="flex items-center gap-2 flex-wrap">
        <ProvenanceBadge provenance={card.provenance} />
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${STATUS_STYLE[card.status]}`}
        >
          {STATUS_LABEL[card.status]}
        </span>
      </div>

      {/* שם + עלות */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug break-words">{card.name}</h3>
          {card.plan && <div className="text-xs text-gray-500 mt-0.5">מסלול: {card.plan}</div>}
        </div>
        <div className="text-left shrink-0">
          <div className="font-bold text-gray-900 tabular-nums text-sm sm:text-base">
            {card.monthlyIls === null ? '—' : ilsCard(card.monthlyIls)}
          </div>
          <div className="text-[11px] text-gray-400">לחודש</div>
        </div>
      </div>

      {/* שימוש */}
      {card.usage && (
        <div>
          <div className="flex items-baseline justify-between gap-2 text-xs mb-1.5">
            {/*
              dir="ltr" חובה כאן. "11,840 / 10,000" בתוך הקשר RTL מתהפך ויזואלית
              ל-"10,000 / 11,840", כלומר נקרא כאילו נוצלו 10,000 מתוך 11,840 —
              בדיוק הפוך מהמצב האמיתי. זה בדיוק סוג המספר שמשקר שהמסך הזה נבנה
              כדי למנוע, ולכן זוג המספרים מוצג תמיד משמאל לימין.
            */}
            <span dir="ltr" className="text-gray-600 tabular-nums inline-block">
              {num(card.usage.used)}
              {card.usage.quota !== null && <span className="text-gray-400"> / {num(card.usage.quota)}</span>}
            </span>
            <span className="text-gray-400 truncate">{card.usage.unit}</span>
          </div>
          {ratio !== null ? (
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${BAR_STYLE[card.status]}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          ) : (
            /* בלי מכסה ידועה אין פס — פס מלא/ריק היה משדר מידע שאין לנו. */
            <div className="text-[11px] text-gray-400">
              אין מכסה ידועה — אפשר להזין אותה בהגדרות למטה כדי לקבל פס התקדמות
            </div>
          )}
          {ratio !== null && (
            <div className="text-[11px] text-gray-400 mt-1 tabular-nums">{pct(ratio)} מהמכסה</div>
          )}
        </div>
      )}

      {/* הסבר */}
      {card.note && <p className="text-xs text-gray-500 leading-relaxed">{card.note}</p>}

      {/* תקלה במשיכה החיה */}
      {card.error && (
        <div className="flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 rounded-lg p-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="break-words">המשיכה החיה נכשלה: {card.error}. המספר למעלה מגיע ממקור אחר.</span>
        </div>
      )}

      {/* אפשר לשדרג ל"חי" */}
      {card.upgradableEnvVar && (
        <div className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2 leading-relaxed">
          אפשר להפוך את הכרטיס הזה ל<span className="font-medium">חי</span> בהגדרת{' '}
          <code dir="ltr" className="font-mono text-[10px] bg-white border px-1 py-0.5 rounded">
            {card.upgradableEnvVar}
          </code>{' '}
          ב-Vercel.
        </div>
      )}

      {/* קישור החוצה */}
      <div className="mt-auto pt-1">
        {linkable ? (
          <a
            href={card.consoleUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-yellow-700 hover:text-yellow-800 font-medium"
          >
            פתיחת החשבון אצל הספק
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-xs text-gray-400">אין קישור חשבון שמור למערכת הזו</span>
        )}
      </div>
    </div>
  )
}

// ── התצוגה ───────────────────────────────────────────────────────────────
/**
 * הצגה טהורה: מקבלת מטען מוכן ולא יודעת דבר על רשת או אימות. כך אפשר
 * להעמיד את המסך מול כל תרחיש (אפס טוקנים, ספק שנפל, חריגה) בלי לזייף
 * התחברות, וכך גם ברור שאין כאן שום לוגיקה שמייצרת מספרים.
 */
export function StatusView({
  data,
  onRefresh,
  refreshing = false,
}: {
  data: StatusPayload
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const attention = needsAttentionCount(data.cards)

  return (
    <section dir="rtl" className="space-y-4 sm:space-y-6">
      {/* ── כותרת + רענון ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">איפה אני עומד</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            כל המערכות שהעסק משלם עליהן או תלוי בהן, במסך אחד.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] sm:text-xs text-gray-400 whitespace-nowrap">
            עודכן {relativeTime(data.fetchedAt)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="רענון נתונים"
          >
            <RefreshCw className={`w-4 h-4 sm:ml-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">רענון</span>
          </Button>
        </div>
      </div>

      {/* ── סיכומים ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile
          label="סה״כ לחודש"
          value={ils(data.totals.totalMonthlyIls)}
          hint={`${ils(data.totals.fixedMonthlyIls)} מנויים + ${ils(data.totals.variable30dIls)} לפי שימוש`}
        />
        <StatTile
          label="עלות להזמנה"
          value={data.totals.costPerOrder === null ? '—' : ils1(data.totals.costPerOrder)}
          hint={
            data.totals.costPerOrder === null
              ? 'אין הזמנות ב-30 הימים האחרונים'
              : 'סך העלות חלקי הזמנות ששולמו'
          }
        />
        <StatTile
          label="הזמנות ב-30 יום"
          value={num(data.totals.orders30d)}
          hint="שולמו, בייצור, נשלחו או הושלמו"
        />
        <StatTile
          label="דורש תשומת לב"
          value={num(attention)}
          hint={attention === 0 ? 'הכל שקט' : 'מוצג בראש הרשימה'}
        />
      </div>

      {/* ── מקרא ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4">
        <div className="text-xs font-medium text-gray-700 mb-2">מאיפה מגיע כל מספר</div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4">
          {(['live', 'counted', 'manual'] as Provenance[]).map((p) => (
            <div key={p} className="flex items-start gap-2">
              <ProvenanceBadge provenance={p} />
              <span className="text-[11px] text-gray-500 leading-snug">{PROVENANCE_MEANING[p]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── כרטיסים ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {data.cards.map((card) => (
          <SystemCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  )
}

// ── הלוח (טעינה + אימות) ─────────────────────────────────────────────────

export default function SystemStatusBoard() {
  const [data, setData] = useState<StatusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force: boolean) => {
    force ? setRefreshing(true) : setLoading(true)
    setError(null)
    try {
      const token = await auth?.currentUser?.getIdToken()
      if (!token) {
        setError('נדרשת התחברות מחדש כדי לראות את מצב המערכות')
        return
      }
      const res = await fetch(`/api/admin/system-status${force ? '?refresh=1' : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setError('טעינת מצב המערכות נכשלה. אפשר לנסות שוב בעוד רגע.')
        return
      }
      setData((await res.json()) as StatusPayload)
    } catch {
      setError('טעינת מצב המערכות נכשלה. אפשר לנסות שוב בעוד רגע.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

  return (
    <div dir="rtl">
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      )}

      {data && !loading && (
        <StatusView data={data} onRefresh={() => void load(true)} refreshing={refreshing} />
      )}
    </div>
  )
}
