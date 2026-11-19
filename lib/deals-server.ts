/**
 * Server-only reads/writes of the `deals` collection via the Admin SDK (TICKET-022).
 * firestore.rules give the browser no access to `deals`; everything goes through here.
 * Every reader degrades to empty when the Admin SDK is not configured (local build).
 */
import { adminDb } from '@/lib/firebase-admin'
import { isDealLive, sortDeals, toDeal } from '@/lib/deals'
import type { Deal } from '@/lib/types'

export const DEALS_COLLECTION = 'deals'

export async function getAllDeals(): Promise<Deal[]> {
  if (!adminDb) return []
  const snap = await adminDb.collection(DEALS_COLLECTION).get()
  return sortDeals(snap.docs.map((d) => toDeal(d.id, d.data() as Record<string, unknown>)))
}

export async function getLiveDeals(now: Date = new Date()): Promise<Deal[]> {
  try {
    return (await getAllDeals()).filter((d) => isDealLive(d, now))
  } catch (e) {
    console.error('[deals] getLiveDeals failed', e)
    return []
  }
}

/** A live deal by slug, or null (unknown, inactive or expired). */
export async function getLiveDealBySlug(slug: string, now: Date = new Date()): Promise<Deal | null> {
  return (await getLiveDeals(now)).find((d) => d.slug === slug) ?? null
}

/** The deal shown in the home hero: first live deal (by sort order) with hero.enabled, or null. */
export async function getHeroDeal(now: Date = new Date()): Promise<Deal | null> {
  return (await getLiveDeals(now)).find((d) => d.hero?.enabled) ?? null
}
