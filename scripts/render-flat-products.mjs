// Renders the site's 3D products to flat transparent PNG cutouts for the
// intro / hero carousel: public/renders/<productId>.png, 800x800, fully
// transparent background, product centered and filling ~85% of the frame.
//
// Usage (from the repo root, dev server running on :3000):
//   node scripts/render-flat-products.mjs <productId> [port]
//   node scripts/render-flat-products.mjs --list
//
// Requires the TEMPORARY harness route app/dev-render-flat/page.tsx (see the
// header of that file — it is recreated from this script's git history when
// renders need refreshing, and deleted again before commit).
//
// One product per invocation on purpose: headless Chromium renders WebGL via
// SwiftShader (software) — each render takes ~12-15s and a long loop chokes.

import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const CHROME = path.join(
  homedir(),
  'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
)

// productId → naming contract for public/renders/<productId>.png.
// variant/model mirror getModel3D() in lib/constants.ts; colors come from the
// product palettes there (intro spirit: white tee, red sweatshirt, green mesh
// cap, black apron, purple buff, light-blue onesie; vest/tote via getColorHex).
// yaw (rad): FRONTAL by owner decision (2026-10-13) — 0 by default, per-product
// nudge allowed only up to ±0.1 where it clearly improves readability.
//
// COLOR RULE (owner, 2026-10-13): every color below must be PHYSICALLY ORDERABLE
// for its product/type — i.e. pass the designer's real per-type filter in
// lib/constants.ts (FABRIC_COLOR_FILTER / SWEATSHIRT_COLOR_FILTER /
// CAP_COLOR_FILTER / TOTE_COLOR_FILTER; no filter → the product's full palette).
// All 14 audited 2026-10-13; each entry below is marked אושר-להזמנה.
const PRODUCTS = {
  tshirt: { variant: 'tshirt', model: '/models/tshirt-web.glb', color: '#FFFFFF', yaw: 0 }, // tshirt 'white' — אושר-להזמנה (cotton: no filter)
  sweatshirt: { variant: 'sweatshirt', model: '/models/sweatshirt-web.glb', color: '#C0202B', yaw: 0 }, // sweatshirt 'red' — אושר-להזמנה (putter filter)
  'cap-mesh': { variant: 'meshcap', model: '/models/meshcap-web.glb', color: '#10B981', yaw: 0 }, // cap 'green' — אושר-להזמנה (mesh filter)
  apron: { variant: 'apron', model: '/models/apron-web.glb', color: '#000000', yaw: 0 }, // apron 'black' — אושר-להזמנה
  buff: { variant: 'buff', model: '/models/buff-web.glb', color: '#A855F7', yaw: 0 }, // buff 'purple' — אושר-להזמנה
  baby: { variant: 'baby', model: '/models/baby-web.glb', color: '#BFDBFE', yaw: 0 }, // baby 'lightblue' — אושר-להזמנה
  vest: { variant: 'vest', model: '/models/vest-web.glb', color: '#CCFF00', yaw: 0 }, // vest 'neonyellow' — אושר-להזמנה
  tote: { variant: 'totevolume', model: '/models/tote-volume-web.glb', color: '#E4D9C3', yaw: -0.1 }, // tote 'beige' — אושר-להזמנה (volume filter); dead-frontal hides the gusset — flat like a 2D cutout
  // Batch 2 (owner, 2026-10-13): the remaining variants for the hero "river".
  // Re-audited 2026-10-13: polo/oversized/ziphoodie/dsbag re-rendered onto
  // colors that pass their REAL per-type filters (the old navy/gray/olive/royal
  // were not orderable for those types).
  polo: { variant: 'polo', model: '/models/polo-web.glb', color: '#9CA3AF', yaw: 0 }, // tshirt 'gray' — אושר-להזמנה (polo filter: white/black/gray; gray freed by oversized's move)
  oversized: { variant: 'oversized', model: '/models/oversized-web.glb', color: '#FFEABE', yaw: 0 }, // tshirt 'beige' — אושר-להזמנה (oversized filter: white/black/beige; white+black exact-taken, this beige ≠ tote beige #E4D9C3)
  hoodie: { variant: 'hoodie', model: '/models/hoodie-web.glb', color: '#6E2A48', yaw: 0 }, // sweatshirt 'burgundy' — אושר-להזמנה (kangaroo filter)
  ziphoodie: { variant: 'ziphoodie', model: '/models/ziphoodie-web.glb', color: '#1F3A63', yaw: 0 }, // sweatshirt 'navy' — אושר-להזמנה (zip filter: navy/black/white/melange)
  cap: { variant: 'cap', model: '/models/cap-web.glb', color: '#F97316', yaw: 0 }, // cap 'orange' — אושר-להזמנה (tembel filter)
  // TOTE_COLOR_FILTER.drawstring is only beige/white/black and ALL three exist
  // elsewhere in the river — black is the least-bad duplicate (apron): the
  // silhouettes differ most, and a dark bag reads on the light hero backdrop.
  dsbag: { variant: 'dsbag', model: '/models/dsbag-web.glb', color: '#000000', yaw: 0 }, // tote 'black' — אושר-להזמנה (drawstring filter)
}

const OUT_SIZE = 800
const FILL = 0.85 // product max-dimension as a fraction of the frame
const ALPHA_THRESHOLD = 8 // pixels with alpha <= this count as background

const [, , productId, portArg] = process.argv
if (productId === '--list') {
  console.log(Object.keys(PRODUCTS).join('\n'))
  process.exit(0)
}
const spec = PRODUCTS[productId]
if (!spec) {
  console.error(`Unknown productId "${productId}". One of: ${Object.keys(PRODUCTS).join(', ')}`)
  process.exit(1)
}
const port = portArg || '3000'

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
})
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1280 } })
  // The lead popup renders fixed inset-0 z-[9999] 4s after load and eats
  // browser checks — seed its storage keys before any page script runs.
  await page.addInitScript(`
    try {
      localStorage.setItem('lead_popup_closed', '1');
      localStorage.setItem('lead_popup_shown', '1');
      localStorage.setItem('cookie_consent', 'accepted');
    } catch (e) {}
  `)
  const url =
    `http://localhost:${port}/dev-render-flat?variant=${encodeURIComponent(spec.variant)}` +
    `&model=${encodeURIComponent(spec.model)}&color=${encodeURIComponent(spec.color)}` +
    `&yaw=${encodeURIComponent(spec.yaw ?? 0)}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.waitForFunction('window.__flatReady === true', null, { timeout: 180_000, polling: 500 })
  await page.waitForTimeout(2000) // settle: Bounds fit lerp + last texture paint

  // Read the WebGL canvas pixels directly — immune to any page background.
  const dataUrl = await page.evaluate("document.querySelector('canvas').toDataURL('image/png')")
  const raw = Buffer.from(dataUrl.split(',')[1], 'base64')

  // ── Normalize: find the opaque bounding box, scale to FILL, center. ──
  const { data, info } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H } = info
  let minX = W, minY = H, maxX = -1, maxY = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) throw new Error('Canvas is fully transparent — model did not render')
  const bw = maxX - minX + 1
  const bh = maxY - minY + 1
  const clipped = minX === 0 || minY === 0 || maxX === W - 1 || maxY === H - 1
  if (clipped) console.warn(`WARN: silhouette touches the canvas edge (bbox ${bw}x${bh} in ${W}x${H}) — may be cut off`)

  const target = Math.round(OUT_SIZE * FILL)
  const scale = target / Math.max(bw, bh)
  const dw = Math.max(1, Math.round(bw * scale))
  const dh = Math.max(1, Math.round(bh * scale))
  const cutout = await sharp(raw)
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .resize(dw, dh, { fit: 'fill' })
    .png()
    .toBuffer()
  const outBuf = await sharp({
    create: { width: OUT_SIZE, height: OUT_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: cutout, left: Math.round((OUT_SIZE - dw) / 2), top: Math.round((OUT_SIZE - dh) / 2) }])
    .png()
    .toBuffer()

  const outDir = path.join(process.cwd(), 'public', 'renders')
  mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `${productId}.png`)
  writeFileSync(outPath, outBuf)

  // Sanity stats for the report: corner alphas + opaque fill ratio.
  const { data: od } = await sharp(outBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const corner = (x, y) => od[(y * OUT_SIZE + x) * 4 + 3]
  let opaque = 0
  for (let i = 3; i < od.length; i += 4) if (od[i] > ALPHA_THRESHOLD) opaque++
  console.log(
    `${productId}: ${outPath} — src bbox ${bw}x${bh}, placed ${dw}x${dh}, ` +
      `corners alpha [${corner(0, 0)},${corner(OUT_SIZE - 1, 0)},${corner(0, OUT_SIZE - 1)},${corner(OUT_SIZE - 1, OUT_SIZE - 1)}], ` +
      `opaque ${((opaque / (OUT_SIZE * OUT_SIZE)) * 100).toFixed(1)}%${clipped ? ' [CLIPPED]' : ''}`,
  )
} finally {
  await browser.close()
}
