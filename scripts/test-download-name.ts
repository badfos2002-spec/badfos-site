/**
 * שם קובץ בהורדת עיצוב מהאדמין — lib/design-download-name.ts
 * הרצה: npx tsx scripts/test-download-name.ts
 */
import assert from 'node:assert'
import {
  buildDesignDownloadNames,
  contentDisposition,
  extFor,
  filenameFromContentDisposition,
  sanitizeFilenamePart,
} from '../lib/design-download-name'

let passed = 0
function ok(name: string, fn: () => void) {
  fn()
  passed++
  console.log(`  ✅ ${name}`)
}

const order = {
  orderNumber: 'BD1234',
  customer: { firstName: 'שנהב', lastName: 'שמואלי' },
  items: [
    { designs: [{ area: 'chest_logo', areaName: 'סמל כיס שמאל' }, { area: 'back', areaName: 'גב' }] },
    { designs: [{ area: 'back', areaName: 'גב' }] },
    { designs: [{ area: 'front_full', areaName: 'קידמי מלא' }] },
  ],
  upscales: { '0_chest_logo': { status: 'done', url: 'https://firebasestorage.googleapis.com/x.png' } },
}

ok('basic Hebrew name, upscale variant', () => {
  const n = buildDesignDownloadNames(order, 'id1', 0, 'chest_logo', 'upscale', 'png')
  assert.equal(n.filename, 'שנהב שמואלי סמל כיס שמאל.png')
  assert.equal(n.asciiFallback, 'order-BD1234-chest_logo.png')
})

ok('source gets (מקור) only when an upscale also exists', () => {
  assert.equal(
    buildDesignDownloadNames(order, 'id1', 0, 'chest_logo', 'source', 'png').filename,
    'שנהב שמואלי סמל כיס שמאל (מקור).png',
  )
  assert.equal(
    buildDesignDownloadNames(order, 'id1', 2, 'front_full', 'source', 'jpg').filename,
    'שנהב שמואלי קידמי מלא.jpg',
  )
})

ok('duplicate areaName across items → (פריט N); unique → no suffix', () => {
  const a = buildDesignDownloadNames(order, 'id1', 0, 'back', 'source', 'png')
  const b = buildDesignDownloadNames(order, 'id1', 1, 'back', 'source', 'png')
  assert.equal(a.filename, 'שנהב שמואלי גב (פריט 1).png')
  assert.equal(b.filename, 'שנהב שמואלי גב (פריט 2).png')
  assert.equal(b.asciiFallback, 'order-BD1234-back-item2.png')
  assert.notEqual(a.filename, b.filename)
})

ok('unsafe / control / bidi chars stripped, spaces collapsed', () => {
  const o = {
    orderNumber: 7,
    customer: { firstName: 'a/b\\c:d*e?"f<g>h|i', lastName: '‮שם‏\n  טוב\t' },
    items: [{ designs: [{ area: 'back', areaName: 'גב' }] }],
  }
  const n = buildDesignDownloadNames(o, 'id', 0, 'back', 'source', 'png')
  assert.equal(n.filename, 'a b c d e f g h i שם טוב גב.png')
  assert.ok(!/[/\\:*?"<>|\u0000-\u001F‎‏‪-‮]/.test(n.filename))
  assert.equal(sanitizeFilenamePart('  x ⁦y⁩  '), 'x y')
})

ok('missing names → "הזמנה <orderNumber> <area>"', () => {
  const o = { orderNumber: 'M55', customer: { firstName: '', lastName: ' ' }, items: [{ designs: [{ area: 'other', areaName: 'עיצוב' }] }] }
  assert.equal(buildDesignDownloadNames(o, 'id', 0, 'other', 'source', 'pdf').filename, 'הזמנה M55 עיצוב.pdf')
  // no customer, no areaName, no orderNumber → falls back to ids
  assert.equal(buildDesignDownloadNames({ items: [{ designs: [{ area: 'other_2' }] }] }, 'abcXYZ', 0, 'other_2', 'source', 'png').filename, 'הזמנה abcXYZ other_2.png')
})

ok('length capped at 120 chars (suffix preserved)', () => {
  const o = { ...order, customer: { firstName: 'א'.repeat(200), lastName: 'ב' } }
  const n = buildDesignDownloadNames(o, 'id', 1, 'back', 'source', 'png')
  const base = n.filename.replace(/\.png$/, '')
  assert.ok(Array.from(base).length <= 120, String(Array.from(base).length))
  assert.ok(base.endsWith(' (פריט 2)'))
})

ok('extFor: content-type, then URL path, then png', () => {
  assert.equal(extFor('image/jpeg'), 'jpg')
  assert.equal(extFor('image/webp; charset=x'), 'webp')
  assert.equal(extFor('application/pdf'), 'pdf')
  assert.equal(extFor('application/octet-stream', 'https://firebasestorage.googleapis.com/v0/b/x/o/designs%2Fs1%2Ffile.HEIC?alt=media'), 'heic')
  assert.equal(extFor('application/octet-stream', 'data:xx'), 'png')
  assert.equal(extFor(null), 'png')
})

ok('Content-Disposition: ASCII fallback + RFC 5987, round-trips', () => {
  const n = buildDesignDownloadNames(order, 'id1', 1, 'back', 'source', 'png')
  const h = contentDisposition(n)
  assert.match(h, /^attachment; filename="order-BD1234-back-item2\.png"; filename\*=UTF-8''[A-Za-z0-9%._~!-]+$/)
  assert.ok(!/[()']/.test(h.split("filename*=UTF-8''")[1]))
  // header must be pure ASCII (Node rejects non-Latin1 header values)
  assert.ok(/^[\x20-\x7E]+$/.test(h))
  assert.equal(filenameFromContentDisposition(h), 'שנהב שמואלי גב (פריט 2).png')
  assert.equal(filenameFromContentDisposition('attachment; filename="a.png"'), 'a.png')
  assert.equal(filenameFromContentDisposition(null), null)
})

console.log(`\n${passed} passed`)
