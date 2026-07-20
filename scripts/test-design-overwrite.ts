/**
 * מעצב — הגנה מפני דריסה שקטה של עיצוב (בדיקת רגרסיה)
 * הרצה: npx tsx scripts/test-design-overwrite.ts
 *
 * נועל שלוש התנהגויות שאסור שיישברו שוב:
 *   1. confirmDesignReplace — מבקש אישור מפורש לפני החלפת עיצוב קיים.
 *   2. כל נתיב העלאה בכל הקטגוריות עובר דרך ה-guard (נעילת מקור), ובביטול —
 *      העיצוב הקיים נשמר ואין דריסה שקטה.
 *   3. שני עיצובים שונים על אותו מוצר/צבע/אזור מקבלים cart id שונה — לא ממוזגים
 *      ולא דורסים זה את זה בעגלה (קריטי להזמנות גדולות של 20+ פריטים).
 */
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateCartItemId } from '../lib/pricing'
import { confirmDesignReplace } from '../lib/utils'

let passed = 0
function ok(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ✅ ${name}`)
  } catch (e: any) {
    console.error(`  ❌ ${name}: ${e.message}`)
    process.exitCode = 1
  }
}

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

// ── 1. חוזה ה-guard ──
console.log('\n1️⃣  confirmDesignReplace — חוזה הפונקציה')

ok('מחזירה true כשהמשתמש מאשר, ומעבירה שם אזור + שאלת החלפה', () => {
  let msg = ''
  ;(globalThis as any).window = { confirm: (m: string) => { msg = m; return true } }
  assert.strictEqual(confirmDesignReplace('גב', true), true)
  assert.ok(msg.includes('גב'), 'ההודעה כוללת את שם האזור')
  assert.ok(msg.includes('להחליף'), 'ההודעה שואלת אם להחליף')
})

ok('מחזירה false כשהמשתמש מבטל', () => {
  ;(globalThis as any).window = { confirm: () => false }
  assert.strictEqual(confirmDesignReplace('מרכזי'), false)
})

// ── 2. לוגיקת ההחלפה — ביטול שומר את העיצוב הקיים ──
console.log('\n2️⃣  לוגיקת ההחלפה — ביטול שומר, אישור מחליף')

type D = { area: string; areaName: string; imageUrl: string; fileName: string }

// משקף את ה-guard שכל handler מריץ: מחליפים רק אם אושר.
function applyUpload(designs: D[], areaId: string, areaName: string, incoming: D, confirmResult: boolean): D[] {
  ;(globalThis as any).window = { confirm: () => confirmResult }
  const has = designs.some(d => d.area === areaId)
  if (has && !confirmDesignReplace(areaName)) return designs // ביטול → ללא שינוי
  const i = designs.findIndex(d => d.area === areaId)
  if (i >= 0) { const u = [...designs]; u[i] = incoming; return u }
  return [...designs, incoming]
}

const existing: D = { area: 'front_full', areaName: 'קידמי מלא', imageUrl: 'AAA', fileName: 'a.png' }
const incoming: D = { area: 'front_full', areaName: 'קידמי מלא', imageUrl: 'BBB', fileName: 'b.png' }

ok('ביטול: המערך לא משתנה וה-imageUrl המקורי נשמר (אין דריסה שקטה)', () => {
  const after = applyUpload([existing], 'front_full', 'קידמי מלא', incoming, false)
  assert.strictEqual(after.length, 1)
  assert.strictEqual(after[0].imageUrl, 'AAA')
})

ok('אישור: העיצוב מוחלף', () => {
  const after = applyUpload([existing], 'front_full', 'קידמי מלא', incoming, true)
  assert.strictEqual(after.length, 1)
  assert.strictEqual(after[0].imageUrl, 'BBB')
})

// ── 3. נעילת מקור — כל נתיב העלאה מוגן ──
console.log('\n3️⃣  נעילת מקור — כל הקטגוריות עוברות דרך ה-guard')

const UPLOAD_FILES = [
  'components/designer/DesignStep.tsx',       // חולצה
  'app/designer/sweatshirt/page.tsx',         // סווטשירט
  'app/designer/buff/page.tsx',               // באף
  'app/designer/apron/page.tsx',              // סינר
  'app/designer/cap/page.tsx',                // כובע
  'app/designer/baby/page.tsx',               // תינוק
]

for (const f of UPLOAD_FILES) {
  ok(`${f} — משתמש ב-confirmDesignReplace`, () => {
    assert.ok(read(f).includes('confirmDesignReplace'), 'חסר ה-guard')
  })
}

ok('לא חזר דפוס הדריסה השקטה setDesignFile(e.target.files?.[0] || null)', () => {
  for (const f of ['app/designer/buff/page.tsx', 'app/designer/apron/page.tsx', 'app/designer/cap/page.tsx', 'app/designer/baby/page.tsx']) {
    assert.ok(!read(f).includes('setDesignFile(e.target.files?.[0] || null)'), `דפוס שקט חזר ב-${f}`)
  }
})

// ── 4. cart id — עיצובים שונים לא מתמזגים ──
console.log('\n4️⃣  cart id — בידוד פריטים בהזמנות גדולות')

const cfg = (imageUrl: string, fileName: string) => ({
  productType: 'tshirt', fabricType: 'cotton', color: 'black',
  sizes: [{ size: 'M', quantity: 1 }],
  designs: [{ area: 'front_full', areaName: 'קידמי מלא', imageUrl, fileName }],
}) as any

ok('שני עיצובים שונים (אותו מוצר/צבע/אזור) → id שונה, בלי מיזוג/דריסה', () => {
  assert.notStrictEqual(generateCartItemId(cfg('AAA', 'cohen.png')), generateCartItemId(cfg('BBB', 'levi.png')))
})

ok('אותו עיצוב בדיוק → אותו id (מיזוג כמויות תקין נשמר)', () => {
  assert.strictEqual(generateCartItemId(cfg('AAA', 'cohen.png')), generateCartItemId(cfg('AAA', 'cohen.png')))
})

console.log(`\n✅ ${passed} בדיקות עברו\n`)
