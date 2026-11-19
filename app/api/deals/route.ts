/**
 * GET /api/deals — public: live deals, sorted, exactly the Deal fields (TICKET-022).
 * `?hero=1` returns `{ deal }` — the single deal shown in the home hero (or null).
 */
import { NextResponse } from 'next/server'
import { getHeroDeal, getLiveDeals } from '@/lib/deals-server'

export const revalidate = 60

const CACHE = { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' }

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get('hero') === '1') {
    return NextResponse.json({ deal: await getHeroDeal() }, { headers: CACHE })
  }
  return NextResponse.json({ deals: await getLiveDeals() }, { headers: CACHE })
}
