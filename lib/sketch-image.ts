/**
 * Shrink an admin sketch image to something Firebase Storage will accept.
 *
 * WHY THIS EXISTS
 * `storage.rules` caps writes under `designs/` at `request.resource.size <
 * 15 * 1024 * 1024`. The sketch maker's "הסר רקע" re-encodes the artwork to a
 * PNG *with an alpha channel*, which clears 15MB on perfectly ordinary input
 * (a phone photo alone can too). Firebase reports a rules denial as
 * `storage/unauthorized`, so the failure reads like a permissions bug and the
 * owner just sees "יצירת הסקיצה נכשלה". The cap is a real protection and stays
 * where it is — the file gets smaller instead.
 *
 * SCOPE — ILLUSTRATION ONLY
 * Sketch files land in `shared_designs` and are only ever *shown* (the
 * /share/<id> page and its 3D preview). The files the owner PRINTS from come
 * from the customer designers (app/designer/* → cart → orders) and are uploaded
 * untouched by `uploadDesignFile`. Nothing here may be put in that path: it
 * would degrade a print master.
 *
 * TRANSPARENCY IS LOAD-BEARING
 * Background removal exists precisely to produce a transparent cut-out;
 * re-encoding that to JPEG paints a solid rectangle behind the artwork and
 * prints it on the garment. So the output format is decided by the PIXELS of
 * the canvas we are about to encode — never by the file extension, because a
 * .png is very often fully opaque.
 */

/** storage.rules: `allow create: if request.resource.size < 15 * 1024 * 1024`. */
const RULE_LIMIT_BYTES = 15 * 1024 * 1024

/**
 * At or below this the file is uploaded byte-for-byte — no decode, no
 * re-encode, no quality loss, and formats canvas cannot round-trip (SVG, GIF)
 * keep working. 3MB under the rule is margin enough that nothing borderline
 * gets through.
 */
const PASSTHROUGH_BYTES = 12 * 1024 * 1024

/**
 * What an oversized file must be squeezed under. Half the cap: a sketch is
 * never worth a retry loop against a hard 403, and the ladder below reaches
 * this on the first rung for anything that is not literal noise.
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

export type SketchImageFailure = 'not_image' | 'undecodable' | 'too_large'

/** Plain Error + a tag: subclassing Error breaks `instanceof` on ES5 targets. */
interface TaggedError extends Error {
  sketchReason: SketchImageFailure
  sketchFile: string
  sketchBytes: number
}

function fail(reason: SketchImageFailure, fileName: string, bytes: number): never {
  const err = new Error(`sketch image ${reason}: ${fileName} (${bytes} bytes)`) as TaggedError
  err.sketchReason = reason
  err.sketchFile = fileName
  err.sketchBytes = bytes
  throw err
}

const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1)

function encode(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality)
  )
}

/**
 * Is every pixel fully opaque? Asked of the RESIZED canvas — the exact pixels
 * about to be encoded — so the answer is about what JPEG would actually
 * destroy. Downscaling cannot invent opacity: a destination pixel covering any
 * transparent source pixel comes out below 255.
 */
function isFullyOpaque(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return false
  return true
}

/**
 * Return a file that is safe to hand to `uploadDesignFile`.
 *
 * Files already small enough come back untouched. Oversized ones are decoded,
 * downscaled and re-encoded — PNG when the pixels carry transparency, JPEG when
 * they do not — walking down `EDGE_LADDER` until the result fits `TARGET_BYTES`,
 * because the size of an encode is not predictable from its dimensions.
 */
export async function compressSketchImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) fail('not_image', file.name, file.size)
  if (file.size <= PASSTHROUGH_BYTES) return file

  const bmp = await createImageBitmap(file).catch(() => fail('undecodable', file.name, file.size))
  const base = file.name.replace(/\.[^.]+$/, '')
  const srcMax = Math.max(bmp.width, bmp.height)
  // Never upscale, and never encode the same canvas twice for two rungs that
  // both clamp to the source size.
  const edges = EDGE_LADDER.map(e => Math.min(e, srcMax)).filter((e, i, a) => a.indexOf(e) === i)

  try {
    // Decided once, on the most faithful rung, and kept: the format must not
    // flip halfway down the ladder.
    let opaque: boolean | null = null

    for (const edge of edges) {
      const scale = edge / srcMax
      const w = Math.max(1, Math.round(bmp.width * scale))
      const h = Math.max(1, Math.round(bmp.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no canvas 2d context')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bmp, 0, 0, w, h)

      if (opaque === null) opaque = isFullyOpaque(ctx.getImageData(0, 0, w, h).data)

      if (opaque) {
        for (const q of JPEG_QUALITIES) {
          const blob = await encode(canvas, 'image/jpeg', q)
          if (blob.size <= TARGET_BYTES) return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
        }
      } else {
        const blob = await encode(canvas, 'image/png')
        if (blob.size <= TARGET_BYTES) return new File([blob], `${base}.png`, { type: 'image/png' })
      }
    }

    fail('too_large', file.name, file.size)
  } finally {
    bmp.close()
  }
}

/**
 * The Hebrew the owner sees. Both failure families live here so the page cannot
 * drift into a generic message again: our own reasons above, and the Firebase
 * Storage codes that survive compression.
 */
export function sketchUploadErrorMessage(err: unknown): string {
  const tagged = err as Partial<TaggedError> | null
  const name = tagged?.sketchFile ? `"${tagged.sketchFile}"` : 'הקובץ'

  switch (tagged?.sketchReason) {
    case 'not_image':
      return `${name} אינו קובץ תמונה. יש להעלות PNG או JPG.`
    case 'undecodable':
      return `לא הצלחנו לפתוח את ${name} — ייתכן שהקובץ פגום או בפורמט שהדפדפן לא קורא. שמרו אותו כ-PNG או JPG ונסו שוב.`
    case 'too_large':
      return `${name} גדול מדי (${mb(tagged.sketchBytes ?? 0)}MB) ולא הצלחנו לדחוס אותו מתחת ל-${mb(RULE_LIMIT_BYTES)}MB. הקטינו את הקובץ ונסו שוב.`
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
