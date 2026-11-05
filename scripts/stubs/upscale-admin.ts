/**
 * In-memory stub of @/lib/firebase-admin for the base64-upscale test.
 * Loaded via tsconfig.upscale-test.json paths override. Records every Storage
 * save so the test can assert a base64 design was materialized to Storage.
 */

import { FieldValue } from 'firebase-admin/firestore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Order = Record<string, any>

export const __store = {
  orders: {} as Record<string, Order>,
  saved: [] as Array<{ path: string; bytes: number; contentType?: string; token?: string }>,
  /** Object paths that "exist" in the fake bucket — bucket().file(p).exists() reads this. */
  storageFiles: new Set<string>(),
  bucketName: 'badfos-test.appspot.com',
  reset() {
    this.orders = {}
    this.saved = []
    this.storageFiles = new Set()
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setPath(obj: any, path: string, value: any) {
  const parts = path.split('.')
  let o = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (typeof o[p] !== 'object' || o[p] === null) o[p] = {}
    o = o[p]
  }
  o[parts[parts.length - 1]] = value
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyPatch(data: Order, patch: Record<string, any>) {
  for (const [k, v] of Object.entries(patch)) {
    // FieldValue.delete() sentinel (the only FieldValue the code under test
    // writes to order docs) — remove the field like Firestore would.
    if (v instanceof FieldValue) {
      if (!k.includes('.')) delete data[k]
      continue
    }
    if (k.includes('.')) setPath(data, k, v)
    else data[k] = v
  }
}

function makeDocRef(id: string) {
  return {
    id,
    async get() {
      const exists = Object.prototype.hasOwnProperty.call(__store.orders, id)
      return { exists, data: () => (exists ? __store.orders[id] : undefined) }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async update(patch: Record<string, any>) {
      const data = __store.orders[id]
      if (!data) throw new Error(`stub update: order ${id} missing`)
      applyPatch(data, patch)
    },
    // usage-tracking counters etc. — irrelevant to these tests, accept silently
    async set() {},
  }
}

export const adminDb = {
  collection: (_name: string) => ({ doc: (id: string) => makeDocRef(id) }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async runTransaction(fn: (tx: any) => Promise<void>) {
    const tx = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async get(ref: any) {
        return ref.get()
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update(ref: any, patch: Record<string, any>) {
        const data = __store.orders[ref.id]
        if (!data) return
        applyPatch(data, patch)
      },
    }
    await fn(tx)
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

export const adminStorage = {
  bucket: () => ({
    name: __store.bucketName,
    file: (path: string) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async save(buf: Buffer, opts?: any) {
        __store.saved.push({
          path,
          bytes: buf.length,
          contentType: opts?.metadata?.contentType,
          token: opts?.metadata?.metadata?.firebaseStorageDownloadTokens,
        })
        __store.storageFiles.add(path)
      },
      async exists(): Promise<[boolean]> {
        return [__store.storageFiles.has(path)]
      },
    }),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const adminAuth = {} as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const adminApp = {} as any
