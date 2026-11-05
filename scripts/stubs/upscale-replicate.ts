/**
 * Stub of @/lib/upscale for the base64-upscale test. Re-declares the constants
 * runUpscaleForOrder relies on and records every prediction request instead of
 * calling Replicate — so the test can assert what URL was sent to the model.
 */
export const SKIP_UPSCALE_PIXELS = 2_000_000
export const MODEL_MAX_INPUT_PIXELS = 2_096_704
export const PIXEL_LIMIT_ERROR =
  /maximum allowed|number of pixels|max size that fits|too large|dimensions/i
export const REAL_ESRGAN_VERSION = 'stub-version'

export const __replicate = {
  calls: [] as string[],
  fail: false,
  reset() {
    this.calls = []
    this.fail = false
  },
}

export async function createUpscalePrediction(
  imageUrl: string,
  _webhookUrl: string
): Promise<{ id: string }> {
  __replicate.calls.push(imageUrl)
  if (__replicate.fail) throw new Error('stub replicate: forced failure')
  return { id: `pred_${__replicate.calls.length}` }
}
