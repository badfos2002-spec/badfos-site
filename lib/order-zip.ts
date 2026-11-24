/**
 * TICKET-032 — «📦 זיפ לדפוס (כל הקבצים)»: הליבה הטהורה של הזיפ שבעל העסק
 * מוריד מכרטיס ההזמנה באדמין, במקום להוריד כל קובץ דפוס בנפרד.
 *
 * כל מה שכאן רץ בדפדפן — אסור לייבא מכאן lib/upscale-order.ts (הוא מביא איתו
 * firebase-admin לחבילת הלקוח). entryMillis מחזיק את אותה סמנטיקה כמו
 * upscaleEntryMillis שם, בלי התלות.
 *
 * הזיפ נכתב כאן בעצמנו ב-STORE (שיטה 0, בלי דחיסה — PNG/JPEG כבר דחוסים),
 * ובלי שום ספריית זיפ בייצור: הבתים הם כותרת + ה-Blob של הקובץ עצמו, כך
 * שהקבצים (הזמנה יכולה להיות 1–2 ג״ב) לא עוברים דרך זיכרון JS.
 */

import { sanitizeFilenamePart } from '@/lib/design-download-name'
import { isManualOrder } from '@/lib/manual-order'

export interface ZipUpscaleLike {
  status?: string
  url?: string
  createdAt?: unknown
}

/** המינימום שצריך מההזמנה — כך ש-Order האמיתי מתאים בלי המרות. */
export interface ZipOrderLike {
  orderNumber?: string | number
  customer?: { firstName?: string; lastName?: string }
  items?: Array<{ designs?: Array<{ area?: string; areaName?: string }> }>
  upscales?: Record<string, ZipUpscaleLike | undefined>
}

export interface ZipPlanEntry {
  itemIdx: number
  area: string
  variant: 'source' | 'upscale'
}

const SOURCE_SUFFIX = ' (מקור)'

/** סטטוסים שאין מה לחכות להם יותר */
const TERMINAL_STATUSES = ['done', 'failed', 'gave_up']

// ── מה נכנס לזיפ ─────────────────────────────────────────────────────────

/** `${itemIdx}_${area}` לכל עיצוב של כל פריט, בסדר שלהם. */
export function designKeys(order: ZipOrderLike | undefined): string[] {
  const keys: string[] = []
  ;(order?.items ?? []).forEach((item, itemIdx) => {
    ;(item?.designs ?? []).forEach((d) => {
      if (d?.area) keys.push(`${itemIdx}_${d.area}`)
    })
  })
  return keys
}

/** כל עיצוב פעם אחת: הקובץ המוגדל כשהוא באמת קיים, אחרת המקור. */
export function planZipEntries(order: ZipOrderLike | undefined): ZipPlanEntry[] {
  const plan: ZipPlanEntry[] = []
  ;(order?.items ?? []).forEach((item, itemIdx) => {
    ;(item?.designs ?? []).forEach((d) => {
      if (!d?.area) return
      const up = order?.upscales?.[`${itemIdx}_${d.area}`]
      const variant = up?.status === 'done' && !!up?.url ? 'upscale' : 'source'
      plan.push({ itemIdx, area: d.area, variant })
    })
  })
  return plan
}

// ── שמות ─────────────────────────────────────────────────────────────────

/** «הזמנה 1592 ישראל ישראלי.zip»; בלי שם לקוח — «הזמנה 1592.zip». */
export function zipFileName(order: ZipOrderLike | undefined, orderId: string): string {
  const orderNo = sanitizeFilenamePart(String(order?.orderNumber ?? orderId))
  const name = sanitizeFilenamePart(
    `${order?.customer?.firstName ?? ''} ${order?.customer?.lastName ?? ''}`,
  )
  return `הזמנה ${orderNo}${name ? ` ${name}` : ''}.zip`
}

/**
 * שם האזור כמו שהוא מופיע בהודעות לבעל העסק — באותו כלל כפילות של
 * buildDesignDownloadNames, כדי שההודעה ושמות הקבצים בזיפ לא יסתרו.
 */
export function designLabel(order: ZipOrderLike | undefined, itemIdx: number, area: string): string {
  const designs = order?.items?.[itemIdx]?.designs ?? []
  const design = designs.find((d) => d?.area === area)
  const label = sanitizeFilenamePart(design?.areaName || area) || area
  const labelOf = (d: { area?: string; areaName?: string }) =>
    sanitizeFilenamePart(d?.areaName || d?.area || '')
  const duplicated = (order?.items ?? []).some(
    (it, i) => i !== itemIdx && (it?.designs ?? []).some((d) => labelOf(d) === label),
  )
  return duplicated ? `${label} (פריט ${itemIdx + 1})` : label
}

function splitExt(name: string): [string, string] {
  const m = name.match(/^(.*)(\.[A-Za-z0-9]{1,5})$/)
  return m ? [m[1], m[2]] : [name, '']
}

/**
 * השם של רשומה בזיפ: השם שהפרוקסי בנה, « (מקור)» לפני הסיומת כשנכנס המקור
 * (ולא פעמיים — הפרוקסי מוסיף אותו בעצמו כשקיימת גם הגדלה), ואז ייחוד
 * בתוך הזיפ עם « (2)», « (3)». `taken` מתעדכן בשם שנבחר.
 */
export function zipEntryName(
  baseNameFromProxy: string,
  variant: 'source' | 'upscale',
  taken: Set<string>,
): string {
  const [stem, ext] = splitExt(baseNameFromProxy)
  const base = variant === 'source' && !stem.endsWith(SOURCE_SUFFIX) ? stem + SOURCE_SUFFIX : stem
  let name = `${base}${ext}`
  for (let n = 2; taken.has(name); n++) name = `${base} (${n})${ext}`
  taken.add(name)
  return name
}

// ── מתי ההגדלות «נרגעו» ──────────────────────────────────────────────────

/** מילישניות מתוך createdAt שיכול להיות Timestamp / Date / מחרוזת. null = לא ידוע. */
export function entryMillis(v: unknown): number | null {
  if (!v) return null
  const ts = v as { toMillis?: () => number }
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'string' || typeof v === 'number') {
    const ms = new Date(v).getTime()
    return Number.isNaN(ms) ? null : ms
  }
  return null
}

/**
 * המפתחות שאין טעם לחכות להם יותר: הסטטוס סופי (או שאין רשומה בכלל) —
 * ולמפתח שהרטריי תבע מחדש (`claimedKeys`) גם createdAt שונה מזה שלפני
 * הלחיצה. בלי התנאי הזה הסנפשוט הראשון אחרי הלחיצה עוד מראה את ה-failed
 * הישן, והזיפ היה יוצא מוקדם מדי עם מקורות. בהזמנה ידנית אין הגדלות בכלל.
 */
export function settledKeys(
  order: ZipOrderLike | undefined,
  claimedKeys: string[] | undefined,
  preClickUpscales: Record<string, ZipUpscaleLike | undefined> | undefined,
): Set<string> {
  const keys = designKeys(order)
  if (isManualOrder(order)) return new Set(keys)
  const claimed = new Set(claimedKeys ?? [])
  const settled = new Set<string>()
  for (const key of keys) {
    const live = order?.upscales?.[key]
    if (live && !TERMINAL_STATUSES.includes(String(live.status))) continue
    if (claimed.has(key) && entryMillis(live?.createdAt) === entryMillis(preClickUpscales?.[key]?.createdAt)) {
      continue
    }
    settled.add(key)
  }
  return settled
}

export function pendingCount(
  order: ZipOrderLike | undefined,
  claimedKeys: string[] | undefined,
  preClickUpscales: Record<string, ZipUpscaleLike | undefined> | undefined,
): number {
  return designKeys(order).length - settledKeys(order, claimedKeys, preClickUpscales).size
}

// ── הזיפ עצמו ────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

/** crc32 מצטבר — להתחיל מ-0 ולהאכיל מקטע־מקטע כמו שהקובץ זורם. */
export function crc32Update(crc: number, chunk: Uint8Array): number {
  let c = (crc ^ 0xffffffff) >>> 0
  for (let i = 0; i < chunk.length; i++) c = (CRC_TABLE[(c ^ chunk[i]) & 0xff] ^ (c >>> 8)) >>> 0
  return (c ^ 0xffffffff) >>> 0
}

export function crc32(data: Uint8Array): number {
  return crc32Update(0, data)
}

export class OrderZipTooLarge extends Error {
  constructor() {
    super('ההזמנה גדולה מדי לקובץ זיפ אחד — הורד/י את הקבצים בודדים')
    this.name = 'OrderZipTooLarge'
  }
}

export interface ZipEntryInput {
  name: string
  blob: Blob
  crc: number
  /** מספר הבתים שנמדד בהורדה — כל שדה בכותרות נגזר ממנו */
  size: number
}

/** אין ZIP64 — מעל הגבולות האלה אין איך לכתוב את ההיסטים והגדלים */
const ZIP64_LIMIT = 0x100000000 // 4 GiB
const MAX_ENTRIES = 65535

const LOCAL_HEADER = 30
const CENTRAL_HEADER = 46
const EOCD = 22

function dosDateTime(now: Date): { time: number; date: number } {
  const year = Math.max(1980, now.getFullYear())
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const date = ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  return { time, date }
}

export function buildStoreZip(entries: ZipEntryInput[], now: Date = new Date()): Blob {
  if (entries.length > MAX_ENTRIES) throw new OrderZipTooLarge()

  const encoder = new TextEncoder()
  const names = entries.map((e) => encoder.encode(e.name))
  let total = EOCD
  entries.forEach((e, i) => {
    if (e.size >= ZIP64_LIMIT) throw new OrderZipTooLarge()
    total += LOCAL_HEADER + names[i].length + e.size + CENTRAL_HEADER + names[i].length
  })
  if (total >= ZIP64_LIMIT) throw new OrderZipTooLarge()

  const { time, date } = dosDateTime(now)
  const parts: BlobPart[] = []
  // Uint8Array<ArrayBuffer> ולא Uint8Array — BlobPart לא מקבל ArrayBufferLike
  const central: Uint8Array<ArrayBuffer>[] = []
  let offset = 0

  entries.forEach((e, i) => {
    const name = names[i]
    // כל שדה בכותרות נגזר מ-size, בזמן שהבתים עצמם מגיעים מה-Blob — פער
    // ביניהם הוא ארכיון מושחת בשקט, שמתגלה רק אצל המדפיס. רועשים במקום.
    if (e.blob.size !== e.size) throw new Error('zip_size_mismatch')

    const local = new Uint8Array(LOCAL_HEADER + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true) // version needed: 2.0
    lv.setUint16(6, 0x0800, true) // ביט 11 — השמות ב-UTF-8 (עברית)
    lv.setUint16(8, 0, true) // STORE
    lv.setUint16(10, time, true)
    lv.setUint16(12, date, true)
    lv.setUint32(14, e.crc >>> 0, true)
    lv.setUint32(18, e.size, true) // אין data descriptor — הגודל וה-crc ידועים
    lv.setUint32(22, e.size, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, LOCAL_HEADER)
    parts.push(local, e.blob)

    const cd = new Uint8Array(CENTRAL_HEADER + name.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true) // version made by: MS-DOS, 2.0
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, time, true)
    cv.setUint16(14, date, true)
    cv.setUint32(16, e.crc >>> 0, true)
    cv.setUint32(20, e.size, true)
    cv.setUint32(24, e.size, true)
    cv.setUint16(28, name.length, true)
    cv.setUint16(30, 0, true) // extra
    cv.setUint16(32, 0, true) // comment
    cv.setUint16(34, 0, true) // disk
    cv.setUint16(36, 0, true) // internal attrs
    cv.setUint32(38, 0, true) // external attrs
    cv.setUint32(42, offset, true)
    cd.set(name, CENTRAL_HEADER)
    central.push(cd)

    offset += local.length + e.size
  })

  const cdSize = central.reduce((n, c) => n + c.length, 0)
  const eocd = new Uint8Array(EOCD)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  return new Blob([...parts, ...central, eocd], { type: 'application/zip' })
}
