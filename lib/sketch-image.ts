/**
 * Shrink an admin sketch image to something Firebase Storage will accept.
 *
 * WHY THIS EXISTS
 * `storage.rules` caps writes under `designs/`. The sketch maker's "הסר רקע"
 * re-encodes the artwork to a PNG *with an alpha channel*, which clears the cap
 * on perfectly ordinary input (a phone photo alone can too). Firebase reports a
 * rules denial as `storage/unauthorized`, so the failure reads like a
 * permissions bug and the owner just sees "יצירת הסקיצה נכשלה". The cap is a
 * real protection and stays where it is — the file gets smaller instead.
 *
 * SCOPE — ILLUSTRATION ONLY
 * Sketch files land in `shared_designs` and are only ever *shown* (the
 * /share/<id> page and its 3D preview). The files the owner PRINTS from come
 * from the customer designers (app/designer/* → cart → orders) and go through
 * the PRINT profile in lib/print-image.ts, which keeps a 4000px floor.
 * Nothing here may be put in that path: 1600px across a 30cm garment print is
 * ~135 DPI and would degrade a print master.
 *
 * TRANSPARENCY IS LOAD-BEARING
 * Background removal exists precisely to produce a transparent cut-out;
 * re-encoding that to JPEG paints a solid rectangle behind the artwork and
 * prints it on the garment. So the output format is decided by the PIXELS of
 * the canvas we are about to encode — never by the file extension, because a
 * .png is very often fully opaque. `fitImageToBytes` does that for both
 * profiles.
 */

import { fitImageToBytes, imageFitInfo, mb, type ImageFitProfile } from './image-fit'

/**
 * At or below this the file is uploaded byte-for-byte — no decode, no
 * re-encode, no quality loss, and formats canvas cannot round-trip (SVG, GIF)
 * keep working. Deliberately far below the 30MB storage rule: a sketch has no
 * reason to be near it.
 */
const PASSTHROUGH_BYTES = 12 * 1024 * 1024

/**
 * What an oversized file must be squeezed under. A sketch is never worth a
 * retry loop against a hard 403, and the ladder below reaches this on the first
 * rung for anything that is not literal noise.
 */
const TARGET_BYTES = 8 * 1024 * 1024

/**
 * Longest edge, largest first. 1600 is the top rung because that is already
 * 2× the ~800 CSS px the share page ever paints the artwork at, so it is
 * retina-sharp there and well above what the 3D decal samples. Rungs below it
 * exist only for pathological input (incompressible noise), where even a
 * lossless PNG cannot beat width × height × 4.
 */
const EDGE_LADDER = [1600, 1200, 900, 700, 500]

/** Tried in order on the opaque path. 0.85 is visually transparent on artwork. */
const JPEG_QUALITIES = [0.85, 0.7]

const SKETCH_PROFILE: ImageFitProfile = {
  passthroughBytes: PASSTHROUGH_BYTES,
  targetBytes: TARGET_BYTES,
  edgeLadder: EDGE_LADDER,
  jpegQualities: JPEG_QUALITIES,
  // 1600px is already more than the share page can show, so there is nothing to
  // gain from re-encoding a sketch at its native size first.
  startAtNativeSize: false,
}

/**
 * Return a file that is safe to hand to `uploadDesignFile`.
 *
 * Files already small enough come back untouched. Oversized ones are decoded,
 * downscaled and re-encoded — PNG when the pixels carry transparency, JPEG when
 * they do not — walking down `EDGE_LADDER` until the result fits `TARGET_BYTES`.
 */
export async function compressSketchImage(file: File): Promise<File> {
  return fitImageToBytes(file, SKETCH_PROFILE)
}

/**
 * The Hebrew the OWNER sees. Both failure families live here so the page cannot
 * drift into a generic message again: our own reasons above, and the Firebase
 * Storage codes that survive compression.
 */
export function sketchUploadErrorMessage(err: unknown): string {
  const { reason, fileName, bytes } = imageFitInfo(err)
  const name = fileName ? `"${fileName}"` : 'הקובץ'

  switch (reason) {
    case 'not_image':
      return `${name} אינו קובץ תמונה. יש להעלות PNG או JPG.`
    case 'undecodable':
      return `לא הצלחנו לפתוח את ${name} — ייתכן שהקובץ פגום או בפורמט שהדפדפן לא קורא. שמרו אותו כ-PNG או JPG ונסו שוב.`
    case 'too_large':
      return `${name} גדול מדי (${mb(bytes ?? 0)}MB) ולא הצלחנו לדחוס אותו מתחת ל-${mb(TARGET_BYTES)}MB. הקטינו את הקובץ ונסו שוב.`
  }

  const code = (err as { code?: string } | null)?.code ?? ''
  switch (code) {
    case 'storage/unauthorized':
    case 'storage/unauthenticated':
      // Post-compression this is a genuine rules/permissions problem, not size —
      // Firebase reports both with the same code, which is what made the
      // original bug so confusing.
      return 'האחסון דחה את ההעלאה (הרשאות). הקבצים כבר נדחסו, כך שזו כנראה תקלת הרשאות ולא גודל — נסו להתנתק ולהתחבר מחדש, ואם זה חוזר יש לבדוק את כללי ה-Storage.'
    case 'storage/retry-limit-exceeded':
    case 'storage/canceled':
      return 'ההעלאה נקטעה — נראה שהחיבור לאינטרנט אינו יציב. בדקו את החיבור ונסו שוב.'
    case 'storage/quota-exceeded':
      return 'נגמר מקום האחסון ב-Firebase. יש לפנות מקום או לשדרג את החבילה.'
  }

  const detail = err instanceof Error && err.message ? ` (${err.message})` : ''
  return `יצירת הסקיצה נכשלה${detail}. נסו שוב בעוד רגע.`
}
