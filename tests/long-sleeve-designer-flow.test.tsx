import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// TICKET-017, the designer end to end: כותנה → שרוול ארוך lands on step 2
// (white/black only) in one tap, with no «יש לבחור סוג חולצה» alert in
// between. TICKET-018 gave long-sleeve its own 3D model, so its design step
// shows the 3D stage like cotton.

vi.mock('next/dynamic', () => ({
  default: () => function StageStub() { return <div data-testid="stage" /> },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  usePathname: () => '/designer/tshirt',
}))
vi.mock('@/lib/storage', () => ({
  uploadDesignFile: async () => 'https://storage.example.com/designs/s1/art.png',
  generateUniqueFileName: (name: string) => name,
}))
vi.mock('@/lib/print-image', () => ({
  preparePrintFile: async (file: File) => file,
  printUploadErrorMessage: () => 'שגיאה',
}))

import TshirtDesigner from '@/components/designer/TshirtDesigner'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

function seed(step: number, fabricType: string) {
  sessionStorage.setItem(
    'designer_session',
    JSON.stringify({ step, config: { productType: 'tshirt', fabricType, color: 'white', designs: [], sizes: [] }, timestamp: Date.now() })
  )
}

describe('TshirtDesigner — long-sleeve flow', () => {
  it('כותנה → שרוול ארוך advances to the colour step with white/black only', async () => {
    const user = userEvent.setup()
    render(<TshirtDesigner use3DPreview />)
    await user.click(screen.getAllByRole('button', { name: /^כותנה/ })[0])
    // The step card is mounted twice (mobile + desktop layouts, CSS hides one);
    // the sub-view opened in the one tapped — it shows no validation alert.
    const sub = screen.getByText('כותנה — איזה שרוול?').parentElement!
    expect(within(sub).queryByRole('alert')).toBeNull()
    await user.click(screen.getAllByRole('button', { name: /שרוול ארוך/ })[0])
    expect(screen.queryByText('יש לבחור סוג חולצה כדי להמשיך.')).toBeNull()
    expect(screen.getAllByText('בחר צבע').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'לבן' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'שחור' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'אפור' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'נייבי' })).toBeNull()
  })

  it('long-sleeve on the design step: the 3D stage (TICKET-018) and the sleeve areas', () => {
    seed(3, 'long-sleeve')
    render(<TshirtDesigner use3DPreview />)
    expect(screen.getAllByTestId('stage').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'חזית' })).toBeNull()
    expect(screen.getAllByText('שרוול ימין').length).toBeGreaterThan(0)
    expect(screen.getAllByText('שרוול שמאל').length).toBeGreaterThan(0)
  })

  it('cotton on the design step keeps the 3D stage and offers no sleeve area', () => {
    seed(3, 'cotton')
    render(<TshirtDesigner use3DPreview />)
    expect(screen.getAllByTestId('stage').length).toBeGreaterThan(0)
    expect(screen.queryByText('שרוול ימין')).toBeNull()
  })
})
