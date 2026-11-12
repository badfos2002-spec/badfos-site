import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import OrderItem3DButton from '@/components/admin/OrderItem3DButton'
import type { DesignArea, OrderItem, ProductType } from '@/lib/types'

// TICKET-006: the button that sits in the per-item card of /admin/orders. The
// item card itself is ~100 lines closed over the page's state, so the gating +
// the lazy mount live in this small component instead — that keeps the orders
// page bundle unchanged until the producer actually asks for 3D.

const dyn = vi.hoisted(() => ({
  /** Every `next/dynamic` options object, in call order. */
  opts: [] as Record<string, unknown>[],
  /** One entry per time the dynamic component actually RENDERED and therefore
   *  ran its import factory — React.lazy does not import before that. */
  imports: [] as Promise<unknown>[],
  /** The props the lazily-loaded viewer received. */
  props: [] as Record<string, unknown>[],
}))

vi.mock('next/dynamic', () => ({
  default: (factory: () => Promise<unknown>, opts: Record<string, unknown>) => {
    dyn.opts.push(opts)
    return function DynamicStub(props: Record<string, unknown>) {
      dyn.imports.push(factory())
      dyn.props.push(props)
      return <div data-testid="viewer-3d" />
    }
  },
}))

// So the factory above resolves without pulling three/WebGL into jsdom.
vi.mock('@/components/admin/OrderItem3DViewer', () => ({
  default: () => <div data-testid="real-viewer" />,
}))

function design(): DesignArea {
  return {
    area: 'front_full',
    areaName: 'קידמי מלא',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/badfos-test.firebasestorage.app/o/d.png?alt=media',
    fileName: 'd.png',
  }
}

function item(productType: string, over: Partial<OrderItem> = {}): OrderItem {
  return {
    productType: productType as ProductType,
    fabricType: 'cotton',
    color: 'black',
    sizes: [{ size: 'L', quantity: 2 }],
    designs: [design()],
    pricePerUnit: 47,
    totalQuantity: 2,
    totalPrice: 94,
    ...over,
  }
}

beforeEach(() => {
  // NOT dyn.opts: `nextDynamic(...)` runs once, when the component module is
  // imported — clearing it here would erase the only record there is.
  dyn.imports.length = 0
  dyn.props.length = 0
})

afterEach(cleanup)

const BUTTON = 'תצוגה תלת-ממדית'

describe('the 3D button only exists where there is a 3D model', () => {
  it('a t-shirt item offers it', () => {
    render(<OrderItem3DButton item={item('tshirt')} orderNumber={1592} index={0} />)

    expect(screen.getByRole('button', { name: BUTTON })).toBeInTheDocument()
  })

  it('a sweatshirt item offers it', () => {
    render(<OrderItem3DButton item={item('sweatshirt')} orderNumber={1592} index={0} />)

    expect(screen.getByRole('button', { name: BUTTON })).toBeInTheDocument()
  })

  it.each(['cap', 'tote', 'buff', 'vest', 'baby', 'apron', 'other'])(
    'a %s item does not — the card is unchanged for it',
    productType => {
      render(<OrderItem3DButton item={item(productType)} orderNumber={1592} index={0} />)

      expect(screen.queryByRole('button', { name: BUTTON })).toBeNull()
      expect(screen.queryByTestId('viewer-3d')).toBeNull()
    }
  )
})

describe('the viewer is lazy — the orders page bundle does not grow until asked', () => {
  it('is wired through next/dynamic with ssr:false', () => {
    render(<OrderItem3DButton item={item('tshirt')} orderNumber={1592} index={0} />)

    expect(dyn.opts).toHaveLength(1)
    expect(dyn.opts[0]).toMatchObject({ ssr: false })
  })

  it('does not import the 3D component on first render', () => {
    render(<OrderItem3DButton item={item('tshirt')} orderNumber={1592} index={0} />)

    expect(dyn.imports).toHaveLength(0)
    expect(screen.queryByTestId('viewer-3d')).toBeNull()
  })

  it('imports and mounts it on the first press, with the item, order number and index', () => {
    const it0 = item('tshirt')
    render(<OrderItem3DButton item={it0} orderNumber={1592} index={2} />)

    fireEvent.click(screen.getByRole('button', { name: BUTTON }))

    expect(dyn.imports).toHaveLength(1)
    expect(screen.getByTestId('viewer-3d')).toBeInTheDocument()
    expect(dyn.props[0]).toMatchObject({ item: it0, orderNumber: 1592, index: 2 })
  })

  it('closes again, and the stage is unmounted (no WebGL context left running)', () => {
    render(<OrderItem3DButton item={item('tshirt')} orderNumber={1592} index={0} />)

    fireEvent.click(screen.getByRole('button', { name: BUTTON }))
    fireEvent.click(screen.getByRole('button', { name: 'סגירת התצוגה' }))

    expect(screen.queryByTestId('viewer-3d')).toBeNull()
    expect(screen.getByRole('button', { name: BUTTON })).toBeInTheDocument()
  })

  it('the press does not reach the order row around it', () => {
    // The orders page card lives inside a clickable row; a 3D press must not
    // collapse the order underneath it.
    const rowClick = vi.fn()
    render(
      <div onClick={rowClick}>
        <OrderItem3DButton item={item('tshirt')} orderNumber={1592} index={0} />
      </div>
    )

    fireEvent.click(screen.getByRole('button', { name: BUTTON }))

    expect(rowClick).not.toHaveBeenCalled()
  })
})
