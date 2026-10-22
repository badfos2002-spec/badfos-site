/**
 * שם הקובץ שנשמר בהורדת עיצוב מהאדמין (/api/admin/download-design):
 * "{שם פרטי} {שם משפחה} {שם האזור}" + סיומת אמיתית, למשל "שנהב שמואלי גב.png".
 * - אותו areaName ביותר מפריט אחד בהזמנה → " (פריט N)" (רק כשצריך).
 * - הורדת מקור כשקיים גם קובץ מוגדל → " (מקור)".
 * - אין שם לקוח → "הזמנה <orderNumber> <אזור>".
 * פונקציות טהורות — נבדקות ב-scripts/test-download-name.ts.
 */

const MAX_BASE_CHARS = 120

const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/tiff': 'tif',
  'application/pdf': 'pdf',
}

/** סיומת לפי content-type; אם לא מזוהה — לפי שם הקובץ ב-URL של Storage; ברירת מחדל png. */
export function extFor(contentType: string | null | undefined, url?: string): string {
  const ct = (contentType ?? '').split(';')[0].trim().toLowerCase()
  if (CONTENT_TYPE_EXT[ct]) return CONTENT_TYPE_EXT[ct]
  if (url && url.startsWith('https://')) {
    try {
      // Storage: .../o/designs%2F<session>%2F<file>.png?alt=media
      const path = decodeURIComponent(new URL(url).pathname)
      const m = path.match(/\.([A-Za-z0-9]{2,5})$/)
      if (m) return m[1].toLowerCase()
    } catch {
      /* ignore — fall through */
    }
  }
  return 'png'
}

/** מסיר תווים אסורים בשמות קבצים, תווי בקרה וכיווניות, ומכווץ רווחים. */
export function sanitizeFilenamePart(s: string): string {
  return s
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/[‎‏‪-‮⁦-⁩؜﻿]/g, '')
    .replace(/[/\\:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function capChars(s: string, max: number): string {
  const chars = Array.from(s) // code points — לא חותך זוג surrogate באמצע
  return chars.length > max ? chars.slice(0, max).join('').trim() : s
}

interface OrderLike {
  orderNumber?: string | number
  customer?: { firstName?: string; lastName?: string }
  items?: Array<{ designs?: Array<{ area?: string; areaName?: string }> }>
  upscales?: Record<string, { status?: string; url?: string } | undefined>
}

export interface DownloadNames {
  /** שם מלא בעברית כולל סיומת (ל-filename*) */
  filename: string
  /** חלופת ASCII (ל-filename=) */
  asciiFallback: string
}

export function buildDesignDownloadNames(
  order: OrderLike | undefined,
  orderId: string,
  itemIdx: number,
  area: string,
  variant: 'source' | 'upscale',
  ext: string,
): DownloadNames {
  const designs = order?.items?.[itemIdx]?.designs ?? []
  const design = designs.find((d) => d?.area === area)
  const areaLabel = sanitizeFilenamePart(design?.areaName || area) || area
  const orderNo = String(order?.orderNumber ?? orderId)

  const name = sanitizeFilenamePart(
    `${order?.customer?.firstName ?? ''} ${order?.customer?.lastName ?? ''}`,
  )
  let base = name ? `${name} ${areaLabel}` : `הזמנה ${sanitizeFilenamePart(orderNo)} ${areaLabel}`

  // אותו שם אזור ביותר מפריט אחד → מספר הפריט
  const labelOf = (d: { area?: string; areaName?: string }) =>
    sanitizeFilenamePart(d?.areaName || d?.area || '')
  const duplicated = (order?.items ?? []).some(
    (it, i) => i !== itemIdx && (it?.designs ?? []).some((d) => labelOf(d) === areaLabel),
  )
  const itemSuffix = duplicated ? ` (פריט ${itemIdx + 1})` : ''

  const up = order?.upscales?.[`${itemIdx}_${area}`]
  const hasBoth = variant === 'source' && up?.status === 'done' && !!up?.url
  const variantSuffix = hasBoth ? ' (מקור)' : ''

  const suffix = `${itemSuffix}${variantSuffix}`
  base = capChars(base, MAX_BASE_CHARS - Array.from(suffix).length) + suffix

  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'png'
  const asciiOrder = orderNo.replace(/[^A-Za-z0-9_-]/g, '') || 'design'
  const asciiParts = [`order-${asciiOrder}`, area.replace(/[^A-Za-z0-9_]/g, '')]
  if (duplicated) asciiParts.push(`item${itemIdx + 1}`)
  if (hasBoth) asciiParts.push('source')

  return {
    filename: `${base}.${safeExt}`,
    asciiFallback: `${asciiParts.join('-')}.${safeExt}`,
  }
}

/** Content-Disposition עם חלופת ASCII + RFC 5987 (UTF-8, תומך עברית). */
export function contentDisposition(names: DownloadNames): string {
  const encoded = encodeURIComponent(names.filename).replace(
    /['()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  )
  return `attachment; filename="${names.asciiFallback}"; filename*=UTF-8''${encoded}`
}

/** קריאת השם מ-Content-Disposition בצד הלקוח (filename* קודם). */
export function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null
  const star = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (star) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      /* fall through */
    }
  }
  const plain = header.match(/filename\s*=\s*"([^"]+)"/i)
  return plain ? plain[1] : null
}
