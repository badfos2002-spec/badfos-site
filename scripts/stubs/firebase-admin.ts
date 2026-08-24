/**
 * Stub של @/lib/firebase-admin לבדיקות בלבד.
 * נטען במקום המודול האמיתי דרך tsconfig.backup-test.json (paths override)
 * בהרצת: npx tsx --tsconfig tsconfig.backup-test.json scripts/test-backup.ts
 *
 * רושם כל פעולה (קריאה/שמירה/מחיקה) ל-events — כך אפשר לאמת סדר פעולות
 * (למשל: הגיבוי נשמר לפני כל מחיקה).
 */

export interface StubDoc {
  id: string
  data: Record<string, unknown>
}

export const __stub = {
  collections: {} as Record<string, StubDoc[]>,
  storageFiles: [] as string[],
  savedFiles: [] as Array<{ path: string; buf: Buffer }>,
  events: [] as string[],
  failSave: false,
  reset() {
    this.collections = {}
    this.storageFiles = []
    this.savedFiles = []
    this.events = []
    this.failSave = false
  },
}

function makeQuery(name: string) {
  const q = {
    where: () => q,
    orderBy: () => q,
    limit: () => q,
    async get() {
      __stub.events.push(`read:${name}`)
      const docs = (__stub.collections[name] || []).map((d) => ({
        id: d.id,
        data: () => d.data,
        ref: {
          async delete() {
            __stub.events.push(`delete:${name}/${d.id}`)
          },
          async update(patch: Record<string, unknown>) {
            __stub.events.push(`update:${name}/${d.id}`)
            Object.assign(d.data, patch)
          },
        },
      }))
      return { docs }
    },
  }
  return q
}

export const adminDb = {
  collection: (name: string) => makeQuery(name),
} as any

export const adminStorage = {
  bucket: () => ({
    file: (path: string) => ({
      async save(buf: Buffer) {
        if (__stub.failSave) throw new Error('stub: storage save failed')
        __stub.events.push(`save:${path}`)
        __stub.savedFiles.push({ path, buf })
        __stub.storageFiles.push(path)
      },
    }),
    async getFiles({ prefix }: { prefix: string }) {
      const files = __stub.storageFiles
        .filter((name) => name.startsWith(prefix))
        .map((name) => ({
          name,
          metadata: { size: 0 },
          async delete() {
            __stub.events.push(`deleteFile:${name}`)
            __stub.storageFiles = __stub.storageFiles.filter((n) => n !== name)
          },
        }))
      return [files]
    },
    async deleteFiles({ prefix }: { prefix: string }) {
      __stub.events.push(`deleteFiles:${prefix}`)
    },
  }),
} as any

export const adminAuth = {} as any
export const adminApp = {} as any

/**
 * Mirrors the real helper. The doubles above are always present, so this stub
 * reports a healthy SDK — the outage direction is covered separately by
 * scripts/test-admin-sdk-outage.ts.
 */
export function adminSdkUnavailable(): string | null {
  return null
}
