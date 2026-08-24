/**
 * In-memory double for @/lib/firebase-admin, used ONLY by
 * scripts/test-payment-pause.ts. Loaded in place of the real module via
 * tsconfig.payment-pause-test.json (paths override):
 *
 *   npx tsx --tsconfig tsconfig.payment-pause-test.json scripts/test-payment-pause.ts
 *
 * Only the Firestore read underneath areOrdersPaused() is fake — the route
 * handler in app/api/payment/create/route.ts runs exactly as it does in
 * production. Nothing here touches production Firestore.
 */

export type PauseFlagMode =
  /** settings/orders exists with { paused: true } */
  | 'paused'
  /** settings/orders exists with { paused: false } */
  | 'open'
  /** settings/orders does not exist at all */
  | 'missing'
  /** the read itself throws (Firestore outage) */
  | 'throw'
  /**
   * FIREBASE_ADMIN_* missing or mis-rotated. lib/firebase-admin.ts swallows the
   * init error and exports `adminDb` as undefined, so the route blows up on
   * property access rather than on the read — reproduced here exactly.
   */
  | 'unconfigured'

export const __stub = {
  mode: 'open' as PauseFlagMode,
  /** every fake operation, in order, so tests can assert what ran and when */
  events: [] as string[],
  reset(mode: PauseFlagMode = 'open') {
    this.mode = mode
    this.events = []
  },
}

const liveDb = {
  collection: (collection: string) => ({
    doc: (docId: string) => ({
      async get() {
        __stub.events.push(`read:${collection}/${docId}`)
        if (__stub.mode === 'throw') {
          throw new Error('stub: 14 UNAVAILABLE — could not reach Firestore backend')
        }
        if (__stub.mode === 'missing') {
          return { exists: false, data: () => undefined }
        }
        return {
          exists: true,
          data: () => ({ paused: __stub.mode === 'paused', updatedAt: null }),
        }
      },
    }),
  }),
}

/**
 * Stands in for the exported binding itself: when the Admin SDK failed to
 * initialise, the real module leaves `adminDb` undefined and every property
 * access on it is a TypeError.
 */
export const adminDb = new Proxy({} as any, {
  get(_target, prop) {
    if (__stub.mode === 'unconfigured') return undefined
    return (liveDb as any)[prop]
  },
}) as any

export const adminStorage = {} as any
export const adminAuth = {} as any
export const adminApp = {} as any
