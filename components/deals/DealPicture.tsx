import { Tag } from 'lucide-react'
import { dealImage } from '@/lib/deals'
import type { Deal } from '@/lib/types'

type Props = {
  deal: Pick<Deal, 'title' | 'imageMobile' | 'imageDesktop'>
  /** Force one variant (admin preview). Default: mobile < 768px, desktop ≥ 768px. */
  variant?: 'mobile' | 'desktop'
  /** Aspect box classes; default 4:5 on mobile, 16:10 from md. */
  aspect?: string
  className?: string
  eager?: boolean
}

/** Deal graphic in a fixed aspect box, centre-cropped (`object-cover`). */
export default function DealPicture({ deal, variant, aspect, className = '', eager }: Props) {
  const mobile = dealImage(deal, 'mobile')
  const desktop = dealImage(deal, 'desktop')
  const box = aspect ?? (variant === 'desktop' ? 'aspect-[16/10]' : variant === 'mobile' ? 'aspect-[4/5]' : 'aspect-[4/5] md:aspect-[16/10]')
  const src = variant ? dealImage(deal, variant) : mobile

  return (
    <div className={`relative w-full overflow-hidden bg-gradient-to-br from-yellow-100 to-orange-100 ${box} ${className}`}>
      {src ? (
        <picture>
          {!variant && desktop && desktop !== mobile && <source media="(min-width: 768px)" srcSet={desktop} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={deal.title}
            loading={eager ? 'eager' : 'lazy'}
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
