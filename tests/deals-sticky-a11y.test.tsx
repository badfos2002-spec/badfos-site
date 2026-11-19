import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// Review H2: on the deal page the fixed sticky contact bar must not be covered by the
// floating accessibility button — while the bar is mounted the floating stack is raised.

vi.mock('@/lib/tracking', () => ({ trackWhatsAppClick: vi.fn(), trackPhoneClick: vi.fn() }))

import WhatsAppButton from '@/components/layout/WhatsAppButton'
import DealStickyBar from '@/components/deals/DealStickyBar'

afterEach(() => cleanup())

const stack = () => screen.getByRole('button', { name: 'כלי נגישות' }).parentElement!

describe('floating buttons vs the sticky deal bar', () => {
  it('sits in the normal corner without a fixed bar', () => {
    render(<WhatsAppButton />)
    expect(stack().className).toContain('bottom-4')
    expect(stack().className).not.toMatch(/bottom-\[calc/)
  })

  it('is raised above the bar while the bar is mounted, and drops back when it unmounts', () => {
    const { rerender } = render(<><WhatsAppButton /><DealStickyBar deal={{ title: 'מבצע', slug: 'מבצע' }} /></>)
    expect(stack().className).toContain('bottom-[calc(env(safe-area-inset-bottom)+88px)]')
    expect(stack().className).toContain('lg:bottom-6')
    expect(stack().className).not.toMatch(/(^|\s)bottom-4(\s|$)/)
    rerender(<WhatsAppButton />)
    expect(stack().className).toContain('bottom-4')
  })
})
