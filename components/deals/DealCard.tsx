import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import DealPicture from './DealPicture'
import DealActions from './DealActions'
import { dealPath, formatDealDate } from '@/lib/deals'
import type { Deal } from '@/lib/types'

type Props = {
  deal: Deal
  /** Admin preview: force an image variant and disable the links. */
  preview?: 'mobile' | 'desktop'
}

export default function DealCard({ deal, preview }: Props) {
  const href = dealPath(deal.slug || 'preview')
  return (
    <article data-testid="deal-card" className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
      {preview ? (
        <DealPicture deal={deal} variant={preview} />
      ) : (
        <Link href={href} tabIndex={-1} aria-hidden="true">
          <DealPicture deal={deal} />
        </Link>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {deal.priceText && (
            <span className="rounded-full bg-[#ffc32e] px-3 py-1 text-sm font-extrabold text-[#3b2600]">{deal.priceText}</span>
          )}
          {deal.endsAt && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {`עד ${formatDealDate(deal.endsAt)}`}
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold leading-snug text-gray-900">
          {preview ? (
            deal.title || 'כותרת המבצע'
          ) : (
            <Link href={href} className="hover:text-yellow-600">{deal.title}</Link>
          )}
        </h2>
        <p className="line-clamp-2 text-gray-600">{deal.shortText}</p>
        <div className="mt-auto pt-1">
          <DealActions deal={deal} inert={!!preview} />
        </div>
      </div>
    </article>
  )
}
