'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

interface MouseImageTrailProps {
  images: string[]
  className?: string
}

const SPAWN_DISTANCE = 60 // px the cursor must move before spawning the next image
const MAX_NODES = 8 // cap concurrent trail images
const IMG_SIZE = 200 // px

export default function MouseImageTrail({ images, className }: MouseImageTrailProps) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const zone = ref.current
      if (!zone || images.length === 0) return

      // Desktop only: fine pointer + wide viewport. Respect reduced motion.
      const desktop = window.matchMedia('(pointer: fine) and (min-width: 1024px)').matches
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!desktop || reduced) return

      let lastX = 0
      let lastY = 0
      let primed = false
      let index = 0
      const nodes: HTMLImageElement[] = []

      const spawn = (x: number, y: number) => {
        const img = document.createElement('img')
        img.src = images[index % images.length]
        img.alt = ''
        img.draggable = false
        index++

        Object.assign(img.style, {
          position: 'absolute',
          top: '0',
          left: '0',
          width: `${IMG_SIZE}px`,
          height: `${IMG_SIZE}px`,
          objectFit: 'cover',
          borderRadius: '1.25rem',
          border: '3px solid rgba(255,255,255,0.85)',
          boxShadow: '0 18px 45px -12px rgba(245,158,11,0.45)',
          pointerEvents: 'none',
          willChange: 'transform, opacity',
        })

        zone.appendChild(img)
        nodes.push(img)

        // Trim oldest if over cap.
        while (nodes.length > MAX_NODES) {
          const old = nodes.shift()
          old?.remove()
        }

        gsap.set(img, {
          xPercent: -50,
          yPercent: -50,
          x,
          y,
          scale: 0.4,
          opacity: 0,
          rotation: gsap.utils.random(-12, 12),
        })

        gsap
          .timeline({
            onComplete: () => {
              img.remove()
              const i = nodes.indexOf(img)
              if (i > -1) nodes.splice(i, 1)
            },
          })
          .to(img, { scale: 1.05, opacity: 1, duration: 0.32, ease: 'power3.out' })
          .to(img, { scale: 0.82, opacity: 0, duration: 0.6, ease: 'power2.in' }, '+=0.12')
      }

      const listenTarget: HTMLElement | Window = zone.closest('section') ?? window

      let rect = zone.getBoundingClientRect()
      const updateRect = () => { rect = zone.getBoundingClientRect() }
      window.addEventListener('scroll', updateRect, { passive: true })
      window.addEventListener('resize', updateRect)

      const onMove = (e: MouseEvent) => {
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Only spawn while the cursor is over the zone.
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
          primed = false
          return
        }

        if (!primed) {
          lastX = x
          lastY = y
          primed = true
          return
        }

        const dist = Math.hypot(x - lastX, y - lastY)
        if (dist < SPAWN_DISTANCE) return

        lastX = x
        lastY = y
        spawn(x, y)
      }

      listenTarget.addEventListener('mousemove', onMove as EventListener)

      return () => {
        listenTarget.removeEventListener('mousemove', onMove as EventListener)
        window.removeEventListener('scroll', updateRect)
        window.removeEventListener('resize', updateRect)
        nodes.forEach((n) => n.remove())
        nodes.length = 0
      }
    },
    { scope: ref, dependencies: [images] }
  )

  return <div ref={ref} className={className} aria-hidden="true" />
}
