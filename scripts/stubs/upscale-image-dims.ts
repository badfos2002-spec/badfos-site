/**
 * Stub of @/lib/image-dims for the base64-upscale test — returns a
 * test-controlled pixel count instead of fetching the image over the network.
 */
export const __dims = { pixels: null as number | null }

export async function readImagePixels(_url: string): Promise<number | null> {
  return __dims.pixels
}
