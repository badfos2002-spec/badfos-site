// Small garment outline showing WHERE a print area sits, for the area buttons.
// Drawn as the customer sees the 3D front view: 'chest_logo' (סמל כיס ימין,
// the wearer's right) is on the VIEWER'S LEFT, 'chest_logo_right' on the right.
// SVG coordinates are not flipped by RTL — never mirror this with CSS.

export type AreaIconProduct = 'tshirt' | 'hoodie' | 'sweatshirt' | 'vest' | 'baby' | 'tote' | 'cap'

const STROKE = '#9CA3AF'
const PRINT = '#F59E0B'

type Rect = [number, number, number, number]

// Silhouettes on a 48×48 grid. `front`/`back` differ only at the neckline.
const SHAPES: Record<AreaIconProduct, { front: string; back: string; extraFront?: string; extraBack?: string }> = {
  tshirt: {
    front: 'M17 6 Q24 12 31 6 L40 10 L46 19 L39 23 L37 20 L37 44 L11 44 L11 20 L9 23 L2 19 L8 10 Z',
    back: 'M17 6 Q24 8 31 6 L40 10 L46 19 L39 23 L37 20 L37 44 L11 44 L11 20 L9 23 L2 19 L8 10 Z',
  },
  sweatshirt: {
    front: 'M17 9 Q24 14 31 9 L41 13 L46 38 L40 39 L37 24 L37 45 L11 45 L11 24 L8 39 L2 38 L7 13 Z',
    back: 'M17 9 Q24 10.5 31 9 L41 13 L46 38 L40 39 L37 24 L37 45 L11 45 L11 24 L8 39 L2 38 L7 13 Z',
  },
  hoodie: {
    // Hood dome over the shoulders; the front adds the face opening.
    front: 'M16 11 C16 2 32 2 32 11 L41 14 L46 38 L40 39 L37 24 L37 45 L11 45 L11 24 L8 39 L2 38 L7 14 Z',
    back: 'M16 11 C16 2 32 2 32 11 L41 14 L46 38 L40 39 L37 24 L37 45 L11 45 L11 24 L8 39 L2 38 L7 14 Z',
    extraFront: 'M19 11 Q19 5 24 5 Q29 5 29 11 Q24 15 19 11 Z',
  },
  vest: {
    front: 'M15 5 L19 5 Q22 16 24 21 Q26 16 29 5 L33 5 L35 12 Q36 18 39 20 L39 45 L9 45 L9 20 Q12 18 13 12 Z',
    back: 'M15 5 L19 5 Q24 8 29 5 L33 5 L35 12 Q36 18 39 20 L39 45 L9 45 L9 20 Q12 18 13 12 Z',
  },
  baby: {
    front: 'M18 5 Q24 10 30 5 L38 9 L44 17 L38 20 L36 18 L36 36 Q36 42 30 44 L28 44 Q24 40 20 44 L18 44 Q12 42 12 36 L12 18 L10 20 L4 17 L10 9 Z',
    back: 'M18 5 Q24 7 30 5 L38 9 L44 17 L38 20 L36 18 L36 36 Q36 42 30 44 L28 44 Q24 40 20 44 L18 44 Q12 42 12 36 L12 18 L10 20 L4 17 L10 9 Z',
  },
  tote: {
    front: 'M9 17 L39 17 L39 45 L9 45 Z',
    back: 'M9 17 L39 17 L39 45 L9 45 Z',
    extraFront: 'M17 17 C17 5 31 5 31 17',
    extraBack: 'M17 17 C17 5 31 5 31 17',
  },
  cap: {
    // Crown + brim seen from the front.
    front: 'M5.6 29.2 C5.6 6.2 42.4 6.2 42.4 29.2 Z M2.2 29.2 Q24 41.8 45.8 29.2 Q24 34.9 2.2 29.2 Z',
    back: 'M5.6 29.2 C5.6 6.2 42.4 6.2 42.4 29.2 Z',
  },
}

// Print rectangles per product (x, y, w, h).
const AREAS: Record<AreaIconProduct, Record<string, Rect>> = {
  tshirt: {
    front_full: [16, 17, 16, 17], back: [14, 13, 20, 22],
    chest_logo: [14, 13, 6.5, 6.5], chest_logo_right: [27.5, 13, 6.5, 6.5], chest_logo_center: [20.75, 13.5, 6.5, 6.5],
  },
  sweatshirt: {
    front_full: [16, 19, 16, 16], back: [14, 15, 20, 21],
    chest_logo: [14, 15.5, 6.5, 6.5], chest_logo_right: [27.5, 15.5, 6.5, 6.5], chest_logo_center: [20.75, 16, 6.5, 6.5],
  },
  hoodie: {
    front_full: [16, 19, 16, 16], back: [14, 15, 20, 21],
    chest_logo: [14, 15.5, 6.5, 6.5], chest_logo_right: [27.5, 15.5, 6.5, 6.5], chest_logo_center: [20.75, 17.5, 6.5, 6.5],
  },
  vest: {
    back: [13, 14, 22, 22],
    chest_logo: [13, 17, 6.5, 6.5], chest_logo_right: [28.5, 17, 6.5, 6.5],
  },
  baby: { front_full: [17, 15, 14, 15], back: [16, 13, 16, 18] },
  tote: { front_full: [14, 22, 20, 17], back: [14, 22, 20, 17] },
  cap: { center: [17.1, 15.4, 13.8, 9.2], center_wide: [12.5, 18.3, 23, 7.5] },
}

export default function AreaIcon({ area, product, className = 'w-10 h-10' }: { area: string; product: AreaIconProduct; className?: string }) {
  const rect = AREAS[product]?.[area]
  if (!rect) return null
  const isBack = area === 'back'
  const shape = SHAPES[product]
  const extra = isBack ? shape.extraBack : shape.extraFront
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <path d={isBack ? shape.back : shape.front} fill="#fff" stroke={STROKE} strokeWidth={1.5} strokeLinejoin="round" fillRule="evenodd" />
      {extra && <path d={extra} fill="none" stroke={STROKE} strokeWidth={1.5} strokeLinecap="round" />}
      <rect x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]} rx={1.5} fill={PRINT} />
    </svg>
  )
}

// Area-button layout: large areas (front/back) on the first row, chest logos
// on one compact row in reading order ימין → אמצעי → שמאל (RTL puts ימין right).
const CHEST_ORDER = ['chest_logo', 'chest_logo_center', 'chest_logo_right']
export const isChestArea = (id: string) => id.startsWith('chest_logo')
export const AREA_ROW_COLS = ['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3']
export function areaRows<T extends { id: string }>(areas: readonly T[]): T[][] {
  const chest = areas.filter(a => isChestArea(a.id)).sort((a, b) => CHEST_ORDER.indexOf(a.id) - CHEST_ORDER.indexOf(b.id))
  return [areas.filter(a => !isChestArea(a.id)), chest].filter(row => row.length > 0)
}
