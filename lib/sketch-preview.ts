/**
 * Snapshot of the live 3D sketch stage, sized for a WhatsApp link preview.
 *
 * WHY THIS EXISTS
 * Every /share/<id> link used to preview with the company logo, so a customer
 * had no reason to tap. Capturing the owner's actual arrangement — the garment
 * in the chosen colour, the artwork where they placed it — turns the link into
 * the sketch itself.
 *
 * WHATSAPP CONSTRAINTS (Meta, "Link Previews", developers.facebook.com):
 *   • "This image should be under 600KB in size."
 *   • "Image should be 300px or more in width with 4:1 width/height or less
 *      aspect ratio."
 * 1200x630 (1.91:1) is Meta's canonical large-preview size and satisfies both,
 * so the sketch renders as a big rich card rather than a small thumbnail. The
 * stage is 3:4 portrait, so the garment is letterboxed onto the same branded
 * backdrop the customer sees on the share page — never cropped.
 */

/** Meta's canonical large-preview size (1.91:1). */
export const PREVIEW_WIDTH = 1200
export const PREVIEW_HEIGHT = 630

/** Same backdrop Preview3DStage paints behind the transparent WebGL canvas. */
const BACKDROP_URL = '/assets/designer-3d-bg.png?v=3'
/** Backdrop fallback: the share page's cream, if the image can't be decoded. */
const BACKDROP_FALLBACK = '#fffdf5'

/** Frame-readiness tuning. See waitForRenderedFrame. */
const SAMPLE_SIZE = 96          // downsampled frame used for the comparisons
const SAMPLE_INTERVAL_MS = 100
const STABLE_SAMPLES = 5        // ~500ms with no visible change
const STABLE_THRESHOLD = 1.0    // mean abs channel delta, 0-255
const MIN_COVERAGE = 0.02       // garment must cover >=2% of the frame
const READY_TIMEOUT_MS = 12000
const CANVAS_TIMEOUT_MS = 5000

/** JPEG: photographic render, opaque backdrop -> far smaller than PNG. */
const JPEG_QUALITY = 0.85
const JPEG_FALLBACK_QUALITY = 0.6
const SIZE_BUDGET_BYTES = 500 * 1024 // headroom under Meta's 600KB ceiling

export interface CaptureDiagnostics {
  ready: boolean
  timedOut: boolean
  elapsedMs: number
  samples: number
  /** Fraction of sampled pixels that are not fully transparent. */
  coverage: number
  /** Mean abs channel delta of the last two samples. */
  lastDiff: number
}

/**
 * Decode every artwork bitmap before we start judging stability.
 *
 * ShirtDecal loads its texture through a NON-suspending TextureLoader
 * (Tshirt3DModel.useArtworkTexture), so the garment renders first and the
 * design pops in whenever its image finishes. Forcing the decode up front means
 * the texture resolves from cache, so "the frame stopped changing" cannot mean
 * "the design has not started loading yet".
 */
async function decodeArtwork(urls: string[]): Promise<void> {
  await Promise.all(
    urls.map(
      url =>
        new Promise<void>(resolve => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve() // a broken artwork skips its own decal
          img.src = url
        })
    )
  )
}

/**
 * Block until the WebGL canvas actually shows a finished scene.
 *
 * A fixed delay is not good enough: the GLTF, the colour and each DecalGeometry
 * land at unrelated times, and a capture fired early yields an empty or
 * half-drawn frame. Instead we watch the pixels — the frame is ready once it
 * both covers enough of the stage (something is drawn) and has stopped changing
 * for STABLE_SAMPLES consecutive samples (nothing is still arriving).
 */
export async function waitForRenderedFrame(
  canvas: HTMLCanvasElement
): Promise<CaptureDiagnostics> {
  const sampler = document.createElement('canvas')
  sampler.width = SAMPLE_SIZE
  sampler.height = SAMPLE_SIZE
  const sctx = sampler.getContext('2d', { willReadFrequently: true })
  if (!sctx) throw new Error('no 2d context for frame sampling')

  const started = Date.now()
  let previous: Uint8ClampedArray | null = null
  let stable = 0
  let samples = 0
  let coverage = 0
  let lastDiff = Number.POSITIVE_INFINITY

  for (;;) {
    sctx.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    sctx.drawImage(canvas, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    const data = sctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data
    samples++

    let opaque = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] > 24) opaque++
    coverage = opaque / (SAMPLE_SIZE * SAMPLE_SIZE)

    if (previous) {
      let sum = 0
      for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - previous[i])
      lastDiff = sum / data.length
    }

    // Both conditions matter: coverage alone passes on a bare garment with the
    // design still loading; stability alone passes on an empty canvas.
    if (coverage >= MIN_COVERAGE && lastDiff <= STABLE_THRESHOLD) stable++
    else stable = 0

    previous = data

    if (stable >= STABLE_SAMPLES) {
      return { ready: true, timedOut: false, elapsedMs: Date.now() - started, samples, coverage, lastDiff }
    }
    if (Date.now() - started > READY_TIMEOUT_MS) {
      // Still moving after 12s: capture anyway if something is drawn — a live
      // frame beats falling back to the logo. Blank means give up.
      return {
        ready: coverage >= MIN_COVERAGE,
        timedOut: true,
        elapsedMs: Date.now() - started,
        samples,
        coverage,
        lastDiff,
      }
    }
    await new Promise(r => setTimeout(r, SAMPLE_INTERVAL_MS))
  }
}

/**
 * Preview3DStage is a dynamic import, so on a cold page the canvas may not
 * exist yet when the owner clicks "create". Wait briefly instead of dropping
 * straight to the logo fallback.
 */
async function waitForCanvas(container: HTMLElement): Promise<HTMLCanvasElement | null> {
  const deadline = Date.now() + CANVAS_TIMEOUT_MS
  for (;;) {
    const canvas = container.querySelector('canvas')
    if (canvas) return canvas
    if (Date.now() > deadline) return null
    await new Promise(r => setTimeout(r, 100))
  }
}

/** Load the branded backdrop; null if it can't be decoded. */
function loadBackdrop(): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = BACKDROP_URL
  })
}

/** Cover-fit `src` into `dw`x`dh` (backdrop), mirroring `background-size: cover`. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dw: number, dh: number) {
  const scale = Math.max(dw / img.width, dh / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.drawImage(img, (dw - w) / 2, (dh - h) / 2, w, h)
}

/**
 * Capture the sketch stage inside `container` as a WhatsApp-sized JPEG.
 *
 * Resolves to `null` — never throws — on any failure, so a bad capture can only
 * cost the preview, never the sketch itself.
 */
export async function captureSketchPreview(
  container: HTMLElement | null,
  artworkUrls: string[]
): Promise<Blob | null> {
  try {
    if (!container) return null
    const canvas = await waitForCanvas(container)
    if (!canvas) return null

    await decodeArtwork(artworkUrls)
    const diag = await waitForRenderedFrame(canvas)
    if (!diag.ready) return null

    const out = document.createElement('canvas')
    out.width = PREVIEW_WIDTH
    out.height = PREVIEW_HEIGHT
    const ctx = out.getContext('2d')
    if (!ctx) return null

    const backdrop = await loadBackdrop()
    if (backdrop) {
      drawCover(ctx, backdrop, PREVIEW_WIDTH, PREVIEW_HEIGHT)
    } else {
      ctx.fillStyle = BACKDROP_FALLBACK
      ctx.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)
    }

    // Contain-fit the portrait stage so the garment is never cropped.
    const scale = Math.min(PREVIEW_WIDTH / canvas.width, (PREVIEW_HEIGHT * 0.98) / canvas.height)
    const w = canvas.width * scale
    const h = canvas.height * scale
    ctx.drawImage(canvas, (PREVIEW_WIDTH - w) / 2, (PREVIEW_HEIGHT - h) / 2, w, h)

    const encode = (q: number) =>
      new Promise<Blob | null>(resolve => out.toBlob(b => resolve(b), 'image/jpeg', q))

    const blob = await encode(JPEG_QUALITY)
    if (blob && blob.size > SIZE_BUDGET_BYTES) return await encode(JPEG_FALLBACK_QUALITY)
    return blob
  } catch (err) {
    console.error('Sketch preview capture failed:', err)
    return null
  }
}
