import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { captureStagePng, saveBlobAs, MIN_PNG_BYTES } from '@/lib/order-snapshot'

// TICKET-006, the one failure mode this feature exists to avoid: a PNG that
// comes back black or half-drawn. The rule in this repo is that a capture waits
// for PIXELS, never for a timeout — so the capture reuses the sketch tool's
// `waitForRenderedFrame` (lib/sketch-preview.ts) and refuses anything that
// looks blank. jsdom has no WebGL and no 2d context, so the frame wait is
// mocked here and the ORDER of operations is what gets pinned.

const frame = vi.hoisted(() => ({ wait: vi.fn() }))
vi.mock('@/lib/sketch-preview', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/sketch-preview')>()),
  waitForRenderedFrame: frame.wait,
}))

const READY = { ready: true, timedOut: false, elapsedMs: 120, samples: 6, coverage: 0.4, lastDiff: 0 }
const BLANK = { ready: false, timedOut: true, elapsedMs: 12000, samples: 99, coverage: 0, lastDiff: 9 }

/** A real 3D still is tens of KB; this stands in for one. */
const realPng = () => new Blob([new Uint8Array(MIN_PNG_BYTES * 8)], { type: 'image/png' })
/** What an empty / single-colour canvas encodes to — about a kilobyte. */
const emptyPng = () => new Blob([new Uint8Array(900)], { type: 'image/png' })

function stage(blob: Blob | null, onToBlob?: () => void) {
  const container = document.createElement('div')
  const canvas = document.createElement('canvas')
  canvas.width = 780
  canvas.height = 780
  // jsdom implements neither toBlob nor a GL context.
  canvas.toBlob = ((cb: (b: Blob | null) => void) => {
    onToBlob?.()
    cb(blob)
  }) as HTMLCanvasElement['toBlob']
  container.appendChild(canvas)
  return container
}

beforeEach(() => {
  frame.wait.mockReset()
  frame.wait.mockResolvedValue(READY)
})

afterEach(() => vi.restoreAllMocks())

describe('captureStagePng — never hands back a blank frame', () => {
  it('returns the PNG once the frame is actually rendered', async () => {
    const blob = await captureStagePng(stage(realPng()))

    expect(blob).toBeInstanceOf(Blob)
    expect(blob!.type).toBe('image/png')
    // The whole point: bigger than a trivially empty PNG.
    expect(blob!.size).toBeGreaterThan(MIN_PNG_BYTES)
  })

  it('waits for the pixels BEFORE reading the canvas — not a setTimeout', async () => {
    let release: (d: typeof READY) => void = () => {}
    frame.wait.mockImplementation(() => new Promise(res => { release = res }))
    const read = vi.fn()

    const pending = captureStagePng(stage(realPng(), read))
    await Promise.resolve()
    expect(read).not.toHaveBeenCalled()

    release(READY)
    await pending
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('a frame that never showed a scene yields null, not a black image', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    frame.wait.mockResolvedValue(BLANK)

    expect(await captureStagePng(stage(realPng()))).toBeNull()
    expect(errors).toHaveBeenCalled()
  })

  it('a suspiciously tiny PNG is rejected — that is what a blank canvas encodes to', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await captureStagePng(stage(emptyPng()))).toBeNull()
    expect(errors).toHaveBeenCalled()
  })

  it('no canvas (stage not mounted / boundary tripped) yields null without throwing', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await captureStagePng(null)).toBeNull()
    expect(await captureStagePng(document.createElement('div'))).toBeNull()
    expect(errors).toHaveBeenCalled()
  })

  it('a tainted canvas (toBlob throws SecurityError) yields null, never an exception', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    const canvas = document.createElement('canvas')
    canvas.toBlob = (() => { throw new Error('SecurityError: tainted canvas') }) as HTMLCanvasElement['toBlob']
    container.appendChild(canvas)

    await expect(captureStagePng(container)).resolves.toBeNull()
    expect(errors).toHaveBeenCalled()
  })
})

describe('saveBlobAs — the file lands on the admin device and nowhere else', () => {
  const OBJECT_URL = 'blob:http://localhost:3109/snapshot'
  let clicked: HTMLAnchorElement[]

  beforeEach(() => {
    clicked = []
    ;(URL as unknown as Record<string, unknown>).createObjectURL = vi.fn(() => OBJECT_URL)
    ;(URL as unknown as Record<string, unknown>).revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function mockClick(this: HTMLAnchorElement) { clicked.push(this) }
    )
    vi.spyOn(window, 'open').mockReturnValue(null)
  })

  it('downloads through a Blob URL + anchor, and leaves no anchor behind', () => {
    const result = saveBlobAs(realPng(), 'הזמנה-1592-פריט-1-גב.png')

    expect(result.outcome).toBe('download')
    expect(result.url).toBe(OBJECT_URL)
    expect(clicked).toHaveLength(1)
    expect(clicked[0].download).toBe('הזמנה-1592-פריט-1-גב.png')
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })

  it('blocked download (iOS Safari) → opens the image in a new tab', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('download blocked')
    })
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window)

    expect(saveBlobAs(realPng(), 'x.png').outcome).toBe('tab')
    expect(open).toHaveBeenCalledWith(OBJECT_URL, '_blank')
  })

  it('popup blocked too → reports blocked with the url, so the UI can offer a link', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('download blocked')
    })
    vi.spyOn(window, 'open').mockReturnValue(null)

    expect(saveBlobAs(realPng(), 'x.png')).toEqual({ outcome: 'blocked', url: OBJECT_URL })
  })

  it('never revokes the url while a fallback tab may still be loading it', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('download blocked')
    })

    saveBlobAs(realPng(), 'x.png')

    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })
})
