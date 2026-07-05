// Editorial building blocks for the SEO landing pages ("magazine article" layouts).
// Server components only — no client JS. RTL-safe, mobile-first.
//
// THEMING RULE: every theme class is passed in as a COMPLETE Tailwind literal
// string from the layout files (components/** is inside tailwind content paths),
// never assembled dynamically. Variant arrays below are full static literals
// cycled by index — the JIT extractor picks them up as-is.

import Image from 'next/image'
import type { CSSProperties, ReactNode } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import type { SeoPageFaq } from '@/lib/seo-pages'

/** Big display type — Secular One with Rubik fallback (var set in app/layout.tsx) */
export const DISPLAY_FONT: CSSProperties = {
  fontFamily: 'var(--font-secular), var(--font-rubik), system-ui, sans-serif',
}

/* ------------------------------------------------------------------ */
/* HeroBand — full-bleed colored hero band with optional diagonal cut */
/* ------------------------------------------------------------------ */

export interface HeroBandProps {
  /** Full bg classes, e.g. 'bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600' */
  bgClass: string
  /** Clip the bottom edge into a subtle diagonal */
  diagonal?: boolean
  /** Breadcrumb nav rendered above the title (style it for the band bg) */
  breadcrumb?: ReactNode
  badgeText?: string
  badgeEmoji?: string
  /** Full chip classes, e.g. 'bg-white/15 text-white border-white/30' */
  badgeClass?: string
  title: string
  titleClass?: string
  subtitle?: string
  subtitleClass?: string
  /** CTA row slot (buttons) */
  cta?: ReactNode
}

export function HeroBand({
  bgClass,
  diagonal,
  breadcrumb,
  badgeText,
  badgeEmoji,
  badgeClass,
  title,
  titleClass,
  subtitle,
  subtitleClass,
  cta,
}: HeroBandProps) {
  return (
    <header
      className={`relative overflow-hidden ${bgClass}`}
      style={
        diagonal
          ? { clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 3.5rem), 0 100%)' }
          : undefined
      }
    >
      {/* Soft decorative glows — neutral white, work on any gradient */}
      <div
        className="pointer-events-none absolute -top-24 left-0 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 right-0 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />

      <div
        className={`relative mx-auto max-w-5xl px-4 pt-8 md:px-8 md:pt-12 ${
          diagonal ? 'pb-24 md:pb-28' : 'pb-14 md:pb-20'
        }`}
      >
        {breadcrumb}
        <div className="text-center md:text-right">
          {badgeText && (
            <p className="mb-5">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-base font-extrabold md:text-lg ${
                  badgeClass ?? 'bg-white/15 text-white border-white/30'
                }`}
              >
                {badgeEmoji && <span aria-hidden>{badgeEmoji}</span>}
                {badgeText}
              </span>
            </p>
          )}
          <h1
            className={`mb-6 text-4xl leading-[1.15] tracking-tight md:text-6xl lg:text-7xl ${
              titleClass ?? 'text-white'
            }`}
            style={DISPLAY_FONT}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={`mb-8 max-w-2xl text-lg leading-relaxed md:ml-auto md:text-xl ${
                subtitleClass ?? 'text-white/90'
              }`}
            >
              {subtitle}
            </p>
          )}
          {cta && (
            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
              {cta}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

/* --------------------------------------------------- */
/* PullQuote — oversized quote with huge decorative mark */
/* --------------------------------------------------- */

export interface PullQuoteProps {
  quote: string
  attribution?: string
  /** Color of the giant quotation mark, e.g. 'text-pink-200' */
  markClass?: string
  quoteClass?: string
}

export function PullQuote({ quote, attribution, markClass, quoteClass }: PullQuoteProps) {
  return (
    <figure className="relative mx-auto max-w-3xl px-6 text-center">
      <span
        className={`pointer-events-none absolute -top-10 -right-1 select-none text-[7rem] leading-none md:-top-14 md:-right-8 md:text-[10rem] ${
          markClass ?? 'text-[#ffc32e]/40'
        }`}
        style={DISPLAY_FONT}
        aria-hidden
      >
        ”
      </span>
      <blockquote
        className={`relative mx-auto max-w-2xl text-2xl leading-snug md:text-4xl md:leading-snug ${
          quoteClass ?? 'text-[#1e293b]'
        }`}
        style={DISPLAY_FONT}
      >
        {quote}
      </blockquote>
      {attribution && (
        <figcaption className="mt-4 text-sm font-bold text-[#64748b] md:text-base">
          — {attribution}
        </figcaption>
      )}
    </figure>
  )
}

/* ----------------------------------------------------------- */
/* PolaroidGallery — tilted, slightly overlapping polaroid cards */
/* ----------------------------------------------------------- */

export interface PolaroidImage {
  src: string
  alt: string
  caption?: string
}

// Static tilt/overlap variants cycled by index. Straight stack on mobile,
// tilted + overlapping (negative margin toward the previous card in RTL) on md+.
const POLAROID_TILTS = [
  'md:rotate-3 md:translate-y-3',
  'md:-rotate-2 md:-translate-y-2 md:-mr-8 md:z-10',
  'md:rotate-2 md:translate-y-5 md:-mr-8',
  'md:-rotate-3 md:-mr-8 md:z-10',
]

export function PolaroidGallery({
  images,
  sizeClass,
}: {
  images: PolaroidImage[]
  /** Full size classes for the photo area, e.g. 'w-60 h-60 sm:w-64 sm:h-64' */
  sizeClass?: string
}) {
  return (
    <div className="flex flex-col items-center gap-8 md:flex-row md:justify-center">
      {images.map((img, i) => (
        <figure
          key={img.src}
          className={`relative rounded-sm bg-white p-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.4)] ring-1 ring-black/5 transition-transform duration-300 hover:z-20 hover:scale-[1.03] ${
            img.caption ? 'pb-12' : 'pb-10'
          } ${POLAROID_TILTS[i % POLAROID_TILTS.length]}`}
        >
          <div
            className={`relative overflow-hidden ${
              sizeClass ?? 'h-60 w-60 sm:h-64 sm:w-64 lg:h-72 lg:w-72'
            }`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 768px) 80vw, 30vw"
              className="object-cover"
            />
          </div>
          {img.caption && (
            <figcaption className="absolute inset-x-3 bottom-3 truncate text-center text-base font-bold italic text-[#475569]">
              {img.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  )
}

/* ------------------------------------------------------- */
/* StepsTimeline — numbered steps with a connecting line     */
/* ------------------------------------------------------- */

export interface TimelineStep {
  title: string
  text?: string
  /** Optional icon/emoji rendered inside the circle instead of the number */
  icon?: ReactNode
}

export function StepsTimeline({
  steps,
  numberClass,
  lineClass,
}: {
  steps: TimelineStep[]
  /** Full classes for the numeral circle, e.g. 'bg-gradient-to-br from-pink-400 to-rose-500 text-white' */
  numberClass: string
  /** Full classes for the connecting line, e.g. 'bg-pink-200' */
  lineClass: string
}) {
  return (
    <ol className="relative grid gap-12 md:grid-cols-3 md:gap-10">
      {/* Vertical connector on mobile (right side in RTL), horizontal on desktop */}
      <span className={`absolute bottom-10 right-[26px] top-8 w-1 rounded-full md:hidden ${lineClass}`} aria-hidden />
      <span className={`absolute left-[16%] right-[16%] top-8 hidden h-1 rounded-full md:block ${lineClass}`} aria-hidden />
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="relative flex items-start gap-5 md:flex-col md:items-center md:gap-4 md:text-center"
        >
          <span
            className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl shadow-lg md:h-16 md:w-16 md:text-3xl ${numberClass}`}
            style={DISPLAY_FONT}
            aria-hidden
          >
            {step.icon ?? i + 1}
          </span>
          <div className="pt-1.5 md:pt-0">
            <h3 className="mb-2 text-lg font-extrabold text-[#1e293b] md:text-xl">{step.title}</h3>
            {step.text && (
              <p className="text-sm leading-relaxed text-[#64748b] md:text-base">{step.text}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

/* ------------------------------------------- */
/* ChecklistCard — card with ✓ list (tips etc.) */
/* ------------------------------------------- */

export function ChecklistCard({
  title,
  as: Heading = 'h2',
  intro,
  items,
  cardClass,
  checkClass,
  footer,
}: {
  title: string
  /** Heading level for the card title (default h2) */
  as?: 'h2' | 'h3'
  intro?: string
  items: string[]
  /** Full classes for the card shell, e.g. 'bg-rose-50 border-rose-200' */
  cardClass?: string
  /** Full classes for the check bullet, e.g. 'bg-pink-100 text-pink-600' */
  checkClass?: string
  footer?: ReactNode
}) {
  return (
    <div
      className={`rounded-3xl border p-6 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.3)] md:p-10 ${
        cardClass ?? 'border-black/5 bg-white'
      }`}
    >
      <Heading
        className="mb-4 text-2xl leading-tight tracking-tight text-[#1e293b] md:text-3xl lg:text-4xl"
        style={DISPLAY_FONT}
      >
        {title}
      </Heading>
      {intro && <p className="mb-6 leading-relaxed text-[#475569] md:text-lg">{intro}</p>}
      <ul className="space-y-3.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                checkClass ?? 'bg-[#fff6e6] text-[#b45309]'
              }`}
              aria-hidden
            >
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
            <span className="font-semibold leading-relaxed text-[#1e293b]">{item}</span>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  )
}

/* --------------------------------------------- */
/* StatStrip — big-number stats in a colored band */
/* --------------------------------------------- */

export interface Stat {
  value: string
  label: string
}

export function StatStrip({
  stats,
  bandClass,
  colsClass,
  valueClass,
  labelClass,
  dividerClass,
}: {
  stats: Stat[]
  /** Full bg classes for the band, e.g. 'bg-pink-50' */
  bandClass: string
  /** Grid columns override — full literal, e.g. 'sm:grid-cols-4' (default 'sm:grid-cols-3') */
  colsClass?: string
  valueClass?: string
  labelClass?: string
  /**
   * Optional divider between items — full literal matched to the band bg,
   * e.g. 'sm:divide-x sm:rtl:divide-x-reverse sm:divide-pink-200' (default: none)
   */
  dividerClass?: string
}) {
  return (
    <section className={bandClass}>
      <div
        className={`mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-10 text-center md:px-8 md:py-14 ${
          colsClass ?? 'sm:grid-cols-3'
        } ${dividerClass ?? ''}`}
      >
        {stats.map((stat) => (
          <div key={stat.label} className="px-2">
            <p
              className={`mb-1.5 text-4xl md:text-5xl ${valueClass ?? 'text-[#b45309]'}`}
              style={DISPLAY_FONT}
            >
              {stat.value}
            </p>
            <p className={`text-base font-bold ${labelClass ?? 'text-[#475569]'}`}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ----------------------------------------------------- */
/* IdeaStickers — slogan chips as playful tilted stickers */
/* ----------------------------------------------------- */

// Static rotation + size variants cycled at different periods for variety.
const STICKER_TILTS = ['rotate-2', '-rotate-2', 'rotate-1', '-rotate-3', 'rotate-3', '-rotate-1']
const STICKER_SIZES = [
  'px-5 py-2.5 text-sm md:text-base',
  'px-4 py-2 text-xs md:text-sm',
  'px-6 py-3 text-base md:text-lg',
]

export function IdeaStickers({
  title,
  emoji,
  subtitle,
  items,
  stickerClasses,
}: {
  title: string
  emoji?: string
  subtitle?: string
  items: string[]
  /** Full color/border class strings, cycled by index, e.g. ['bg-pink-50 text-pink-700 border-pink-200', ...] */
  stickerClasses: string[]
}) {
  return (
    <div>
      <h2
        className="mb-2 text-center text-2xl leading-tight tracking-tight text-[#1e293b] md:text-3xl lg:text-4xl"
        style={DISPLAY_FONT}
      >
        {emoji && (
          <span aria-hidden className="ml-2">
            {emoji}
          </span>
        )}
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mb-8 max-w-2xl text-center font-semibold text-[#64748b]">{subtitle}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {items.map((item, i) => (
          <span
            key={item}
            className={`inline-block rounded-2xl border-2 font-bold shadow-sm ${
              STICKER_TILTS[i % STICKER_TILTS.length]
            } ${STICKER_SIZES[i % STICKER_SIZES.length]} ${
              stickerClasses[i % stickerClasses.length]
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------- */
/* SplitSection — image + text, alternating direction */
/* ------------------------------------------------- */

export function SplitSection({
  eyebrow,
  eyebrowClass,
  title,
  image,
  reverse,
  imageFrameClass,
  children,
}: {
  eyebrow?: string
  /** Full classes, e.g. 'text-pink-500' */
  eyebrowClass?: string
  title: string
  image: { src: string; alt: string }
  /** Flip image/text column order on desktop */
  reverse?: boolean
  imageFrameClass?: string
  /** Body copy (paragraphs) */
  children: ReactNode
}) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      <div className={reverse ? 'md:order-2' : ''}>
        {eyebrow && (
          <p
            className={`mb-3 text-sm font-extrabold tracking-wide ${eyebrowClass ?? 'text-[#b45309]'}`}
          >
            {eyebrow}
          </p>
        )}
        <h2
          className="mb-4 text-2xl leading-tight tracking-tight text-[#1e293b] md:text-3xl lg:text-4xl"
          style={DISPLAY_FONT}
        >
          {title}
        </h2>
        <div className="space-y-4 text-base leading-relaxed text-[#475569] md:text-lg">
          {children}
        </div>
      </div>
      <div className={reverse ? 'md:order-1' : ''}>
        <div
          className={`relative aspect-[4/3] overflow-hidden ${
            imageFrameClass ?? 'rounded-3xl shadow-xl ring-1 ring-black/5'
          }`}
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------- */
/* FaqAccordion — <details> cards with plus/minus indicator  */
/* -------------------------------------------------------- */

export function FaqAccordion({
  faq,
  iconClass,
  cardClass,
}: {
  faq: SeoPageFaq[]
  /** Full color classes for the +/- icon, e.g. 'text-pink-500' */
  iconClass?: string
  cardClass?: string
}) {
  return (
    <div className="space-y-3">
      {faq.map((item, index) => (
        <details
          key={index}
          className={`group rounded-2xl border shadow-sm transition-shadow duration-200 hover:shadow-md open:shadow-md ${
            cardClass ?? 'border-black/5 bg-white'
          }`}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-5 text-base font-bold text-[#1e293b] md:text-lg [&::-webkit-details-marker]:hidden">
            <span>{item.q}</span>
            <span className="shrink-0" aria-hidden>
              <Plus className={`h-5 w-5 group-open:hidden ${iconClass ?? 'text-[#f59e0b]'}`} />
              <Minus className={`hidden h-5 w-5 group-open:block ${iconClass ?? 'text-[#f59e0b]'}`} />
            </span>
          </summary>
          <p className="px-6 pb-6 leading-relaxed text-[#475569]">{item.a}</p>
        </details>
      ))}
    </div>
  )
}

/* ------------------------------------------------ */
/* CtaBanner — closing CTA band with gradient bg     */
/* ------------------------------------------------ */

export function CtaBanner({
  bgClass,
  headline,
  sub,
  children,
  shellClass,
}: {
  /** Full gradient bg classes, e.g. 'bg-gradient-to-br from-pink-500 to-rose-600' */
  bgClass: string
  headline: string
  sub?: string
  /** Button row slot (yellow CTA + green WhatsApp) */
  children: ReactNode
  /** Shape/shadow override — full literal (default rounded band) */
  shellClass?: string
}) {
  return (
    <section
      className={`relative overflow-hidden p-8 text-center md:p-14 ${bgClass} ${
        shellClass ?? 'rounded-[2.5rem] shadow-[0_30px_70px_-25px_rgba(0,0,0,0.45)]'
      }`}
    >
      <div
        className="pointer-events-none absolute -top-16 right-8 h-52 w-52 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-4 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <h2 className="relative mb-4 text-3xl tracking-tight text-white md:text-5xl" style={DISPLAY_FONT}>
        {headline}
      </h2>
      {sub && (
        <p className="relative mx-auto mb-7 max-w-2xl text-lg font-semibold text-white/90 md:text-xl">
          {sub}
        </p>
      )}
      <div className="relative flex flex-wrap items-center justify-center gap-3">{children}</div>
    </section>
  )
}
