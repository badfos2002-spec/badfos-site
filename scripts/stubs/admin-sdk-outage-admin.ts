/**
 * In-memory double for @/lib/firebase-admin, used ONLY by
 * scripts/test-admin-sdk-outage.ts. Loaded in place of the real module via
 * tsconfig.admin-sdk-outage-test.json (paths override):
 *
 *   npx tsx --tsconfig tsconfig.admin-sdk-outage-test.json scripts/test-admin-sdk-outage.ts
 *
 * It reproduces the two states that matter and nothing else:
 *
 *   'healthy'      — the SDK initialised; adminDb/adminAuth/adminStorage work
 *                    and adminSdkUnavailable() returns null.
 *   'unconfigured' — FIREBASE_ADMIN_* missing or mis-rotated. The real module
 *                    swallows the init error and leaves the three exports
 *                    `undefined`, so every property access is a TypeError.
 *                    Reproduced exactly, including the message
 *                    adminSdkUnavailable() reports.
 *
 * The route handlers under test run completely unmodified.
 */

export type SdkMode = 'healthy' | 'unconfigured'

const INIT_ERROR =
  'Firebase Admin SDK not configured. Set FIREBASE_ADMIN_PROJECT_ID, ' +
  'FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in .env.local.'

export const __stub = {
  mode: 'healthy' as SdkMode,
  /** collection -> docId -> data */
  collections: {} as Record<string, Record<string, Record<string, unknown>>>,
  /** every mutation, in order */
  events: [] as string[],
  /** what verifyIdToken should do with a given token */
  validToken: 'good-token',
  tokenEmail: 'badfos2002@gmail.com',

  reset(mode: SdkMode = 'healthy') {
    this.mode = mode
    this.collections = {}
    this.events = []
    this.validToken = 'good-token'
    this.tokenEmail = 'badfos2002@gmail.com'
  },

  docs(collection: string): Record<string, Record<string, unknown>> {
    this.collections[collection] = this.collections[collection] || {}
    return this.collections[collection]
  },
}

// ── Firestore double ─────────────────────────────────────────────────────

function snapOf(collection: string, id: string) {
  const data = __stub.docs(collection)[id]
  return { id, exists: data !== undefined, data: () => data }
}

function docRef(collection: string, id: string) {
  const ref = {
    id,
    async get() {
      __stub.events.push(`read:${collection}/${id}`)
      return { ...snapOf(collection, id), ref }
    },
    async update(patch: Record<string, unknown>) {
      __stub.events.push(`update:${collection}/${id}`)
      Object.assign(__stub.docs(collection)[id], patch)
    },
    async set(data: Record<string, unknown>) {
      __stub.events.push(`set:${collection}/${id}`)
      __stub.docs(collection)[id] = data
    },
  }
  return ref
}

function query(collection: string) {
  const q: any = {
    where: () => q,
    orderBy: () => q,
    limit: () => q,
    async get() {
      __stub.events.push(`query:${collection}`)
      const docs = Object.keys(__stub.docs(collection)).map((id) => ({
        ...snapOf(collection, id),
        ref: docRef(collection, id),
      }))
      return { docs, empty: docs.length === 0 }
    },
  }
  return q
}

const liveDb = {
  collection: (name: string) => {
    const col: any = query(name)
    col.doc = (id: string) => docRef(name, id)
    col.add = async (data: Record<string, unknown>) => {
      const id = `auto-${Object.keys(__stub.docs(name)).length + 1}`
      __stub.events.push(`add:${name}/${id}`)
      __stub.docs(name)[id] = data
      return { id }
    }
    return col
  },
  async runTransaction(fn: (tx: any) => Promise<any>) {
    const tx = {
      async get(ref: any) {
        return ref.get()
      },
      update(ref: any, patch: Record<string, unknown>) {
        __stub.events.push(`tx-update:${ref.id}`)
        void ref.update(patch)
      },
      set(ref: any, data: Record<string, unknown>) {
        __stub.events.push(`tx-set:${ref.id}`)
        void ref.set(data)
      },
    }
    return fn(tx)
  },
}

const liveAuth = {
  async verifyIdToken(token: string) {
    __stub.events.push('verifyIdToken')
    if (token !== __stub.validToken) throw new Error('stub: invalid id token')
    return { email: __stub.tokenEmail, email_verified: true }
  },
}

const liveStorage = {
  bucket: () => ({
    name: 'badfos-test.appspot.com',
    file: () => ({
      async save() {},
      async delete() {},
      async getMetadata() {
        return [{ size: '0' }]
      },
    }),
    async getFiles() {
      return [[]]
    },
    async deleteFiles() {},
  }),
}

/**
 * Stands in for the exported bindings themselves: when the Admin SDK failed to
 * initialise, the real module leaves them `undefined`, so the Proxy returns
 * undefined for every property and callers blow up on access — exactly as in
 * production.
 */
function binding<T extends object>(live: T): T {
  return new Proxy({} as T, {
    get(_t, prop) {
      if (__stub.mode === 'unconfigured') return undefined
      return (live as any)[prop]
    },
  })
}

export const adminDb = binding(liveDb) as any
export const adminAuth = binding(liveAuth) as any
export const adminStorage = binding(liveStorage) as any
export const adminApp = {} as any

/** Mirrors the real helper: a reason when the SDK is unusable, null when fine. */
export function adminSdkUnavailable(): string | null {
  return __stub.mode === 'unconfigured' ? INIT_ERROR : null
}
