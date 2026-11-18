import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'

// TICKET-021: in the prefix modes the panel used to auto-select EVERY candidate
// (3,622 files on 18.11.2026) and the server refused anything over the per-run
// cap. The default selection must now fit the cap, and the panel must refuse to
// open the confirm modal over it.

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken: async () => 'test-token' } },
}))

import StorageCleanupPanel from '@/components/admin/StorageCleanupPanel'
import { MAX_DELETIONS_PER_RUN } from '@/lib/storage-cleanup'

type Group = { prefix: string; files: number; bytes: number; ambiguous?: boolean }

function payload(mode: string, groups: Group[], extra: Record<string, unknown> = {}) {
  const candidates = groups.flatMap((g) =>
    Array.from({ length: g.files }, (_, i) => ({
      path: `${g.prefix}f${i}.png`,
      sizeBytes: Math.round(g.bytes / g.files),
      ageDays: 120,
    }))
  )
  return {
    mode,
    planToken: 'plan-1',
    scan: { docsScanned: 1493, prefixesProtected: 641, byCollection: {} },
    minAgeDays: 90,
    scanned: 7520,
    scannedBytes: 6.52 * 1024 ** 3,
    skipped: { referenced: 3898 },
    ageBuckets: { under7d: 0, d7to30: 0, d30to90: 0, d90to180: 0, over180d: 0, unknown: 0 },
    totalFiles: candidates.length,
    totalBytes: candidates.reduce((s, c) => s + c.sizeBytes, 0),
    groups: groups.map((g) => ({ ...g, oldestAgeDays: 120, sample: [] })),
    candidates,
    ...extra,
  }
}

// 3,622 files, list order as the server returns it. Greedy ≤ 2,000:
// 1,200 ✓ (1,200) · 900 ✗ · 700 ✓ (1,900) · 500 ✗ · 300 ✗ · 12 ✓ · 6 ✓ · 4 ✓ → 1,922
const BIG: Group[] = [
  { prefix: 'designs/a/', files: 1200, bytes: 1200 * 1000 },
  { prefix: 'designs/b/', files: 900, bytes: 900 * 1000 },
  { prefix: 'designs/c/', files: 700, bytes: 700 * 1000 },
  { prefix: 'designs/d/', files: 500, bytes: 500 * 1000 },
  { prefix: 'designs/e/', files: 300, bytes: 300 * 1000 },
  { prefix: 'designs/f/', files: 12, bytes: 12 * 1000 },
  { prefix: 'designs/g/', files: 6, bytes: 6 * 1000 },
  { prefix: 'designs/h/', files: 4, bytes: 4 * 1000 },
]
const GREEDY = 1922

let previewResponse: unknown
let deleteResponse: unknown
const calls: Record<string, unknown>[] = []

beforeEach(() => {
  calls.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body))
      calls.push(body)
      const json =
        body.action === 'log'
          ? { entries: [], cronArmed: true }
          : body.action === 'preview'
            ? previewResponse
            : deleteResponse
      return new Response(JSON.stringify(json), { status: 200 })
    })
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const n = (x: number) => x.toLocaleString('he-IL')
/** strips the LTR isolates the panel wraps numbers in */
const txt = (el: Element | null) => (el?.textContent ?? '').replace(/[\u2066\u2069]/g, '')
const deleteButton = () => screen.queryByRole('button', { name: /^מחק [\d,]+ קבצים/ })

async function scan(modeLabel?: string) {
  render(<StorageCleanupPanel />)
  if (modeLabel) fireEvent.click(screen.getByRole('button', { name: modeLabel }))
  fireEvent.click(screen.getByRole('button', { name: 'סרוק' }))
  await screen.findByText(/נבחרו כעת/)
}

describe('StorageCleanupPanel — per-run cap on the selection (TICKET-021)', () => {
  it('exports the cap from the client-safe module', () => {
    expect(MAX_DELETIONS_PER_RUN).toBe(2000)
  })

  it('orphans over the cap: default selection is the greedy set ≤ cap, with a round notice', async () => {
    previewResponse = payload('orphans', BIG)
    await scan()
    const btn = deleteButton()!
    expect(btn).not.toBeNull()
    expect(txt(btn)).toContain(`מחק ${n(GREEDY)} קבצים`)
    expect((btn as HTMLButtonElement).disabled).toBe(false)
    const notice = screen.getByText(/סבב זה:/)
    expect(txt(notice)).toContain(n(GREEDY))
    expect(txt(notice)).toContain(n(3622))
    expect(txt(notice)).toContain(n(2000))
    expect(txt(notice)).toContain('לסרוק שוב לסבב הבא')
  })

  it('ticking beyond the cap disables delete and shows the red line; helpers clear and restore', async () => {
    previewResponse = payload('orphans', BIG)
    await scan()
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes.map((b) => b.checked)).toEqual([true, false, true, false, false, true, true, true])

    fireEvent.click(boxes[1]) // +900 → 2,822
    const btn = deleteButton() as HTMLButtonElement
    expect(txt(btn)).toContain(n(GREEDY + 900))
    expect(btn.disabled).toBe(true)
    expect(txt(screen.getByText(/המקסימום לריצה הוא/, { selector: '[role="alert"]' }))).toContain(
      `נבחרו ${n(GREEDY + 900)} קבצים`
    )
    fireEvent.click(btn)
    expect(screen.queryByText('מחיקה לצמיתות')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'נקה בחירה' }))
    expect(deleteButton()).toBeNull()
    expect((screen.getAllByRole('checkbox') as HTMLInputElement[]).every((b) => !b.checked)).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'בחר עד המקסימום' }))
    expect(txt(deleteButton()!)).toContain(`מחק ${n(GREEDY)} קבצים`)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('orphans under the cap: everything selected, no notice, button enabled', async () => {
    previewResponse = payload('orphans', [{ prefix: 'designs/x/', files: 1200, bytes: 1200 * 1000 }])
    await scan()
    const btn = deleteButton() as HTMLButtonElement
    expect(txt(btn)).toContain(`מחק ${n(1200)} קבצים`)
    expect(btn.disabled).toBe(false)
    expect(screen.queryByText(/סבב זה:/)).toBeNull()
    fireEvent.click(btn)
    expect(screen.getByText('מחיקה לצמיתות')).toBeTruthy()
  })

  it('old-orders: unchanged — checkboxes disabled and all checked, no helpers, no notice', async () => {
    previewResponse = payload('old-orders', [
      { prefix: 'orders/1/', files: 3, bytes: 3000 },
      { prefix: 'orders/2/', files: 2, bytes: 2000 },
    ], {
      fileLevel: {
        byGroup: {},
        remaining: { owners: 0, files: 0, bytes: 0 },
        oversized: [],
        eligibleOrders: 2,
        ordersInBatch: 2,
        stamps: 2,
        sharesToStamp: 0,
      },
    })
    await scan('עיצובים של הזמנות סגורות מעל 30 יום')
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes.every((b) => b.checked && b.disabled)).toBe(true)
    expect(screen.queryByRole('button', { name: 'נקה בחירה' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'בחר עד המקסימום' })).toBeNull()
    expect(screen.queryByText(/סבב זה:/)).toBeNull()
    expect(txt(deleteButton()!)).toContain(`מחק ${n(5)} קבצים`)
  })

  it('after an orphans delete with candidates remaining, the success line says to scan again', async () => {
    previewResponse = payload('orphans', BIG)
    deleteResponse = { deleted: GREEDY, bytesFreed: GREEDY * 1000, logged: true }
    await scan()
    fireEvent.click(deleteButton()!)
    const dialog = screen.getByText('מחיקה לצמיתות').closest('div')!.parentElement!
    fireEvent.change(within(dialog).getByPlaceholderText('מחק לצמיתות'), { target: { value: 'מחק לצמיתות' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'מחק לצמיתות' }))
    await waitFor(() => expect(txt(screen.getByText(/^נמחקו/))).toContain('לסרוק שוב לסבב הבא'))
    expect(txt(screen.getByText(/^נמחקו/))).toContain(`נותרו ~${n(3622 - GREEDY)}`)
    const del = calls.find((c) => c.action === 'delete') as { paths: string[] }
    expect(del.paths).toHaveLength(GREEDY)
  })
})
