// Flagship magazine layout for 'חולצות-למסיבת-רווקות' — pink-energy editorial
// composition built from the shared blocks. All copy comes from lib/seo-pages.ts.

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

// Cycled sticker color variants — full static literals (pink family)
const STICKER_CLASSES = [
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-white text-rose-600 border-rose-300',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
]

export default function BacheloretteLayout({ page, waUrl }: SeoLayoutProps) {
  const [storyParagraph, pricingParagraph, tipParagraph] = page.paragraphs
  const keepsakeBenefit = page.benefits[3]

  const relatedPages = page.related
    .map((slug) => getSeoPage(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  return (
    <main className="min-h-screen bg-white" dir="rtl">
      {/* 1. Hero — full-bleed pink band with diagonal bottom edge */}
      <HeroBand
        bgClass="bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600"
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

      {/* 2. Fun stats band */}
      <StatStrip
        bandClass="bg-pink-50"
        stats={[
          { value: 'מ־37 ₪', label: 'חולצה מודפסת — פחות מקוקטייל אחד' },
          { value: '5%', label: 'הנחה אוטומטית מעל 15 חולצות' },
          { value: 'ימים ספורים', label: 'מהעיצוב ועד שהחולצות אצלכן' },
        ]}
        valueClass="text-pink-600"
        labelClass="text-[#64748b]"
      />

      {/* 3. Story split — the moment everyone opens the bag */}
      {storyParagraph && (
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <SplitSection
            eyebrow="הסיפור"
            eyebrowClass="text-pink-500"
            title={storyParagraph.title}
            image={{ src: page.galleryImages[0], alt: `${page.h1} — הדפסה של בדפוס` }}
            imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-pink-100"
          >
            <p>{storyParagraph.text}</p>
          </SplitSection>
        </section>
      )}

      {/* 4. Polaroid gallery on a soft angled pink band */}
      <section
        className="bg-gradient-to-b from-pink-50/70 to-rose-50 py-20 md:py-24"
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

      {/* 5. Slogan stickers */}
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

      {/* 6. Pull quote — a keepsake, not a costume */}
      {keepsakeBenefit && (
        <section className="bg-white py-10 md:py-16">
          <PullQuote
            quote={keepsakeBenefit.text}
            attribution={keepsakeBenefit.title}
            markClass="text-pink-200"
            quoteClass="text-[#1e293b]"
          />
        </section>
      )}

      {/* 7. Pricing/timing split (reversed direction) */}
      {pricingParagraph && (
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <SplitSection
            reverse
            eyebrow="תכל'ס"
            eyebrowClass="text-pink-500"
            title={pricingParagraph.title}
            image={{
              src: page.galleryImages[1] ?? page.galleryImages[0],
              alt: `${page.h1} — חולצות מודפסות של בדפוס`,
            }}
            imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-rose-100"
          >
            <p>{pricingParagraph.text}</p>
          </SplitSection>
        </section>
      )}

      {/* 8. Three steps */}
      <section className="bg-pink-50/60 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <h2 className="mb-10 text-center text-2xl font-extrabold text-[#1e293b] md:mb-14 md:text-3xl">
            איך זה עובד?
          </h2>
          <StepsTimeline
            numberClass="bg-gradient-to-br from-pink-400 to-rose-500 text-white"
            lineClass="bg-pink-200"
            steps={[
              {
                title: 'מעצבות יחד',
                text: 'מעלות כיתוב, תמונה או בדיחה פנימית במעצב האונליין',
              },
              {
                title: 'מאשרות תצוגה מקדימה',
                text: 'רואות כל חולצה בתצוגה מקדימה חיה לפני שמשלמות',
              },
              {
                title: 'אוספות או מקבלות',
                text: 'איסוף עצמי חינם מראשון לציון או משלוח עד הבית לכל הארץ',
              },
            ]}
          />
        </div>
      </section>

      {/* 9. The WhatsApp-poll tip as a checklist card */}
      {tipParagraph && (
        <section className="mx-auto max-w-4xl px-4 py-16 md:px-8 md:py-24">
          <ChecklistCard
            title={tipParagraph.title}
            intro={tipParagraph.text}
            cardClass="bg-rose-50 border-rose-200"
            checkClass="bg-pink-100 text-pink-600"
            items={[
              'אחת לוקחת פיקוד על ההזמנה',
              'סקר מידות וצבעים בקבוצת הוואטסאפ — בלי הכלה 🤫',
              'דדליין של 24 שעות לתשובות',
              'מתלבטות עם הכיתוב? הגרפיקאי שלנו שולח סקיצה לאישור',
            ]}
          />
        </section>
      )}

      {/* 10. FAQ */}
      <section className="mx-auto max-w-4xl px-4 pb-16 md:px-8 md:pb-24">
        <h2 className="mb-6 text-2xl font-extrabold text-[#1e293b] md:text-3xl">שאלות נפוצות</h2>
        <FaqAccordion faq={page.faq} iconClass="text-pink-500" cardClass="border-pink-100 bg-white" />
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
                className="rounded-full border border-pink-200 bg-white px-5 py-2.5 text-sm font-bold text-[#1e293b] hover:bg-pink-50 hover:border-pink-400 transition-colors"
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
          bgClass="bg-gradient-to-br from-pink-500 to-rose-600"
          headline="מוכנות להתחיל לעצב?"
          sub="מעצבות יחד אונליין, רואות תצוגה מקדימה חיה ומקבלות מהר — גם כשנזכרתן ברגע האחרון."
        >
          <CtaButtons page={page} waUrl={waUrl} />
        </CtaBanner>
      </div>
    </main>
  )
}
