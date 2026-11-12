/**
 * TICKET-006 — "save image" for the admin order-card 3D viewer.
 *
 * ZERO STORAGE: the PNG is created in the browser and handed to the admin's own
 * device. Nothing is uploaded, nothing is written to Firestore.
 *
 * The capture waits for PIXELS, never for a timeout — `waitForRenderedFrame`
 * (lib/sketch-preview.ts) is the mechanism the sketch link-preview already uses:
 * it samples the canvas until something is drawn AND the frame stopped changing,
 * so the GLTF, the colour and every decal have all landed. The readback itself
 * works because `Preview3DStage` has always created its Canvas with
 * `preserveDrawingBuffer: true` (for that same sketch capture) — this feature
 * switches nothing on and adds no cost to the customer pages.
 */

import { waitForRenderedFrame } from '@/lib/sketch-preview'

/**
 * Second net under the frame wait: an empty or single-colour canvas encodes to
 * about a kilobyte, while a real 3D still is tens of KB. A black PNG is the one
 * outcome worse than an error message, so anything under this floor is treated
 * as the blank frame it almost certainly is.
 */
export const MIN_PNG_BYTES = 3000

/**
 * The stage inside `container` as a PNG — or null, loudly, if it would be
 * blank. Never throws: a tainted canvas (`toBlob` → SecurityError) must not
 * take the admin page down with it.
 */
export async function captureStagePng(container: HTMLElement | null): Promise<Blob | null> {
  try {
    const canvas = container?.querySelector('canvas')
    if (!canvas) {
      console.error('[ORDER_3D_NO_CANVAS] no <canvas> in the viewer — the 3D stage is not mounted')
      return null
    }

    const diag = await waitForRenderedFrame(canvas)
    if (!diag.ready) {
      console.error('[ORDER_3D_BLANK_FRAME] the canvas never showed a scene — refusing to save it', diag)
      return null
    }

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(b => resolve(b), 'image/png')
    )
    if (!blob || blob.size < MIN_PNG_BYTES) {
      console.error('[ORDER_3D_EMPTY_PNG] the encoded PNG looks blank', { bytes: blob?.size ?? 0 })
      return null
    }
    return blob
  } catch (err) {
    console.error('[ORDER_3D_CAPTURE_ERROR] capture failed:', err)
    return null
  }
}

export interface SaveResult {
  /** `download` = in the Downloads folder. `tab` = shown in a new tab (the
   *  admin saves it by hand). `blocked` = neither worked; the UI must offer
   *  `url` as a link, so the image is never silently lost. */
  outcome: 'download' | 'tab' | 'blocked'
  url: string
}

/** Blob + anchor download, with the iOS-Safari fallbacks behind it. */
export function saveBlobAs(blob: Blob, filename: string): SaveResult {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  if ('download' in anchor) {
    try {
      anchor.href = url
      anchor.download = filename
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      // The click has already started the download; revoke late so a slow
      // browser is never left holding a dead url.
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      return { outcome: 'download', url }
    } catch {
      anchor.remove()
    }
  }

  // iOS Safari and anything else that blocks an anchor download: show the PNG
  // so it can be saved with a long press. The url is deliberately NOT revoked
  // on these paths — the tab (or the link the UI offers) still needs it.
  return window.open(url, '_blank') ? { outcome: 'tab', url } : { outcome: 'blocked', url }
}
