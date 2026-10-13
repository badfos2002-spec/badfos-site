import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Same-origin mirror of the admin price overrides (settings/pricing).
 *
 * Why this exists: customers running content blockers can't reach
 * firestore.googleapis.com, so the client-side SDK load (PricingLoader) fails
 * and they see code-default prices — while the server (which reads the same
 * document via the admin SDK) verifies the charge against the OVERRIDDEN
 * prices and refuses with "Price mismatch". A same-origin request is never
 * touched by blockers, so this endpoint bypasses the problem entirely.
 *
 * Public by design: settings/pricing is already world-readable in the
 * Firestore rules — this exposes nothing new.
 *
 * Failure contract: a MISSING document is a legitimate "no overrides" and
 * returns 200 + {}. An UNREADABLE document returns 503 + no-store — never a
 * cacheable 200+{} that would wipe overrides already applied on the client
 * (applyPricingOverrides replaces wholesale) and silence the SDK fallback.
 * Both consumers handle it: PricingLoader falls back to the SDK, the checkout
 * safety belt keeps the already-loaded state.
 *
 * Reads are cached per warm instance for 60s (same pattern and TTL as
 * loadPricingOverrides in app/api/payment/create/route.ts — failures are
 * NEVER cached), and the last-known-good document is served, stale, when a
 * read fails mid-flight.
 */
const PRICING_TTL_MS = 60_000
let pricingCache: { data: Record<string, unknown>; at: number } | null = null

const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300' }

export async function GET() {
  if (pricingCache && Date.now() - pricingCache.at < PRICING_TTL_MS) {
    return NextResponse.json(pricingCache.data, { headers: CACHE_HEADERS })
  }
  try {
    const snap = await adminDb.collection('settings').doc('pricing').get()
    const data = snap.exists ? (snap.data() as Record<string, unknown>) ?? {} : {}
    pricingCache = { data, at: Date.now() }
    return NextResponse.json(data, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error(
      '[PRICING_OVERRIDES_UNREADABLE] settings/pricing could not be read — ' +
      (pricingCache ? 'serving the last-known-good overrides (stale).' : 'returning 503 (no last-known-good yet).') +
      ' If the admin has overridden prices, clients may show defaults until this recovers:',
      error
    )
    if (pricingCache) {
      return NextResponse.json(pricingCache.data, { headers: CACHE_HEADERS })
    }
    return NextResponse.json(
      { error: 'pricing_unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
