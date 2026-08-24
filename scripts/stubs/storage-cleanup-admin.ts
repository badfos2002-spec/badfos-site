/**
 * In-memory doubles for @/lib/firebase-admin, used ONLY by
 * scripts/test-storage-cleanup.ts. Loaded in place of the real module via
 * tsconfig.storage-cleanup-test.json (paths override):
 *
 *   npx tsx --tsconfig tsconfig.storage-cleanup-test.json scripts/test-storage-cleanup.ts
 *
 * These are real enough to run the production code paths unmodified — the route
 * handler, the reference scan, the planner and the deleter all execute exactly
 * as they do in production; only the storage engine underneath is fake. Every
 * mutation is recorded so a test can assert that NOTHING outside the plan moved.
 */

export interface StubFile {
  name: string
  size: number
  /** ISO string, or null/'' to simulate metadata Storage did not give us. */
  timeCreated: string | null
}

export const __stub = {
  /** collection -> docId -> data */
  collections: {} as Record<string, Record<string, Record<string, unknown>>>,
  /** every object in the fake bucket, across ALL prefixes */
  files: [] as StubFile[],
  events: [] as string[],
  /** collection names whose reads should throw, to test fail-closed behaviour */
  failReads: new Set<string>(),
  /** object paths whose delete should throw */
  failDeletes: new Set<string>(),
  /** verifyIdToken behaviour */
  token: null as null | { email: string; email_verified: boolean },
  tokenThrows: false,

  reset() {
    this.collections = {}
    this.files = []
    this.events = []
    this.failReads = new Set()
    this.failDeletes = new Set()
    this.token = { email: 'badfos2002@gmail.com', email_verified: true }
    this.tokenThrows = false
  },

  addDocs(collection: string, docs: Record<string, Record<string, unknown>>) {
    this.collections[collection] = { ...(this.collections[collection] || {}), ...docs }
  },

  addFile(name: string, size: number, ageDays: number | null, now = Date.now()) {
    this.files.push({
      name,
      size,
      timeCreated: ageDays === null ? null : new Date(now - ageDays * 86_400_000).toISOString(),
    })
  },

  /** Sorted snapshot of the bucket — for exact before/after comparison. */
  snapshot(): string[] {
    return this.files.map((f) => f.name).sort()
  },

  docSnapshot(): string[] {
    const out: string[] = []
    for (const [c, docs] of Object.entries(this.collections)) {
      for (const id of Object.keys(docs)) out.push(`${c}/${id}`)
    }
    return out.sort()
  },
}

// ── Firestore double ─────────────────────────────────────────────────────

function docsOf(name: string) {
  return Object.entries(__stub.collections[name] || {}).map(([id, data]) => ({
    id,
    exists: true,
    data: () => data,
    ref: {
      async delete() {
        __stub.events.push(`deleteDoc:${name}/${id}`)
        delete __stub.collections[name][id]
      },
      async update(patch: Record<string, unknown>) {
        __stub.events.push(`updateDoc:${name}/${id}`)
        Object.assign(__stub.collections[name][id], patch)
      },
    },
  }))
}

function makeQuery(name: string) {
  const q: any = {
    where: () => q,
    orderBy: () => q,
    limit: () => q,
    async get() {
      if (__stub.failReads.has(name)) throw new Error(`stub: read of ${name} failed`)
      __stub.events.push(`read:${name}`)
      return { docs: docsOf(name) }
    },
  }
  return q
}

function makeCollection(name: string) {
  const col: any = makeQuery(name)
  col.doc = (id: string) => ({
    async get() {
      if (__stub.failReads.has(name)) throw new Error(`stub: read of ${name} failed`)
      __stub.events.push(`readDoc:${name}/${id}`)
      const data = __stub.collections[name]?.[id]
      return { id, exists: data !== undefined, data: () => data }
    },
    async delete() {
      __stub.events.push(`deleteDoc:${name}/${id}`)
      if (__stub.collections[name]) delete __stub.collections[name][id]
    },
  })
  col.add = async (data: Record<string, unknown>) => {
    const id = `auto-${Math.random().toString(36).slice(2, 10)}`
    __stub.events.push(`addDoc:${name}/${id}`)
    __stub.collections[name] = __stub.collections[name] || {}
    __stub.collections[name][id] = data
    return { id }
  }
  return col
}

export const adminDb = {
  collection: (name: string) => makeCollection(name),
} as any

// ── Storage double ───────────────────────────────────────────────────────

export const adminStorage = {
  bucket: () => ({
    async getFiles({ prefix }: { prefix: string }) {
      __stub.events.push(`getFiles:${prefix}`)
      const files = __stub.files
        .filter((f) => f.name.startsWith(prefix))
        .map((f) => ({
          name: f.name,
          metadata: { size: String(f.size), timeCreated: f.timeCreated ?? undefined },
        }))
      return [files]
    },
    file: (path: string) => ({
      async delete() {
        if (__stub.failDeletes.has(path)) throw new Error(`stub: delete of ${path} failed`)
        __stub.events.push(`deleteFile:${path}`)
        __stub.files = __stub.files.filter((f) => f.name !== path)
      },
      async getMetadata() {
        const f = __stub.files.find((x) => x.name === path)
        if (!f) throw new Error('not found')
        return [{ size: String(f.size), timeCreated: f.timeCreated ?? undefined }]
      },
    }),
    async deleteFiles() {
      throw new Error('stub: deleteFiles (prefix delete) must never be called by this tool')
    },
  }),
} as any

// ── Auth double ──────────────────────────────────────────────────────────

export const adminAuth = {
  async verifyIdToken(_token: string) {
    if (__stub.tokenThrows || !__stub.token) throw new Error('stub: invalid token')
    return __stub.token
  },
} as any

export const adminApp = {} as any
