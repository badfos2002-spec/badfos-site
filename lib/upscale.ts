/**
 * Replicate Real-ESRGAN 4x upscaling for design images.
 *
 * Architecture (Vercel Hobby time limits): we never block waiting for the
 * upscale to finish. A prediction is created with a completion webhook that
 * points at /api/upscale-callback — Replicate calls us back when it's done.
 */

// nightmareai/real-esrgan — pinned version id.
// This is the model's stable public version (unchanged for years, verified
// via GET https://api.replicate.com/v1/models/nightmareai/real-esrgan —
// scratchpad/upscale_test.js re-verifies it on every run and warns on drift).
export const REAL_ESRGAN_VERSION =
  'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa'

/**
 * Hard input limit of this real-esrgan version. Inputs with more pixels than
 * this are rejected by the model with:
 *   "...total number of pixels N greater than the max size that fits in GPU
 *    memory on this hardware, 2096704. Resize input image and try again."
 * Empirically confirmed via the Replicate API (2026-07): 2.00MP accepted,
 * 2.25MP rejected — the model's stated cap is exactly 2,096,704 px (1448²).
 */
export const MODEL_MAX_INPUT_PIXELS = 2_096_704

/**
 * At/above this pixel count we skip upscaling and use the ORIGINAL image as the
 * print file — it's already high-res, and 4x would exceed the model cap anyway.
 * Kept a safe margin below MODEL_MAX_INPUT_PIXELS so anything we still send to
 * the model is guaranteed to be under its limit.
 */
export const SKIP_UPSCALE_PIXELS = 2_000_000

/**
 * Matches a Replicate/model error meaning the input was too large for the GPU.
 * Such images are already high-res, so we fall back to the original instead of
 * marking the upscale failed. The real error contains both "number of pixels"
 * and "dimensions" and "max size that fits".
 */
export const PIXEL_LIMIT_ERROR =
  /maximum allowed|number of pixels|max size that fits|too large|dimensions/i

const REPLICATE_PREDICTIONS_URL = 'https://api.replicate.com/v1/predictions'

/**
 * Create a Replicate prediction to upscale an image 4x.
 * Returns the prediction id. Does NOT wait for completion —
 * Replicate will POST the finished prediction to `webhookUrl`.
 */
export async function createUpscalePrediction(
  imageUrl: string,
  webhookUrl: string
): Promise<{ id: string }> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) {
    throw new Error('REPLICATE_API_TOKEN is not configured')
  }

  const res = await fetch(REPLICATE_PREDICTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: REAL_ESRGAN_VERSION,
      input: {
        image: imageUrl,
        scale: 4,
        face_enhance: false,
      },
      webhook: webhookUrl,
      webhook_events_filter: ['completed'],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Replicate prediction creation failed: ${res.status} ${detail.slice(0, 300)}`)
  }

  const data = await res.json()
  if (!data?.id || typeof data.id !== 'string') {
    throw new Error('Replicate response missing prediction id')
  }

  return { id: data.id }
}
