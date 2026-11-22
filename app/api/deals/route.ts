/**
 * GET /api/deals — public: live deals, sorted, exactly the Deal fields (TICKET-022).
 * `?hero=1` returns `{ deals }` — every live deal in the home hero, in sort order (TICKET-029).
 */
import { NextResponse } from 'next/server'
import { getHeroDeals, getLiveDeals } from '@/lib/deals-server'

export const revalidate = 60

const CACHE = { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' }

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get('hero') === '1') {
    return NextResponse.json({ deals: await getHeroDeals() }, { headers: CACHE })
  }
  return NextResponse.json({ deals: await getLiveDeals() }, { headers: CACHE })
}
