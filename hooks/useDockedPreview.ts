'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Docked-video pattern for the mobile designers' preview (TICKET-011).
 *
 * The preview block stays in normal flow as a PLACEHOLDER that never changes
 * size; once it has scrolled out under the sticky header (h-20 = 80 px) its
 * content docks (`position: fixed`) in a compact bar, and comes back when the
 * placeholder is well back in view. Every decision reads the placeholder's rect
 * — never the element that moves — and docking changes nothing in flow, so the
 * page cannot jump and the state cannot flip back on its own. The gap between
 * the two thresholds only absorbs the finger's own jitter.
 *
 * `height` is the placeholder's height measured while undocked; the caller
 * pins it on the placeholder while docked. Passive listener, one read per
 * animation frame, SSR-safe, removed on unmount.
 */
export function useDockedPreview(
  placeholderRef: RefObject<HTMLElement>,
  { enabled = true, headerBottom = 80, undockGap = 140 }: { enabled?: boolean; headerBottom?: number; undockGap?: number } = {}
): { docked: boolean; height: number | undefined } {
  const [docked, setDocked] = useState(false)
  const [height, setHeight] = useState<number | undefined>(undefined)
  const dockedRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
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
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (pending) window.cancelAnimationFrame(frame)
    }
  }, [placeholderRef, enabled, headerBottom, undockGap])

  return { docked, height }
}
