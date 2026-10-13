'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { CarouselItem } from '@/lib/types'

// ProductRiver — two full-bleed marquee rows of products flowing slowly in
// opposite directions below the hero copy (one continuous row on mobile).
// Pure CSS animation (duplicated-track infinite marquee), no GSAP, no deps.
// Used inside the combined hero (NewHeroSection).

// The track renders the row's items GROUP_REPEATS times; the animation
// translates by -50%, so the track must hold an even number of identical
// groups and each half must be wider than the widest viewport (1536px).
// 4 repeats → half = 2 groups ≈ 2100px on desktop, ≈ 1300px on mobile.
const GROUP_REPEATS = 4

const RIVER_CSS = `
@keyframes hr-flow-a { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes hr-flow-b { from { transform: translateX(-50%); } to { transform: translateX(0); } }
.hr-track { display: flex; width: max-content; will-change: transform; }
.hr-track-a { animation: hr-flow-a 30s linear infinite; }
.hr-track-b { animation: hr-flow-b 34s linear infinite; }
.hr-track-m { animation: hr-flow-a 30s linear infinite; }
.hr-row:hover .hr-track,
.hr-row:focus-within .hr-track { animation-play-state: paused; }
.hr-row {
  -webkit-mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent);
  mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent);
}
@media (prefers-reduced-motion: reduce) {
  .hr-track-a, .hr-track-b, .hr-track-m { animation: none; }
}
`

function RiverRow({
  items,
  trackClass,
  className = '',
  groupRepeats = GROUP_REPEATS,
}: {
  items: CarouselItem[]
  trackClass: string
  className?: string
  groupRepeats?: number
}) {
  return (
    <div className={`hr-row relative w-full overflow-hidden ${className}`}>
      <div className={`hr-track ${trackClass}`}>
        {Array.from({ length: groupRepeats }, (_, g) => (
          <div key={g} className="flex flex-none" aria-hidden={g > 0 || undefined}>
            {items.map((item) => (
              <Link
                key={`${g}-${item.id}`}
                href={item.href ?? '/designer'}
                tabIndex={g > 0 ? -1 : undefined}
                aria-label={g === 0 ? `עיצוב ${item.tag}` : undefined}
                className="flex flex-none flex-col items-center w-[140px] md:w-56 mx-3 md:mx-5 transition-transform duration-300 hover:-translate-y-1.5"
              >
                <div className="relative w-full aspect-square">
                  <Image
                    src={item.imageUrl}
                    alt={g === 0 ? item.tag : ''}
                    fill
                    sizes="(max-width: 768px) 140px, 224px"
                    className="object-contain drop-shadow-[0_14px_24px_rgba(133,77,14,0.15)]"
                    loading={g === 0 ? 'eager' : 'lazy'}
                  />
                </div>
                <span className="mt-1.5 md:mt-2 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full border border-[#fde047]/70 text-[11px] md:text-sm font-semibold text-[#854d0e] shadow-sm whitespace-nowrap">
                  {item.tag}
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// dir=ltr so the standard marquee translate math is predictable; the Hebrew
// labels inside each card render correctly regardless.
export function ProductRiver({ items, className = '' }: { items: CarouselItem[]; className?: string }) {
  const sorted = [...items].sort((a, b) => a.order - b.order)
  const half = Math.ceil(sorted.length / 2)
  const topItems = sorted.slice(0, half)
  const bottomItems = sorted.slice(half)

  return (
    <div className={className} dir="ltr">
      <style>{RIVER_CSS}</style>
      {/* Mobile (<640px): one continuous row with ALL items. 2 repeats → the
          -50% loop point is exactly one full group (~2300px), seamless and
          wider than any mobile viewport. Same half-track distance as the old
          mobile top row (14 item widths), so 30s keeps the same visual speed. */}
      <RiverRow items={sorted} trackClass="hr-track-m" className="sm:hidden" groupRepeats={2} />
      {/* Tablet/desktop (≥640px): two counter-flowing rows, unchanged */}
      <RiverRow items={topItems} trackClass="hr-track-a" className="hidden sm:block" />
      {bottomItems.length > 0 && (
        <RiverRow items={bottomItems} trackClass="hr-track-b" className="hidden sm:block mt-3 md:mt-6" />
      )}
    </div>
  )
}
