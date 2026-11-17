/**
 * TICKET-006 — everything the admin order-card 3D viewer can decide without a
 * canvas: which angles the producer gets a button for, what the saved PNG is
 * called, and how the order's stored designs become `ShirtDesign[]`.
 *
 * Pure module (no React, no three) so it can be unit-tested directly.
 */

import { angleForArea } from '@/components/designer/three/placements'
import type { ShirtVariant } from '@/components/designer/three/placements'
import type { ShirtDesign } from '@/components/designer/three/Tshirt3DModel'
import { getModel3D } from '@/lib/constants'
import { to3DDesigns } from '@/lib/enlarge'
import type { OrderItem } from '@/lib/types'

export interface ViewerAngle {
  /** The design area this angle faces — doubles as the button key. */
  area: string
  /** Hebrew button label, and the suffix of the saved file name. */
  label: string
  /** Turntable angle, straight from TICKET-004's `angleForArea`. */
  angle: number
}

/** A shoulder is only worth a button when something is actually printed on it. */
const SHOULDERS: readonly { area: string; label: string }[] = [
  { area: 'shoulder_right', label: 'כתף ימין' },
  { area: 'shoulder_left', label: 'כתף שמאל' },
]

/** The item's 3D variant — the same mapping the designers use. */
function variantOf(item: OrderItem): ShirtVariant | undefined {
  return getModel3D(item.productType, item.fabricType)?.variant as ShirtVariant | undefined
}

/**
 * Front and back always (a garment has two sides to check), plus a quarter turn
 * for each shoulder that carries a print. The angles are NEVER derived here:
 * `angleForArea` owns the relation between a placement's projector rotation and
 * the turntable, so a shoulder's sign can only ever be wrong in one place.
 */
export function anglesForItem(item: OrderItem): ViewerAngle[] {
  const variant = variantOf(item)
  const designs = Array.isArray(item.designs) ? item.designs : []
  const angles: ViewerAngle[] = [
    { area: 'front_full', label: 'קדימה', angle: angleForArea(variant, 'front_full') },
    { area: 'back', label: 'גב', angle: angleForArea(variant, 'back') },
  ]
  for (const shoulder of SHOULDERS) {
    if (designs.some(d => d?.area === shoulder.area)) {
      angles.push({ ...shoulder, angle: angleForArea(variant, shoulder.area) })
    }
  }
  return angles
}

/** Path separators and the characters macOS / Windows refuse in a file name. */
const UNSAFE_IN_FILENAME = /[\\/:*?"<>|]/g

/** `הזמנה-1592-פריט-1-כתף ימין.png` — items are numbered from 1 for the producer. */
export function snapshotFileName(orderNumber: number, index: number, angleLabel: string): string {
  return `הזמנה-${orderNumber}-פריט-${index + 1}-${angleLabel}.png`.replace(UNSAFE_IN_FILENAME, '-')
}

/**
 * Firebase Storage serves design images without CORS headers, so a WebGL
 * texture cannot read them — and a cross-origin texture also TAINTS the canvas,
 * which would make `toBlob` throw on the one action this feature exists for.
 * Same rule and same proxy as `Tshirt3DModel.useArtworkTexture`; rewriting here
 * is idempotent, because the rewritten url no longer matches that regex.
 */
function sameOriginUrl(url: string): string {
  return /^https:\/\/firebasestorage\.googleapis\.com\//.test(url)
    ? `/api/design-proxy?url=${encodeURIComponent(url)}`
    : url
}

/**
 * The order's stored designs, as the 3D stage wants them.
 *
 * The enlargement is NOT computed here: `to3DDesigns` (lib/enlarge.ts) is the
 * mapping every other Preview3DStage caller goes through, and it carries both
 * halves of the rule this viewer must not be alone in disagreeing with — the
 * 3-step ceiling (`enlarge: 7` is 1.3, never 1.7) and the product AND area gate
 * (only `front_full` / `back` of t-shirts and sweatshirts). The admin sees the
 * print at the size the customer paid for, or it is a bug.
 */
export function viewerDesignsFor(item: OrderItem): ShirtDesign[] {
  const designs = Array.isArray(item.designs) ? item.designs : []
  return to3DDesigns(
    item.productType,
    designs
      .filter(d => d?.imageUrl)
      .map(d => ({ area: d.area, url: sameOriginUrl(d.imageUrl), enlarge: d.enlarge }))
  )
}
