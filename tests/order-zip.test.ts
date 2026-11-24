import { describe, it, expect } from 'vitest'
import { unzipSync } from 'fflate'
import {
  buildStoreZip,
  crc32,
  crc32Update,
  designKeys,
  designLabel,
  entryMillis,
  OrderZipTooLarge,
  pendingCount,
  planZipEntries,
  settledKeys,
  zipEntryName,
  zipFileName,
} from '@/lib/order-zip'

// TICKET-032 — «📦 זיפ לדפוס (כל הקבצים)»: כל קבצי הדפוס של הזמנה בזיפ אחד.
// הלוגיקה הטהורה יושבת ב-lib/order-zip.ts (בלי firebase-admin — זה קוד שרץ
// בדפדפן): מה נכנס לזיפ, איך נקרא כל קובץ, מתי ההגדלות «נרגעו» וכתיבת הזיפ
// עצמה ב-STORE. הקורא העצמאי בבדיקות הוא fflate (devDependency בלבד) — קוד
// הייצור כותב את הבתים בעצמו.

type Up = { status?: string; url?: string; createdAt?: unknown }

function order(opts: {
  orderNumber?: number
  customer?: { firstName?: string; lastName?: string }
  items?: Array<Array<{ area: string; areaName?: string }>>
  upscales?: Record<string, Up>
  source?: string
}) {
  return {
    orderNumber: opts.orderNumber,
    customer: opts.customer,
    source: opts.source,
    items: (opts.items ?? []).map((designs) => ({ designs })),
    upscales: opts.upscales,
  }
}

const TWO_ITEMS = [
  [
    { area: 'front_full', areaName: 'קידמי מלא' },
    { area: 'back', areaName: 'גב' },
  ],
  [{ area: 'back', areaName: 'גב' }],
]

/** jsdom's Blob may not expose arrayBuffer() — FileReader always works there. */
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

const u16 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8)
const u32 = (b: Uint8Array, at: number) =>
  (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0

const NOW = new Date('2026-11-25T10:30:00Z')

describe('zipFileName', () => {
  it('«הזמנה {מספר} {שם הלקוח}.zip»', () => {
    expect(
      zipFileName(order({ orderNumber: 1592, customer: { firstName: 'ישראל', lastName: 'ישראלי' } }), 'abc'),
    ).toBe('הזמנה 1592 ישראל ישראלי.zip')
  })

  it('בלי שם לקוח — «הזמנה {מספר}.zip»', () => {
    expect(zipFileName(order({ orderNumber: 1592 }), 'abc')).toBe('הזמנה 1592.zip')
    expect(zipFileName(order({ orderNumber: 1592, customer: { firstName: ' ', lastName: '' } }), 'abc')).toBe(
      'הזמנה 1592.zip',
    )
  })

  it('בלי מספר הזמנה — מזהה המסמך', () => {
    expect(zipFileName(order({}), 'abc123')).toBe('הזמנה abc123.zip')
  })

  it('מנקה תווים אסורים בשם קובץ', () => {
    expect(
      zipFileName(order({ orderNumber: 7, customer: { firstName: 'יש/ראל', lastName: 'א:ב' } }), 'x'),
    ).toBe('הזמנה 7 יש ראל א ב.zip')
  })
})

describe('planZipEntries', () => {
  it('מוגדל רק כשיש done + url, אחרת מקור — בסדר הפריטים והעיצובים', () => {
    expect(
      planZipEntries(
        order({
          items: TWO_ITEMS,
          upscales: {
            '0_front_full': { status: 'done', url: 'https://s/u.png' },
            '0_back': { status: 'done' }, // done בלי url → מקור
            // '1_back' בכלל לא קיים → מקור
          },
        }),
      ),
    ).toEqual([
      { itemIdx: 0, area: 'front_full', variant: 'upscale' },
      { itemIdx: 0, area: 'back', variant: 'source' },
      { itemIdx: 1, area: 'back', variant: 'source' },
    ])
  })

  it('pending / failed / gave_up → מקור', () => {
    const items = [[{ area: 'front_full' }, { area: 'back' }, { area: 'chest_logo' }]]
    expect(
      planZipEntries(
        order({
          items,
          upscales: {
            '0_front_full': { status: 'pending', url: 'https://s/u.png' },
            '0_back': { status: 'failed' },
            '0_chest_logo': { status: 'gave_up' },
          },
        }),
      ).every((e) => e.variant === 'source'),
    ).toBe(true)
  })

  it('הזמנה בלי עיצובים — רשימה ריקה', () => {
    expect(planZipEntries(order({ items: [[]] }))).toEqual([])
  })
})

describe('designKeys', () => {
  it('מפתח לכל עיצוב, בסדר', () => {
    expect(designKeys(order({ items: TWO_ITEMS }))).toEqual(['0_front_full', '0_back', '1_back'])
  })
})

describe('zipEntryName', () => {
  it('מוסיף « (מקור)» לפני הסיומת, פעם אחת', () => {
    expect(zipEntryName('ישראל ישראלי גב.png', 'source', new Set())).toBe('ישראל ישראלי גב (מקור).png')
    expect(zipEntryName('ישראל ישראלי גב (מקור).png', 'source', new Set())).toBe('ישראל ישראלי גב (מקור).png')
  })

  it('לא מוסיף « (מקור)» לקובץ מוגדל', () => {
    expect(zipEntryName('ישראל ישראלי גב.png', 'upscale', new Set())).toBe('ישראל ישראלי גב.png')
  })

  it('שם בלי סיומת', () => {
    expect(zipEntryName('גב', 'source', new Set())).toBe('גב (מקור)')
  })

  it('כפילויות מקבלות « (2)», « (3)»', () => {
    const taken = new Set<string>()
    expect(zipEntryName('גב.png', 'upscale', taken)).toBe('גב.png')
    expect(zipEntryName('גב.png', 'upscale', taken)).toBe('גב (2).png')
    expect(zipEntryName('גב.png', 'upscale', taken)).toBe('גב (3).png')
  })

  it('« (מקור)» ואז מספר הכפילות', () => {
    const taken = new Set<string>()
    expect(zipEntryName('גב.png', 'source', taken)).toBe('גב (מקור).png')
    expect(zipEntryName('גב.png', 'source', taken)).toBe('גב (מקור) (2).png')
  })
})

describe('designLabel', () => {
  it('שם האזור, ועם « (פריט N)» כשאותו אזור חוזר בכמה פריטים', () => {
    const o = order({ items: TWO_ITEMS })
    expect(designLabel(o, 0, 'front_full')).toBe('קידמי מלא')
    expect(designLabel(o, 0, 'back')).toBe('גב (פריט 1)')
    expect(designLabel(o, 1, 'back')).toBe('גב (פריט 2)')
  })

  it('בלי areaName — מזהה האזור', () => {
    expect(designLabel(order({ items: [[{ area: 'back' }]] }), 0, 'back')).toBe('back')
  })
})

describe('entryMillis', () => {
  it('Timestamp / Date / מחרוזת / חסר', () => {
    expect(entryMillis({ toMillis: () => 1700000000000 })).toBe(1700000000000)
    expect(entryMillis(new Date(1700000000000))).toBe(1700000000000)
    expect(entryMillis('2026-11-25T10:30:00.000Z')).toBe(Date.parse('2026-11-25T10:30:00.000Z'))
    expect(entryMillis(undefined)).toBe(null)
    expect(entryMillis('לא תאריך')).toBe(null)
  })
})

describe('settledKeys / pendingCount', () => {
  const items = [[{ area: 'front_full', areaName: 'קידמי מלא' }, { area: 'back', areaName: 'גב' }]]

  it('pending לא נרגע; רשומה חסרה נרגעה', () => {
    const o = order({ items, upscales: { '0_front_full': { status: 'pending' } } })
    expect([...settledKeys(o, [], undefined)]).toEqual(['0_back'])
    expect(pendingCount(o, [], undefined)).toBe(1)
  })

  it('done / failed / gave_up נרגעו כשהמפתח לא נתבע', () => {
    const o = order({
      items,
      upscales: { '0_front_full': { status: 'done', url: 'u' }, '0_back': { status: 'gave_up' } },
    })
    expect(settledKeys(o, [], undefined).size).toBe(2)
    expect(pendingCount(o, [], undefined)).toBe(0)
  })

  it('מפתח נתבע נשאר לא רגוע כל עוד createdAt זהה לזה שלפני הלחיצה', () => {
    const pre = { '0_front_full': { status: 'failed', createdAt: new Date(1000) } }
    const live = order({
      items,
      upscales: { '0_front_full': { status: 'failed', createdAt: new Date(1000) } },
    })
    expect(settledKeys(live, ['0_front_full'], pre).has('0_front_full')).toBe(false)
    expect(pendingCount(live, ['0_front_full'], pre)).toBe(1)
  })

  it('createdAt חדש + סטטוס סופי → נרגע', () => {
    const pre = { '0_front_full': { status: 'failed', createdAt: new Date(1000) } }
    const live = order({
      items,
      upscales: { '0_front_full': { status: 'done', url: 'u', createdAt: { toMillis: () => 2000 } } },
    })
    expect(settledKeys(live, ['0_front_full'], pre).has('0_front_full')).toBe(true)
  })

  it('createdAt חדש אבל pending → עדיין לא רגוע', () => {
    const pre = { '0_front_full': { status: 'failed', createdAt: new Date(1000) } }
    const live = order({
      items,
      upscales: { '0_front_full': { status: 'pending', createdAt: new Date(2000) } },
    })
    expect(settledKeys(live, ['0_front_full'], pre).has('0_front_full')).toBe(false)
  })

  it('מפתח נתבע שהרשומה שלו עוד לא הופיעה בסנפשוט — לא רגוע', () => {
    const live = order({ items, upscales: {} })
    expect(settledKeys(live, ['0_front_full'], {}).has('0_front_full')).toBe(false)
    expect(pendingCount(live, ['0_front_full'], {})).toBe(1)
  })

  it('createdAt כמחרוזת מול Date — השוואה לפי מילישניות', () => {
    const pre = { '0_back': { status: 'failed', createdAt: '2026-11-25T10:00:00.000Z' } }
    const same = order({
      items,
      upscales: { '0_back': { status: 'failed', createdAt: new Date('2026-11-25T10:00:00.000Z') } },
    })
    expect(settledKeys(same, ['0_back'], pre).has('0_back')).toBe(false)
    const changed = order({
      items,
      upscales: { '0_back': { status: 'failed', createdAt: new Date('2026-11-25T10:00:01.000Z') } },
    })
    expect(settledKeys(changed, ['0_back'], pre).has('0_back')).toBe(true)
  })

  it('הזמנה ידנית — הכול רגוע מיד', () => {
    const o = order({ items, source: 'manual', upscales: { '0_front_full': { status: 'pending' } } })
    expect(settledKeys(o, ['0_front_full'], {}).size).toBe(2)
    expect(pendingCount(o, ['0_front_full'], {})).toBe(0)
  })
})

describe('crc32', () => {
  const bytes = (s: string) => new TextEncoder().encode(s)

  it('וקטורים מוכרים', () => {
    expect(crc32(bytes('123456789'))).toBe(0xcbf43926)
    expect(crc32(new Uint8Array(0))).toBe(0)
  })

  it('חישוב מצטבר לפי מקטעים שווה לחישוב בבת אחת', () => {
    const whole = bytes('הזמנה 1592 — עיצוב לדפוס')
    let crc = 0
    for (let i = 0; i < whole.length; i += 7) crc = crc32Update(crc, whole.subarray(i, i + 7))
    expect(crc).toBe(crc32(whole))
  })
})

describe('buildStoreZip', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 250, 255])
  const bin = new Uint8Array(1000)
  for (let i = 0; i < bin.length; i++) bin[i] = (i * 31) % 256

  // Uint8Array<ArrayBuffer> ולא Uint8Array — BlobPart לא מקבל ArrayBufferLike
  function entry(name: string, data: Uint8Array<ArrayBuffer>) {
    return { name, blob: new Blob([data]), crc: crc32(data), size: data.length }
  }

  it('קורא עצמאי (fflate) מקבל את השמות והבתים', async () => {
    const zip = buildStoreZip(
      [entry('ישראל ישראלי גב (מקור).png', png), entry('ישראל ישראלי קידמי מלא.bin', bin)],
      NOW,
    )
    expect(zip.type).toBe('application/zip')
    const out = unzipSync(await bytesOf(zip))
    expect(Object.keys(out)).toEqual(['ישראל ישראלי גב (מקור).png', 'ישראל ישראלי קידמי מלא.bin'])
    expect(out['ישראל ישראלי גב (מקור).png']).toEqual(png)
    expect(out['ישראל ישראלי קידמי מלא.bin']).toEqual(bin)
  })

  it('כותרת מקומית: גרסה 20, דגל ביט 11 (UTF-8), שיטה 0', async () => {
    const b = await bytesOf(buildStoreZip([entry('גב.png', png)], NOW))
    expect(u32(b, 0)).toBe(0x04034b50)
    expect(u16(b, 4)).toBe(20)
    expect(u16(b, 6) & 0x0800).toBe(0x0800)
    expect(u16(b, 8)).toBe(0)
    expect(u32(b, 14)).toBe(crc32(png))
    expect(u32(b, 18)).toBe(png.length) // compressed = uncompressed ב-STORE
    expect(u32(b, 22)).toBe(png.length)
  })

  it('EOCD סופר את הרשומות', async () => {
    const b = await bytesOf(buildStoreZip([entry('a.png', png), entry('b.bin', bin)], NOW))
    const eocd = b.length - 22
    expect(u32(b, eocd)).toBe(0x06054b50)
    expect(u16(b, eocd + 8)).toBe(2)
    expect(u16(b, eocd + 10)).toBe(2)
    // המדריך המרכזי יושב בדיוק אחרי הקבצים
    expect(u32(b, eocd + 12) + u32(b, eocd + 16)).toBe(eocd)
  })

  it('זיפ ריק — תקין וקריא', async () => {
    const b = await bytesOf(buildStoreZip([], NOW))
    expect(b.length).toBe(22)
    expect(u16(b, 10)).toBe(0)
  })

  it('רשומה בודדת מעל 4 ג״ב → OrderZipTooLarge', () => {
    const big = { name: 'big.png', blob: new Blob([png]), crc: 0, size: 4 * 1024 * 1024 * 1024 }
    expect(() => buildStoreZip([big], NOW)).toThrow(OrderZipTooLarge)
  })

  it('סך הזיפ מעל 4 ג״ב → OrderZipTooLarge', () => {
    const half = (size: number, name: string) => ({ name, blob: new Blob([png]), crc: 0, size })
    expect(() =>
      buildStoreZip([half(2_500_000_000, 'a.png'), half(2_000_000_000, 'b.png')], NOW),
    ).toThrow(OrderZipTooLarge)
  })

  it('יותר מ-65,535 רשומות → OrderZipTooLarge, 65,535 עוברות', () => {
    const many = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ name: `${i}.png`, blob: new Blob([]), crc: 0, size: 0 }))
    expect(() => buildStoreZip(many(65_536), NOW)).toThrow(OrderZipTooLarge)
    expect(() => buildStoreZip(many(65_535), NOW)).not.toThrow()
  })

  it('הודעת OrderZipTooLarge היא זו שמוצגת לבעל העסק', () => {
    expect(new OrderZipTooLarge().message).toBe(
      'ההזמנה גדולה מדי לקובץ זיפ אחד — הורד/י את הקבצים בודדים',
    )
  })
})
