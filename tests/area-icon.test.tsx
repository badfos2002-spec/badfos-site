import { afterEach, describe, it, expect } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import AreaIcon, {
  areaRows,
  AREA_ROW_COLS,
  isChestArea,
  isCompactArea,
} from '@/components/designer/AreaIcon'

// vitest.config.mts does not set `globals: true`, so Testing Library's
// automatic cleanup never registers — without this, a second render() leaves
// the first one's DOM behind.
afterEach(cleanup)

// TICKET-004: the area buttons. A product with no rect for an area renders
// null, so the shoulders need rects on tshirt / sweatshirt / hoodie and on
// nothing else. The shoulder rects sit on the SLEEVE — outside the body
// outline (x < 11 / x > 37 on the 48×48 grid) — so they cannot be confused
// with the chest logos at a glance.

function iconRect(area: string, product: 'tshirt' | 'hoodie' | 'sweatshirt' | 'vest' | 'baby' | 'tote' | 'cap') {
  const { container } = render(<AreaIcon area={area} product={product} />)
  const rect = container.querySelector('rect')
  return rect && {
    x: Number(rect.getAttribute('x')),
    y: Number(rect.getAttribute('y')),
    width: Number(rect.getAttribute('width')),
    height: Number(rect.getAttribute('height')),
  }
}

describe('AreaIcon — shoulder icons', () => {
  it('renders a print rect for both shoulders on tshirt', () => {
    expect(iconRect('shoulder_right', 'tshirt')).not.toBeNull()
    expect(iconRect('shoulder_left', 'tshirt')).not.toBeNull()
  })

  it('renders a print rect for both shoulders on sweatshirt', () => {
    expect(iconRect('shoulder_right', 'sweatshirt')).not.toBeNull()
    expect(iconRect('shoulder_left', 'sweatshirt')).not.toBeNull()
  })

  it('renders a print rect for both shoulders on hoodie', () => {
    expect(iconRect('shoulder_right', 'hoodie')).not.toBeNull()
    expect(iconRect('shoulder_left', 'hoodie')).not.toBeNull()
  })

  it('renders nothing for products without shoulders', () => {
    for (const product of ['tote', 'cap', 'vest', 'baby'] as const) {
      const { container } = render(<AreaIcon area="shoulder_right" product={product} />)
      expect(container.firstChild).toBeNull()
      cleanup()
    }
  })

  it('the pair mirrors across the 48-wide icon on every shirt product', () => {
    for (const product of ['tshirt', 'sweatshirt', 'hoodie'] as const) {
      const right = iconRect('shoulder_right', product)!
      const left = iconRect('shoulder_left', product)!
      expect(right.width).toBe(left.width)
      expect(right.y).toBe(left.y)
      expect(right.x + right.width + left.x).toBe(48)
      cleanup()
    }
  })

  it('the shoulder rects sit on the sleeve, outside the body outline (x<11 / x>37)', () => {
    for (const product of ['tshirt', 'sweatshirt', 'hoodie'] as const) {
      const right = iconRect('shoulder_right', product)!
      const left = iconRect('shoulder_left', product)!
      expect(right.x + right.width).toBeLessThanOrEqual(11)
      expect(left.x).toBeGreaterThanOrEqual(37)
      cleanup()
    }
  })

  it('the existing areas still render', () => {
    expect(iconRect('front_full', 'tshirt')).not.toBeNull()
    cleanup()
    expect(iconRect('chest_logo', 'tshirt')).not.toBeNull()
    cleanup()
    expect(iconRect('back', 'vest')).not.toBeNull()
  })
})

describe('areaRows — the shoulders get their own row', () => {
  const SHIRT_AREAS = [
    { id: 'front_full' },
    { id: 'back' },
    { id: 'chest_logo' },
    { id: 'chest_logo_right' },
    { id: 'chest_logo_center' },
    { id: 'shoulder_right' },
    { id: 'shoulder_left' },
  ]

  it('splits the 7 shirt areas into 3 rows of 2 / 3 / 2', () => {
    const rows = areaRows(SHIRT_AREAS)
    expect(rows.map(r => r.length)).toEqual([2, 3, 2])
  })

  it('row 1 is the large areas, row 2 the chest logos, row 3 the shoulders', () => {
    const rows = areaRows(SHIRT_AREAS)
    expect(rows[0].map(a => a.id)).toEqual(['front_full', 'back'])
    expect(rows[1].map(a => a.id)).toEqual(['chest_logo', 'chest_logo_center', 'chest_logo_right'])
    expect(rows[2].map(a => a.id)).toEqual(['shoulder_right', 'shoulder_left'])
  })

  it('every row has a defined, non-empty Tailwind column class', () => {
    for (const row of areaRows(SHIRT_AREAS)) {
      expect(AREA_ROW_COLS[row.length]).toBeDefined()
      expect(AREA_ROW_COLS[row.length]).not.toBe('')
    }
  })

  it('a product without shoulders is unchanged — vest still gets 2 rows of 1 / 2', () => {
    const rows = areaRows([{ id: 'back' }, { id: 'chest_logo' }, { id: 'chest_logo_right' }])
    expect(rows.map(r => r.map(a => a.id))).toEqual([['back'], ['chest_logo', 'chest_logo_right']])
  })

  it('the zip hoodie (no קידמי מלא) still gets a defined column class per row', () => {
    const rows = areaRows([
      { id: 'back' },
      { id: 'chest_logo' },
      { id: 'chest_logo_right' },
      { id: 'shoulder_right' },
      { id: 'shoulder_left' },
    ])
    expect(rows.map(r => r.length)).toEqual([1, 2, 2])
    for (const row of rows) expect(AREA_ROW_COLS[row.length]).toBeTruthy()
  })
})

describe('isCompactArea — small prints get the short button', () => {
  it('both shoulders are compact', () => {
    expect(isCompactArea('shoulder_right')).toBe(true)
    expect(isCompactArea('shoulder_left')).toBe(true)
  })

  it('the chest logos stay compact and the large areas do not', () => {
    expect(isCompactArea('chest_logo')).toBe(true)
    expect(isCompactArea('chest_logo_center')).toBe(true)
    expect(isCompactArea('front_full')).toBe(false)
    expect(isCompactArea('back')).toBe(false)
  })

  it('isChestArea still means chest only — the shoulders are their own row', () => {
    expect(isChestArea('chest_logo')).toBe(true)
    expect(isChestArea('shoulder_right')).toBe(false)
  })
})
