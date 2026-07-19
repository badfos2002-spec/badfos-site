/**
 * Dependency-free image dimension reader for design image URLs.
 *
 * Parses header bytes for PNG, JPEG and WebP — the formats the designer
 * produces (compressImage in components/designer/DesignStep.tsx emits PNG or
 * JPEG; iPhone HEIC is converted to JPEG first). WebP is covered defensively.
 *
 * Fetches a small Range of the header first (cheap), then falls back to a full
 * fetch if the server ignored Range or the JPEG SOF marker sat past the window.
 *
 * Returns the total pixel count (width * height), or null when the dimensions
 * can't be determined — callers treat null as "unknown, try upscaling anyway".
 */

function parsePng(buf: Buffer): number | null {
  // 8-byte signature, then IHDR chunk: len(4) + "IHDR"(4) + width(4 BE) + height(4 BE)
  if (buf.length < 24) return null
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return null
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null
  const w = buf.readUInt32BE(16)
  const h = buf.readUInt32BE(20)
  return w && h ? w * h : null
}

function parseJpeg(buf: Buffer): number | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null
  let off = 2
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) { off++; continue }
    let marker = buf[off + 1]
    // Skip any fill bytes (runs of 0xFF)
    while (marker === 0xff && off + 2 < buf.length) { off++; marker = buf[off + 1] }
    off += 2
    // Standalone markers with no length payload: SOI, EOI, TEM, RSTn
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (off + 2 > buf.length) return null
    const segLen = buf.readUInt16BE(off)
    // SOF markers carry the frame dimensions: C0..CF except C4(DHT), C8(JPG), CC(DAC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (off + 7 > buf.length) return null
      const h = buf.readUInt16BE(off + 3)
      const w = buf.readUInt16BE(off + 5)
      return w && h ? w * h : null
    }
    off += segLen
  }
  return null
}

function parseWebp(buf: Buffer): number | null {
  if (buf.length < 30) return null
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null
  const fourcc = buf.toString('ascii', 12, 16)
  if (fourcc === 'VP8 ') {
    // Lossy: frame tag(3)+start code(3) then width(14b LE)@26, height(14b LE)@28
    const w = buf.readUInt16LE(26) & 0x3fff
    const h = buf.readUInt16LE(28) & 0x3fff
    return w && h ? w * h : null
  }
  if (fourcc === 'VP8L') {
    // Lossless: signature 0x2F @20, then 14b (w-1) and 14b (h-1)
    if (buf[20] !== 0x2f) return null
    const b = buf.readUInt32LE(21)
    const w = (b & 0x3fff) + 1
    const h = ((b >> 14) & 0x3fff) + 1
    return w * h
  }
  if (fourcc === 'VP8X') {
    // Extended: canvas width-1 (24b LE)@24, canvas height-1 (24b LE)@27
    const w = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1
    const h = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1
    return w * h
  }
  return null
}

function parseDims(buf: Buffer): number | null {
  return parsePng(buf) ?? parseJpeg(buf) ?? parseWebp(buf)
}

/**
 * Total pixel count of the image at `url`, or null if it can't be determined.
 * Only https URLs are read (design images are stored on Firebase Storage).
 */
export async function readImagePixels(url: string): Promise<number | null> {
  if (!url || !url.startsWith('https://')) return null
  try {
    // Cheap: try to read just the header bytes via a ranged GET
    const ranged = await fetch(url, { headers: { Range: 'bytes=0-65535' } })
    if (ranged.ok || ranged.status === 206) {
      const px = parseDims(Buffer.from(await ranged.arrayBuffer()))
      if (px) return px
    }
    // Fall back to a full fetch (server ignored Range, or the SOF was past 64KB)
    const full = await fetch(url)
    if (!full.ok) return null
    return parseDims(Buffer.from(await full.arrayBuffer()))
  } catch {
    return null
  }
}
