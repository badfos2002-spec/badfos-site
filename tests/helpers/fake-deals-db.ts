// In-memory stand-in for the slice of the Firestore Admin API that
// lib/deals-server.ts uses (collection('deals'): get / doc().get/set/update/delete
// and batch().update/commit). Not a test file — imported by deals-*.test.*.

type Data = Record<string, unknown>

export function createFakeDb(seed: Record<string, Data> = {}) {
  const store = new Map<string, Data>(Object.entries(seed).map(([k, v]) => [k, { ...v }]))
  let autoId = 0
  const writes: { op: string; id: string; data?: Data }[] = []
  const commits: { op: string; id: string }[][] = []

  const docRef = (id: string) => ({
    id,
    async get() {
      const data = store.get(id)
      return { id, exists: data !== undefined, data: () => (data ? { ...data } : undefined) }
    },
    async set(data: Data) {
      writes.push({ op: 'set', id, data })
      store.set(id, { ...data })
    },
    async update(data: Data) {
      if (!store.has(id)) throw new Error('NOT_FOUND')
      writes.push({ op: 'update', id, data })
      store.set(id, { ...store.get(id), ...data })
    },
    async delete() {
      writes.push({ op: 'delete', id })
      store.delete(id)
    },
  })

  const collection = (name: string) => {
    if (name !== 'deals') throw new Error(`unexpected collection ${name}`)
    return {
      doc: (id?: string) => docRef(id ?? `auto${++autoId}`),
      async get() {
        const docs = [...store.entries()].map(([id, data]) => ({ id, data: () => ({ ...data }) }))
        return { docs, size: docs.length, empty: docs.length === 0 }
      },
    }
  }

  const batch = () => {
    const ops: (() => void)[] = []
    const log: { op: string; id: string }[] = []
    return {
      set(ref: { id: string }, data: Data) {
        log.push({ op: 'set', id: ref.id })
        ops.push(() => {
          writes.push({ op: 'set', id: ref.id, data })
          store.set(ref.id, { ...data })
        })
      },
      update(ref: { id: string }, data: Data) {
        log.push({ op: 'update', id: ref.id })
        ops.push(() => {
          if (!store.has(ref.id)) throw new Error('NOT_FOUND')
          writes.push({ op: 'update', id: ref.id, data })
          store.set(ref.id, { ...store.get(ref.id), ...data })
        })
      },
      async commit() {
        commits.push(log)
        ops.forEach((op) => op())
      },
    }
  }

  return { db: { collection, batch }, store, writes, commits }
}

export const FIXTURE_DEALS: Record<string, Data> = {
  live1: {
    slug: 'מבצע-חורף',
    title: 'מבצע חורף',
    shortText: 'סווטשרטים במחיר מיוחד לכל החורף',
    priceText: '20% הנחה',
    imageMobile: '/images/deals/m.jpg',
    imageDesktop: '/images/deals/d.jpg',
    endsAt: '2099-12-31',
    isActive: true,
    sortOrder: 1,
    order: { href: '/designer/sweatshirt', label: 'להזמנת סווטשרט', couponCode: 'WINTER20' },
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    secretAdminNote: 'must not leak',
  },
  live2: {
    slug: 'כובעים',
    title: 'כובעים לקבוצות',
    shortText: 'כובע טמבל עם הדפס',
    isActive: true,
    sortOrder: 0,
    imageMobile: '/images/deals/cap.jpg',
    hero: { enabled: true, title: 'כובעים בהירו', text: 'טקסט הירו', ctaLabel: 'לכובעים' },
    createdAt: '2026-11-05T10:00:00.000Z',
    updatedAt: '2026-11-05T10:00:00.000Z',
  },
  expired: {
    slug: 'נגמר',
    title: 'מבצע שנגמר',
    shortText: 'כבר לא בתוקף',
    endsAt: '2020-01-01',
    isActive: true,
    sortOrder: 2,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
  inactive: {
    slug: 'כבוי',
    title: 'מבצע כבוי',
    shortText: 'לא פעיל',
    isActive: false,
    hero: { enabled: true },
    sortOrder: 3,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
}
