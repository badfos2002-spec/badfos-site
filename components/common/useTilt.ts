'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface UseTiltOptions {
  /** Maximum tilt in degrees on each axis. */
  maxTilt?: number
  /** Scale applied on hover. */
  scale?: number
  /** CSS transform perspective in px. */
  perspective?: number
}

/**
 * Reusable 3D tilt hook for cards. Returns a ref to attach to an element.
 * Desktop only (pointer: fine) and respects prefers-reduced-motion — otherwise a no-op.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>(
  options: UseTiltOptions = {}
) {
  const { maxTilt = 8, scale = 1.03, perspective = 800 } = options
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const fine = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    gsap.set(el, {
      transformPerspective: perspective,
      transformStyle: 'preserve-3d',
    })

    const rotX = gsap.quickTo(el, 'rotationX', { duration: 0.4, ease: 'power3.out' })
    const rotY = gsap.quickTo(el, 'rotationY', { duration: 0.4, ease: 'power3.out' })
    const scaleTo = gsap.quickTo(el, 'scale', { duration: 0.4, ease: 'power3.out' })

    const handleMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width - 0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5
      rotY(px * maxTilt * 2)
      rotX(-py * maxTilt * 2)
      scaleTo(scale)
    }

    const handleLeave = () => {
      rotX(0)
      rotY(0)
      scaleTo(1)
    }

    el.addEventListener('pointermove', handleMove)
    el.addEventListener('pointerleave', handleLeave)

    return () => {
      el.removeEventListener('pointermove', handleMove)
      el.removeEventListener('pointerleave', handleLeave)
    }
  }, [maxTilt, scale, perspective])

  return ref
}

export default useTilt
