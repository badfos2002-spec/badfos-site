import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

// TICKET-022: the «אזור מבצעים» tab (settings/deals banner) is dead after the deals
// page; it is removed from /admin/discounts. Quantity discounts are untouched.

const getDoc = vi.fn(async (_ref: string) => ({ exists: () => false, data: () => ({}) }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn((_db, ...path: string[]) => path.join('/')), getDoc: (ref: string) => getDoc(ref), setDoc: vi.fn() }))
vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('@/lib/db', () => ({
  getAllDocuments: async () => [],
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
}))

import AdminDiscountsPage from '@/app/admin/discounts/page'

afterEach(() => cleanup())

describe('/admin/discounts', () => {
  it('has no «אזור מבצעים» tab and never reads settings/deals; the discounts form still renders', async () => {
    render(<AdminDiscountsPage />)
    expect(await screen.findByText('כללי הנחה אוטומטיים')).toBeInTheDocument()
    expect(screen.queryByText('אזור מבצעים')).not.toBeInTheDocument()
    expect(getDoc).not.toHaveBeenCalledWith('settings/deals')
    fireEvent.click(screen.getByRole('button', { name: /הנחה חדשה/ }))
    expect(screen.getByRole('heading', { name: 'הנחה חדשה' })).toBeInTheDocument()
  })
})
