'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

// Layout effects warn on the server; the docked state only exists in a browser.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Docked-video pattern for the mobile designers' preview (TICKET-011).
 *
 * The preview block stays in normal flow as a PLACEHOLDER; once it has scrolled
 * up under the sticky header its content docks in a fixed compact bar
 * (app/globals.css, keyed on `data-docked`), and comes back when it is well back
 * in view. Every decision reads the placeholder's rect — never the element that
 * moves. With `boxRef` (TICKET-013) the edge compared is the EXPANDED box's
 * bottom: placeholder top + the box's offset and height in the expanded layout,
 * layout facts (offsetTop/offsetHeight, untouched by transforms) captured while
 * undocked or in the data-measuring pass — so the size rows below the box do
 * not move the dock point. Without a laid-out box: the placeholder's bottom.
 *
 * While docked the placeholder is pinned to its EXPANDED height (`height`), so
 * undocking cannot change the page's height. When the expanded layout changes
 * while docked (`measureKey`: rows appear or go, the step changes) or the
 * viewport is resized, the pin is re-measured synchronously: `data-measuring`
 * makes the CSS treat the block as undocked for one read, inside a layout
 * effect, so no frame is ever painted in between. Hysteresis: dock under 280,
 * undock over 480. TICKET-013: 280, not the header's 80 — the lower ~200 px of
 * the big box are still on screen when it docks, so its zoom into the bar is seen.
 *
 * FLIP (TICKET-013, `boxRef`): on every scroll-driven flip the box zooms
 * continuously between its two rects. First = its visual rect right before the
 * flip (includes an in-flight transform); last = its rect after the commit, once
 * its running animations are cancelled — so a reversal mid-zoom starts where the
 * box visually is. Inverted with translate + scale (transform-origin 0 0 in
 * CSS) and played to `none`. Transform on the box only; reduced motion, the
 * first read, a resize and the last-step undock never zoom.
 *
 * Passive listeners, one read per animation frame, SSR-safe, removed on unmount.
 */
export function useDockedPreview(
  placeholderRef: RefObject<HTMLElement>,
  {
    enabled = true,
    measureKey,
    dockAt = 280,
    undockGap = 200,
    boxRef,
  }: { enabled?: boolean; measureKey?: string; dockAt?: number; undockGap?: number; boxRef?: RefObject<HTMLElement> } = {}
): { docked: boolean; height: number | undefined } {
  const [docked, setDocked] = useState(false)
  const [height, setHeight] = useState<number | undefined>(undefined)
  const dockedRef = useRef(false)
  /** The box's offset from the placeholder top and its height, in the EXPANDED layout. */
  const boxGeom = useRef<{ top: number; height: number } | null>(null)

  /** Read the expanded box's layout facts; call only while the expanded layout is applied. */
  const measureBox = useCallback(() => {
    const el = placeholderRef.current
    const box = boxRef?.current
    boxGeom.current = null
    if (!el || !box || !box.offsetHeight) return
    if (box.offsetParent === el) boxGeom.current = { top: box.offsetTop, height: box.offsetHeight }
    else if (box.offsetParent === el.offsetParent)
      boxGeom.current = { top: box.offsetTop - el.offsetTop, height: box.offsetHeight }
  }, [placeholderRef, boxRef])
  /** The box's visual rect right before a scroll-driven flip (FLIP "first"). */
  const flipFrom = useRef<DOMRect | null>(null)

  // FLIP "last / invert / play", after the flipped state is committed.
  useIsoLayoutEffect(() => {
    const first = flipFrom.current
    flipFrom.current = null
    const box = boxRef?.current
    if (!first || !box || typeof box.animate !== 'function') return
    box.getAnimations?.().forEach(a => a.cancel())
    const last = box.getBoundingClientRect()
    if (!last.width || !last.height) return
    box.animate(
      [
        { transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${first.width / last.width}, ${first.height / last.height})` },
        { transform: 'none' },
      ],
      { id: 'preview-flip', duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' }
    )
  }, [docked, boxRef])

  /** Read the expanded height while docked, without a painted frame in between. */
  const remeasure = useCallback(() => {
    const el = placeholderRef.current
    if (!el || !dockedRef.current) return
    el.setAttribute('data-measuring', '')
    el.style.height = ''
    // Sub-pixel: a rounded pin is a visible 1 px jump at undock.
    const h = el.getBoundingClientRect().height
    measureBox()
    el.removeAttribute('data-measuring')
    el.style.height = `${h}px`
    setHeight(h)
  }, [placeholderRef, measureBox])

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
    const read = (flip: boolean) => {
      pending = false
      const el = placeholderRef.current
      if (!el) return
      // Not laid out (desktop: the mobile layout is display:none) — nothing to dock.
      if (!dockedRef.current && el.offsetHeight === 0) return
      const rect = el.getBoundingClientRect()
      if (!dockedRef.current) {
        setHeight(rect.height)
        measureBox()
      }
      const g = boxGeom.current
      const bottom = g ? rect.top + g.top + g.height : rect.bottom
      const next = dockedRef.current ? bottom <= dockAt + undockGap : bottom < dockAt
      if (next !== dockedRef.current) {
        const box = boxRef?.current
        if (flip && box && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
          flipFrom.current = box.getBoundingClientRect()
        dockedRef.current = next
        setDocked(next)
      }
    }
    const onScroll = () => {
      if (pending) return
      pending = true
      frame = window.requestAnimationFrame(() => read(true))
    }
    // A state change caused by a resize sets the state without a zoom.
    const onResize = () => {
      remeasure()
      if (pending) window.cancelAnimationFrame(frame)
      pending = true
      frame = window.requestAnimationFrame(() => read(false))
    }
    // First read: a page loaded already scrolled docks with no zoom — the big
    // rect it would start from was never painted.
    read(false)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (pending) window.cancelAnimationFrame(frame)
    }
  }, [placeholderRef, boxRef, enabled, dockAt, undockGap, remeasure, measureBox])

  return { docked, height }
}
