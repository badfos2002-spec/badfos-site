// Magazine layout for 'חולצות-ליום-הולדת' — festive purple/fuchsia "gift" energy.
// Structurally distinct from the flagship: party photos hook right after the hero,
// pull quote early, stats late. All copy comes from lib/seo-pages.ts.

import Link from 'next/link'
import { ArrowLeft, ChevronLeft, MessageCircle } from 'lucide-react'
import { getSeoPage } from '@/lib/seo-pages'
import type { SeoLayoutProps } from './types'
import {
  HeroBand,
  PolaroidGallery,
  PullQuote,
  SplitSection,
  IdeaStickers,
  StepsTimeline,
  StatStrip,
  ChecklistCard,
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

// Cycled sticker color variants — full static literals (purple/fuchsia/pink family)
const STICKER_CLASSES = [
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-white text-fuchsia-600 border-fuchsia-300',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'bg-pink-50 text-pink-700 border-pink-200',
]

export default function BirthdayLayout({ page, waUrl }: SeoLayoutProps) {
  const [giftParagraph, designParagraph, timingParagraph] = page.paragraphs

  const relatedPages = page.related
    .map((slug) => getSeoPage(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  return (
    <main className="min-h-screen bg-white" dir="rtl">
      {/* 1. Hero — diagonal purple band with floating party confetti emoji */}
      <div className="relative">
        <HeroBand
          bgClass="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600"
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
        {/* Festive floats — decorative only, never block clicks */}
        <span
          className="pointer-events-none absolute right-[6%] top-10 select-none text-3xl opacity-60 md:text-5xl"
          aria-hidden
        >
          🎈
        </span>
        <span
          className="pointer-events-none absolute left-[8%] top-24 hidden select-none text-4xl opacity-50 md:block"
          aria-hidden
        >
          🎉
        </span>
        <span
          className="pointer-events-none absolute bottom-24 left-[4%] select-none text-2xl opacity-40 md:bottom-32 md:text-4xl"
          aria-hidden
        >
          🎁
        </span>
      </div>

      {/* 2. Party photos first — the hook, on a soft purple band */}
      <section className="bg-gradient-to-b from-purple-50/80 to-fuchsia-50/60 py-14 md:py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <PolaroidGallery
            images={page.galleryImages.map((src, i) => ({
              src,
              alt: `${page.h1} — דוגמה ${i + 1} מלקוחות בדפוס`,
            }))}
          />
        </div>
      </section>

      {/* 3. Early pull quote — the gift you remember */}
      {giftParagraph && (
        <section className="bg-white py-12 md:py-16">
          <PullQuote
            quote={giftParagraph.title}
            markClass="text-fuchsia-200"
            quoteClass="text-[#1e293b]"
          />
        </section>
      )}

      {/* 4. Story split — why this is the gift everyone remembers */}
      {giftParagraph && (
        <section className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-20">
          <SplitSection
            eyebrow="המתנה"
            eyebrowClass="text-fuchsia-600"
            title={giftParagraph.title}
            image={{ src: page.galleryImages[0], alt: `${page.h1} — הדפסה של בדפוס` }}
            imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-purple-100"
          >
            <p>{giftParagraph.text}</p>
          </SplitSection>
        </section>
      )}

      {/* 5. Sticker wall — print slogan ideas */}
      {page.ideas && (
        <section className="bg-fuchsia-50/50 py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-4 md:px-8">
            <IdeaStickers
              title={page.ideas.title}
              emoji={page.accent?.emoji}
              subtitle="קחו השראה — כל כיתוב כזה מעצבים אונליין תוך דקות, עם תצוגה מקדימה חיה."
              items={page.ideas.items}
              stickerClasses={STICKER_CLASSES}
            />
          </div>
        </section>
      )}

      {/* 6. Three steps to the surprise */}
      <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
        <h2 className="mb-10 text-center text-2xl font-extrabold text-[#1e293b] md:mb-14 md:text-3xl">
          שלוש דקות עד ההפתעה
        </h2>
        <StepsTimeline
          numberClass="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white"
          lineClass="bg-purple-200"
          steps={[
            {
              title: 'בוחרים עיצוב',
              text: 'מעלים תמונה של החוגג ומוסיפים כיתוב, שם וגיל במעצב האונליין',
            },
            {
              title: 'תצוגה מקדימה חיה',
              text: 'רואים את החולצה מכל צד לפני שמשלמים — בלי הפתעות בהדפסה',
            },
            {
              title: 'ההפתעה מוכנה',
              text: 'ייצור תוך ימים ספורים — משלוח עד הבית או איסוף עצמי מראשון לציון',
            },
          ]}
        />
      </section>

      {/* 7. How-to split (reversed) — designing without design skills */}
      {designParagraph && (
        <section className="mx-auto max-w-5xl px-4 pb-16 md:px-8 md:pb-24">
          <SplitSection
            reverse
            eyebrow="ככה זה עובד"
            eyebrowClass="text-purple-600"
            title={designParagraph.title}
            image={{
              src: page.galleryImages[1] ?? page.galleryImages[0],
              alt: `${page.h1} — חולצות מודפסות של בדפוס`,
            }}
            imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-fuchsia-100"
          >
            <p>{designParagraph.text}</p>
          </SplitSection>
        </section>
      )}

      {/* 8. Numbers band — late, after the story has landed */}
      <StatStrip
        bandClass="bg-purple-50"
        stats={[
          { value: 'מ־37 ₪', label: 'חולצה מודפסת עם תמונה וכיתוב' },
          { value: 'ימים ספורים', label: 'ייצור מהיר — מוכן לפני המסיבה' },
          { value: '5%', label: 'הנחה אוטומטית מעל 15 יחידות' },
        ]}
        valueClass="text-purple-700"
        labelClass="text-[#64748b]"
      />

      {/* 9. Timing tips as a checklist card */}
      {timingParagraph && (
        <section className="mx-auto max-w-4xl px-4 py-16 md:px-8 md:py-24">
          <ChecklistCard
            title={timingParagraph.title}
            intro={timingParagraph.text}
            cardClass="bg-fuchsia-50 border-fuchsia-200"
            checkClass="bg-purple-100 text-purple-600"
            items={[
              'מזמינים כמה ימים לפני האירוע — בלי לחץ של הרגע האחרון',
              'שולחים את התמונה בקובץ המקורי מהטלפון, לא דרך וואטסאפ',
              'מאזור המרכז? איסוף עצמי מראשון לציון חוסך את ימי המשלוח',
              'כותבים לנו את תאריך המסיבה — ונוודא שהחולצות מגיעות לפניה',
            ]}
          />
        </section>
      )}

      {/* 10. FAQ */}
      <section className="mx-auto max-w-4xl px-4 pb-16 md:px-8 md:pb-24">
        <h2 className="mb-6 text-2xl font-extrabold text-[#1e293b] md:text-3xl">שאלות נפוצות</h2>
        <FaqAccordion
          faq={page.faq}
          iconClass="text-purple-500"
          cardClass="border-purple-100 bg-white"
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
                className="rounded-full border border-purple-200 bg-white px-5 py-2.5 text-sm font-bold text-[#1e293b] hover:bg-purple-50 hover:border-purple-400 transition-colors"
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
          bgClass="bg-gradient-to-br from-purple-600 to-fuchsia-600"
          headline="מוכנים להפתיע?"
          sub="מעצבים אונליין בכמה דקות, רואים תצוגה מקדימה חיה — והמתנה מוכנה לפני המסיבה."
        >
          <CtaButtons page={page} waUrl={waUrl} />
        </CtaBanner>
      </div>
    </main>
  )
}
