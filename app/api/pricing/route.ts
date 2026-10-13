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
 * FAIL OPEN to {} if the document is unreadable — exactly like
 * loadPricingOverrides in app/api/payment/create/route.ts, with the same
 * grep-able log marker, so the client falls back to code-default prices the
 * same way the server's verification does.
 */
export async function GET() {
  let data: Record<string, unknown> = {}
  try {
    const snap = await adminDb.collection('settings').doc('pricing').get()
    data = snap.exists ? (snap.data() as Record<string, unknown>) ?? {} : {}
  } catch (error) {
    console.error(
      '[PRICING_OVERRIDES_UNREADABLE] settings/pricing could not be read — serving {} (code-default prices). ' +
      'If the admin has overridden prices, clients are showing defaults until this recovers:',
      error
    )
  }
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
  })
}
