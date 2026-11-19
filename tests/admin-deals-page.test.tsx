import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import type { Deal } from '@/lib/types'

// TICKET-022: /admin/deals — list, add/edit, active toggle, sort order (up/down →
// reorder), two image uploaders (mobile/desktop) and a live preview. All writes
// go through POST /api/admin/deals.

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken: async () => 'test-token' } },
}))
const uploadSiteImage = vi.fn(async (_f: File, _c: string, name: string) => `https://firebasestorage.googleapis.com/v0/b/b/o/site-images%2Fdeals%2F${name}?alt=media`)
vi.mock('@/lib/storage', () => ({ uploadSiteImage }))

import AdminDealsPage from '@/app/admin/deals/page'

const DEALS: Deal[] = [
  { id: 'a', slug: 'מבצע-חורף', title: 'מבצע חורף', shortText: 'x', isActive: true, sortOrder: 0, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '' },
  { id: 'b', slug: 'כבוי', title: 'מבצע כבוי', shortText: 'x', isActive: false, sortOrder: 1, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '' },
  { id: 'c', slug: 'נגמר', title: 'מבצע שנגמר', shortText: 'x', isActive: true, endsAt: '2020-01-01', sortOrder: 2, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '' },
]

const calls: Record<string, any>[] = []

beforeEach(() => {
  calls.length = 0
  uploadSiteImage.mockClear()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body))
      calls.push({ ...body, auth: (init.headers as Record<string, string>).Authorization })
      if (body.action === 'list') return new Response(JSON.stringify({ deals: DEALS }))
      if (body.action === 'save') return new Response(JSON.stringify({ deal: { ...body.deal, id: body.deal.id ?? 'new1', createdAt: 'now', updatedAt: 'now' } }))
      return new Response(JSON.stringify({ ok: true }))
    })
  )
  vi.stubGlobal('confirm', () => true)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function openNew() {
  render(<AdminDealsPage />)
  await screen.findByText('מבצע חורף')
  fireEvent.click(screen.getByRole('button', { name: /מבצע חדש/ }))
}

describe('admin deals — list', () => {
  it('loads every deal with its status chip, using the admin token', async () => {
    render(<AdminDealsPage />)
    const rows = await screen.findAllByTestId('admin-deal-row')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getByText('פעיל')).toBeInTheDocument()
    expect(within(rows[1]).getByText('לא פעיל')).toBeInTheDocument()
    expect(within(rows[2]).getByText('פג תוקף')).toBeInTheDocument()
    expect(calls[0]).toMatchObject({ action: 'list', auth: 'Bearer test-token' })
  })

  it('«למטה» on the first deal calls reorder with the new order', async () => {
    render(<AdminDealsPage />)
    const rows = await screen.findAllByTestId('admin-deal-row')
    fireEvent.click(within(rows[0]).getByRole('button', { name: /הזז למטה/ }))
    await waitFor(() => expect(calls.some((c) => c.action === 'reorder')).toBe(true))
    expect(calls.find((c) => c.action === 'reorder')!.ids).toEqual(['b', 'a', 'c'])
  })

  it('«למעלה» on the last deal calls reorder', async () => {
    render(<AdminDealsPage />)
    const rows = await screen.findAllByTestId('admin-deal-row')
    fireEvent.click(within(rows[2]).getByRole('button', { name: /הזז למעלה/ }))
    await waitFor(() => expect(calls.find((c) => c.action === 'reorder')?.ids).toEqual(['a', 'c', 'b']))
  })

  it('delete asks and calls the API', async () => {
    render(<AdminDealsPage />)
    const rows = await screen.findAllByTestId('admin-deal-row')
    fireEvent.click(within(rows[1]).getByRole('button', { name: /מחק/ }))
    await waitFor(() => expect(calls.find((c) => c.action === 'delete')?.id).toBe('b'))
  })
})

describe('admin deals — form', () => {
  it('shows validation messages and does not save an empty deal', async () => {
    await openNew()
    fireEvent.click(screen.getByRole('button', { name: 'שמור' }))
    expect(await screen.findByText('חובה למלא כותרת')).toBeInTheDocument()
    expect(screen.getByText('חובה למלא טקסט קצר')).toBeInTheDocument()
    expect(calls.some((c) => c.action === 'save')).toBe(false)
  })

  it('auto-fills a unique slug from the title until the slug is edited', async () => {
    await openNew()
    fireEvent.change(screen.getByLabelText('כותרת'), { target: { value: 'מבצע חורף' } })
    expect(screen.getByLabelText(/כתובת/)).toHaveValue('מבצע-חורף-2')
    fireEvent.change(screen.getByLabelText(/כתובת/), { target: { value: 'my-slug' } })
    fireEvent.change(screen.getByLabelText('כותרת'), { target: { value: 'משהו אחר' } })
    expect(screen.getByLabelText(/כתובת/)).toHaveValue('my-slug')
  })

  it('uploaders accept images only and reject files over 5 MB', async () => {
    await openNew()
    const input = screen.getByLabelText('תמונה למובייל') as HTMLInputElement
    expect(input.accept).toContain('image/')
    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.change(input, { target: { files: [big] } })
    expect(await screen.findByText(/עד 5MB/)).toBeInTheDocument()
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [pdf] } })
    expect(await screen.findByText(/JPG, PNG או WebP/)).toBeInTheDocument()
    expect(uploadSiteImage).not.toHaveBeenCalled()
  })

  it('uploads a valid image to site-images/deals and shows it', async () => {
    await openNew()
    const input = screen.getByLabelText('תמונה לדסקטופ') as HTMLInputElement
    const ok = new File(['x'], 'wide.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [ok] } })
    await waitFor(() => expect(uploadSiteImage).toHaveBeenCalledTimes(1))
    expect(uploadSiteImage.mock.calls[0][0]).toBe(ok)
    expect(uploadSiteImage.mock.calls[0][1]).toBe('deals')
    await waitFor(() => expect(screen.getByAltText('תצוגה מקדימה — דסקטופ')).toHaveAttribute('src', expect.stringContaining('site-images%2Fdeals%2F')))
  })

  it('saves a full deal with the order button and coupon', async () => {
    await openNew()
    fireEvent.change(screen.getByLabelText('כותרת'), { target: { value: 'מבצע כובעים' } })
    fireEvent.change(screen.getByLabelText('טקסט קצר'), { target: { value: 'כובעים לקבוצות' } })
    fireEvent.change(screen.getByLabelText(/מחיר/), { target: { value: '₪30 לכובע' } })
    fireEvent.change(screen.getByLabelText('תאריך סיום'), { target: { value: '2026-12-31' } })
    fireEvent.click(screen.getByLabelText(/כפתור «להזמנה»/))
    fireEvent.change(screen.getByLabelText('יעד הכפתור'), { target: { value: '/designer/cap' } })
    fireEvent.change(screen.getByLabelText('קוד קופון'), { target: { value: 'cap10' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמור' }))
    await waitFor(() => expect(calls.some((c) => c.action === 'save')).toBe(true))
    const saved = calls.find((c) => c.action === 'save')!.deal
    expect(saved).toMatchObject({
      title: 'מבצע כובעים',
      slug: 'מבצע-כובעים',
      shortText: 'כובעים לקבוצות',
      priceText: '₪30 לכובע',
      endsAt: '2026-12-31',
      isActive: true,
      order: { href: '/designer/cap', couponCode: 'CAP10' },
    })
  })

  it('shows a live preview at mobile and desktop widths', async () => {
    await openNew()
    fireEvent.change(screen.getByLabelText('כותרת'), { target: { value: 'תצוגה' } })
    const previews = screen.getAllByTestId('deal-card')
    expect(previews).toHaveLength(2)
    previews.forEach((p) => expect(within(p).getByText('תצוגה')).toBeInTheDocument())
  })
})
