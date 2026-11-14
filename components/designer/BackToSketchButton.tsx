'use client'

import { useEffect, useState, type RefObject } from 'react'
import { ArrowUp } from 'lucide-react'

/** Button height (48) + its bottom offset (24) + a margin. */
const BOTTOM_BAND = 96

/**
 * Mobile-only floating «לסקיצה» button (TICKET-011): shown while the preview
 * block (`targetRef`) is out of view, a tap scrolls smoothly back to it.
 *
 * Pure visibility signal — nothing on the page resizes with it, so there is no
 * feedback loop. While `avoidRef` (the mobile nav row) crosses the bottom band
 * the button steps aside: it sits bottom-left, exactly where «הבא» is in RTL.
 * `hidden` (the last step) renders nothing.
 */
export default function BackToSketchButton({
  targetRef,
  avoidRef,
  hidden = false,
}: {
  targetRef: RefObject<HTMLElement>
  avoidRef?: RefObject<HTMLElement>
  hidden?: boolean
}) {
  const [previewOut, setPreviewOut] = useState(false)
  const [avoidIn, setAvoidIn] = useState(false)

  useEffect(() => {
    const target = targetRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      entries => { for (const e of entries) setPreviewOut(!e.isIntersecting) },
      // The site header is sticky (h-20): a preview hidden under it is out of sight.
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [targetRef])

  useEffect(() => {
    const avoid = avoidRef?.current
    if (!avoid || typeof IntersectionObserver === 'undefined') return
    let observer: IntersectionObserver | null = null
    // Only the bottom band where the button sits counts: the nav row may stay
    // on a tall phone's screen for most of the step without ever touching it.
    const watch = () => {
      observer?.disconnect()
      observer = new IntersectionObserver(
        entries => { for (const e of entries) setAvoidIn(e.isIntersecting) },
        { threshold: 0, rootMargin: `-${Math.max(0, window.innerHeight - BOTTOM_BAND)}px 0px 0px 0px` }
      )
      observer.observe(avoid)
    }
    watch()
    window.addEventListener('resize', watch)
    return () => {
      window.removeEventListener('resize', watch)
      observer?.disconnect()
    }
  }, [avoidRef])

  if (hidden || !previewOut || avoidIn) return null

  return (
    <button
      type="button"
      aria-label="חזרה לסקיצה"
      onClick={() => targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      className="lg:hidden fixed left-4 z-40 h-12 px-5 rounded-full gradient-yellow text-white font-semibold shadow-lg flex items-center gap-2 whitespace-nowrap animate-in fade-in duration-150 motion-reduce:animate-none"
      style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
    >
      <ArrowUp className="w-5 h-5" aria-hidden="true" />
      לסקיצה
    </button>
  )
}
