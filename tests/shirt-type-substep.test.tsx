import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShirtTypeStep from '@/components/designer/ShirtTypeStep'

// TICKET-017: step 1 of the t-shirt designer. «כותנה» opens a sleeve sub-view
// (שרוול קצר → cotton, שרוול ארוך +₪5 → long-sleeve); picking a sleeve selects
// it AND advances to step 2. The other fabrics keep select-then-«הבא».

afterEach(cleanup)

function setup(selectedType?: string) {
  const calls: string[] = []
  const onSelect = vi.fn((id: string) => { calls.push(`select:${id}`) })
  const onAdvance = vi.fn(() => { calls.push('advance') })
  render(<ShirtTypeStep selectedType={selectedType} onSelect={onSelect} onAdvance={onAdvance} />)
  return { onSelect, onAdvance, calls, user: userEvent.setup() }
}

const cottonCard = () => screen.getByRole('button', { name: /^כותנה/ })

describe('ShirtTypeStep — top level', () => {
  it('renders the four classic fabric cards — no fifth long-sleeve card', () => {
    setup()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    expect(screen.queryByRole('button', { name: /שרוול ארוך/ })).toBeNull()
    for (const name of [/^כותנה/, /^דרייפיט/, /^פולו/, /^אוברסייז/]) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })

  it('every card carries aria-pressed', () => {
    setup('polo')
    for (const b of screen.getAllByRole('button')) expect(b.getAttribute('aria-pressed')).not.toBeNull()
    expect(screen.getByRole('button', { name: /^פולו/ }).getAttribute('aria-pressed')).toBe('true')
  })

  it('other fabrics keep today\'s behaviour: select, no auto-advance', async () => {
    const { onSelect, onAdvance, user } = setup()
    await user.click(screen.getByRole('button', { name: /^דרייפיט/ }))
    expect(onSelect).toHaveBeenCalledWith('dri-fit')
    expect(onAdvance).not.toHaveBeenCalled()
  })
})

describe('ShirtTypeStep — cotton sleeve sub-view', () => {
  it('tapping כותנה swaps the grid for the two sleeve cards + a back link, without selecting', async () => {
    const { onSelect, user } = setup()
    await user.click(cottonCard())
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByText('כותנה — איזה שרוול?')).toBeTruthy()
    expect(screen.getByRole('button', { name: /שרוול קצר/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /שרוול ארוך/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /חזרה לסוגי הבד/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^דרייפיט/ })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('the long card shows the +₪5 surcharge', async () => {
    const { user } = setup()
    await user.click(cottonCard())
    expect(within(screen.getByRole('button', { name: /שרוול ארוך/ })).getByText('+₪5')).toBeTruthy()
  })

  it('שרוול ארוך → onSelect("long-sleeve") then onAdvance()', async () => {
    const { calls, user } = setup()
    await user.click(cottonCard())
    await user.click(screen.getByRole('button', { name: /שרוול ארוך/ }))
    expect(calls).toEqual(['select:long-sleeve', 'advance'])
  })

  it('שרוול קצר → onSelect("cotton") then onAdvance()', async () => {
    const { calls, user } = setup()
    await user.click(cottonCard())
    await user.click(screen.getByRole('button', { name: /שרוול קצר/ }))
    expect(calls).toEqual(['select:cotton', 'advance'])
  })

  it('the back link restores the grid without selecting anything', async () => {
    const { onSelect, onAdvance, user } = setup()
    await user.click(cottonCard())
    await user.click(screen.getByRole('button', { name: /חזרה לסוגי הבד/ }))
    expect(onSelect).not.toHaveBeenCalled()
    expect(onAdvance).not.toHaveBeenCalled()
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })
})

describe('ShirtTypeStep — returning with a cotton sleeve selected', () => {
  it('long-sleeve: the grid shows כותנה pressed with the caption «שרוול ארוך»', () => {
    setup('long-sleeve')
    expect(screen.getAllByRole('button')).toHaveLength(4)
    const card = cottonCard()
    expect(card.getAttribute('aria-pressed')).toBe('true')
    expect(within(card).getByText('שרוול ארוך')).toBeTruthy()
  })

  it('cotton: the caption reads «שרוול קצר»', () => {
    setup('cotton')
    const card = cottonCard()
    expect(card.getAttribute('aria-pressed')).toBe('true')
    expect(within(card).getByText('שרוול קצר')).toBeTruthy()
  })

  it('a non-cotton selection shows no sleeve caption on כותנה', () => {
    setup('polo')
    expect(cottonCard().getAttribute('aria-pressed')).toBe('false')
    expect(within(cottonCard()).queryByText(/שרוול/)).toBeNull()
  })

  it('reopening the sub-view highlights the current sleeve', async () => {
    const { user } = setup('long-sleeve')
    await user.click(cottonCard())
    expect(screen.getByRole('button', { name: /שרוול ארוך/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /שרוול קצר/ }).getAttribute('aria-pressed')).toBe('false')
  })
})
