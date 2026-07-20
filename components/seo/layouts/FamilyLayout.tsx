// Magazine layout for 'חולצות-משפחתיות' — warm family photo-album editorial:
// amber/orange tones, nostalgic feel. All copy comes from lib/seo-pages.ts.

import Link from 'next/link'
import { ArrowLeft, ChevronLeft, MessageCircle } from 'lucide-react'
import { getSeoPage } from '@/lib/seo-pages'
import type { SeoLayoutProps } from './types'
import {
  HeroBand,
  StatStrip,
  SplitSection,
  PolaroidGallery,
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

// Cycled sticker color variants — full static literals (warm amber/orange/rose family)
const STICKER_CLASSES = [
  'bg-amber-50 text-amber-800 border-amber-200',
  'bg-white text-orange-600 border-orange-300',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-rose-50 text-rose-700 border-rose-200',
]

export default function FamilyLayout({ page, waUrl }: SeoLayoutProps) {
  const [storyParagraph, pricingParagraph, tipParagraph] = page.paragraphs

  // Album captions for the polaroids — pulled from the page's own slogan ideas
  const albumCaptions = [page.ideas?.items[1], page.ideas?.items[2], page.ideas?.items[7]]

  const relatedPages = page.related
    .map((slug) => getSeoPage(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* 1. Hero — soft warm band, no diagonal (photo-album warmth, not party energy) */}
      <HeroBand
        bgClass="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500"
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

      {/* 2. Story split FIRST — the 4-generations / airport moment */}
      {storyParagraph && (
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <SplitSection
            eyebrow="רגע משפחתי"
            eyebrowClass="text-orange-500"
            title={storyParagraph.title}
            image={{ src: page.galleryImages[0], alt: `${page.h1} — הדפסה של בדפוס` }}
            imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-amber-100"
          >
            <p>{storyParagraph.text}</p>
          </SplitSection>
        </section>
      )}

      {/* 3. The family album — polaroids with captions on a warm cream band */}
      <section className="bg-gradient-to-b from-amber-50 via-orange-50/70 to-amber-50 py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <h2 className="mb-3 text-center text-2xl font-extrabold text-[#1e293b] md:text-3xl">
            האלבום המשפחתי
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center font-semibold text-[#92400e] md:mb-14">
            {page.audienceLine}
          </p>
          <PolaroidGallery
            images={page.galleryImages.map((src, i) => ({
              src,
              alt: `${page.h1} — דוגמה ${i + 1} מלקוחות בדפוס`,
              caption: albumCaptions[i],
            }))}
          />
        </div>
      </section>

      {/* 4. Pull quote — the sentence every family repeats (from the story copy) */}
      <section className="bg-white py-12 md:py-20">
        <PullQuote
          quote="התמונה עם ארבעה דורות באותה חולצה הופכת לקלאסיקה שתלויה בסלון"
          attribution="כל משפחה שכבר עשתה את זה פעם אחת"
          markClass="text-orange-200"
          quoteClass="text-[#1e293b]"
        />
      </section>

      {/* 5. Slogan sticker wall — warm variants */}
      {page.ideas && (
        <section className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-20">
          <IdeaStickers
            title={page.ideas.title}
            emoji={page.accent?.emoji}
            subtitle="קחו השראה — כל כיתוב כזה מעצבים אונליין תוך דקות, עם תצוגה מקדימה חיה."
            items={page.ideas.items}
            stickerClasses={STICKER_CLASSES}
          />
        </section>
      )}

      {/* 6. Pricing/practical split (reversed direction) */}
      {pricingParagraph && (
        <section className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-20">
          <SplitSection
            reverse
            eyebrow="תכל'ס"
            eyebrowClass="text-orange-500"
            title={pricingParagraph.title}
            image={{
              src: page.galleryImages[1] ?? page.galleryImages[0],
              alt: `${page.h1} — חולצות מודפסות של בדפוס`,
            }}
            imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-orange-100"
          >
            <p>{pricingParagraph.text}</p>
          </SplitSection>
        </section>
      )}

      {/* 7. Stats band — warm amber */}
      <StatStrip
        bandClass="bg-amber-50"
        stats={[
          { value: 'עיצוב אונליין', label: 'תצוגה מקדימה חיה לפני שמזמינים' },
          { value: 'XS–4XL', label: 'מידה לכל אחד — מסבא ועד הנכד הקטן' },
          { value: 'DTF', label: 'הדפסה עמידה שמחזיקה טיולים וכביסות' },
        ]}
        valueClass="text-orange-600"
        labelClass="text-[#64748b]"
      />

      {/* 8. Three steps */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <h2 className="mb-10 text-center text-2xl font-extrabold text-[#1e293b] md:mb-14 md:text-3xl">
            איך זה עובד?
          </h2>
          <StepsTimeline
            numberClass="bg-gradient-to-br from-amber-400 to-orange-500 text-white"
            lineClass="bg-amber-200"
            steps={[
              {
                title: 'אוספים מידות בקבוצה',
                text: 'מישהי לוקחת פיקוד בקבוצה המשפחתית — ותוך ערב אחד ההזמנה סגורה',
              },
              {
                title: 'מעצבים יחד',
                text: 'מעלים תמונה משפחתית, שם שבט או כינוי מצחיק ורואים תצוגה מקדימה חיה',
              },
              {
                title: 'מקבלים עד הבית',
                text: 'משלוח מרוכז אחד לכל הארץ או איסוף עצמי חינם מראשון לציון',
              },
            ]}
          />
        </div>
      </section>

      {/* 9. The WhatsApp-group tip as a checklist card */}
      {tipParagraph && (
        <section className="mx-auto max-w-4xl px-4 py-12 md:px-8 md:py-20">
          <ChecklistCard
            title={tipParagraph.title}
            intro={tipParagraph.text}
            cardClass="bg-amber-50 border-amber-200"
            checkClass="bg-orange-100 text-orange-600"
            items={[
              'זורקים את הרעיון בקבוצה המשפחתית',
              'אחד לוקח פיקוד ואוסף מידות — מ־XS לנכדים ועד 4XL',
              'הגרפיקאי שלנו דואג שהתמונה של סבא וסבתא תצא חדה ומכובדת',
              'נשאר רק להחליט מי עומד ליד סבתא בתמונה 📸',
            ]}
          />
        </section>
      )}

      {/* 10. FAQ */}
      <section className="mx-auto max-w-4xl px-4 pb-16 md:px-8 md:pb-24">
        <h2 className="mb-6 text-2xl font-extrabold text-[#1e293b] md:text-3xl">שאלות נפוצות</h2>
        <FaqAccordion
          faq={page.faq}
          iconClass="text-orange-500"
          cardClass="border-amber-100 bg-white"
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
                className="rounded-full border border-amber-200 bg-white px-5 py-2.5 text-sm font-bold text-[#1e293b] hover:bg-amber-50 hover:border-orange-400 transition-colors"
              >
                {related.h1}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 12. Closing CTA band — warm gradient */}
      <div className="mx-auto max-w-5xl px-4 pb-16 md:px-8 md:pb-24">
        <CtaBanner
          bgClass="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500"
          headline="מתחילים מסורת משפחתית?"
          sub="עיצוב אחד לכל השבט, מידה מדויקת לכל אחד — והתמונה עם החולצות נשארת בסלון שנים."
        >
          <CtaButtons page={page} waUrl={waUrl} />
        </CtaBanner>
      </div>
    </div>
  )
}
