import Link from 'next/link'
import { Tag } from 'lucide-react'
import DealCard from './DealCard'
import type { Deal } from '@/lib/types'

/** /deals body: hero + grid (1 col mobile, 2 md, 3 lg) or the empty state. */
export default function DealsGrid({ deals }: { deals: Deal[] }) {
  return (
    <div className="min-h-screen bg-white py-10" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-yellow-200 bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-700 shadow-sm">
            <Tag className="ml-2 h-4 w-4" aria-hidden="true" />
            מבצעים מתחלפים
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900 lg:text-4xl">מבצעים</h1>
          <p className="text-gray-600">המבצעים הפעילים שלנו כרגע. שאלה על מבצע? כתבו לנו בוואטסאפ או התקשרו.</p>
        </div>

        {deals.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl bg-gray-50 px-6 py-14 text-center">
            <Tag className="mx-auto mb-4 h-12 w-12 text-gray-300" aria-hidden="true" />
            <p className="mb-6 text-lg font-medium text-gray-700">אין מבצעים פעילים כרגע</p>
            <Link
              href="/packages"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#ffc32e] px-6 font-bold text-[#3b2600] hover:bg-[#f5b51c]"
            >
              לחבילות שלנו
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
