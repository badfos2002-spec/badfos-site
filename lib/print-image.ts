/**
 * Make a customer's artwork small enough for Firebase Storage WITHOUT taking it
 * below print quality.
 *
 * WHY THIS EXISTS
 * `storage.rules` caps writes under `designs/`, and Firebase reports a rules
 * denial as `storage/unauthorized` — so it reads like an auth bug. A customer
 * whose 20MB phone photo or exported PNG was rejected saw a generic
 * "העלאת קובץ העיצוב נכשלה" and left; the owner never heard about it. The cap
 * is now 30MB (was 15MB) and everything under it is uploaded byte-for-byte —
 * only a file that still does not fit is touched at all.
 *
 * SCOPE — PRINT MASTERS
 * These are the files the owner physically prints from (app/designer/* → cart →
 * orders → /api/admin/download-design). Quality is not negotiable here the way
 * it is for the sketch maker, whose files are only ever *displayed*. The
 * sibling profile in lib/sketch-image.ts is ILLUSTRATION quality — 1600px,
 * JPEG 0.85. Never route a design through it: 1600px across a 30cm garment
 * print is ~135 DPI, i.e. visibly soft on the garment.
 *
 * THE PRINT FLOOR — WHERE 4000px COMES FROM
 * A shirt print is ~30cm wide = 30 / 2.54 = 11.81". The print standard is
 * 300 DPI, which needs 11.81 × 300 ≈ 3543px on the longest edge. The ladder
 * therefore stops at 4000px — 4000 / 11.81 ≈ 339 DPI at a 30cm width, ~13%
 * of headroom over the standard. A file that still cannot reach the cap by
 * 4000px is REFUSED with a Hebrew message rather than silently printed soft.
 *
 * TRANSPARENCY IS LOAD-BEARING
 * Logos are routinely transparent cut-outs. Re-encoding one to JPEG paints a
 * solid rectangle behind the artwork and the owner prints that rectangle. So
 * the output format is decided by the PIXELS about to be encoded — never by the
 * file extension, because a .png is very often fully opaque.
 */

import { CONTACT_INFO } from './constants'
import { dataUrlToBlob } from './storage'
import { failImageFit, fitImageToBytes, imageFitInfo, mb, type ImageFitProfile } from './image-fit'

/** Mirrors storage.rules: `allow create: if request.resource.size < 30 * 1024 * 1024`. */
const RULE_LIMIT_BYTES = 30 * 1024 * 1024

/**
 * The largest file the rule accepts (`size < LIMIT`), so every upload the rule
 * would have taken is passed through untouched — a print master is never
 * re-encoded just for being close to the line.
 */
const PASSTHROUGH_BYTES = RULE_LIMIT_BYTES - 1

/**
 * What an oversized file must be squeezed under. 4MB of headroom below the rule
 * so an encode landing just over the line cannot turn into a hard 403 the
 * customer has no way to act on.
 */
const TARGET_BYTES = 26 * 1024 * 1024

/** ~339 DPI at a 30cm print width. See the header for the arithmetic. */
const PRINT_FLOOR_PX = 4000

/**
 * Longest edge, largest first. The native size is tried first (see the profile
 * below), so these rungs only exist for artwork that genuinely cannot be
 * re-encoded down at full resolution.
 */
const EDGE_LADDER = [6000, 5000, 4500, PRINT_FLOOR_PX]

/**
 * Tried in order on the opaque path. Both are print-grade: resolution is given
 * up before quality drops any further, because JPEG mush is more visible on a
 * garment than a smaller-but-clean image.
 */
const JPEG_QUALITIES = [0.95, 0.9]

/**
 * Past this we refuse without decoding: at ~4 bytes per pixel a file this big
 * is a several-hundred-MB canvas allocation and a dead tab on a phone. (This
 * generalises the 100MB guard the sweatshirt designer already had to all
 * designers.)
 */
const MAX_DECODE_BYTES = 100 * 1024 * 1024

const PRINT_PROFILE: ImageFitProfile = {
  passthroughBytes: PASSTHROUGH_BYTES,
  targetBytes: TARGET_BYTES,
  edgeLadder: EDGE_LADDER,
  jpegQualities: JPEG_QUALITIES,
  // A 40MB PNG of a 5000px logo is usually just badly compressed, not too big:
  // re-encoding it at its own resolution keeps every pixel the owner prints.
  startAtNativeSize: true,
}

/**
 * Return a file that is safe to hand to `uploadDesignFile`.
 *
 * Anything the storage rule would have accepted comes back as the SAME File —
 * byte-identical, no decode, no re-encode. Only a file over the cap is reduced,
 * and never below the print floor.
 */
export async function preparePrintFile(file: File): Promise<File> {
  if (file.type.startsWith('image/') && file.size > MAX_DECODE_BYTES) {
    failImageFit('too_large', file.name, file.size)
  }
  return fitImageToBytes(file, PRINT_PROFILE)
}

/**
 * Same guarantee for the checkout path, where the design is carried as a data:
 * URL in the cart rather than as a File. Anything that is not a data: URL (an
 * https Storage URL a designer already uploaded, which therefore already passed
 * the cap) is not ours to measure and is rejected by the caller instead.
 */
export async function preparePrintDataUrl(dataUrl: string, fileName: string): Promise<File> {
  const blob = dataUrlToBlob(dataUrl)
  return preparePrintFile(new File([blob], fileName, { type: blob.type }))
}

/**
 * Did this error come from preparing or uploading a design file? Lets a broad
 * checkout catch tell a refused design apart from an unrelated failure and pick
 * the Hebrew accordingly, instead of alerting Firebase's English.
 */
export function isDesignUploadError(err: unknown): boolean {
  if (imageFitInfo(err).reason) return true
  const code = (err as { code?: string } | null)?.code
  return typeof code === 'string' && code.startsWith('storage/')
}

/**
 * The Hebrew a CUSTOMER sees. Both failure families live here so no designer
 * can drift back into a generic message: our own reasons above, and the
 * Firebase Storage codes that survive a reduction.
 *
 * Every dead end offers WhatsApp — a customer who cannot upload is a lost
 * order, and the owner would rather receive the file by hand than nothing.
 */
export function printUploadErrorMessage(err: unknown): string {
  const { reason, fileName, bytes } = imageFitInfo(err)
  const name = fileName ? `"${fileName}"` : 'הקובץ'
  const whatsapp = `בוואטסאפ ${CONTACT_INFO.phone}`

  switch (reason) {
    case 'not_image':
      return `${name} אינו קובץ תמונה. יש להעלות קובץ PNG או JPG.`
    case 'undecodable':
      return `לא הצלחנו לפתוח את ${name} — ייתכן שהקובץ פגום או בפורמט שהדפדפן לא קורא. שמרו אותו כ-PNG או JPG ונסו שוב, או שלחו לנו אותו ${whatsapp} ונטפל בזה בשבילכם.`
    case 'too_large':
      return `${name} גדול מדי (${mb(bytes ?? 0)}MB). לא ניתן להקטין אותו מתחת ל-${mb(RULE_LIMIT_BYTES)}MB בלי לרדת מתחת לרזולוציה הדרושה להדפסה, ואנחנו לא מוכנים לפגוע באיכות ההדפסה שלכם. שמרו את הקובץ מחדש כ-JPG באיכות גבוהה ונסו שוב, או שלחו לנו אותו ${whatsapp} ונטפל בזה בשבילכם.`
  }

  const code = (err as { code?: string } | null)?.code ?? ''
  switch (code) {
    case 'storage/unauthorized':
    case 'storage/unauthenticated':
      // Post-reduction the file is inside the cap, so this is a genuine
      // rules/permissions problem and not size — Firebase reports both with the
      // same code, which is exactly what made the original bug so confusing.
      return `העלאת הקובץ נדחתה על ידי השרת. גודל הקובץ תקין, כך שזו כנראה תקלה זמנית — רעננו את הדף ונסו שוב, ואם זה חוזר שלחו לנו את העיצוב ${whatsapp} ונשלים את ההזמנה.`
    case 'storage/retry-limit-exceeded':
    case 'storage/canceled':
    case 'storage/unknown':
      return `ההעלאה נקטעה — נראה שהחיבור לאינטרנט אינו יציב. בדקו את החיבור ונסו שוב, ואם זה חוזר שלחו לנו את העיצוב ${whatsapp}.`
    case 'storage/quota-exceeded':
      return `לא הצלחנו לשמור את הקובץ כרגע — זו תקלה אצלנו ולא אצלכם. שלחו לנו את העיצוב ${whatsapp} ונשלים את ההזמנה.`
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return `אין חיבור לאינטרנט, ולכן לא ניתן להעלות את הקובץ. התחברו ונסו שוב.`
  }

  return `העלאת קובץ העיצוב נכשלה. נסו שוב בעוד רגע, ואם זה חוזר שלחו לנו את העיצוב ${whatsapp} ונשלים את ההזמנה.`
}
