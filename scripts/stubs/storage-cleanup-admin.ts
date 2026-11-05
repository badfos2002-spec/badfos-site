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
 *
 * Real enough for the nightly cron route too (app/api/cleanup-old-designs):
 * where() filters on equality and on Timestamp/Date ranges, update() takes
 * dotted field paths and FieldValue sentinels, documents can be set/created,
 * files can be saved and checked for existence. (Extended from the double QA
 * built for the review rounds.)
 */
import { Timestamp } from 'firebase-admin/firestore'

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
  /** `collection/id` whose doc update should throw */
  failUpdates: new Set<string>(),
  /** verifyIdToken behaviour */
  token: null as null | { email: string; email_verified: boolean },
  tokenThrows: false,

  reset() {
    this.collections = {}
    this.files = []
    this.events = []
    this.failReads = new Set()
    this.failDeletes = new Set()
    this.failUpdates = new Set()
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

const millis = (v: any): number | null =>
  v instanceof Date ? v.getTime() : v && typeof v.toMillis === 'function' ? v.toMillis() : null

/** FieldValue sentinels → the value Firestore would store. */
function resolve(patch: Record<string, any>, prev: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(patch)) {
    const ctor = v && typeof v === 'object' ? v.constructor?.name : ''
    if (ctor === 'NumericIncrementTransform') out[k] = (typeof prev[k] === 'number' ? prev[k] : 0) + (v.operand ?? 1)
    else if (ctor === 'ServerTimestampTransform') out[k] = Timestamp.now()
    else if (ctor === 'DeleteTransform') out[k] = undefined
    else out[k] = v
  }
  return out
}

/** Apply a patch the way update() does: dotted keys are field paths. */
function apply(target: Record<string, any>, patch: Record<string, any>) {
  for (const [k, v] of Object.entries(resolve(patch, target))) {
    const parts = k.split('.')
    let o = target
    for (const p of parts.slice(0, -1)) o = o[p] = o[p] && typeof o[p] === 'object' ? o[p] : {}
    const last = parts[parts.length - 1]
    if (v === undefined) delete o[last]
    else o[last] = v
  }
}

function docRef(name: string, id: string) {
  return {
    id,
    async get() {
      if (__stub.failReads.has(name)) throw new Error(`stub: read of ${name} failed`)
      __stub.events.push(`readDoc:${name}/${id}`)
      const data = __stub.collections[name]?.[id]
      return { id, exists: data !== undefined, data: () => data, ref: docRef(name, id) }
    },
    async delete() {
      __stub.events.push(`deleteDoc:${name}/${id}`)
      if (__stub.collections[name]) delete __stub.collections[name][id]
    },
    async update(patch: Record<string, unknown>) {
      if (__stub.failUpdates.has(`${name}/${id}`)) throw new Error(`stub: update of ${name}/${id} failed`)
      const data = __stub.collections[name]?.[id]
      if (data === undefined) throw new Error(`stub: update of missing ${name}/${id}`)
      __stub.events.push(`updateDoc:${name}/${id}`)
      apply(data, patch)
    },
    async set(patch: Record<string, unknown>, opts?: { merge?: boolean }) {
      __stub.events.push(`setDoc:${name}/${id}`)
      __stub.collections[name] = __stub.collections[name] || {}
      const prev = opts?.merge ? __stub.collections[name][id] || {} : {}
      __stub.collections[name][id] = prev
      apply(prev, patch)
    },
    async create(data: Record<string, unknown>) {
      if (__stub.collections[name]?.[id]) throw Object.assign(new Error('exists'), { code: 6 })
      await this.set(data)
    },
  }
}

function makeQuery(name: string, filters: [string, string, any][] = []) {
  const q: any = {
    where: (field: string, op: string, value: any) => makeQuery(name, [...filters, [field, op, value]]),
    orderBy: () => q,
    limit: () => q,
    async get() {
      if (__stub.failReads.has(name)) throw new Error(`stub: read of ${name} failed`)
      __stub.events.push(`read:${name}`)
      const docs = Object.entries(__stub.collections[name] || {})
        .filter(([, data]) =>
          filters.every(([field, op, value]) => {
            const a = millis((data as any)[field])
            const b = millis(value)
            // Non-timestamp operands: equality only (a range never matches).
            if (a === null || b === null) return op === '==' ? (data as any)[field] === value : false
            return op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : op === '>=' ? a >= b : a === b
          })
        )
        .map(([id, data]) => ({ id, exists: true, data: () => data, ref: docRef(name, id) }))
      return { docs, size: docs.length, empty: docs.length === 0 }
    },
  }
  return q
}

export const adminDb = {
  collection: (name: string) => {
    const col: any = makeQuery(name)
    col.doc = (id: string) => docRef(name, id)
    col.add = async (data: Record<string, unknown>) => {
      const id = `auto-${Math.random().toString(36).slice(2, 10)}`
      __stub.events.push(`addDoc:${name}/${id}`)
      __stub.collections[name] = __stub.collections[name] || {}
      __stub.collections[name][id] = data
      return { id }
    }
    return col
  },
  /** No isolation — one test, one writer. Enough to run the claim transactions. */
  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return fn({
      get: (ref: any) => ref.get(),
      update: (ref: any, patch: Record<string, unknown>) => ref.update(patch),
      set: (ref: any, data: Record<string, unknown>, opts?: { merge?: boolean }) => ref.set(data, opts),
    })
  },
} as any

// ── Storage double ───────────────────────────────────────────────────────

function fileHandle(path: string) {
  return {
    name: path,
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
    async exists() {
      return [__stub.files.some((x) => x.name === path)]
    },
    async save(buf: Buffer) {
      __stub.events.push(`saveFile:${path}`)
      __stub.files = __stub.files.filter((f) => f.name !== path)
      __stub.files.push({ name: path, size: buf.length, timeCreated: new Date().toISOString() })
    },
  }
}

export const adminStorage = {
  bucket: () => ({
    name: 'badfos-28b67.firebasestorage.app',
    async getFiles({ prefix }: { prefix: string }) {
      __stub.events.push(`getFiles:${prefix}`)
      const files = __stub.files
        .filter((f) => f.name.startsWith(prefix))
        .map((f) => ({
          ...fileHandle(f.name),
          metadata: { size: String(f.size), timeCreated: f.timeCreated ?? undefined },
        }))
      return [files]
    },
    file: (path: string) => fileHandle(path),
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
export const adminSdkUnavailable = () => null
