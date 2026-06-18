'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

interface RevealTextProps {
  text: string
  className?: string
  as?: keyof JSX.IntrinsicElements
  /** 'scroll' reveals on scroll into view; 'mount' plays immediately (for above-the-fold hero titles). */
  trigger?: 'scroll' | 'mount'
  stagger?: number
  y?: number
  delay?: number
}

/**
 * Bold heading reveal that animates word by word with a premium lift (rotateX).
 * Words stay real and selectable for SEO/accessibility. Reduced-motion renders plain text.
 */
export default function RevealText({
  text,
  className,
  as: Tag = 'h2',
  trigger = 'scroll',
  stagger = 0.08,
  y = 30,
  delay = 0,
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null)

  const words = text.split(' ')

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return

      // Reduced motion: leave words fully visible, no animation.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.registerPlugin(ScrollTrigger)

      const targets = el.querySelectorAll<HTMLElement>('[data-reveal-word]')
      if (!targets.length) return

      gsap.set(el, { perspective: 600 })
      gsap.set(targets, {
        opacity: 0,
        y,
        rotateX: -40,
        transformOrigin: 'top center',
      })

      gsap.to(targets, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.7,
        delay,
        ease: 'power3.out',
        stagger,
        ...(trigger === 'scroll'
          ? {
              scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                once: true,
              },
            }
          : {}),
      })
    },
    { scope: ref }
  )

  return (
    // @ts-expect-error dynamic tag with ref is safe here
    <Tag ref={ref} className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          data-reveal-word
          style={{ display: 'inline-block', willChange: 'transform, opacity' }}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}
