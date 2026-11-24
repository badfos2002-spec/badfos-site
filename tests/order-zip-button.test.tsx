import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { unzipSync } from 'fflate'
import { contentDisposition } from '@/lib/design-download-name'
import type { Order } from '@/lib/types'

// TICKET-032 — «📦 זיפ לדפוס (כל הקבצים)» בכרטיס ההזמנה באדמין: לחיצה אחת
// מפעילה רטריי הגדלה, מחכה שההגדלות ייגמרו, מורידה קובץ־קובץ ושומרת זיפ אחד.
// הרשת חסומה בבדיקות (tests/setup.ts) — adminFetch ממוקה, וה-Response-ים
// אמיתיים (undici) כדי שגם res.body, ה-reader וה-Content-Disposition יבדקו.

const h = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  /** כשמוגדר — buildStoreZip זורק את זה במקום לבנות זיפ */
  zipThrows: null as Error | null,
  /** רץ בתוך buildStoreZip — החלון היחיד שבו הרכיב נמצא בוודאות בפאזת האריזה */
  onBuildZip: null as null | (() => void),
}))

vi.mock('@/lib/admin-fetch', () => ({ adminFetch: h.adminFetch }))

// מעבר דרך המימוש האמיתי, חוץ מהמקרה שבודק את מסלול «גדול מדי» —
// 4 ג״ב אמיתיים לא נבנים בבדיקה.
vi.mock('@/lib/order-zip', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/order-zip')>()
  return {
    ...actual,
    buildStoreZip: (...args: Parameters<typeof actual.buildStoreZip>) => {
      if (h.zipThrows) throw h.zipThrows
      h.onBuildZip?.()
      return actual.buildStoreZip(...args)
    },
  }
})

// crc32 מגיע מהמימוש האמיתי דרך ה-pass-through שלמעלה
import { crc32, OrderZipTooLarge } from '@/lib/order-zip'
import OrderZipButton from '@/components/admin/OrderZipButton'

const ORDER_ID = 'ord1'
const PNG_A = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
const PNG_B = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 250, 251, 252, 253])
/** הניסיון החוזר מגיע בכמה מקטעים — כך ה-crc שלו נבדק על ריצת בתים מלאה */
const RETRY_PARTS = [new Uint8Array([0x89, 0x50, 0x4e, 0x47]), new Uint8Array([11, 22, 33, 44]), new Uint8Array([55])]
const RETRY_WHOLE = new Uint8Array([...RETRY_PARTS[0], ...RETRY_PARTS[1], ...RETRY_PARTS[2]])

const SWEPT_ALERT =
  'הקבצים של הזמנה זו נמחקו מהאחסון לפי מדיניות 30 הימים (הזמנות ישנות). ההעלאה המקורית של הלקוח אינה זמינה יותר להורדה.'
const RETRY_DELETED_ALERT =
  'אי אפשר להגדיל — קבצי העיצוב של ההזמנה הזו נמחקו בניקוי האחסון (הזמנה סגורה), ואין קובץ מקור להגדיל ממנו.'
const DOWNLOAD_FAILED_ALERT = 'ההורדה נכשלה, נסה/י שוב בעוד רגע'

type Up = { status?: string; url?: string; createdAt?: unknown }

function makeOrder(upscales: Record<string, Up> | undefined, extra: Record<string, unknown> = {}): Order {
  return {
    id: ORDER_ID,
    orderNumber: 1592,
    customer: { firstName: 'ישראל', lastName: 'ישראלי' },
    items: [
      {
        designs: [
          { area: 'front_full', areaName: 'קידמי מלא' },
          { area: 'back', areaName: 'גב' },
        ],
      },
    ],
    upscales,
    ...extra,
  } as unknown as Order
}

/** הזמנה עם עיצוב אחד — למסלולים שלא בודקים ריבוי קבצים */
function oneDesignOrder(extra: Record<string, unknown> = {}): Order {
  return {
    id: ORDER_ID,
    orderNumber: 1592,
    customer: { firstName: 'ישראל', lastName: 'ישראלי' },
    items: [{ designs: [{ area: 'back', areaName: 'גב' }] }],
    ...extra,
  } as unknown as Order
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function fileRes(filename: string, bytes: Uint8Array<ArrayBuffer>, status = 200): Response {
  return new Response(bytes, {
    status,
    headers: { 'content-disposition': contentDisposition({ filename, asciiFallback: 'design.png' }) },
  })
}

/** תשובה שהגוף שלה מגיע במקטעים, כמו קובץ אמיתי */
function streamedRes(filename: string, chunks: Uint8Array<ArrayBuffer>[]): Response {
  const body = new ReadableStream({
    start(c) {
      for (const chunk of chunks) c.enqueue(chunk)
      c.close()
    },
  })
  return new Response(body, {
    headers: { 'content-disposition': contentDisposition({ filename, asciiFallback: 'design.png' }) },
  })
}

/**
 * תשובה תקינה (res.ok) שהגוף שלה נקטע באמצע — נפילת רשת בזמן הורדה.
 * ה-pull הוא העיקר: enqueue ואז error מיידי *מוחק* את התור לפי התקן, והקורא
 * לא מקבל בתים בכלל. כאן המקטע הראשון באמת נמסר ורק הקריאה הבאה נדחית, וזה
 * מה שמאפשר למקטע חלקי «לדלוף» אל ניסיון חוזר שלא מאפס את עצמו.
 */
function brokenStreamRes(filename: string, head: Uint8Array<ArrayBuffer>): Response {
  let pulls = 0
  const body = new ReadableStream({
    pull(c) {
      if (pulls++ === 0) c.enqueue(head)
      else c.error(new Error('network glitch mid-stream'))
    },
  })
  return new Response(body, {
    headers: { 'content-disposition': contentDisposition({ filename, asciiFallback: 'design.png' }) },
  })
}

function mockFetch(handlers: {
  retry?: (body: Record<string, unknown>) => Response | Promise<Response>
  download?: (q: URLSearchParams, nth: number) => Response | Promise<Response>
}) {
  let nth = 0
  h.adminFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.startsWith('/api/admin/retry-upscale')) {
      if (!handlers.retry) throw new Error(`unexpected retry-upscale call`)
      return handlers.retry(JSON.parse(String(init?.body ?? '{}')))
    }
    if (url.startsWith('/api/admin/download-design')) {
      if (!handlers.download) throw new Error(`unexpected download-design call`)
      return handlers.download(new URL(url, 'https://badfos.co.il').searchParams, nth++)
    }
    throw new Error(`unexpected url ${url}`)
  })
}

const callsTo = (path: string) => h.adminFetch.mock.calls.filter((c) => String(c[0]).startsWith(path))
const retryCalls = () => callsTo('/api/admin/retry-upscale')
const downloadCalls = () => callsTo('/api/admin/download-design')
const downloadQueries = () =>
  downloadCalls().map((c) => {
    const q = new URL(String(c[0]), 'https://badfos.co.il').searchParams
    return `${q.get('itemIdx')}_${q.get('area')}:${q.get('variant')}`
  })

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const u16 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8)
const u32 = (b: Uint8Array, at: number) =>
  (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0

/**
 * ה-crc של כל רשומה כמו שהוא נכתב בכותרת המקומית בזיפ שנשמר. fflate לא
 * מאמת crc, ולכן רק קריאת הבתים האלה מוכיחה שהרכיב חישב את ה-crc על הבתים
 * הנכונים — crc שגוי היה שותק בכל הבדיקות ונופל אצל בעל העסק.
 */
function localHeaderCrcs(b: Uint8Array): number[] {
  const crcs: number[] = []
  let at = 0
  while (u32(b, at) === 0x04034b50) {
    crcs.push(u32(b, at + 14))
    at += 30 + u16(b, at + 26) + u16(b, at + 28) + u32(b, at + 18)
  }
  return crcs
}

/** ה-Blob של jsdom עשוי לא לחשוף arrayBuffer() — FileReader תמיד עובד שם */
async function bytesOf(blob: Blob): Promise<Uint8Array> {
  const maybe = blob as { arrayBuffer?: () => Promise<ArrayBuffer> }
  if (typeof maybe.arrayBuffer === 'function') return new Uint8Array(await maybe.arrayBuffer())
  return await new Promise<Uint8Array>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(new Uint8Array(fr.result as ArrayBuffer))
    fr.onerror = () => reject(fr.error)
    fr.readAsArrayBuffer(blob)
  })
}

/** כל תווית שהכפתור הציג בפועל, לפי הסדר — כולל כאלה שלא שורדות רנדר אחד */
function recordLabels() {
  const history: string[] = []
  const push = (t?: string | null) => {
    const v = t?.trim()
    if (v && history[history.length - 1] !== v) history.push(v)
  }
  // חובה לקרוא את oldValue ולא רק את ה-DOM החי: כששני רנדרים נופלים לפני
  // שה-callback רץ, המצב האמצעי כבר לא נמצא ב-DOM — והוא בדיוק מה שנבדק כאן
  const mo = new MutationObserver((records) => {
    for (const r of records) if (r.type === 'characterData') push(r.oldValue)
    push(document.body.querySelector('button')?.textContent)
  })
  mo.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    characterDataOldValue: true,
  })
  return history
}

let savedBlobs: Blob[] = []
let savedNames: string[] = []
let alertSpy: ReturnType<typeof vi.spyOn>
const onStart = vi.fn()
const onEnd = vi.fn()

beforeEach(() => {
  h.adminFetch.mockReset()
  h.zipThrows = null
  h.onBuildZip = null
  savedBlobs = []
  savedNames = []
  onStart.mockReset()
  onEnd.mockReset()
  ;(URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn((b: Blob) => {
    savedBlobs.push(b)
    return `blob:zip-${savedBlobs.length}`
  })
  ;(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    savedNames.push(this.download)
  })
  alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderButton(order: Order, props: { locked?: boolean; active?: boolean } = {}) {
  const view = render(
    <OrderZipButton
      order={order}
      active={props.active ?? true}
      locked={props.locked ?? false}
      onStart={onStart}
      onEnd={onEnd}
    />,
  )
  return {
    ...view,
    update: (next: Order) =>
      view.rerender(
        <OrderZipButton
          order={next}
          active={props.active ?? true}
          locked={props.locked ?? false}
          onStart={onStart}
          onEnd={onEnd}
        />,
      ),
  }
}

const zipButton = () => screen.getByRole('button', { name: /זיפ לדפוס/ })
const cancelButton = () => screen.getByRole('button', { name: 'ביטול' })
const clickZip = () => fireEvent.click(zipButton())

describe('OrderZipButton — לפני הלחיצה', () => {
  it('הזמנה בלי עיצובים בכלל — הכפתור לא מוצג', () => {
    renderButton({ id: ORDER_ID, orderNumber: 1, items: [{ designs: [] }] } as unknown as Order)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('locked — ג׳וב של הזמנה אחרת רץ, הכפתור מושבת', () => {
    renderButton(makeOrder(undefined), { locked: true })
    expect(zipButton()).toBeDisabled()
  })

  it('קבצי ההזמנה נמחקו בניקוי הזמנות סגורות — אלרט, ואף קריאה לא יוצאת', async () => {
    mockFetch({})
    renderButton(makeOrder(undefined, { designsDeleted: true }))
    clickZip()
    expect(alertSpy).toHaveBeenCalledWith(SWEPT_ALERT)
    expect(h.adminFetch).not.toHaveBeenCalled()
    expect(onStart).not.toHaveBeenCalled()
    expect(zipButton()).toBeInTheDocument()
  })

  it('designsDeletedReason=closed_order — אותו אלרט, ואף קריאה לא יוצאת', async () => {
    mockFetch({})
    renderButton(makeOrder(undefined, { designsDeleted: true, designsDeletedReason: 'closed_order' }))
    clickZip()
    expect(alertSpy).toHaveBeenCalledWith(SWEPT_ALERT)
    expect(h.adminFetch).not.toHaveBeenCalled()
    expect(onStart).not.toHaveBeenCalled()
  })

  it('designsDeletedReason=storage_limit — כן ממשיכים (ההגדלות משוחזרות)', async () => {
    mockFetch({ retry: () => json({ success: true, claimedKeys: [] }) })
    renderButton(
      makeOrder({ '0_front_full': { status: 'done', url: 'u' }, '0_back': { status: 'done', url: 'u' } }, {
        designsDeleted: true,
        designsDeletedReason: 'storage_limit',
      }),
    )
    clickZip()
    await waitFor(() => expect(retryCalls()).toHaveLength(1))
    expect(alertSpy).not.toHaveBeenCalledWith(SWEPT_ALERT)
  })
})

describe('OrderZipButton — הרטריי שלפני ההמתנה', () => {
  it('קורא פעם אחת עם מזהה ההזמנה', async () => {
    const gate = deferred<Response>()
    mockFetch({ retry: () => gate.promise })
    renderButton(makeOrder({ '0_front_full': { status: 'failed' }, '0_back': { status: 'failed' } }))
    const button = zipButton()
    fireEvent.click(button)
    fireEvent.click(button) // אותו כפתור, כבר מושבת — אין רטריי שני
    await waitFor(() => expect(retryCalls()).toHaveLength(1))
    // בזמן שהרטריי באוויר: תווית ההמתנה, והכפתור מושבת (אין «לחיצה שנייה»)
    expect(screen.getByRole('button', { name: /ממתין להגדלה/ })).toBeDisabled()
    expect(retryCalls()[0][1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(retryCalls()[0][1].body))).toEqual({ orderId: ORDER_ID })
    expect(onStart).toHaveBeenCalledTimes(1)
    await act(async () => {
      gate.resolve(json({ success: true, claimedKeys: [] }))
    })
  })

  it('409 designs_deleted — האלרט של «נסה שוב הגדלה», נשארים לפני הלחיצה', async () => {
    mockFetch({ retry: () => json({ error: 'designs_deleted' }, 409) })
    renderButton(makeOrder({ '0_front_full': { status: 'failed' } }))
    clickZip()
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(RETRY_DELETED_ALERT))
    expect(downloadCalls()).toHaveLength(0)
    expect(zipButton()).toBeInTheDocument()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('400 order_not_paid — מדלגים על ההמתנה ואורזים את המקורות', async () => {
    mockFetch({
      retry: () => json({ error: 'order_not_paid' }, 400),
      download: () => fileRes('ישראל ישראלי גב.png', PNG_A),
    })
    renderButton(oneDesignOrder())
    clickZip()
    await waitFor(() => expect(savedNames).toHaveLength(1))
    expect(downloadQueries()).toEqual(['0_back:source'])
  })

  it('כשל אחר ברטריי — ממתינים בכל זאת ואורזים ממה שיש', async () => {
    mockFetch({
      retry: () => json({ error: 'server_error' }, 500),
      download: () => fileRes('ישראל ישראלי גב.png', PNG_A),
    })
    // כל הרשומות סופיות, ו-claimedKeys ריק → אין למה לחכות
    renderButton(oneDesignOrder({ upscales: { '0_back': { status: 'gave_up' } } }))
    clickZip()
    await waitFor(() => expect(savedNames).toHaveLength(1))
    expect(downloadQueries()).toEqual(['0_back:source'])
  })

  it('הזמנה ידנית — בלי רטריי בכלל, ישר להורדה', async () => {
    mockFetch({ download: () => fileRes('ישראל ישראלי גב.png', PNG_A) })
    renderButton(oneDesignOrder({ source: 'manual' }))
    clickZip()
    await waitFor(() => expect(savedNames).toHaveLength(1))
    expect(retryCalls()).toHaveLength(0)
    // א-סימטריה מכוונת: השם מקבל « (מקור)» לפי Q1, אבל ההודעה שותקת —
    // בהזמנה ידנית אין הגדלות בכלל, המקור הוא קובץ הדפוס ולא נפילה
    expect(Object.keys(unzipSync(await bytesOf(savedBlobs[0])))).toEqual(['ישראל ישראלי גב (מקור).png'])
    expect(alertSpy).not.toHaveBeenCalled()
  })
})

describe('OrderZipButton — ההמתנה להגדלות', () => {
  const claimed = makeOrder({
    '0_front_full': { status: 'failed', createdAt: new Date(1000) },
    '0_back': { status: 'done', url: 'https://s/b.png' },
  })

  it('מציג כמה נרגעו, ולא מוריד כלום כל עוד מפתח שנתבע לא השתנה', async () => {
    mockFetch({ retry: () => json({ success: true, claimedKeys: ['0_front_full'] }) })
    renderButton(claimed)
    clickZip()
    expect(await screen.findByRole('button', { name: /ממתין להגדלה 1\/2/ })).toBeInTheDocument()
    expect(cancelButton()).toBeInTheDocument()
    expect(downloadCalls()).toHaveLength(0)
  })

  it('«ביטול» בזמן ההמתנה — חוזרים לכפתור, בלי הורדות', async () => {
    mockFetch({ retry: () => json({ success: true, claimedKeys: ['0_front_full'] }) })
    renderButton(claimed)
    clickZip()
    await screen.findByRole('button', { name: /ממתין להגדלה/ })
    fireEvent.click(cancelButton())
    expect(zipButton()).toBeInTheDocument()
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(downloadCalls()).toHaveLength(0)
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('פירוק הרכיב בזמן ההמתנה — abort, onEnd פעם אחת, ואפס הורדות', async () => {
    mockFetch({ retry: () => json({ success: true, claimedKeys: ['0_front_full'] }) })
    const view = renderButton(claimed)
    clickZip()
    await screen.findByRole('button', { name: /ממתין להגדלה/ })
    const signal = retryCalls()[0][1].signal as AbortSignal
    expect(signal.aborted).toBe(false)
    view.unmount()
    expect(signal.aborted).toBe(true)
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(downloadCalls()).toHaveLength(0)
  })
})

describe('OrderZipButton — ההורדה והאריזה', () => {
  const beforeClick = makeOrder({
    '0_front_full': { status: 'failed', createdAt: new Date(1000) },
    '0_back': { status: 'done', url: 'https://s/b.png' },
  })
  /** ההגדלה שנתבעה חזרה עם createdAt חדש אבל נכשלה סופית → נכנסת כמקור */
  const afterUpscales = makeOrder({
    '0_front_full': { status: 'gave_up', createdAt: new Date(2000) },
    '0_back': { status: 'done', url: 'https://s/b.png' },
  })

  function twoFiles(claimedKeys: string[] = ['0_front_full']) {
    mockFetch({
      retry: () => json({ success: true, claimedKeys }),
      download: (q) =>
        q.get('area') === 'front_full'
          ? fileRes('ישראל ישראלי קידמי מלא.png', PNG_A)
          : fileRes('ישראל ישראלי גב.png', PNG_B),
    })
  }

  it('מריץ את כל המסלול: המתנה → הורדות → זיפ אחד עם השמות של הפרוקסי', async () => {
    twoFiles()
    const view = renderButton(beforeClick)
    clickZip()
    await screen.findByRole('button', { name: /ממתין להגדלה 1\/2/ })

    view.update(afterUpscales)
    await waitFor(() => expect(savedNames).toHaveLength(1))

    expect(downloadQueries()).toEqual(['0_front_full:source', '0_back:upscale'])
    expect(savedNames[0]).toBe('הזמנה 1592 ישראל ישראלי.zip')
    expect(savedBlobs[0].type).toBe('application/zip')

    const bytes = await bytesOf(savedBlobs[0])
    const out = unzipSync(bytes)
    expect(Object.keys(out)).toEqual(['ישראל ישראלי קידמי מלא (מקור).png', 'ישראל ישראלי גב.png'])
    expect(out['ישראל ישראלי קידמי מלא (מקור).png']).toEqual(PNG_A)
    expect(out['ישראל ישראלי גב.png']).toEqual(PNG_B)
    // ה-crc שהרכיב חישב על הבתים ששהוא הזרים, כמו שנכתב בזיפ
    expect(localHeaderCrcs(bytes)).toEqual([crc32(PNG_A), crc32(PNG_B)])

    expect(alertSpy).toHaveBeenCalledWith('הזיפ נשמר. לא הוגדלו ונכנסו כמקור: קידמי מלא.')
    expect(await screen.findByText(/✅ הזיפ נשמר/)).toBeInTheDocument()
    expect(onEnd).toHaveBeenCalledTimes(1)

    await waitFor(() => expect(zipButton()).toBeInTheDocument(), { timeout: 6000 })
  }, 15_000)

  it('קובץ אחד בכל פעם — השני יוצא רק אחרי שהראשון נגמר', async () => {
    const gates = [deferred<Response>(), deferred<Response>()]
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: (_q, nth) => gates[nth].promise,
    })
    renderButton(afterUpscales)
    clickZip()

    await waitFor(() => expect(downloadCalls()).toHaveLength(1))
    expect(await screen.findByRole('button', { name: /מוריד קבצים 1\/2/ })).toBeInTheDocument()
    await act(async () => {
      gates[0].resolve(fileRes('ישראל ישראלי קידמי מלא.png', PNG_A))
    })
    await waitFor(() => expect(downloadCalls()).toHaveLength(2))
    await act(async () => {
      gates[1].resolve(fileRes('ישראל ישראלי גב.png', PNG_B))
    })
    await waitFor(() => expect(savedNames).toHaveLength(1))
  })

  // קובץ דפוס אמיתי מגיע במאות מקטעים. כאן נבדק שה-crc מצטבר על כולם
  // ברצף הנכון, ולא רק על המקטע הראשון.
  it('גוף שמגיע בכמה מקטעים — ה-crc מחושב על כל הבתים ברצף', async () => {
    const parts = [
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      new Uint8Array([250, 0, 7, 7, 13]),
      new Uint8Array([9]),
    ]
    const whole = new Uint8Array([...parts[0], ...parts[1], ...parts[2]])
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: (q) =>
        q.get('area') === 'front_full'
          ? streamedRes('ישראל ישראלי קידמי מלא.png', parts)
          : fileRes('ישראל ישראלי גב.png', PNG_B),
    })
    renderButton(afterUpscales)
    clickZip()
    await waitFor(() => expect(savedNames).toHaveLength(1))
    const bytes = await bytesOf(savedBlobs[0])
    expect(localHeaderCrcs(bytes)).toEqual([crc32(whole), crc32(PNG_B)])
    expect(unzipSync(bytes)['ישראל ישראלי קידמי מלא (מקור).png']).toEqual(whole)
  })

  // בקובץ דפוס של מאות מגה-בייט נפילה באמצע הזרימה שכיחה יותר מכשל בבקשה
  // עצמה, והיא מפילה בדיוק את ההמתנה הארוכה שהכפתור הזה בא לחסוך. ולכן
  // קריאת הגוף היא חלק מאותה יחידת «ניסיון חוזר אחד» של הבקשה.
  it('הגוף נקטע באמצע — ניסיון חוזר אחד, והזיפ יוצא שלם', async () => {
    let first = true
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: (q) => {
        if (q.get('area') === 'front_full' && first) {
          first = false
          return brokenStreamRes('ישראל ישראלי קידמי מלא.png', new Uint8Array([1, 2, 3]))
        }
        return q.get('area') === 'front_full'
          ? streamedRes('ישראל ישראלי קידמי מלא.png', RETRY_PARTS)
          : fileRes('ישראל ישראלי גב.png', PNG_B)
      },
    })
    const labels = recordLabels()
    renderButton(afterUpscales)
    clickZip()
    await waitFor(() => expect(savedNames).toHaveLength(1))

    expect(downloadQueries()).toEqual(['0_front_full:source', '0_front_full:source', '0_back:upscale'])
    const bytes = await bytesOf(savedBlobs[0])
    const out = unzipSync(bytes)
    // הניסיון השני מתחיל מאפס: אין מקטעים, crc או גודל ששרדו מהניסיון שנפל.
    // ה-crc הוא ההוכחה — fflate לא מאמת אותו, ולכן בתים נכונים לבדם לא מספיקים.
    expect(Object.keys(out)).toEqual(['ישראל ישראלי קידמי מלא (מקור).png', 'ישראל ישראלי גב.png'])
    expect(out['ישראל ישראלי קידמי מלא (מקור).png']).toEqual(RETRY_WHOLE)
    expect(localHeaderCrcs(bytes)).toEqual([crc32(RETRY_WHOLE), crc32(PNG_B)])
    expect(alertSpy).not.toHaveBeenCalledWith(DOWNLOAD_FAILED_ALERT)
    // אותו שלב, לא התקדמות כפולה: אין 2/2 לפני שהקובץ הראשון נגמר, ו-n לא תפח
    expect(labels.filter((l) => /מוריד קבצים/.test(l))).toEqual([
      '⬇️ מוריד קבצים 0/2',
      '⬇️ מוריד קבצים 1/2',
      '⬇️ מוריד קבצים 2/2',
    ])
  })

  // תקציב אחד של ניסיון חוזר לבקשה ולגוף יחד — לא אחד לכל אחד
  it('כשל בבקשה ואז כשל באמצע הגוף — שני ניסיונות בסך הכול ועצירה', async () => {
    let n = 0
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: () => {
        n++
        if (n === 1) return json({ error: 'server_error' }, 500)
        return brokenStreamRes('ישראל ישראלי קידמי מלא.png', new Uint8Array([1, 2, 3]))
      },
    })
    renderButton(afterUpscales)
    clickZip()
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(DOWNLOAD_FAILED_ALERT))
    expect(downloadCalls()).toHaveLength(2)
    expect(savedNames).toHaveLength(0)
  })

  it('«ביטול» באמצע הגוף — הזרימה נדחית ב-AbortError, בלי ניסיון חוזר', async () => {
    let fail!: (e: unknown) => void
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: () =>
        new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(new Uint8Array([1, 2, 3]))
              fail = (e) => c.error(e)
            },
          }),
          { headers: { 'content-disposition': contentDisposition({ filename: 'א.png', asciiFallback: 'a.png' }) } },
        ),
    })
    renderButton(afterUpscales)
    clickZip()
    await screen.findByRole('button', { name: /מוריד קבצים 1\/2/ })
    fireEvent.click(cancelButton())
    await act(async () => {
      fail(new DOMException('The user aborted a request.', 'AbortError'))
    })
    expect(alertSpy).not.toHaveBeenCalled()
    expect(downloadCalls()).toHaveLength(1)
    expect(savedNames).toHaveLength(0)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  // ביטול שנוחת בין הכישלון הראשון לניסיון השני — אסור שהשני ייצא לדרך
  it('ביטול בין שני הניסיונות — אין ניסיון שני', async () => {
    const gate = deferred<unknown>()
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: () =>
        ({
          ok: false,
          status: 500,
          headers: new Headers(),
          json: () => gate.promise,
        }) as unknown as Response,
    })
    renderButton(afterUpscales)
    clickZip()
    await screen.findByRole('button', { name: /מוריד קבצים 1\/2/ })
    fireEvent.click(cancelButton())
    await act(async () => {
      gate.resolve({ error: 'server_error' })
    })
    expect(downloadCalls()).toHaveLength(1)
    expect(alertSpy).not.toHaveBeenCalled()
    expect(savedNames).toHaveLength(0)
  })

  it('410 בניסיון השני — עצירה עם הודעת הניקוי', async () => {
    let n = 0
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: () => (++n === 1 ? json({ error: 'server_error' }, 500) : json({ error: 'file_swept' }, 410)),
    })
    renderButton(afterUpscales)
    clickZip()
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(SWEPT_ALERT))
    expect(downloadCalls()).toHaveLength(2)
    expect(savedNames).toHaveLength(0)
  })

  it('404 בניסיון השני — מדלגים, ממשיכים, והעיצוב מפורט בהודעה', async () => {
    let n = 0
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: (q) => {
        if (q.get('area') !== 'front_full') return fileRes('ישראל ישראלי גב.png', PNG_B)
        return ++n === 1 ? json({ error: 'server_error' }, 500) : json({ error: 'file_missing' }, 404)
      },
    })
    renderButton(afterUpscales)
    clickZip()
    await waitFor(() => expect(savedNames).toHaveLength(1))
    expect(downloadQueries()).toEqual(['0_front_full:source', '0_front_full:source', '0_back:upscale'])
    expect(Object.keys(unzipSync(await bytesOf(savedBlobs[0])))).toEqual(['ישראל ישראלי גב.png'])
    expect(alertSpy).toHaveBeenCalledWith('הזיפ נשמר. לא נמצאו קבצים: קידמי מלא.')
  })

  // Q3(b): «ביטול» זמין בכל הג׳וב — גם באריזה. בלי זה הפאזה לא מגיעה ל-DOM
  // בכלל (שני עדכוני המצב נופלים באותה משימה) והתשובה הסגורה לא ניתנת לממש.
  it('«ביטול» בזמן האריזה — התווית והכפתור קיימים, ואין זיפ', async () => {
    const seen: string[] = []
    h.onBuildZip = () => {
      seen.push(screen.getByRole('button', { name: /אורז זיפ/ }).textContent?.trim() ?? '')
      seen.push(cancelButton().textContent?.trim() ?? '')
      fireEvent.click(cancelButton())
    }
    twoFiles([])
    renderButton(afterUpscales)
    clickZip()
    await waitFor(() => expect(onEnd).toHaveBeenCalledTimes(1))
    expect(seen).toEqual(['🗜️ אורז זיפ…', 'ביטול'])
    expect(savedNames).toHaveLength(0)
    expect(alertSpy).not.toHaveBeenCalled()
    expect(zipButton()).toBeInTheDocument()
  })

  it('הגוף נקטע פעמיים — «ההורדה נכשלה», בלי זיפ', async () => {
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: () => brokenStreamRes('ישראל ישראלי קידמי מלא.png', new Uint8Array([1, 2, 3])),
    })
    renderButton(afterUpscales)
    clickZip()
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(DOWNLOAD_FAILED_ALERT))
    expect(downloadCalls()).toHaveLength(2)
    expect(savedNames).toHaveLength(0)
    expect(zipButton()).toBeInTheDocument()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('404 file_missing בקובץ אחד — השאר נארזים וההודעה מפרטת אותו', async () => {
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: (q) =>
        q.get('area') === 'back'
          ? json({ error: 'file_missing' }, 404)
          : fileRes('ישראל ישראלי קידמי מלא.png', PNG_A),
    })
    renderButton(afterUpscales)
    clickZip()
    await waitFor(() => expect(savedNames).toHaveLength(1))
    const out = unzipSync(await bytesOf(savedBlobs[0]))
    expect(Object.keys(out)).toEqual(['ישראל ישראלי קידמי מלא (מקור).png'])
    expect(alertSpy).toHaveBeenCalledWith(
      'הזיפ נשמר. לא הוגדלו ונכנסו כמקור: קידמי מלא. לא נמצאו קבצים: גב.',
    )
  })

  it('410 file_swept — הג׳וב נעצר עם הודעת הניקוי, בלי זיפ', async () => {
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: () => json({ error: 'file_swept' }, 410),
    })
    renderButton(afterUpscales)
    clickZip()
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(SWEPT_ALERT))
    expect(savedNames).toHaveLength(0)
    expect(downloadCalls()).toHaveLength(1)
    expect(zipButton()).toBeInTheDocument()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('כשל אחר בקובץ — ניסיון חוזר אחד, ואם הצליח הזיפ נשמר', async () => {
    let first = true
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: (q) => {
        if (q.get('area') === 'front_full' && first) {
          first = false
          return json({ error: 'server_error' }, 500)
        }
        return fileRes(`ישראל ישראלי ${q.get('area') === 'back' ? 'גב' : 'קידמי מלא'}.png`, PNG_A)
      },
    })
    renderButton(afterUpscales)
    clickZip()
    await waitFor(() => expect(savedNames).toHaveLength(1))
    expect(downloadQueries()).toEqual([
      '0_front_full:source',
      '0_front_full:source',
      '0_back:upscale',
    ])
    expect(alertSpy).not.toHaveBeenCalledWith(DOWNLOAD_FAILED_ALERT)
  })

  it('כשל אחר בקובץ פעמיים — עוצרים עם «ההורדה נכשלה», בלי זיפ', async () => {
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: () => json({ error: 'server_error' }, 500),
    })
    renderButton(afterUpscales)
    clickZip()
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(DOWNLOAD_FAILED_ALERT))
    expect(downloadCalls()).toHaveLength(2)
    expect(savedNames).toHaveLength(0)
    expect(zipButton()).toBeInTheDocument()
  })

  it('זיפ גדול מדי — ההודעה של OrderZipTooLarge, בלי קובץ', async () => {
    h.zipThrows = new OrderZipTooLarge()
    twoFiles([]) // אין מפתח שנתבע → אין המתנה, ישר להורדות ולאריזה
    renderButton(afterUpscales)
    clickZip()
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('ההזמנה גדולה מדי לקובץ זיפ אחד — הורד/י את הקבצים בודדים'),
    )
    expect(savedNames).toHaveLength(0)
    expect(zipButton()).toBeInTheDocument()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('«ביטול» בזמן ההורדה — abort, בלי זיפ ובלי אלרט', async () => {
    const gate = deferred<Response>()
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: () => gate.promise,
    })
    renderButton(afterUpscales)
    clickZip()
    await screen.findByRole('button', { name: /מוריד קבצים 1\/2/ })
    const signal = downloadCalls()[0][1].signal as AbortSignal
    fireEvent.click(cancelButton())
    expect(signal.aborted).toBe(true)
    expect(zipButton()).toBeInTheDocument()
    await act(async () => {
      gate.resolve(fileRes('ישראל ישראלי קידמי מלא.png', PNG_A))
    })
    expect(savedNames).toHaveLength(0)
    expect(alertSpy).not.toHaveBeenCalled()
    // לא התחיל ניסיון חוזר ולא הקובץ הבא — ביטול הוא לא כשל
    expect(downloadCalls()).toHaveLength(1)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  // המסלול השכיח במציאות: ה-fetch עצמו נדחה ב-AbortError ברגע ה-abort.
  // מימוש שהתייחס אליו ככשל רגיל היה מנסה שוב או מקפיץ אלרט.
  it('«ביטול» שמפיל את ה-fetch ב-AbortError — בשקט, בלי ניסיון חוזר', async () => {
    const gate = deferred<Response>()
    mockFetch({
      retry: () => json({ success: true, claimedKeys: [] }),
      download: () => gate.promise,
    })
    renderButton(afterUpscales)
    clickZip()
    await screen.findByRole('button', { name: /מוריד קבצים 1\/2/ })
    fireEvent.click(cancelButton())
    await act(async () => {
      gate.reject(new DOMException('The user aborted a request.', 'AbortError'))
    })
    expect(alertSpy).not.toHaveBeenCalled()
    expect(downloadCalls()).toHaveLength(1)
    expect(savedNames).toHaveLength(0)
    expect(zipButton()).toBeInTheDocument()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })
})
