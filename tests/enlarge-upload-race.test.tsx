import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DesignStep from '@/components/designer/DesignStep'
import EnlargeRows from '@/components/designer/EnlargeRows'
import { withEnlarge } from '@/lib/enlarge'
import type { DesignArea } from '@/lib/types'

// TICKET-005, the race the "+" creates in EXISTING upload code.
//
// DesignStep puts the artwork on the garment immediately from a local blob:
// URL and swaps in the https Storage URL when the upload lands — and that swap
// is written as `putDesign({ ...entry, imageUrl: permanentUrl })`, where
// `entry` was captured BEFORE the upload started. The customer can press "+"
// during those seconds (that is the whole point of the optimistic preview), and
// the swap would then overwrite their enlargement with the pre-upload snapshot:
// the chip disappears and the price silently drops back.
//
// TICKET-010 moved the size control out of DesignStep to EnlargeRows under the
// preview, so the press now arrives from the PARENT (the designer's state) —
// exactly what the harness below wires, the way TshirtDesigner does. The race
// is unchanged: the swap must re-read the area's current enlargement.
//
// This test presses a size button while the upload is in flight and then lets
// the swap land. It fails against the captured-entry code and passes once the swap
// merges the area's CURRENT enlargement.
//
// Everything that would touch the network is mocked at the module level
// (tests/setup.ts fails any real fetch/XHR).

const hoisted = vi.hoisted(() => ({
  resolveUpload: null as ((url: string) => void) | null,
}))

vi.mock('@/lib/storage', () => ({
  uploadDesignFile: () =>
    new Promise<string>(resolve => {
      hoisted.resolveUpload = resolve
    }),
  generateUniqueFileName: (name: string) => name,
}))

vi.mock('@/lib/print-image', () => ({
  preparePrintFile: async (file: File) => file,
  printUploadErrorMessage: () => 'שגיאה',
}))

const PERMANENT_URL = 'https://storage.example.com/designs/s1/art.png'

/** A real PNG header, so DesignStep's own signature sniff says "image/png" and
 *  the file is handed on untouched instead of going down the re-encode path. */
function pngFile(): File {
  const bytes = new Uint8Array(128)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  return new File([bytes], 'art.png', { type: 'image/png' })
}

function Harness() {
  const [designs, setDesigns] = useState<DesignArea[]>([])
  return (
    <>
      <DesignStep designs={designs} fabricType="cotton" onUpdate={setDesigns} />
      <EnlargeRows
        productType="tshirt"
        designs={designs}
        onChange={(area, steps) => setDesigns(prev => withEnlarge(prev, 'tshirt', area, steps))}
      />
      <output data-testid="designs">{JSON.stringify(designs)}</output>
    </>
  )
}

const designs = (): DesignArea[] => JSON.parse(screen.getByTestId('designs').textContent || '[]')
const frontFull = () => designs().find(d => d.area === 'front_full')

beforeEach(() => {
  hoisted.resolveUpload = null
  globalThis.createImageBitmap = (() =>
    Promise.resolve({ width: 1200, height: 1200, close: () => {} })) as unknown as typeof createImageBitmap
  URL.createObjectURL = () => 'blob:local-preview'
  URL.revokeObjectURL = () => {}
  // warmCache waits for an <img> to load the uploaded URL before the preview
  // switches to it. jsdom never loads anything, so fire onload instead of
  // leaning on the 5s fallback timer.
  class LoadingImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_url: string) {
      setTimeout(() => this.onload?.(), 0)
    }
  }
  ;(window as unknown as { Image: unknown }).Image = LoadingImage
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** Upload a file to קידמי מלא and wait for the optimistic blob: preview. */
async function uploadToFrontFull(user: ReturnType<typeof userEvent.setup>) {
  const [label] = screen.getAllByLabelText(/עיצוב לאזור קידמי מלא/)
  const input = label.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, pngFile())
  await waitFor(() => expect(frontFull()?.imageUrl).toBe('blob:local-preview'))
  await waitFor(() => expect(hoisted.resolveUpload).not.toBeNull())
}

describe('DesignStep — a "+" pressed while the upload is in flight survives the swap', () => {
  it('keeps the enlargement when the https URL lands', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await uploadToFrontFull(user)

    // The customer presses "+" while the upload is still running.
    await user.click(screen.getByRole('button', { name: '+1' }))
    await waitFor(() => expect(frontFull()?.enlarge).toBe(1))

    // The upload lands and the blob: preview is swapped for the Storage URL.
    hoisted.resolveUpload!(PERMANENT_URL)
    await waitFor(() => expect(frontFull()?.imageUrl).toBe(PERMANENT_URL))

    // The enlargement must still be there — this is the regression.
    expect(frontFull()?.enlarge).toBe(1)
  })

  it('keeps three presses made during the upload', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await uploadToFrontFull(user)

    await user.click(screen.getByRole('button', { name: '+1' }))
    await user.click(screen.getByRole('button', { name: '+2' }))
    await user.click(screen.getByRole('button', { name: '+3' }))
    await waitFor(() => expect(frontFull()?.enlarge).toBe(3))

    hoisted.resolveUpload!(PERMANENT_URL)
    await waitFor(() => expect(frontFull()?.imageUrl).toBe(PERMANENT_URL))
    expect(frontFull()?.enlarge).toBe(3)
  })

  it('an upload nobody enlarged still carries NO enlarge key', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await uploadToFrontFull(user)

    hoisted.resolveUpload!(PERMANENT_URL)
    await waitFor(() => expect(frontFull()?.imageUrl).toBe(PERMANENT_URL))
    expect('enlarge' in frontFull()!).toBe(false)
  })

  it('the swap still delivers the permanent URL and the file name', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await uploadToFrontFull(user)

    hoisted.resolveUpload!(PERMANENT_URL)
    await waitFor(() => expect(frontFull()?.imageUrl).toBe(PERMANENT_URL))
    expect(frontFull()?.fileName).toBe('art.png')
    expect(frontFull()?.areaName).toBe('קידמי מלא')
  })
})
