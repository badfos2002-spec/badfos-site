'use client'

import EnlargeControl from '@/components/designer/EnlargeControl'
import { canEnlarge, ENLARGEABLE_AREAS } from '@/lib/enlarge'
import type { DesignArea } from '@/lib/types'

/**
 * The print-size rows under the preview — one EnlargeControl per design whose
 * area can be enlarged (front_full, then back), on mobile and desktop alike.
 *
 * They sit beside the preview rather than in the area grid, so the customer
 * sees the print grow while pressing. A press also turns the preview to that
 * side (`onFocusArea`) — pressing "+1" on the back with the front in view
 * would otherwise change something they cannot see.
 *
 * Renders nothing when no design can be enlarged.
 */
export default function EnlargeRows({
  productType,
  designs,
  onChange,
  onFocusArea,
}: {
  productType?: string
  designs: DesignArea[]
  onChange: (area: string, steps: number) => void
  onFocusArea?: (area: string) => void
}) {
  const rows = ENLARGEABLE_AREAS
    .filter(area => canEnlarge(productType, area))
    .map(area => designs.find(d => d.area === area))
    .filter((d): d is DesignArea => !!d)
  if (rows.length === 0) return null

  return (
    <div data-enlarge-rows="" className="space-y-2">
      {rows.map(d => (
        <EnlargeControl
          key={d.area}
          productType={productType}
          area={d.area}
          hasDesign
          enlarge={d.enlarge}
          onChange={steps => {
            onChange(d.area, steps)
            onFocusArea?.(d.area)
          }}
        />
      ))}
    </div>
  )
}
