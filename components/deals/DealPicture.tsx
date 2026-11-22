import { Tag } from 'lucide-react'
import { dealImage, type DealImageVariant } from '@/lib/deals'
import type { Deal } from '@/lib/types'

type Props = {
  deal: Pick<Deal, 'title' | 'imageSquare' | 'imageMobile' | 'imageDesktop'>
  /** Force one shape everywhere (admin preview). Default: mobile < 768px, desktop ≥ 768px. */
  variant?: DealImageVariant
  /** Per-breakpoint shape instead of the default pair (TICKET-025A). */
  shapes?: { base: DealImageVariant; md: DealImageVariant }
  /** Aspect box classes; default 4:5 on mobile, 16:10 from md. */
  aspect?: string
  className?: string
  eager?: boolean
}

const BOX: Record<DealImageVariant, string> = { square: 'aspect-square', mobile: 'aspect-[4/5]', desktop: 'aspect-[16/10]' }

/** Deal graphic in a fixed aspect box, centre-cropped (`object-cover`). */
export default function DealPicture({ deal, variant, shapes, aspect, className = '', eager }: Props) {
  const { base, md } = variant ? { base: variant, md: variant } : shapes ?? { base: 'mobile' as const, md: 'desktop' as const }
  const src = dealImage(deal, base)
  const mdSrc = dealImage(deal, md)
  const box = aspect ?? (variant ? BOX[variant] : 'aspect-[4/5] md:aspect-[16/10]')

  return (
    <div className={`relative w-full overflow-hidden bg-gradient-to-br from-yellow-100 to-orange-100 ${box} ${className}`}>
      {src ? (
        <picture>
          {mdSrc && mdSrc !== src && <source media="(min-width: 768px)" srcSet={mdSrc} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={deal.title}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : undefined}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </picture>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Tag className="h-12 w-12 text-yellow-500/60" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}
