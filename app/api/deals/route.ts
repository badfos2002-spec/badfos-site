/** GET /api/deals — public: live deals, sorted, exactly the Deal fields (TICKET-022). */
import { NextResponse } from 'next/server'
import { getLiveDeals } from '@/lib/deals-server'

export const revalidate = 60

export async function GET() {
  const deals = await getLiveDeals()
  return NextResponse.json(
    { deals },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
  )
}
