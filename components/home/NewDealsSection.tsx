'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Tag } from 'lucide-react'
import DealPicture from '@/components/deals/DealPicture'
import { dealPath } from '@/lib/deals'
import type { Deal } from '@/lib/types'

const MAX_DEALS = 3

/** Home: up to 3 live deals from /api/deals + «לכל המבצעים»; renders nothing when there are none (TICKET-022). */
export default function NewDealsSection() {
  const [deals, setDeals] = useState<Deal[]>([])

  useEffect(() => {
    let alive = true
    fetch('/api/deals')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && Array.isArray(data?.deals)) setDeals(data.deals.slice(0, MAX_DEALS))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (deals.length === 0) return null

  return (
    <section className="bg-gradient-to-b from-white to-yellow-50 py-14 md:py-20" dir="rtl">
      <div className="mx-auto max-w-[1536px] px-4 md:px-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#ffc32e] px-4 py-1.5 text-sm font-extrabold text-[#3b2600]">
              <Tag className="h-4 w-4" aria-hidden="true" />
              מבצעים
            </div>
            <h2 className="text-3xl font-black text-[#1e293b] lg:text-4xl">המבצעים שלנו עכשיו</h2>
          </div>
          <Link
            href="/deals"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-yellow-300 bg-white px-5 font-bold text-yellow-700 hover:bg-yellow-50"
          >
            לכל המבצעים
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {deals.map((deal) => (
            <Link key={deal.id} href={dealPath(deal.slug)} className="group block">
              <article
                data-testid="home-deal-card"
                className="flex items-center gap-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-md transition-shadow group-hover:shadow-xl md:flex-col md:items-stretch md:gap-0 md:p-0"
              >
                <div className="w-24 flex-shrink-0 overflow-hidden rounded-xl md:w-full md:rounded-none">
                  <DealPicture deal={deal} aspect="aspect-square md:aspect-[16/10]" />
                </div>
                <div className="min-w-0 flex-1 md:p-4">
                  <h3 className="line-clamp-2 text-lg font-bold text-gray-900 group-hover:text-yellow-600">{deal.title}</h3>
                  {deal.priceText && (
                    <span className="mt-2 inline-block rounded-full bg-yellow-100 px-3 py-0.5 text-sm font-extrabold text-yellow-800">{deal.priceText}</span>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
