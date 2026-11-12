import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import OrderItem3DViewer from '@/components/admin/OrderItem3DViewer'
import { angleForArea } from '@/components/designer/three/placements'
import type { DesignArea, DesignAreaType, OrderItem } from '@/lib/types'

// TICKET-006: the live viewer inside an admin order card. The WebGL stage is
// mocked away — what is tested here is the control surface around it: one
// button per angle, the angle actually handed to the stage, and a PNG that
// lands on the admin's own device and NOWHERE else (no Storage, no Firestore,
// no network at all).

const stage = vi.hoisted(() => ({
  props: [] as Record<string, unknown>[],
  throws: false,
}))

vi.mock('@/components/designer/three/Preview3DStage', () => ({
  default: (props: Record<string, unknown>) => {
    stage.props.push(props)
    // How "no WebGL" arrives in real life: the Canvas throws on mount and
    // ThreeErrorBoundary catches it.
    if (stage.throws) throw new Error('WebGL context could not be created')
    return <canvas data-testid="stage-canvas" />
  },
}))

// Only the pixel-waiting capture is mocked (it needs a real GL canvas);
// `saveBlobAs` — the part that decides HOW the file reaches the admin — stays
// real, because that is what these tests are about.
const snap = vi.hoisted(() => ({ capture: vi.fn() }))
vi.mock('@/lib/order-snapshot', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/order-snapshot')>()),
  captureStagePng: snap.capture,
}))

const STORAGE = 'https://firebasestorage.googleapis.com/v0/b/badfos-test.firebasestorage.app/o'
const OBJECT_URL = 'blob:http://localhost:3109/stub-object-url'

function design(area: DesignAreaType): DesignArea {
  return {
    area,
    areaName: area,
    imageUrl: `${STORAGE}/designs%2F${area}.png?alt=media&token=abc123`,
    fileName: `${area}.png`,
  }
}

function item(designs: DesignArea[], over: Partial<OrderItem> = {}): OrderItem {
  return {
    productType: 'tshirt',
    fabricType: 'cotton',
    color: 'black',
    sizes: [{ size: 'L', quantity: 3 }],
    designs,
    pricePerUnit: 47,
    totalQuantity: 3,
    totalPrice: 141,
    ...over,
  }
}

const PNG = () => new Blob(['pretend-png-bytes'], { type: 'image/png' })

let clickedAnchors: HTMLAnchorElement[]
let anchorClick: ReturnType<typeof vi.spyOn>
let openSpy: ReturnType<typeof vi.spyOn>
let fetchSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  stage.props.length = 0
  stage.throws = false
  snap.capture.mockReset()
  snap.capture.mockResolvedValue(PNG())

  // jsdom implements neither of these.
  ;(URL as unknown as Record<string, unknown>).createObjectURL = vi.fn(() => OBJECT_URL)
  ;(URL as unknown as Record<string, unknown>).revokeObjectURL = vi.fn()

  clickedAnchors = []
  anchorClick = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function mockClick(this: HTMLAnchorElement) {
      clickedAnchors.push(this)
    })
  openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
  // tests/setup.ts already makes fetch throw; the spy is here so the "never
  // talks to the network" assertion can be made directly.
  fetchSpy = vi.spyOn(globalThis, 'fetch')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const lastStageProps = () => stage.props[stage.props.length - 1]

describe('OrderItem3DViewer — the angle buttons', () => {
  it('renders one button per angle the item has, and only those', () => {
    render(
      <OrderItem3DViewer
        item={item([design('front_full'), design('shoulder_right')])}
        orderNumber={1592}
        index={0}
      />
    )

    expect(screen.getByRole('button', { name: 'קדימה' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'גב' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'כתף ימין' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'כתף שמאל' })).toBeNull()
  })

  it('opens facing the front, and marks that button as the selected one', () => {
    render(<OrderItem3DViewer item={item([design('front_full')])} orderNumber={1592} index={0} />)

    expect(lastStageProps().focusAngle).toBe(0)
    expect(screen.getByRole('button', { name: 'קדימה' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'גב' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('pressing גב turns the stage to π', () => {
    render(<OrderItem3DViewer item={item([design('back')])} orderNumber={1592} index={0} />)

    fireEvent.click(screen.getByRole('button', { name: 'גב' }))

    expect(lastStageProps().focusAngle).toBe(Math.PI)
    expect(screen.getByRole('button', { name: 'גב' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('pressing כתף ימין turns the stage to angleForArea — the sign is never re-derived here', () => {
    render(
      <OrderItem3DViewer item={item([design('shoulder_right')])} orderNumber={1592} index={0} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'כתף ימין' }))

    expect(lastStageProps().focusAngle).toBe(angleForArea('tshirt', 'shoulder_right'))
  })

  it('pressing the selected button again still sends the stage a fresh angle', () => {
    // The producer spins the shirt by hand and then taps "קדימה" to get back.
    // Same orientation, different number (coterminal) — otherwise the prop
    // never changes and the press does nothing.
    render(<OrderItem3DViewer item={item([design('front_full')])} orderNumber={1592} index={0} />)

    const front = screen.getByRole('button', { name: 'קדימה' })
    fireEvent.click(front)
    const first = lastStageProps().focusAngle as number
    fireEvent.click(front)
    const second = lastStageProps().focusAngle as number

    expect(second).not.toBe(first)
    expect(Math.abs(second - first) % (Math.PI * 2)).toBeCloseTo(0, 10)
  })

  it('hands the stage the item colour, model and proxied designs', () => {
    render(<OrderItem3DViewer item={item([design('front_full')])} orderNumber={1592} index={0} />)

    const props = lastStageProps()
    expect(props.variant).toBe('tshirt')
    expect(props.modelUrl).toBe('/models/tshirt-web.glb')
    expect(props.colorHex).toBe('#000000')
    const designs = props.designs as { url: string }[]
    expect(designs).toHaveLength(1)
    expect(designs[0].url.startsWith('/api/design-proxy?url=')).toBe(true)
  })
})

describe('OrderItem3DViewer — שמור תמונה', () => {
  it('captures the rendered stage and downloads it with the exact Hebrew name', async () => {
    render(<OrderItem3DViewer item={item([design('back')])} orderNumber={1592} index={0} />)

    fireEvent.click(screen.getByRole('button', { name: 'גב' }))
    fireEvent.click(screen.getByRole('button', { name: 'שמור תמונה' }))

    await waitFor(() => expect(snap.capture).toHaveBeenCalledTimes(1))
    // The capture is handed the element that holds the canvas — the frame, not
    // a timeout, is what it waits on.
    expect(snap.capture.mock.calls[0][0]).toContainElement(screen.getByTestId('stage-canvas'))

    await waitFor(() => expect(clickedAnchors).toHaveLength(1))
    expect(clickedAnchors[0].getAttribute('download')).toBe('הזמנה-1592-פריט-1-גב.png')
    expect(clickedAnchors[0].getAttribute('href')).toBe(OBJECT_URL)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('names the file after the item index + 1 and the angle on screen', async () => {
    render(<OrderItem3DViewer item={item([design('front_full')])} orderNumber={1600} index={2} />)

    fireEvent.click(screen.getByRole('button', { name: 'שמור תמונה' }))

    await waitFor(() => expect(clickedAnchors).toHaveLength(1))
    expect(clickedAnchors[0].getAttribute('download')).toBe('הזמנה-1600-פריט-3-קדימה.png')
  })

  it('cannot be fired twice into two captures while the first is still running', async () => {
    let finish: (b: Blob | null) => void = () => {}
    snap.capture.mockImplementation(() => new Promise(res => { finish = res }))
    render(<OrderItem3DViewer item={item([design('front_full')])} orderNumber={1592} index={0} />)

    const save = screen.getByRole('button', { name: 'שמור תמונה' })
    fireEvent.click(save)
    await waitFor(() => expect(save).toBeDisabled())
    fireEvent.click(save)

    expect(snap.capture).toHaveBeenCalledTimes(1)
    await act(async () => { finish(PNG()) })
    expect(save).not.toBeDisabled()
  })

  it('iOS Safari / blocked download: falls back to opening the image in a new tab', async () => {
    anchorClick.mockImplementation(() => { throw new Error('download blocked') })
    const tab = {} as Window
    openSpy.mockReturnValue(tab)
    render(<OrderItem3DViewer item={item([design('front_full')])} orderNumber={1592} index={0} />)

    fireEvent.click(screen.getByRole('button', { name: 'שמור תמונה' }))

    await waitFor(() => expect(openSpy).toHaveBeenCalledTimes(1))
    expect(openSpy.mock.calls[0][0]).toBe(OBJECT_URL)
  })

  it('even the new tab blocked (popup blocker): the image is offered as a link, never silently lost', async () => {
    anchorClick.mockImplementation(() => { throw new Error('download blocked') })
    openSpy.mockReturnValue(null)
    render(<OrderItem3DViewer item={item([design('front_full')])} orderNumber={1592} index={0} />)

    fireEvent.click(screen.getByRole('button', { name: 'שמור תמונה' }))

    const link = await screen.findByRole('link', { name: 'פתח את התמונה' })
    expect(link).toHaveAttribute('href', OBJECT_URL)
    expect(link).toHaveAttribute('download', 'הזמנה-1592-פריט-1-קדימה.png')
  })

  it('a blank / failed capture says so in Hebrew instead of downloading nothing', async () => {
    snap.capture.mockResolvedValue(null)
    render(<OrderItem3DViewer item={item([design('front_full')])} orderNumber={1592} index={0} />)

    fireEvent.click(screen.getByRole('button', { name: 'שמור תמונה' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('שמירת התמונה נכשלה, נסו שוב')
    expect(clickedAnchors).toHaveLength(0)
  })
})

describe('OrderItem3DViewer — no WebGL, and no network', () => {
  it('a stage that cannot start shows a plain Hebrew message instead of crashing', () => {
    stage.throws = true
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    // React re-dispatches a boundary-caught error as a window error event; left
    // alone, jsdom prints the (expected) stack and the run stops being pristine.
    const swallow = (e: ErrorEvent) => e.preventDefault()
    window.addEventListener('error', swallow)

    expect(() =>
      render(<OrderItem3DViewer item={item([design('front_full')])} orderNumber={1592} index={0} />)
    ).not.toThrow()

    expect(screen.getByText('התצוגה התלת-ממדית אינה נתמכת בדפדפן הזה')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'שמור תמונה' })).toBeNull()
    window.removeEventListener('error', swallow)
    errors.mockRestore()
  })

  it('rendering, turning and saving never touch the network — zero storage cost', async () => {
    render(
      <OrderItem3DViewer
        item={item([design('front_full'), design('shoulder_left')])}
        orderNumber={1592}
        index={0}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'כתף שמאל' }))
    fireEvent.click(screen.getByRole('button', { name: 'שמור תמונה' }))
    await waitFor(() => expect(clickedAnchors).toHaveLength(1))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('OrderItem3DViewer — phone first', () => {
  it('the stage is square and full width on a phone, wider on desktop', () => {
    render(<OrderItem3DViewer item={item([design('front_full')])} orderNumber={1592} index={0} />)

    const box = screen.getByTestId('stage-canvas').parentElement as HTMLElement
    expect(box.className).toMatch(/\bw-full\b/)
    expect(box.className).toMatch(/\baspect-square\b/)
    expect(box.className).toMatch(/sm:aspect-/)
  })

  it('every control is a 44 px touch target', () => {
    render(
      <OrderItem3DViewer
        item={item([design('front_full'), design('shoulder_right')])}
        orderNumber={1592}
        index={0}
      />
    )

    for (const name of ['קדימה', 'גב', 'כתף ימין', 'שמור תמונה']) {
      expect(screen.getByRole('button', { name }).className).toMatch(/min-h-\[44px\]/)
    }
  })
})
