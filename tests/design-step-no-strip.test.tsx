import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import DesignStep from '@/components/designer/DesignStep'
import type { DesignArea } from '@/lib/types'

// TICKET-010: the size control moved under the preview (EnlargeRows, rendered
// by the designer). The step card itself — mobile rows and desktop file card —
// carries no size control any more.

vi.mock('@/lib/storage', () => ({
  uploadDesignFile: async () => 'https://storage.example.com/x.png',
  generateUniqueFileName: (name: string) => name,
}))

afterEach(cleanup)

const designs: DesignArea[] = [
  { area: 'front_full', areaName: 'קידמי מלא', imageUrl: 'https://example.com/a.png', fileName: 'a.png', enlarge: 2 },
  { area: 'back', areaName: 'גב', imageUrl: 'https://example.com/b.png', fileName: 'b.png' },
]

describe('DesignStep — no size strip inside the step card', () => {
  it('renders no radiogroup and no size wording with front_full and back designs', () => {
    const { container } = render(<DesignStep designs={designs} fabricType="cotton" onUpdate={() => {}} />)
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/גודל ההדפס|הגדלת העיצוב/)
    expect(screen.queryByRole('button', { name: 'הגדלת העיצוב' })).not.toBeInTheDocument()
  })
})
