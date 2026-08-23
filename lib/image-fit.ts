/**
 * Shared mechanics for shrinking an image File until Firebase Storage accepts
 * it: alpha-aware format choice + a longest-edge ladder + tagged failures.
 *
 * THIS MODULE HOLDS NO QUALITY POLICY.
 * Every number that decides how good the output looks lives in the caller's
 * profile, and there are exactly two:
 *
 *   lib/print-image.ts   PRINT profile        — customer artwork the owner
 *                                               physically prints. 4000px floor.
 *   lib/sketch-image.ts  ILLUSTRATION profile — admin sketches that are only
 *                                               ever displayed. 1600px top rung.
 *
 * Do not give any field here a default, and do not import one profile from the
 * other: the whole point of the split is that a future reader cannot
 * accidentally route a print master through display-quality settings (1600px on
 * a 30cm garment print is ~135 DPI — visibly soft).
 */

export type ImageFitFailure = 'not_image' | 'undecodable' | 'too_large'

export interface ImageFitProfile {
  /** At or below this many bytes the file is returned untouched — byte-identical. */
  passthroughBytes: number
  /** What an oversized file must be squeezed under before it is accepted. */
  targetBytes: number
  /** Longest-edge rungs in px, largest first. Clamped to the source; never upscales. */
  edgeLadder: number[]
  /** Tried in order on the opaque (JPEG) path. */
  jpegQualities: number[]
  /**
   * Try the source's own size as the first rung, before the ladder. Lets a
   * merely badly-compressed file be re-encoded at full resolution instead of
   * losing pixels it did not need to lose.
   */
  startAtNativeSize: boolean
}

/** Plain Error + tags: subclassing Error breaks `instanceof` on ES5 targets. */
interface TaggedError extends Error {
  imageFitReason: ImageFitFailure
  imageFitFile: string
  imageFitBytes: number
}

export interface ImageFitInfo {
  reason?: ImageFitFailure
  fileName?: string
  bytes?: number
}

export function failImageFit(reason: ImageFitFailure, fileName: string, bytes: number): never {
  const err = new Error(`image fit ${reason}: ${fileName} (${bytes} bytes)`) as TaggedError
  err.imageFitReason = reason
  err.imageFitFile = fileName
  err.imageFitBytes = bytes
  throw err
}

/** Read the tags back off an error, for the Hebrew message each profile owns. */
export function imageFitInfo(err: unknown): ImageFitInfo {
  const tagged = err as Partial<TaggedError> | null
  return { reason: tagged?.imageFitReason, fileName: tagged?.imageFitFile, bytes: tagged?.imageFitBytes }
}

export const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1)

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
 * Return a File that fits `profile.targetBytes`, or throw a tagged failure.
 *
 * Files already at or under `passthroughBytes` come back as the SAME object —
 * no decode, no re-encode, no quality loss, and formats canvas cannot
 * round-trip (SVG, GIF) keep working. Oversized ones are decoded, drawn at each
 * rung of the ladder in turn and re-encoded — PNG when the pixels carry
 * transparency, JPEG when they do not — because the size of an encode is not
 * predictable from its dimensions.
 */
export async function fitImageToBytes(file: File, profile: ImageFitProfile): Promise<File> {
  if (!file.type.startsWith('image/')) failImageFit('not_image', file.name, file.size)
  if (file.size <= profile.passthroughBytes) return file

  const bmp = await createImageBitmap(file).catch(() => failImageFit('undecodable', file.name, file.size))
  const base = file.name.replace(/\.[^.]+$/, '')
  const srcMax = Math.max(bmp.width, bmp.height)
  // Never upscale, and never encode the same canvas twice for two rungs that
  // both clamp to the source size.
  const rungs = profile.startAtNativeSize ? [srcMax, ...profile.edgeLadder] : profile.edgeLadder
  const edges = rungs.map(e => Math.min(e, srcMax)).filter((e, i, a) => a.indexOf(e) === i)

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
        for (const q of profile.jpegQualities) {
          const blob = await encode(canvas, 'image/jpeg', q)
          if (blob.size <= profile.targetBytes) return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
        }
      } else {
        const blob = await encode(canvas, 'image/png')
        if (blob.size <= profile.targetBytes) return new File([blob], `${base}.png`, { type: 'image/png' })
      }
    }

    failImageFit('too_large', file.name, file.size)
  } finally {
    bmp.close()
  }
}
