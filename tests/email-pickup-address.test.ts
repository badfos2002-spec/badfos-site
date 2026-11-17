import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONTACT_INFO } from '@/lib/constants'
import { OrderShippedEmail } from '@/lib/email-templates/order-shipped'
import { OrderConfirmationEmail } from '@/lib/email-templates/order-confirmation'
import type { Order } from '@/lib/types'

// TICKET-016: pickup emails carry the full business address, not just the city.

const ROOT = join(__dirname, '..')
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

function makeOrder(method: 'pickup' | 'delivery'): Order {
  return {
    id: 'o1',
    orderNumber: 1600,
    status: 'paid',
    customer: { firstName: 'דנה', lastName: 'כהן', email: 'dana@example.com', phone: '0500000000' },
    shipping:
      method === 'delivery'
        ? { method, cost: 35, address: { street: 'הרצל', number: '12', city: 'חולון', floor: '2' } }
        : { method, cost: 0 },
    items: [
      {
        productType: 'tshirt',
        fabricType: 'cotton',
        color: 'white',
        sizes: [],
        designs: [],
        pricePerUnit: 47,
        totalQuantity: 10,
        totalPrice: 470,
      },
    ],
    subtotal: 470,
    discount: 0,
    total: 470,
    createdAt: null,
    updatedAt: null,
  } as unknown as Order
}

const BUSINESS_STREET = 'אליהו איתן 3'
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1

describe('order-shipped email', () => {
  it('pickup: shows the full business address and still asks to coordinate', () => {
    const html = OrderShippedEmail({ order: makeOrder('pickup') })
    expect(html).toContain(CONTACT_INFO.address)
    expect(html).toContain('תיאום מועד')
    expect(count(html, CONTACT_INFO.address)).toBe(1)
  })
  it('delivery: shows the customer street, not the business street', () => {
    const html = OrderShippedEmail({ order: makeOrder('delivery') })
    expect(html).not.toContain(BUSINESS_STREET)
    expect(html).toContain('הרצל')
  })
})

describe('order-confirmation email', () => {
  it('pickup: has a «כתובת לאיסוף» row with the full business address', () => {
    const html = OrderConfirmationEmail({ order: makeOrder('pickup') })
    expect(html).toContain('כתובת לאיסוף')
    expect(html).toContain(CONTACT_INFO.address)
    expect(count(html, CONTACT_INFO.address)).toBe(1)
  })
  it('delivery: no pickup-address row and no business street', () => {
    const html = OrderConfirmationEmail({ order: makeOrder('delivery') })
    expect(html).not.toContain('כתובת לאיסוף')
    expect(html).not.toContain(BUSINESS_STREET)
  })
})

describe('escaping guard', () => {
  it.each([
    'lib/email-templates/order-shipped.tsx',
    'lib/email-templates/order-confirmation.tsx',
  ])('%s interpolates the business address only through escapeHtml', (file) => {
    const src = read(file)
    expect(src).toContain('${escapeHtml(CONTACT_INFO.address)}')
    expect(src).not.toMatch(/\$\{CONTACT_INFO\.address\}/)
  })
})
