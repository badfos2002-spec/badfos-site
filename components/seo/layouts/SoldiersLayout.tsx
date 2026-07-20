// Magazine layout for 'חולצות-לחיילים' — olive/khaki military editorial with the
// brand amber as the "insignia" accent. Built from the shared blocks; all copy
// comes from lib/seo-pages.ts. Deliberately light on photos (the soldiers gallery
// section is still being populated) — the composition leans on bold display type,
// the dark seasonality band and the stencil-flavored idea stickers instead.

import Link from 'next/link'
import { ArrowLeft, Camera, ChevronLeft, MessageCircle } from 'lucide-react'
import { getSeoPage } from '@/lib/seo-pages'
import type { SeoLayoutProps } from './types'
import {
  HeroBand,
  StatStrip,
  SplitSection,
  IdeaStickers,
  PullQuote,
  StepsTimeline,
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

// Cycled sticker color variants — full static literals (olive/khaki/amber family,
// including one dark "stencil" sticker for military flavor)
const STICKER_CLASSES = [
  'bg-[#f1f0e4] text-[#3f4a24] border-[#cfd3b4]',
  'bg-white text-stone-700 border-stone-300',
  'bg-amber-50 text-amber-800 border-amber-200',
  'bg-[#333d21] text-amber-100 border-[#272e18]',
]

export default function SoldiersLayout({ page, waUrl }: SeoLayoutProps) {
  // Content mapping: [0] end-of-track story, [1] commander gift / release &
  // enlistment parties, [2] how to close a platoon order (feeds the checklist)
  const [storyParagraph, giftParagraph, processParagraph] = page.paragraphs
  const namesBenefit = page.benefits[2]
  const urgentBenefit = page.benefits[1]

  const relatedPages = page.related
    .map((slug) => getSeoPage(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* 1. Hero — dark olive-drab band, amber insignia accents */}
      <HeroBand
        bgClass="bg-gradient-to-br from-[#4a5228] via-[#3a4423] to-[#272e18]"
        diagonal
        breadcrumb={
          <nav aria-label="פירורי לחם" className="mb-8 text-sm text-white/60">
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
        badgeClass="bg-white/10 text-amber-200 border-amber-300/30"
        title={page.h1}
        titleClass="text-white"
        subtitle={page.heroText}
        subtitleClass="text-stone-200"
        cta={<CtaButtons page={page} waUrl={waUrl} />}
      />

      {/* 2. Khaki-paper stats band — the platoon logistics in three lines */}
      <StatStrip
        bandClass="bg-[#f4f3ea]"
        stats={[
          { value: 'כל הפלוגה', label: 'כל אחד מוסיף מידה — הזמנה מרוכזת אחת' },
          { value: 'מהיום למחר', label: 'בהזמנות דחופות — כשהטקס לא מחכה' },
          { value: 'XS–4XL', label: 'חולצות, סווטשירטים ובאפים ליחידה' },
        ]}
        valueClass="text-[#4b5320]"
        labelClass="text-[#64748b]"
        dividerClass="sm:divide-x sm:rtl:divide-x-reverse sm:divide-[#dcdcc6]"
      />

      {/* 3. End-of-track story split — the one strong real photo */}
      {storyParagraph && (
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <SplitSection
            eyebrow="סוף מסלול"
            eyebrowClass="text-[#6b7a3f]"
            title={storyParagraph.title}
            image={{ src: page.galleryImages[0], alt: `${page.h1} — הדפסת גב של בדפוס` }}
            imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-[#e9e8d8]"
          >
            <p>{storyParagraph.text}</p>
          </SplitSection>
        </section>
      )}

      {/* 4. Stencil idea stickers — platoon caption bank */}
      {page.ideas && (
        <section className="bg-[#f8f7f0] py-16 md:py-20">
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

      {/* 5. Three steps — from the platoon group chat to the ceremony */}
      <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-20">
        <h2 className="mb-10 text-center text-2xl font-extrabold text-[#1e293b] md:mb-14 md:text-3xl">
          איך זה עובד?
        </h2>
        <StepsTimeline
          numberClass="bg-gradient-to-br from-[#5b6b33] to-[#3a4423] text-white"
          lineClass="bg-[#d9dcc0]"
          steps={[
            {
              title: 'אחד לוקח פיקוד',
              text: 'סקר בקבוצת הפלוגה — כל אחד מוסיף מידה וצבע, דדליין עד סוף השבוע',
            },
            {
              title: 'מעצבים ומאשרים סקיצה',
              text: 'שמות וכינויים על הגב, סמל היחידה על החזה — הגרפיקאי שולח סקיצה לאישור',
            },
            {
              title: 'מקבלים לפני הטקס',
              text: 'ייצור בימים ספורים, מהיום למחר כשצריך — משלוח מרוכז או איסוף מראשון לציון',
            },
          ]}
        />
      </section>

      {/* 6. Dark seasonality band — the army calendar */}
      <StatStrip
        bandClass="bg-gradient-to-l from-[#3a4423] to-[#272e18]"
        stats={[
          { value: 'גיוסים', label: 'מסיבות גיוס של מרץ, אוגוסט ונובמבר' },
          { value: 'סיומי מסלול', label: 'טקסים, כומתות וחולצות לכל הפלוגה' },
          { value: 'שחרורים', label: 'מסיבות שחרור — "משוחרר רשמית" בענק על הגב' },
        ]}
        valueClass="text-amber-300"
        labelClass="text-stone-300"
      />

      {/* 7. Commander gift / parties split (reversed direction) */}
      {giftParagraph && (
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <SplitSection
            reverse
            eyebrow="צ׳ופר פלוגתי"
            eyebrowClass="text-[#6b7a3f]"
            title={giftParagraph.title}
            image={{
              src: page.galleryImages[2] ?? page.galleryImages[0],
              alt: `${page.h1} — סט חולצות מודפסות של בדפוס`,
            }}
            imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-[#e9e8d8]"
          >
            <p>{giftParagraph.text}</p>
          </SplitSection>
        </section>
      )}

      {/* 8. Pull quote — the names-on-the-back move */}
      {namesBenefit && (
        <section className="bg-white pb-10 md:pb-16">
          <PullQuote
            quote="אחים למסלול, אחים לחיים"
            attribution="הכיתוב שסוגר כל מסלול — עם השם והכינוי של כל אחד על הגב"
            markClass="text-[#cfd3b4]"
            quoteClass="text-[#1e293b]"
          />
        </section>
      )}

      {/* 9. The platoon organizer's checklist */}
      {processParagraph && (
        <section className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-14">
          <ChecklistCard
            title="הצ׳קליסט של סוגר הפינה בפלוגה"
            intro={processParagraph.text}
            cardClass="bg-[#f7f6ec] border-[#dcdfc2]"
            checkClass="bg-[#e7eacb] text-[#4b5320]"
            items={[
              'סקר מידות וצבעים בקבוצת הפלוגה — דדליין עד שבת בערב, נקודה',
              'רשימת שמות וכינויים לגב — שולחים לנו, הגרפיקאי מסדר',
              'תשלום מרוכז: הצעת מחיר בהודעה אחת, גבייה בביט או בפייבוקס',
              'סקיצה לאישור לפני ההדפסה — שאף כינוי לא יתפספס',
              'משלוח מרוכז לכל הארץ או איסוף חינם מראשון לציון — בדרך לבסיס',
            ]}
            footer={
              <p className="text-sm font-semibold leading-relaxed text-[#64748b]">
                {urgentBenefit?.text}
              </p>
            }
          />
        </section>
      )}

      {/* 10. FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-16 md:px-8 md:py-24">
        <h2 className="mb-6 text-2xl font-extrabold text-[#1e293b] md:text-3xl">שאלות נפוצות</h2>
        <FaqAccordion
          faq={page.faq}
          iconClass="text-[#6b7a3f]"
          cardClass="border-[#e3e5cd] bg-white"
        />
      </section>

      {/* 11. Related pages + gallery chip (the soldiers section fills up as photos land) */}
      {relatedPages.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pb-16 md:px-8 md:pb-20">
          <h2 className="mb-4 text-xl font-extrabold text-[#1e293b]">אולי יעניין אתכם גם</h2>
          <div className="flex flex-wrap gap-3">
            {relatedPages.map((related) => (
              <Link
                key={related.slug}
                href={`/${related.slug}`}
                className="rounded-full border border-[#cfd3b4] bg-white px-5 py-2.5 text-sm font-bold text-[#1e293b] hover:bg-[#f4f3ea] hover:border-[#8a9a4e] transition-colors"
              >
                {related.h1}
              </Link>
            ))}
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-colors"
            >
              <Camera className="h-4 w-4" />
              עבודות אמיתיות בגלריה שלנו
            </Link>
          </div>
        </section>
      )}

      {/* 12. Closing CTA band */}
      <div className="mx-auto max-w-5xl px-4 pb-16 md:px-8 md:pb-24">
        <CtaBanner
          bgClass="bg-gradient-to-br from-[#4b5320] to-[#2c3418]"
          headline="הפלוגה מחכה לחולצות?"
          sub="כל אחד זורק מידה בקבוצה, אנחנו מדפיסים — ובהזמנות דחופות נעשה הכול כדי שיהיה מוכן מהיום למחר."
        >
          <CtaButtons page={page} waUrl={waUrl} />
        </CtaBanner>
      </div>
    </div>
  )
}
