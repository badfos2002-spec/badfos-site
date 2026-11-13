'use client'

import { useEffect, useState } from 'react'

/**
 * True once the page is scrolled past `compactAt`, false again only under
 * `expandAt` — the mobile designers shrink their sticky preview with it.
 *
 * HYSTERESIS, NOT A SENTINEL. Shrinking the sticky block shortens the page,
 * which moves scrollY (and anything an IntersectionObserver watches below the
 * block) by the very amount it shrank. A single threshold — or a sentinel —
 * then flips straight back, and the preview flickers. The gap between the two
 * thresholds absorbs that jump.
 *
 * Passive listener, one read per animation frame, SSR-safe (false on the
 * server), removed on unmount.
 */
export function useCompactOnScroll({ compactAt = 160, expandAt = 40 }: { compactAt?: number; expandAt?: number } = {}): boolean {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    let frame = 0
    let pending = false
    const read = () => {
      pending = false
      const y = window.scrollY
      setCompact(prev => (prev ? y >= expandAt : y > compactAt))
    }
    const onScroll = () => {
      if (pending) return
      pending = true
      frame = window.requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (pending) window.cancelAnimationFrame(frame)
    }
  }, [compactAt, expandAt])

  return compact
}
