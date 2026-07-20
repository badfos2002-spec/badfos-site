// Home-turf layout for 'הדפסת-חולצות-בראשון-לציון' — brand-yellow editorial
// composition built from the shared blocks. All copy comes from lib/seo-pages.ts.

import Link from 'next/link'
import { ArrowLeft, ChevronLeft, MessageCircle } from 'lucide-react'
import { getSeoPage } from '@/lib/seo-pages'
import type { SeoLayoutProps } from './types'
import {
  DISPLAY_FONT,
  HeroBand,
  StatStrip,
  SplitSection,
  PolaroidGallery,
  ChecklistCard,
  FaqAccordion,
} from '../blocks'

/**
 * CTA pair. On the yellow hero the homepage button is dark slate (yellow-on-yellow
 * has no contrast); on the dark closing band it flips to the brand yellow gradient.
 * Both variants are complete static literals.
 */
function CtaButtons({ page, waUrl, onDark }: SeoLayoutProps & { onDark?: boolean }) {
  return (
    <>
      <Link
        href="/"
        className={
          onDark
            ? 'inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffc32e] to-[#f59e0b] px-8 py-4 text-lg font-extrabold text-white shadow-[0_15px_35px_-10px_rgba(245,158,11,0.6)] hover:from-[#e6ac28] hover:to-[#d97706] transition-colors'
            : 'inline-flex items-center gap-2 rounded-full bg-[#1e293b] px-8 py-4 text-lg font-extrabold text-white shadow-[0_15px_35px_-10px_rgba(30,41,59,0.55)] hover:bg-[#0f172a] transition-colors'
        }
      >
        {page.ctaText}
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1fb455] px-8 py-4 text-lg font-extrabold text-white shadow-lg transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        דברו איתנו בוואטסאפ
      </a>
    </>
  )
}

export default function RishonLayout({ page, waUrl }: SeoLayoutProps) {
  const [localParagraph, urgentParagraph, pricingParagraph] = page.paragraphs

  const relatedPages = page.related
    .map((slug) => getSeoPage(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* 1. Hero — full-bleed brand-yellow band with diagonal bottom edge */}
      <HeroBand
        bgClass="bg-gradient-to-br from-[#f59e0b] via-[#fbbf24] to-[#ffc32e]"
        diagonal
        breadcrumb={
          <nav aria-label="פירורי לחם" className="mb-8 text-sm text-[#1e293b]/60">
            <ol className="flex items-center gap-1.5 flex-wrap">
              <li>
                <Link href="/" className="hover:text-[#1e293b] transition-colors">
                  בית
                </Link>
              </li>
              <li aria-hidden>
                <ChevronLeft className="w-4 h-4" />
              </li>
              <li className="font-semibold text-[#1e293b]">{page.h1}</li>
            </ol>
          </nav>
        }
        title={page.h1}
        titleClass="text-[#1e293b]"
        subtitle={page.heroText}
        subtitleClass="text-[#1e293b]/80"
        cta={<CtaButtons page={page} waUrl={waUrl} />}
      />

      {/* 2. Local facts strip — all verified in the page copy/FAQ */}
      <StatStrip
        bandClass="bg-[#fff6e6]"
        stats={[
          { value: 'חינם', label: 'איסוף עצמי בתיאום מראש' },
          { value: 'דובנוב 10', label: 'ראשון לציון' },
          { value: 'לכל הארץ', label: 'משלוח עד הבית' },
        ]}
        valueClass="text-[#b45309]"
        labelClass="text-[#64748b]"
      />

      {/* 3. Local-business split */}
      {localParagraph && (
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <SplitSection
            title={localParagraph.title}
            image={{ src: page.galleryImages[0], alt: `${page.h1} — הדפסה של בדפוס` }}
            imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-amber-100"
          >
            <p>{localParagraph.text}</p>
          </SplitSection>
        </section>
      )}

      {/* 4. Polaroid gallery on a soft angled yellow band */}
      <section
        className="bg-gradient-to-b from-amber-50/70 to-[#fff6e6] py-20 md:py-24"
        style={{ clipPath: 'polygon(0 2.5rem, 100% 0, 100% 100%, 0 100%)' }}
      >
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <PolaroidGallery
            images={page.galleryImages.map((src, i) => ({
              src,
              alt: `${page.h1} — דוגמה ${i + 1} מלקוחות בדפוס`,
            }))}
          />
        </div>
      </section>

      {/* 5. Urgent-orders split (reversed direction) */}
      {urgentParagraph && (
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <SplitSection
            reverse
            title={urgentParagraph.title}
            image={{
              src: page.galleryImages[1] ?? page.galleryImages[0],
              alt: `${page.h1} — חולצות מודפסות של בדפוס`,
            }}
            imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-amber-100"
          >
            <p>{urgentParagraph.text}</p>
          </SplitSection>
        </section>
      )}

      {/* 6. Pricing paragraph as a checklist card — items are the page's own benefit titles */}
      {pricingParagraph && (
        <section className="mx-auto max-w-4xl px-4 py-4 md:px-8 md:py-8">
          <ChecklistCard
            title={pricingParagraph.title}
            intro={pricingParagraph.text}
            cardClass="bg-amber-50 border-amber-200"
            checkClass="bg-[#fff6e6] text-[#b45309]"
            items={page.benefits.map((benefit) => benefit.title)}
          />
        </section>
      )}

      {/* 7. FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-16 md:px-8 md:py-24">
        <h2 className="mb-6 text-2xl font-extrabold text-[#1e293b] md:text-3xl">שאלות נפוצות</h2>
        <FaqAccordion
          faq={page.faq}
          iconClass="text-[#f59e0b]"
          cardClass="border-amber-100 bg-white"
        />
      </section>

      {/* 8. Related pages */}
      {relatedPages.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pb-16 md:px-8 md:pb-20">
          <h2 className="mb-4 text-xl font-extrabold text-[#1e293b]">אולי יעניין אתכם גם</h2>
          <div className="flex flex-wrap gap-3">
            {relatedPages.map((related) => (
              <Link
                key={related.slug}
                href={`/${related.slug}`}
                className="rounded-full border border-amber-200 bg-white px-5 py-2.5 text-sm font-bold text-[#1e293b] hover:bg-amber-50 hover:border-[#f59e0b] transition-colors"
              >
                {related.h1}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 9. Closing CTA band — dark slate with a yellow-accent headline (composed
          inline: the shared CtaBanner hardcodes a white headline) */}
      <div className="mx-auto max-w-5xl px-4 pb-16 md:px-8 md:pb-24">
        <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center shadow-[0_30px_70px_-25px_rgba(0,0,0,0.45)] md:p-14">
          <div
            className="pointer-events-none absolute -top-16 right-8 h-52 w-52 rounded-full bg-[#ffc32e]/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 left-4 h-64 w-64 rounded-full bg-[#ffc32e]/10 blur-3xl"
            aria-hidden
          />
          <h2 className="relative mb-7 text-3xl text-[#ffc32e] md:text-5xl" style={DISPLAY_FONT}>
            {page.h1}
          </h2>
          <div className="relative flex flex-wrap items-center justify-center gap-3">
            <CtaButtons page={page} waUrl={waUrl} onDark />
          </div>
        </section>
      </div>
    </div>
  )
}
