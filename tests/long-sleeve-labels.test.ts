import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getTypeLabel, typeLabelAfterNoun } from '@/lib/constants'
import { productTypeLabel, aggregateDaily, supplierText } from '@/lib/daily-orders'
import { OrderConfirmationEmail } from '@/lib/email-templates/order-confirmation'
import type { Order } from '@/lib/types'

// TICKET-017 review: «חולצת שרוול ארוך» already contains the garment noun, so
// the sites that put their own noun first ("חולצה …", "חולצות …") must not
// say it twice. The name itself is unchanged everywhere else.

const RLM = '‏'

function emailFor(fabricType: string): string {
  const order = {
    id: 'o1', orderNumber: 1700, status: 'paid',
    customer: { firstName: 'דנה', lastName: 'כהן', email: 'dana@example.com', phone: '0500000000' },
    shipping: { method: 'pickup', cost: 0 },
    items: [{ productType: 'tshirt', fabricType, color: 'white', sizes: [], designs: [], pricePerUnit: 42, totalQuantity: 10, totalPrice: 420 }],
    subtotal: 420, discount: 0, total: 420, createdAt: null, updatedAt: null,
  } as unknown as Order
  return OrderConfirmationEmail({ order })
}

function supplierHead(fabricType: string): string {
  const summary = aggregateDaily([{ status: 'paid', items: [{ productType: 'tshirt', fabricType, color: 'white', sizes: [{ size: 'M', quantity: 3 }] }] }], [])
  return supplierText(summary).split('\n')[0].replace(RLM, '')
}

describe('typeLabelAfterNoun', () => {
  it('drops the leading «חולצת » of the long-sleeve name only', () => {
    expect(typeLabelAfterNoun('long-sleeve')).toBe('שרוול ארוך')
    expect(typeLabelAfterNoun('cotton')).toBe('כותנה')
    expect(typeLabelAfterNoun('polo')).toBe('פולו')
  })

  it('getTypeLabel itself is unchanged', () => {
    expect(getTypeLabel('long-sleeve')).toBe('חולצת שרוול ארוך')
  })
})

describe('daily orders', () => {
  it('productTypeLabel: «חולצה שרוול ארוך»; classic fabrics unchanged', () => {
    expect(productTypeLabel('tshirt', 'long-sleeve')).toBe('חולצה שרוול ארוך')
    expect(productTypeLabel('tshirt', 'cotton')).toBe('חולצה כותנה')
    expect(productTypeLabel('tshirt', 'polo')).toBe('חולצה פולו')
  })

  it('supplier text: «חולצות שרוול ארוך»; classic fabrics unchanged', () => {
    expect(supplierHead('long-sleeve')).toBe('חולצות שרוול ארוך לבן')
    expect(supplierHead('cotton')).toBe('חולצות כותנה לבן')
    expect(supplierHead('polo')).toBe('חולצות פולו לבן')
  })
})

describe('order confirmation email', () => {
  it('item line: «חולצות - שרוול ארוך»; classic fabrics unchanged', () => {
    expect(emailFor('long-sleeve')).toContain('<strong>חולצות - שרוול ארוך</strong>')
    expect(emailFor('long-sleeve')).not.toContain('חולצת שרוול ארוך')
    expect(emailFor('cotton')).toContain('<strong>חולצות - כותנה</strong>')
    expect(emailFor('polo')).toContain('<strong>חולצות - פולו</strong>')
  })
})

describe('admin orders list row', () => {
  // The row is composed inline in a large client page: "<product> <fabric> מעוצבת".
  // Its fabric word comes from the page's fabricLabels map (fabricName), passed
  // through the helper; the detail line «סוג: …» keeps the full name.
  const src = readFileSync(join(__dirname, '..', 'app/admin/orders/page.tsx'), 'utf8')

  it('the row strips the noun from the fabric label via typeLabelAfterNoun', () => {
    expect(src).toMatch(/typeLabelAfterNoun\(item\.fabricType!, fabricName\)/)
    expect(src).toContain('<strong>סוג:</strong> {fabricName}')
  })

  it('composes «חולצה שרוול ארוך מעוצבת» and keeps «חולצה כותנה מעוצבת»', () => {
    const row = (fabric: string, label: string) => `חולצה ${typeLabelAfterNoun(fabric, label)} מעוצבת`
    expect(row('long-sleeve', 'חולצת שרוול ארוך')).toBe('חולצה שרוול ארוך מעוצבת')
    expect(row('cotton', 'כותנה')).toBe('חולצה כותנה מעוצבת')
  })
})
