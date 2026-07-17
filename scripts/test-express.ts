/**
 * Express pickup (אקספרס באיסוף עצמי) — focused test matrix
 * הרצה: npx tsx scripts/test-express.ts
 *
 * מכסה:
 *   1. שרשרת התמחור — calculateOrderTotal עם/בלי אקספרס, הנחות לא חלות על האקספרס
 *   2. זכאות — איסוף עצמי בלבד, עד 20 יחידות
 *   3. סניטציה בשרת — sanitizeShipping + stripIneligibleExpress (order-sync)
 *   4. רינדור ShippingForm — הטוגל לא מוצג כשנבחר משלוח
 *   5. בדיקות מקור — אדמין (כרטיס כתום + באדג'), payment/create allowance
 */
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { calculateOrderTotal } from '../lib/pricing'
import { EXPRESS_PICKUP, isExpressEligible } from '../lib/constants'
import { sanitizeShipping, stripIneligibleExpress, EXPRESS_MAX_QUANTITY } from '../lib/order-sanitize'

// Next.js compiles JSX with the automatic runtime; tsx here uses classic —
// expose React globally so the component modules can resolve it
;(globalThis as any).React = React

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

const items = (totalPrice: number, totalQuantity: number) =>
  [{ totalPrice, totalQuantity }] as any

console.log('\n1️⃣  שרשרת תמחור — calculateOrderTotal')

ok('איסוף עצמי + אקספרס: total = subtotal + 50', () => {
  const t = calculateOrderTotal(items(100, 2), 'pickup', 0, undefined, EXPRESS_PICKUP.cost)
  assert.strictEqual(t.express, 50)
  assert.strictEqual(t.shipping, 0)
  assert.strictEqual(t.total, 150)
})

ok('איסוף עצמי + אקספרס + קופון: ההנחה לא חלה על האקספרס (100-10+50=140)', () => {
  const t = calculateOrderTotal(items(100, 2), 'pickup', 10, undefined, 50)
  assert.strictEqual(t.total, 140)
  assert.strictEqual(t.express, 50)
})

ok('הנחת כמות (15 יח׳, 5%) חלה על המוצרים בלבד, לא על האקספרס', () => {
  const t = calculateOrderTotal(items(555, 15), 'pickup', 0, undefined, 50)
  assert.strictEqual(t.quantityDiscount, 555 * 0.05)
  assert.strictEqual(t.total, 555 - 27.75 + 50)
})

ok('משלוח בלי אקספרס: total = subtotal + 35, אין 50 בשום מקום', () => {
  const t = calculateOrderTotal(items(100, 2), 'delivery', 0, undefined, 0)
  assert.strictEqual(t.express, 0)
  assert.strictEqual(t.total, 135)
})

ok('ברירת מחדל (בלי פרמטר אקספרס) — אפס, תאימות לאחור', () => {
  const t = calculateOrderTotal(items(100, 2), 'pickup')
  assert.strictEqual(t.express, 0)
  assert.strictEqual(t.total, 100)
})

console.log('\n2️⃣  זכאות — isExpressEligible')

ok('איסוף עצמי + 20 יחידות → זכאי', () => assert.strictEqual(isExpressEligible('pickup', 20), true))
ok('איסוף עצמי + 21 יחידות → לא זכאי', () => assert.strictEqual(isExpressEligible('pickup', 21), false))
ok('משלוח → לעולם לא זכאי', () => assert.strictEqual(isExpressEligible('delivery', 5), false))
ok('עגלה ריקה → לא זכאי', () => assert.strictEqual(isExpressEligible('pickup', 0), false))
ok('קבועים תואמים בין constants ל-order-sanitize', () =>
  assert.strictEqual(EXPRESS_PICKUP.maxQuantity, EXPRESS_MAX_QUANTITY))

console.log('\n3️⃣  סניטציה בשרת — order-sanitize (order-sync)')

ok('sanitizeShipping: איסוף+אקספרס נשמר, המחיר נכפה ל-50 מהשרת', () => {
  const s = sanitizeShipping({ method: 'pickup', cost: 0, express: true, expressCost: 1 })
  assert.strictEqual(s.express, true)
  assert.strictEqual(s.expressCost, 50)
})

ok('sanitizeShipping: אקספרס על משלוח — נמחק', () => {
  const s = sanitizeShipping({ method: 'delivery', cost: 35, express: true, expressCost: 50 })
  assert.strictEqual(s.express, undefined)
  assert.strictEqual(s.expressCost, undefined)
})

ok('sanitizeShipping: איסוף בלי אקספרס — אין שדות אקספרס', () => {
  const s = sanitizeShipping({ method: 'pickup', cost: 0 })
  assert.ok(!('express' in s) && !('expressCost' in s))
})

ok('stripIneligibleExpress: 21+ יחידות → האקספרס נמחק (אין 50 ₪ שקט)', () => {
  const s = stripIneligibleExpress({ method: 'pickup', cost: 0, express: true, expressCost: 50 }, 30)
  assert.ok(!('express' in s) && !('expressCost' in s))
})

ok('stripIneligibleExpress: 20 יחידות → האקספרס נשמר', () => {
  const s = stripIneligibleExpress({ method: 'pickup', cost: 0, express: true, expressCost: 50 }, 20)
  assert.strictEqual(s.express, true)
})

console.log('\n4️⃣  רינדור ShippingForm')

ok('ברירת מחדל (משלוח נבחר): טוגל האקספרס לא מרונדר', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ShippingForm = require('../components/cart/ShippingForm').default
  const html = renderToStaticMarkup(React.createElement(ShippingForm, { onSubmit: () => {}, totalQuantity: 5 }))
  assert.ok(html.includes('משלוח עד הבית'), 'delivery option rendered')
  assert.ok(!html.includes('אקספרס'), 'express toggle must NOT render when delivery is selected')
})

console.log('\n5️⃣  בדיקות מקור — אדמין + payment/create')

const adminSrc = readFileSync(join(__dirname, '../app/admin/orders/page.tsx'), 'utf8')
ok('אדמין: כרטיס כתום מלא להזמנת אקספרס (עדיפות על צהוב-שחזור)', () =>
  assert.ok(adminSrc.includes("order.shipping?.express ? 'border-orange-400 bg-orange-50/70 ring-1 ring-orange-300' : isRecoveredCustomer(order)")))
ok('אדמין: באדג׳ ⚡ אקספרס בשורה המכווצת', () =>
  assert.ok(adminSrc.includes('⚡ אקספרס</span>') && adminSrc.includes('bg-orange-500 text-white')))
ok('אדמין: באנר בפרטים המורחבים + שורת אקספרס בסיכום', () =>
  assert.ok(adminSrc.includes('⚡ אקספרס — 1-2 ימי עסקים!') && adminSrc.includes('אקספרס ⚡')))

const paySrc = readFileSync(join(__dirname, '../app/api/payment/create/route.ts'), 'utf8')
ok('payment/create: תוספת 50 מאושרת רק עם express וכמות ≤ 20', () =>
  assert.ok(paySrc.includes('express && totalQuantity <= EXPRESS_MAX_QUANTITY ? EXPRESS_COST : 0')))

const shipSrc = readFileSync(join(__dirname, '../components/cart/ShippingForm.tsx'), 'utf8')
ok('ShippingForm: אוטו-ניקוי האקספרס כשהזכאות נשללת', () =>
  assert.ok(shipSrc.includes('if (!isExpressEligible(method, totalQuantity)) setExpress(false)')))

console.log(`\n${process.exitCode ? '❌ יש כשלונות' : `✅ כל ${passed} הבדיקות עברו`}\n`)
