'use client'

/**
 * TICKET-032 — «📦 זיפ לדפוס (כל הקבצים)» בכרטיס ההזמנה ב-/admin/orders.
 *
 * לחיצה אחת במקום להוריד כל קובץ דפוס בנפרד: מפעילה רטריי הגדלה אחד (אותה
 * קריאה של «🔄 נסה שוב הגדלה»), מחכה שכל ההגדלות ייגמרו — בלי תקרת זמן —
 * מורידה קובץ אחרי קובץ דרך הפרוקסי המאומת, ושומרת זיפ אחד. מה שלא הוגדל
 * נכנס כמקור, עם « (מקור)» בשם.
 *
 * ההזמנה מגיעה חיה מהסנפשוט של העמוד: order.upscales נקרא מה-props בכל רנדר,
 * ולא מתוך סגירה שנשמרה מהלחיצה. היחידים שנתפסים בזמן הלחיצה הם claimedKeys
 * ותצלום ה-upscales שלפני הקריאה — בלעדיהם אי אפשר לדעת מה באמת השתנה.
 *
 * ג׳וב אחד בכל רגע בעמוד: onStart/onEnd מחזיקים את zipOrderId שם, בדיוק כמו
 * downloadingKey. onEnd נקרא פעם אחת לג׳וב (finishJob).
 */

import { useEffect, useRef, useState } from 'react'
import type { Order } from '@/lib/types'
import { adminFetch } from '@/lib/admin-fetch'
import { isManualOrder } from '@/lib/manual-order'
import {
  buildDesignDownloadNames,
  extFor,
  filenameFromContentDisposition,
} from '@/lib/design-download-name'
import {
  buildStoreZip,
  crc32Update,
  designKeys,
  designLabel,
  OrderZipTooLarge,
  pendingCount,
  planZipEntries,
  settledKeys,
  zipEntryName,
  zipFileName,
  type ZipEntryInput,
  type ZipUpscaleLike,
} from '@/lib/order-zip'

/** 'starting' = הרטריי בדרך; מציג את אותה תווית המתנה (אין פה עברית חדשה) */
type Phase = 'idle' | 'starting' | 'waiting' | 'downloading' | 'packing' | 'done'

// אותם נוסחים שבעל העסק מקבל היום מהורדת קובץ בודד ומ«נסה שוב הגדלה»
const SWEPT_ALERT =
  'הקבצים של הזמנה זו נמחקו מהאחסון לפי מדיניות 30 הימים (הזמנות ישנות). ההעלאה המקורית של הלקוח אינה זמינה יותר להורדה.'
const SWEPT_STORAGE_ALERT =
  'קבצי ההזמנה נמחקו ע"י ניקוי חירום של אחסון מלא (תקלה שתוקנה) — ניתן לייצר מחדש את קבצי ההדפסה בכפתור \'נסה שוב הגדלה\'.'
const RETRY_DELETED_ALERT =
  'אי אפשר להגדיל — קבצי העיצוב של ההזמנה הזו נמחקו בניקוי האחסון (הזמנה סגורה), ואין קובץ מקור להגדיל ממנו.'
const DOWNLOAD_FAILED_ALERT = 'ההורדה נכשלה, נסה/י שוב בעוד רגע'

/** כמה זמן «✅ הזיפ נשמר» נשאר על המסך */
const DONE_MS = 4000

type FileOutcome =
  | { kind: 'ok'; res: Response; blob: Blob; crc: number }
  | { kind: 'missing' }
  | { kind: 'swept'; alert: string }
  | { kind: 'failed' }
  | { kind: 'aborted' }

export default function OrderZipButton({
  order,
  active,
  locked,
  onStart,
  onEnd,
  className = '',
}: {
  order: Order
  active: boolean
  locked: boolean
  onStart: () => void
  onEnd: () => void
  className?: string
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState({ i: 0, n: 0 })

  // ההזמנה העדכנית לאפקטים — נכתב בכל רנדר, כך שאף סגירה לא מתיישנת
  const orderRef = useRef(order)
  orderRef.current = order
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const claimedRef = useRef<string[]>([])
  const preUpscalesRef = useRef<Record<string, ZipUpscaleLike | undefined> | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)
  /** false = יש ג׳וב פתוח שעוד לא שוחרר ב-onEnd */
  const endedRef = useRef(true)
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** reactStrictMode מפעיל אפקטים פעמיים בפיתוח — ההורדות ירוצו פעם אחת */
  const runningRef = useRef(false)
  /** התוכנית כפי שנקבעה ברגע המעבר להורדות */
  const planRef = useRef<ReturnType<typeof planZipEntries>>([])

  const keys = designKeys(order)
  const settled = settledKeys(order, claimedRef.current, preUpscalesRef.current).size

  /** onEnd פעם אחת לג׳וב */
  const finishJob = () => {
    if (endedRef.current) return
    endedRef.current = true
    onEndRef.current()
  }

  const backToIdle = () => {
    setPhase('idle')
    finishJob()
  }

  /**
   * המעבר להורדות: התוכנית נקבעת כאן — ברגע הזה, מה-props העדכניים — ולכן
   * גם המונה יודע מיד כמה קבצים יהיו, ולא מציג 0/0 עד הקובץ הראשון.
   */
  const startDownloading = () => {
    planRef.current = planZipEntries(orderRef.current)
    setProgress({ i: 0, n: planRef.current.length })
    setPhase('downloading')
  }

  const cancel = () => {
    abortRef.current?.abort()
    backToIdle()
  }

  // ── ההמתנה: רגע שכל ההגדלות נרגעו — יורדים לקבצים. בלי טיימר ובלי תקרה.
  useEffect(() => {
    if (phase !== 'waiting') return
    if (pendingCount(order, claimedRef.current, preUpscalesRef.current) === 0) startDownloading()
  }, [phase, order, order.upscales])

  // ── העמוד ביטל את הג׳וב מבחוץ (zipOrderId התאפס) — עוצרים.
  //    אחרי 'done' ה-onEnd כבר יצא, ולכן ארבע שניות «הזיפ נשמר» לא נהרגות.
  useEffect(() => {
    if (active || endedRef.current) return
    abortRef.current?.abort()
    backToIdle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // ── פירוק הרכיב (כרטיס ההזמנה נסגר): abort + שחרור הנעילה בעמוד
  useEffect(
    () => () => {
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current)
      if (endedRef.current) return
      abortRef.current?.abort()
      endedRef.current = true
      onEndRef.current()
    },
    [],
  )

  // ── ההורדות: התוכנית נקבעת ברגע הזה, מה-props העדכניים
  useEffect(() => {
    if (phase !== 'downloading' || runningRef.current) return
    runningRef.current = true
    void runJob().finally(() => {
      runningRef.current = false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  /**
   * ניסיון אחד להביא קובץ: הבקשה *וגם* קריאת הגוף. נפילה באמצע הזרימה היא
   * «כשל אחר» בדיוק כמו נפילה של הבקשה, ולכן שתיהן חולקות את אותו תקציב של
   * ניסיון חוזר אחד — ובקובץ של מאות מגה-בייט דווקא הנפילה באמצע שכיחה.
   * כל המקטעים, ה-crc וה-Blob הם מקומיים לניסיון, ולכן ניסיון שנפל לא
   * משאיר אחריו כלום.
   */
  async function requestFile(
    itemIdx: number,
    area: string,
    variant: 'source' | 'upscale',
    signal: AbortSignal,
  ): Promise<FileOutcome> {
    try {
      const res = await adminFetch(
        `/api/admin/download-design?orderId=${encodeURIComponent(order.id)}&itemIdx=${itemIdx}&area=${encodeURIComponent(area)}&variant=${variant}`,
        { signal },
      )
      if (res.ok) {
        const { blob, crc } = await readFile(res)
        return { kind: 'ok', res, blob, crc }
      }
      const data = await res.json().catch(() => ({}))
      if (data?.error === 'file_swept_storage') return { kind: 'swept', alert: SWEPT_STORAGE_ALERT }
      if (data?.error === 'file_swept') return { kind: 'swept', alert: SWEPT_ALERT }
      if (data?.error === 'file_missing') return { kind: 'missing' }
      return { kind: 'failed' }
    } catch {
      return signal.aborted ? { kind: 'aborted' } : { kind: 'failed' }
    }
  }

  /** הבתים נקראים זורמים: ה-crc מתעדכן מקטע־מקטע, והמקטעים נזרקים מיד אחרי
   *  שה-Blob נבנה מהם — הזמנה שלמה יכולה להיות 1–2 ג״ב. */
  async function readFile(res: Response): Promise<{ blob: Blob; crc: number }> {
    // ה-reader מחזיר Uint8Array<ArrayBufferLike>; BlobPart דורש ArrayBuffer
    const chunks: BlobPart[] = []
    let crc = 0
    if (res.body) {
      const reader = res.body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          crc = crc32Update(crc, value)
          chunks.push(value as unknown as BlobPart)
        }
      }
    } else {
      const bytes = new Uint8Array(await res.arrayBuffer())
      crc = crc32Update(crc, bytes)
      chunks.push(bytes)
    }
    const blob = new Blob(chunks)
    chunks.length = 0
    return { blob, crc }
  }

  async function runJob() {
    const signal = abortRef.current?.signal
    if (!signal) return
    const current = orderRef.current
    const plan = planRef.current
    const manual = isManualOrder(current)
    const taken = new Set<string>()
    const entries: ZipEntryInput[] = []
    const fellBackToSource: string[] = []
    const notFound: string[] = []

    try {
      for (let i = 0; i < plan.length; i++) {
        const { itemIdx, area, variant } = plan[i]
        setProgress({ i: i + 1, n: plan.length })

        let outcome = await requestFile(itemIdx, area, variant, signal)
        // כל כשל אחר — ניסיון חוזר אחד מיד, ורק אחד: הבקשה והגוף חולקים את
        // אותו תקציב. ביטול הוא לא כשל, וגם ביטול שנחת בינתיים עוצר כאן.
        if (outcome.kind === 'failed' && !signal.aborted) {
          outcome = await requestFile(itemIdx, area, variant, signal)
        }
        if (signal.aborted || outcome.kind === 'aborted') return
        if (outcome.kind === 'swept') {
          alert(outcome.alert)
          backToIdle()
          return
        }
        if (outcome.kind === 'failed') {
          alert(DOWNLOAD_FAILED_ALERT)
          backToIdle()
          return
        }
        if (outcome.kind === 'missing') {
          notFound.push(designLabel(current, itemIdx, area))
          continue
        }

        const { blob, crc } = outcome
        const base =
          filenameFromContentDisposition(outcome.res.headers.get('content-disposition')) ??
          buildDesignDownloadNames(
            current,
            order.id,
            itemIdx,
            area,
            variant,
            extFor(outcome.res.headers.get('content-type')),
          ).filename
        entries.push({
          name: zipEntryName(base, variant, taken),
          blob,
          crc,
          // מאותם בתים שנאספו — buildStoreZip גוזר כל שדה בכותרות מ-size
          size: blob.size,
        })
        // בהזמנה ידנית אין בכלל הגדלות — המקור הוא קובץ הדפוס, לא נפילה
        if (variant === 'source' && !manual) fellBackToSource.push(designLabel(current, itemIdx, area))
      }

      // בלי הוויתור הזה שני עדכוני המצב (packing ואז done) נופלים באותה
      // משימה, React מאחד אותם לרנדר אחד, ו«🗜️ אורז זיפ…» לא מגיע ל-DOM
      // בכלל — כלומר «ביטול» בזמן האריזה (Q3b) לא היה קיים.
      setPhase('packing')
      await new Promise((r) => setTimeout(r, 0))
      if (signal.aborted) return
      const zip = buildStoreZip(entries)
      if (signal.aborted) return

      const objectUrl = URL.createObjectURL(zip)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = zipFileName(current, order.id)
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)

      if (fellBackToSource.length > 0 || notFound.length > 0) {
        const lines = ['הזיפ נשמר.']
        if (fellBackToSource.length > 0) lines.push(`לא הוגדלו ונכנסו כמקור: ${fellBackToSource.join(', ')}.`)
        if (notFound.length > 0) lines.push(`לא נמצאו קבצים: ${notFound.join(', ')}.`)
        alert(lines.join(' '))
      }

      setPhase('done')
      finishJob()
      doneTimerRef.current = setTimeout(() => setPhase('idle'), DONE_MS)
    } catch (err) {
      if (signal.aborted) return
      alert(err instanceof OrderZipTooLarge ? err.message : DOWNLOAD_FAILED_ALERT)
      backToIdle()
    }
  }

  const start = async () => {
    if (locked || phase !== 'idle') return
    // ניקוי הזמנות סגורות לקח גם את המקורות — אין מה לארוז
    if (order.designsDeleted && order.designsDeletedReason !== 'storage_limit') {
      alert(SWEPT_ALERT)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    endedRef.current = false
    claimedRef.current = []
    preUpscalesRef.current = undefined
    setProgress({ i: 0, n: 0 })
    onStart()

    // הזמנה ידנית לא עוברת הגדלה בכלל — ישר לקבצים
    if (isManualOrder(order)) {
      startDownloading()
      return
    }

    // התצלום נלקח לפני הקריאה: ההשוואה אליו היא מה שמבדיל רשומה חדשה
    // מאותה רשומת failed ישנה שעוד מופיעה בסנפשוט הראשון אחרי הלחיצה
    const pre = order.upscales
    setPhase('starting')
    try {
      const res = await adminFetch('/api/admin/retry-upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
        signal: controller.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (controller.signal.aborted) return
      if (!res.ok) {
        if (data?.error === 'designs_deleted') {
          alert(RETRY_DELETED_ALERT)
          backToIdle()
          return
        }
        // ההזמנה לא שולמה — אין הגדלות ואין למה לחכות, אורזים מקורות
        if (data?.error === 'order_not_paid') {
          startDownloading()
          return
        }
      } else {
        claimedRef.current = Array.isArray(data?.claimedKeys) ? data.claimedKeys : []
      }
      preUpscalesRef.current = pre
      setPhase('waiting')
    } catch {
      // גם כשהרטריי עצמו נפל אפשר לארוז ממה שקיים
      if (controller.signal.aborted) return
      preUpscalesRef.current = pre
      setPhase('waiting')
    }
  }

  if (keys.length === 0) return null

  const busy = phase !== 'idle' && phase !== 'done'
  const label =
    phase === 'idle'
      ? '📦 זיפ לדפוס (כל הקבצים)'
      : phase === 'starting' || phase === 'waiting'
        ? `⏳ ממתין להגדלה ${settled}/${keys.length}`
        : phase === 'downloading'
          ? `⬇️ מוריד קבצים ${progress.i}/${progress.n}`
          : phase === 'packing'
            ? '🗜️ אורז זיפ…'
            : '✅ הזיפ נשמר'

  const btn =
    'inline-flex min-h-[44px] w-full items-center justify-center gap-1 whitespace-normal break-words rounded-lg px-3 text-sm font-semibold sm:w-auto'

  return (
    // הכרטיס שמעל פותח/סוגר את ההזמנה בלחיצה — לחיצה כאן לא מקפלת אותו
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-center ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={start}
        disabled={locked || busy || phase === 'done'}
        className={`${btn} border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60`}
      >
        {label}
      </button>
      {busy && (
        <button
          type="button"
          onClick={cancel}
          className={`${btn} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
        >
          ביטול
        </button>
      )}
    </div>
  )
}
