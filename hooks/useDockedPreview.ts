'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

// Layout effects warn on the server; the docked state only exists in a browser.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Docked-video pattern for the mobile designers' preview (TICKET-011).
 *
 * The preview block stays in normal flow as a PLACEHOLDER; once it has scrolled
 * out under the sticky header (h-20 = 80 px) its content docks in a fixed
 * compact bar (app/globals.css, keyed on `data-docked`), and comes back when the
 * placeholder is well back in view. Every decision reads the placeholder's rect
 * — never the element that moves.
 *
 * While docked the placeholder is pinned to its EXPANDED height (`height`), so
 * undocking cannot change the page's height. When the expanded layout changes
 * while docked (`measureKey`: rows appear or go, the step changes) or the
 * viewport is resized, the pin is re-measured synchronously: `data-measuring`
 * makes the CSS treat the block as undocked for one read, inside a layout
 * effect, so no frame is ever painted in between. The hysteresis gap (dock
 * under 80, undock over 300) is larger than any rows change (~193 px), so a
 * re-measured shrink can never re-trigger docking.
 *
 * Passive listeners, one read per animation frame, SSR-safe, removed on unmount.
 */
export function useDockedPreview(
  placeholderRef: RefObject<HTMLElement>,
  {
    enabled = true,
    measureKey,
    headerBottom = 80,
    undockGap = 220,
  }: { enabled?: boolean; measureKey?: string; headerBottom?: number; undockGap?: number } = {}
): { docked: boolean; height: number | undefined } {
  const [docked, setDocked] = useState(false)
  const [height, setHeight] = useState<number | undefined>(undefined)
  const dockedRef = useRef(false)

  /** Read the expanded height while docked, without a painted frame in between. */
  const remeasure = useCallback(() => {
    const el = placeholderRef.current
    if (!el || !dockedRef.current) return
    el.setAttribute('data-measuring', '')
    el.style.height = ''
    const h = el.offsetHeight
    el.removeAttribute('data-measuring')
    el.style.height = `${h}px`
    setHeight(h)
  }, [placeholderRef])

  // Expanded layout changed while docked → new pin, same layout pass.
  useIsoLayoutEffect(() => {
    remeasure()
  }, [measureKey, remeasure])

  useIsoLayoutEffect(() => {
    if (!enabled) {
      // Undock and unpin in the same commit (both read `docked`), before paint.
      dockedRef.current = false
      setDocked(false)
      return
    }
    let frame = 0
    let pending = false
    const read = () => {
      pending = false
      const el = placeholderRef.current
      if (!el) return
      // Not laid out (desktop: the mobile layout is display:none) — nothing to dock.
      if (!dockedRef.current && el.offsetHeight === 0) return
      if (!dockedRef.current) setHeight(el.offsetHeight)
      const bottom = el.getBoundingClientRect().bottom
      const next = dockedRef.current ? bottom <= headerBottom + undockGap : bottom < headerBottom
      if (next !== dockedRef.current) {
        dockedRef.current = next
        setDocked(next)
      }
    }
    const onScroll = () => {
      if (pending) return
      pending = true
      frame = window.requestAnimationFrame(read)
    }
    const onResize = () => {
      remeasure()
      onScroll()
    }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (pending) window.cancelAnimationFrame(frame)
    }
  }, [placeholderRef, enabled, headerBottom, undockGap, remeasure])

  return { docked, height }
}
