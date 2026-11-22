'use client'

import { Fragment, useRef } from 'react'
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

/** The separator between two word spans. A plain space would be dropped: it is
 *  collapsible, and a collapsible space at the end of an inline-block's last
 *  line is removed, so the words would touch. */
const SEP = '\u00A0'

/** Strong-RTL and strong-LTR code points. Explicit ranges, not
 *  `\p{Script=…}` — tsconfig targets ES2017 and tsc rejects unicode property
 *  escapes there. */
const STRONG_RTL = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\uFB1D-\uFDFF\uFE70-\uFEFF]/
const STRONG_LTR = /[A-Za-z\u00C0-\u024F]/

type RunDir = 'rtl' | 'ltr'

/** A word's own direction, from its FIRST strong character. `null` = no strong
 *  character at all (digits, «₪1500», punctuation, the empty string a double
 *  space produces) — such a word joins a neighbouring run. */
function wordDirection(word: string): RunDir | null {
  for (const ch of word) {
    if (STRONG_RTL.test(ch)) return 'rtl'
    if (STRONG_LTR.test(ch)) return 'ltr'
  }
  return null
}

/**
 * Consecutive words grouped into direction runs, as `[from, to]` index pairs.
 * A word with no strong character joins the run before it, or the run after it
 * when it is first; a text with no strong character anywhere is one RTL run,
 * which is exactly today's output.
 */
function directionRuns(words: string[]): { dir: RunDir; from: number; to: number }[] {
  const own = words.map(wordDirection)
  const firstStrong = own.find((d): d is RunDir => d !== null) ?? 'rtl'
  const runs: { dir: RunDir; from: number; to: number }[] = []
  let carry: RunDir | null = null
  own.forEach((d, i) => {
    const dir = d ?? carry ?? firstStrong
    carry = dir
    const open = runs[runs.length - 1]
    if (open && open.dir === dir) open.to = i
    else runs.push({ dir, from: i, to: i })
  })
  return runs
}

/**
 * Bold heading reveal that animates word by word with a premium lift (rotateX).
 * Words stay real and selectable for SEO/accessibility. Reduced-motion renders plain text.
 *
 * Every word is its own `display:inline-block` span, because the lift needs an
 * atomic box per word — and atomic inline boxes are ordered by the heading's
 * base direction, RTL in the hero, so Latin words would lay out right-to-left
 * (TICKET-028). The words are therefore grouped into direction runs and every
 * LTR run is wrapped in a `<span dir="ltr">`: the dir attribute is
 * direction:ltr + unicode-bidi:isolate, so the boxes inside it are ordered LTR
 * while the span itself sits in the surrounding RTL flow and still wraps across
 * lines. An RTL run gets no wrapper at all — its word spans stay direct
 * children of the tag, exactly as before, so an all-Hebrew title's DOM is
 * unchanged.
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

  const runs = directionRuns(words)

  /** `withSep` is false only for the last word of an LTR run: inside the
   *  isolate that separator would render at the run's LTR-internal end — the
   *  wrong side of the run, giving a doubled gap there and none on the other
   *  side. It is emitted after the wrapper instead, where the RTL flow puts it
   *  between the run and the next word. */
  const renderWord = (i: number, withSep: boolean) => (
    <span
      key={i}
      data-reveal-word
      style={{ display: 'inline-block', willChange: 'transform, opacity' }}
    >
      {words[i]}
      {withSep && i < words.length - 1 ? SEP : ''}
    </span>
  )

  return (
    // @ts-expect-error dynamic tag with ref is safe here
    <Tag ref={ref} className={className}>
      {runs.map((run) => {
        const spans = []
        for (let i = run.from; i <= run.to; i++) {
          spans.push(renderWord(i, run.dir === 'rtl' || i < run.to))
        }
        // An RTL run renders bare, exactly as before the runs existed.
        if (run.dir === 'rtl') return spans
        return (
          <Fragment key={run.from}>
            <span dir="ltr">{spans}</span>
            {/* A plain space, not SEP: both are the same width, but a U+00A0
                is not collapsible, so when the title wraps at this very
                boundary it would hang at the start of the wrapped line and
                push a centred heading off-centre by a full space. */}
            {run.to < words.length - 1 ? ' ' : ''}
          </Fragment>
        )
      })}
    </Tag>
  )
}
