'use client'

import { useEffect, useState, type RefObject } from 'react'
import { ArrowUp } from 'lucide-react'

/**
 * Mobile-only floating «לסקיצה» button (TICKET-011): shown while the preview
 * block (`targetRef`) is out of view, a tap scrolls smoothly back to it.
 *
 * Pure visibility signal — nothing on the page resizes with it, so there is no
 * feedback loop. While `avoidRef` (the mobile nav row) is in view the button
 * steps aside: it sits bottom-left, exactly where «הבא» is in RTL.
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
    const avoid = avoidRef?.current ?? null
    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.target === target) setPreviewOut(!e.isIntersecting)
          else if (e.target === avoid) setAvoidIn(e.isIntersecting)
        }
      },
      { threshold: 0 }
    )
    observer.observe(target)
    if (avoid) observer.observe(avoid)
    return () => observer.disconnect()
  }, [targetRef, avoidRef])

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
