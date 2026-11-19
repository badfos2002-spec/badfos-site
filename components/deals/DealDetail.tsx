import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import DealPicture from './DealPicture'
import DealActions from './DealActions'
import DealStickyBar from './DealStickyBar'
import { formatDealDate } from '@/lib/deals'
import type { Deal } from '@/lib/types'

/** /deals/[slug]: image on the right (RTL first column), text on the left; sticky contact bar on mobile. */
export default function DealDetail({ deal }: { deal: Deal }) {
  return (
    <div className="min-h-screen bg-white pb-32 pt-6 lg:pb-16 lg:pt-10" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link href="/deals" className="mb-4 inline-flex min-h-[44px] items-center gap-1 font-medium text-gray-600 hover:text-yellow-600">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          לכל המבצעים
        </Link>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-12">
          <DealPicture deal={deal} eager className="rounded-2xl shadow-lg" />
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-black leading-tight text-gray-900 lg:text-4xl">{deal.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {deal.priceText && (
                <span className="rounded-full bg-[#ffc32e] px-4 py-1.5 text-lg font-extrabold text-[#3b2600]">{deal.priceText}</span>
              )}
              {deal.endsAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {`בתוקף עד ${formatDealDate(deal.endsAt)}`}
                </span>
              )}
            </div>
            <p className="whitespace-pre-line text-lg leading-relaxed text-gray-700">{deal.shortText}</p>
            <div className="lg:max-w-md">
              <DealActions deal={deal} />
            </div>
          </div>
        </div>
      </div>
      <DealStickyBar deal={deal} />
    </div>
  )
}
