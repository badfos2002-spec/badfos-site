// Magazine layout for 'חולצות-לסוף-שנה' — fresh emerald/teal "ועד ההורים שסוגר
// פינה" composition built from the shared blocks. All copy comes from
// lib/seo-pages.ts. Structure intentionally differs from the flagship: the
// parents-committee checklist is the hero move, pulled up over the diagonal.

import Link from 'next/link'
import { ArrowLeft, ChevronLeft, MessageCircle } from 'lucide-react'
import { getSeoPage } from '@/lib/seo-pages'
import type { SeoLayoutProps } from './types'
import {
  HeroBand,
  ChecklistCard,
  StepsTimeline,
  SplitSection,
  IdeaStickers,
  StatStrip,
  PullQuote,
  PolaroidGallery,
  FaqAccordion,
  CtaBanner,
} from '../blocks'

/** Yellow brand CTA + green WhatsApp button pair (hero + closing banner) */
function CtaButtons({ page, waUrl }: SeoLayoutProps) {
  return (
    <>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffc32e] to-[#f59e0b] px-8 py-4 text-lg font-extrabold text-white shadow-[0_15px_35px_-10px_rgba(245,158,11,0.6)] hover:from-[#e6ac28] hover:to-[#d97706] transition-colors"
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

// Cycled sticker color variants — full static literals (emerald/teal/lime family)
const STICKER_CLASSES = [
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-white text-teal-600 border-teal-300',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-lime-50 text-lime-700 border-lime-300',
]

export default function EndOfYearLayout({ page, waUrl }: SeoLayoutProps) {
  // Content mapping: [0] keepsake + teacher-gift story, [1] class-budget math,
  // [2] process for non-designers (feeds the checklist)
  const [keepsakeParagraph, budgetParagraph, processParagraph] = page.paragraphs
  const namesBenefit = page.benefits[1]
  const sketchBenefit = page.benefits[2]
  const deadlineBenefit = page.benefits[3]

  const relatedPages = page.related
    .map((slug) => getSeoPage(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  return (
    <main className="min-h-screen bg-white" dir="rtl">
      {/* 1. Hero — emerald→teal diagonal band, school-year energy */}
      <HeroBand
        bgClass="bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700"
        diagonal
        breadcrumb={
          <nav aria-label="פירורי לחם" className="mb-8 text-sm text-white/70">
            <ol className="flex items-center gap-1.5 flex-wrap">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  בית
                </Link>
              </li>
              <li aria-hidden>
                <ChevronLeft className="w-4 h-4" />
              </li>
              <li className="font-semibold text-white">{page.h1}</li>
            </ol>
          </nav>
        }
        badgeText={page.audienceLine}
        badgeEmoji={page.accent?.emoji}
        badgeClass="bg-white/15 text-white border-white/30"
        title={page.h1}
        subtitle={page.heroText}
        cta={<CtaButtons page={page} waUrl={waUrl} />}
      />

      {/* 2. THE hero move — the parents-committee checklist, pulled up over the diagonal */}
      {processParagraph && (
        <section className="relative z-10 mx-auto -mt-10 max-w-4xl px-4 md:-mt-14 md:px-8">
          <ChecklistCard
            title="הצ'קליסט של ועד ההורים"
            intro="אף אחד לא נבחר לוועד ההורים בגלל כישורי עיצוב — וזה בסדר. ככה סוגרים את החולצות בלי כאב ראש:"
            cardClass="bg-white border-emerald-200"
            checkClass="bg-emerald-100 text-emerald-600"
            items={[
              'שולחים רשימת שמות, לוגו או אפילו רק רעיון כללי — הגרפיקאי שלנו מרכיב עיצוב מסודר',
              'מקבלים סקיצה לאישור לפני ההדפסה — כל שם, כל ניקוד, כל גרש',
              'משלבים באותה הזמנה מידות ילדים לתלמידים ומידות מבוגרים למורים — מ־XS ועד 4XL',
              'סוגרים מידות שבועיים־שלושה לפני מסיבת הסיום — איסוף המידות לוקח יותר זמן מההדפסה',
              'בוחרים משלוח מרוכז אחד לכל הארץ או איסוף עצמי חינם מראשון לציון',
            ]}
            footer={
              <p className="text-sm font-semibold leading-relaxed text-[#64748b]">
                {processParagraph.title} — {sketchBenefit?.text}
              </p>
            }
          />
        </section>
      )}

      {/* 3. Three steps — from class list to party day */}
      <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-20">
        <h2 className="mb-10 text-center text-2xl font-extrabold text-[#1e293b] md:mb-14 md:text-3xl">
          איך זה עובד?
        </h2>
        <StepsTimeline
          numberClass="bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
          lineClass="bg-emerald-200"
          steps={[
            {
              title: 'אוספים מידות מהכיתה',
              text: 'טבלה או סקר בקבוצת ההורים עם שם + מידה, ודדליין ברור',
            },
            {
              title: 'מעצבים ומאשרים סקיצה',
              text: 'הגרפיקאי מסדר את השמות בעיצוב מקצועי ושולח סקיצה לאישור',
            },
            {
              title: 'מחלקים חולצות במסיבה',
              text: 'משלוח מרוכז לכל הארץ או איסוף עצמי חינם מראשון לציון',
            },
          ]}
        />
      </section>

      {/* 4. Budget split — 30 kids, 60 parents with opinions */}
      {budgetParagraph && (
        <section className="bg-emerald-50/60 py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-4 md:px-8">
            <SplitSection
              eyebrow="תכל'ס לוועד"
              eyebrowClass="text-emerald-600"
              title={budgetParagraph.title}
              image={{ src: page.galleryImages[0], alt: `${page.h1} — הדפסה של בדפוס` }}
              imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-emerald-100"
            >
              <p>{budgetParagraph.text}</p>
            </SplitSection>
          </div>
        </section>
      )}

      {/* 5. Slogan stickers — end-of-year classics */}
      {page.ideas && (
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <IdeaStickers
            title={page.ideas.title}
            emoji={page.accent?.emoji}
            subtitle="קחו השראה — כל כיתוב כזה מעצבים אונליין תוך דקות, עם תצוגה מקדימה חיה."
            items={page.ideas.items}
            stickerClasses={STICKER_CLASSES}
          />
        </section>
      )}

      {/* 6. Numbers band — the committee math */}
      <StatStrip
        bandClass="bg-gradient-to-l from-emerald-600 to-teal-600"
        stats={[
          { value: 'אפס טעויות', label: 'סקיצה לאישור לפני ההדפסה — כל שם, כל גרש' },
          { value: 'ימים ספורים', label: 'ייצור מהיר — מוכנים לפני מסיבת הסיום' },
          { value: 'XS–4XL', label: 'מידות ילדים ומבוגרים באותה הזמנה' },
        ]}
        valueClass="text-white"
        labelClass="text-emerald-50"
      />

      {/* 7. Keepsake / teacher-gift split (reversed direction) */}
      {keepsakeParagraph && (
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <SplitSection
            reverse
            eyebrow="המזכרת"
            eyebrowClass="text-teal-600"
            title={keepsakeParagraph.title}
            image={{
              src: page.galleryImages[1] ?? page.galleryImages[0],
              alt: `${page.h1} — חולצות מודפסות של בדפוס`,
            }}
            imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-teal-100"
          >
            <p>{keepsakeParagraph.text}</p>
          </SplitSection>
        </section>
      )}

      {/* 8. Pull quote — the gratitude shirt */}
      <section className="bg-white pb-10 md:pb-16">
        <PullQuote
          quote="תודה למורה הכי טובה בעולם"
          attribution="הכיתוב שמרגש כל סוף שנה — גם אצל הגננת של החיים 💚"
          markClass="text-teal-200"
          quoteClass="text-[#1e293b]"
        />
      </section>

      {/* 9. Polaroid gallery on a soft emerald band */}
      <section
        className="bg-gradient-to-b from-emerald-50/70 to-teal-50 py-20 md:py-24"
        style={{ clipPath: 'polygon(0 0, 100% 2.5rem, 100% 100%, 0 100%)' }}
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

      {/* 10. FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-16 md:px-8 md:py-24">
        <h2 className="mb-6 text-2xl font-extrabold text-[#1e293b] md:text-3xl">שאלות נפוצות</h2>
        <FaqAccordion
          faq={page.faq}
          iconClass="text-emerald-600"
          cardClass="border-emerald-100 bg-white"
        />
      </section>

      {/* 11. Related pages */}
      {relatedPages.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pb-16 md:px-8 md:pb-20">
          <h2 className="mb-4 text-xl font-extrabold text-[#1e293b]">אולי יעניין אתכם גם</h2>
          <div className="flex flex-wrap gap-3">
            {relatedPages.map((related) => (
              <Link
                key={related.slug}
                href={`/${related.slug}`}
                className="rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-bold text-[#1e293b] hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
              >
                {related.h1}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 12. Closing CTA band */}
      <div className="mx-auto max-w-5xl px-4 pb-16 md:px-8 md:pb-24">
        <CtaBanner
          bgClass="bg-gradient-to-br from-emerald-600 to-teal-700"
          headline="סוגרים את החולצות לפני שהשנה נסגרת?"
          sub={deadlineBenefit?.text ?? namesBenefit?.text ?? page.heroText}
        >
          <CtaButtons page={page} waUrl={waUrl} />
        </CtaBanner>
      </div>
    </main>
  )
}
