'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

type RevealDirection = 'up' | 'down' | 'left' | 'right'

interface RevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
  duration?: number
  stagger?: number
  /** Entrance direction. 'right' enters from the right edge (positive X), 'left' from negative X (RTL-natural). */
  from?: RevealDirection
  /** When set (e.g. 0.9), animate from that scale up to 1, combined with the translate. */
  scale?: number
  as?: keyof JSX.IntrinsicElements
}

export default function Reveal({
  children,
  className,
  delay = 0,
  y = 40,
  duration = 0.8,
  stagger,
  from = 'up',
  scale,
  as: Tag = 'div',
}: RevealProps) {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return

      // Reduced motion: leave content fully visible, no animation, never hidden.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.registerPlugin(ScrollTrigger)

      const targets = stagger != null ? Array.from(el.children) : el

      // Resolve the entrance offset from the requested direction.
      const fromVars: gsap.TweenVars = { opacity: 0 }
      switch (from) {
        case 'down':
          fromVars.y = -y
          break
        case 'left':
          fromVars.x = -y
          break
        case 'right':
          fromVars.x = y
          break
        case 'up':
        default:
          fromVars.y = y
          break
      }
      if (scale != null) fromVars.scale = scale

      gsap.set(targets, fromVars)
      gsap.to(targets, {
        opacity: 1,
        x: 0,
        y: 0,
        ...(scale != null ? { scale: 1 } : {}),
        duration,
        delay,
        ease: 'power3.out',
        ...(stagger != null ? { stagger } : {}),
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once: true,
        },
      })
    },
    { scope: ref }
  )

  return (
    // @ts-expect-error dynamic tag with ref is safe here
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
