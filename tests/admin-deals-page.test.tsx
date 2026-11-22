import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within, act } from '@testing-library/react'
import type { Deal } from '@/lib/types'

// TICKET-022: /admin/deals — list, add/edit, active toggle, sort order (up/down →
// reorder), two image uploaders (mobile/desktop) and a live preview. All writes
// go through POST /api/admin/deals.

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken: async () => 'test-token' } },
}))
const { uploadSiteImage } = vi.hoisted(() => ({
  uploadSiteImage: vi.fn(async (_f: File, _c: string, name: string) => `https://firebasestorage.googleapis.com/v0/b/badfos-28b67.firebasestorage.app/o/site-images%2Fdeals%2F${name}?alt=media`),
}))
vi.mock('@/lib/storage', () => ({ uploadSiteImage }))

import AdminDealsPage from '@/app/admin/deals/page'
import DealsManager from '@/components/admin/DealsManager'

const DEALS: Deal[] = [
  { id: 'a', slug: 'מבצע-חורף', title: 'מבצע חורף', shortText: 'x', imageSquare: '/images/deals/s.jpg', imageMobile: '/images/deals/m.jpg', imageDesktop: '/images/deals/d.jpg', isActive: true, sortOrder: 0, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '' },
  { id: 'b', slug: 'כבוי', title: 'מבצע כבוי', shortText: 'x', imageMobile: '/images/deals/only-m.jpg', isActive: false, sortOrder: 1, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '' },
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
    expect(await screen.findByText(/הקובץ גדול מדי/)).toBeInTheDocument()
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [pdf] } })
    expect(await screen.findByText(/רק קבצי JPG, PNG או WebP/)).toBeInTheDocument()
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

describe('admin deals — hero (Addendum A)', () => {
  it('the hero toggle + overrides are sent with save, and the preview shows the hero variant', async () => {
    await openNew()
    fireEvent.change(screen.getByLabelText('כותרת'), { target: { value: 'מבצע הירו' } })
    fireEvent.change(screen.getByLabelText('טקסט קצר'), { target: { value: 'טקסט' } })
    fireEvent.click(screen.getByLabelText('הצג את המבצע בהירו של דף הבית'))
    fireEvent.change(screen.getByLabelText(/כותרת בהירו/), { target: { value: 'כותרת גדולה' } })
    fireEvent.change(screen.getByLabelText(/טקסט בהירו/), { target: { value: 'טקסט הירו' } })
    expect(within(screen.getByTestId('hero-preview')).getByText('כותרת גדולה')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'שמור' }))
    await waitFor(() => expect(calls.some((c) => c.action === 'save')).toBe(true))
    expect(calls.find((c) => c.action === 'save')!.deal.hero).toEqual({ enabled: true, title: 'כותרת גדולה', text: 'טקסט הירו', ctaLabel: '' })
  })

  it('marks the hero deal in the list', async () => {
    DEALS[0].hero = { enabled: true }
    render(<AdminDealsPage />)
    const rows = await screen.findAllByTestId('admin-deal-row')
    expect(within(rows[0]).getByText('בהירו')).toBeInTheDocument()
    expect(within(rows[1]).queryByText('בהירו')).not.toBeInTheDocument()
    delete DEALS[0].hero
  })
})

// TICKET-025A: a third, square slot — three uploaders in a fixed order, the square
// chain in the list thumbnail and the hero preview, and a soft (never blocking)
// shape warning measured in the browser (stubbed here through the `measure` prop).
describe('admin deals — the square image slot', () => {
  const openEditFirst = async (measure?: (url: string) => Promise<{ width: number; height: number }>) => {
    render(measure ? <DealsManager measure={measure} /> : <AdminDealsPage />)
    const rows = await screen.findAllByTestId('admin-deal-row')
    fireEvent.click(within(rows[0]).getByRole('button', { name: /עריכה/ }))
  }

  it('three uploaders — square, mobile, desktop — in that order, with the new hints', async () => {
    await openNew()
    expect([...document.querySelectorAll('input[type="file"]')].map((i) => i.id)).toEqual([
      'deal-image-square',
      'deal-image-mobile',
      'deal-image-desktop',
    ])
    expect(screen.getByLabelText('תמונה ריבועית')).toBeInTheDocument()
    expect(screen.getByText('לקרוסלה בדף הבית. ריבוע 1:1, מומלץ 1080×1080. JPG/PNG/WebP עד 5MB.')).toBeInTheDocument()
    expect(screen.getByLabelText('תמונה למובייל')).toBeInTheDocument()
    expect(screen.getByText('לעמוד המבצע ולכרטיסים בטלפון. לאורך 4:5, מומלץ 1080×1350.')).toBeInTheDocument()
    expect(screen.getByLabelText('תמונה לדסקטופ')).toBeInTheDocument()
    expect(screen.getByText('לעמוד המבצע ולכרטיסים במחשב. רחבה 16:10, מומלץ 1600×1000. אם חסרה תמונה למשבצת — תוצג הקרובה ביותר מהאחרות.')).toBeInTheDocument()
  })

  it('a square upload lands in site-images/deals as «…-square.ext» and is saved as imageSquare', async () => {
    await openNew()
    fireEvent.change(screen.getByLabelText('תמונה ריבועית'), { target: { files: [new File(['x'], 'sq.png', { type: 'image/png' })] } })
    await waitFor(() => expect(uploadSiteImage).toHaveBeenCalledTimes(1))
    expect(uploadSiteImage.mock.calls[0][1]).toBe('deals')
    expect(uploadSiteImage.mock.calls[0][2]).toMatch(/^\d+-square\.png$/)
    const url = await uploadSiteImage.mock.results[0].value
    await waitFor(() => expect(screen.getByAltText('תצוגה מקדימה — ריבועית')).toHaveAttribute('src', url))

    fireEvent.change(screen.getByLabelText('כותרת'), { target: { value: 'מבצע ריבוע' } })
    fireEvent.change(screen.getByLabelText('טקסט קצר'), { target: { value: 'טקסט' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמור' }))
    await waitFor(() => expect(calls.some((c) => c.action === 'save')).toBe(true))
    expect(calls.find((c) => c.action === 'save')!.deal.imageSquare).toBe(url)
  })

  it('warns about a landscape upload in the square slot and clears it on a square one', async () => {
    const measure = vi
      .fn()
      .mockResolvedValueOnce({ width: 1600, height: 900 })
      .mockResolvedValueOnce({ width: 1080, height: 1080 })
    render(<DealsManager measure={measure} />)
    await screen.findByText('מבצע חורף')
    fireEvent.click(screen.getByRole('button', { name: /מבצע חדש/ }))
    const input = screen.getByLabelText('תמונה ריבועית')

    fireEvent.change(input, { target: { files: [new File(['x'], 'wide.png', { type: 'image/png' })] } })
    expect(await screen.findByTestId('deal-image-warning-square')).toHaveTextContent('התמונה שהועלתה שוכבת ולא ריבועית — תיחתך מהמרכז')
    // never blocking: the field is set and saving is still available
    expect(screen.getByRole('button', { name: 'שמור' })).toBeEnabled()

    fireEvent.change(input, { target: { files: [new File(['x'], 'ok.png', { type: 'image/png' })] } })
    await waitFor(() => expect(screen.queryByTestId('deal-image-warning-square')).not.toBeInTheDocument())
  })

  it('measures a slot that already holds a URL when the form opens, and «הסר תמונה» clears only its own slot', async () => {
    const measure = vi.fn(async (url: string) => (url.endsWith('s.jpg') ? { width: 1600, height: 900 } : { width: 0, height: 0 }))
    await openEditFirst(measure)
    expect(await screen.findByTestId('deal-image-warning-square')).toHaveTextContent('התמונה שהועלתה שוכבת ולא ריבועית — תיחתך מהמרכז')
    expect(screen.queryByTestId('deal-image-warning-mobile')).not.toBeInTheDocument()
    expect(screen.queryByTestId('deal-image-warning-desktop')).not.toBeInTheDocument()
    expect(measure.mock.calls.map((c) => c[0])).toEqual(['/images/deals/s.jpg', '/images/deals/m.jpg', '/images/deals/d.jpg'])

    fireEvent.click(within(screen.getByTestId('deal-uploader-square')).getByRole('button', { name: 'הסר תמונה' }))
    await waitFor(() => expect(screen.queryByTestId('deal-image-warning-square')).not.toBeInTheDocument())
    expect(screen.queryByAltText('תצוגה מקדימה — ריבועית')).not.toBeInTheDocument()
    expect(screen.getByAltText('תצוגה מקדימה — מובייל')).toHaveAttribute('src', '/images/deals/m.jpg')
    expect(screen.getByAltText('תצוגה מקדימה — דסקטופ')).toHaveAttribute('src', '/images/deals/d.jpg')
  })

  // A measurement is async: whatever the admin does next must win over a late result.
  describe('a measurement still in flight', () => {
    const uploadInto = (slot: string, name: string) =>
      fireEvent.change(screen.getByLabelText(slot), { target: { files: [new File(['x'], name, { type: 'image/png' })] } })

    const openWith = async (measure: () => Promise<{ width: number; height: number }>) => {
      render(<DealsManager measure={measure} />)
      await screen.findByText('מבצע חורף')
      fireEvent.click(screen.getByRole('button', { name: /מבצע חדש/ }))
    }

    it('does not paint a warning on a slot that was cleared meanwhile', async () => {
      const pending: ((s: { width: number; height: number }) => void)[] = []
      const measure = vi.fn(() => new Promise<{ width: number; height: number }>((res) => pending.push(res)))
      await openWith(measure)
      uploadInto('תמונה ריבועית', 'wide.png')
      await waitFor(() => expect(measure).toHaveBeenCalledTimes(1))

      fireEvent.click(within(screen.getByTestId('deal-uploader-square')).getByRole('button', { name: 'הסר תמונה' }))
      await waitFor(() => expect(screen.queryByAltText('תצוגה מקדימה — ריבועית')).not.toBeInTheDocument())

      await act(async () => pending[0]({ width: 1600, height: 900 }))
      expect(screen.queryByTestId('deal-image-warning-square')).not.toBeInTheDocument()
    })

    it('does not carry a warning from a closed form into a freshly opened one', async () => {
      const pending: ((s: { width: number; height: number }) => void)[] = []
      const measure = vi.fn(() => new Promise<{ width: number; height: number }>((res) => pending.push(res)))
      await openWith(measure)
      uploadInto('תמונה ריבועית', 'wide.png')
      await waitFor(() => expect(measure).toHaveBeenCalledTimes(1))

      fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))
      fireEvent.click(screen.getByRole('button', { name: /מבצע חדש/ }))
      await act(async () => pending[0]({ width: 1600, height: 900 }))
      expect(screen.queryByTestId('deal-image-warning-square')).not.toBeInTheDocument()
    })

    it('does not let an older measurement override the file that replaced it', async () => {
      const pending: ((s: { width: number; height: number }) => void)[] = []
      const measure = vi.fn(() => new Promise<{ width: number; height: number }>((res) => pending.push(res)))
      await openWith(measure)
      uploadInto('תמונה ריבועית', 'wide.png')
      await waitFor(() => expect(measure).toHaveBeenCalledTimes(1))
      uploadInto('תמונה ריבועית', 'square.png')
      await waitFor(() => expect(measure).toHaveBeenCalledTimes(2))

      await act(async () => pending[1]({ width: 1080, height: 1080 })) // the file now in the slot: fine
      await act(async () => pending[0]({ width: 1600, height: 900 })) // the replaced one: must be ignored
      expect(screen.queryByTestId('deal-image-warning-square')).not.toBeInTheDocument()
    })
  })

  it('the list thumbnail prefers the square image and falls back to the nearest one', async () => {
    render(<AdminDealsPage />)
    const rows = await screen.findAllByTestId('admin-deal-row')
    expect(rows[0].querySelector('img')).toHaveAttribute('src', '/images/deals/s.jpg')
    expect(rows[1].querySelector('img')).toHaveAttribute('src', '/images/deals/only-m.jpg')
  })

  it('the hero preview shows the square image, not the landscape one', async () => {
    await openEditFirst()
    fireEvent.click(screen.getByLabelText('הצג את המבצע בהירו של דף הבית'))
    const hero = screen.getByTestId('hero-preview')
    expect(hero.querySelector('picture img')).toHaveAttribute('src', '/images/deals/s.jpg')
  })
})

describe('admin deals — delete failure (review H5)', () => {
  it('keeps the row and shows an error when the API refuses the delete', async () => {
    const alert = vi.fn()
    vi.stubGlobal('alert', alert)
    const base = globalThis.fetch as unknown as (u: string, i: RequestInit) => Promise<Response>
    vi.stubGlobal('fetch', vi.fn(async (u: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body))
      if (body.action === 'delete') return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
      return base(u, init)
    }))
    render(<AdminDealsPage />)
    const rows = await screen.findAllByTestId('admin-deal-row')
    fireEvent.click(within(rows[1]).getByRole('button', { name: /מחק/ }))
    await waitFor(() => expect(alert).toHaveBeenCalledWith('שגיאה במחיקה'))
    expect(screen.getAllByTestId('admin-deal-row')).toHaveLength(3)
    expect(screen.getByText('מבצע כבוי')).toBeInTheDocument()
  })
})
