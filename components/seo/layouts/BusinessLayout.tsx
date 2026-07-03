// B2B magazine layout for 'הדפסת-חולצות-לעסקים' — clean, corporate navy/slate
// composition built from the shared blocks. All copy comes from lib/seo-pages.ts.

import Link from 'next/link'
import { ArrowLeft, ChevronLeft, MessageCircle } from 'lucide-react'
import { getSeoPage } from '@/lib/seo-pages'
import type { SeoLayoutProps } from './types'
import {
  HeroBand,
  StatStrip,
  StepsTimeline,
  SplitSection,
  PullQuote,
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

export default function BusinessLayout({ page, waUrl }: SeoLayoutProps) {
  const [brandingParagraph, pricingParagraph, processParagraph] = page.paragraphs
  const trustBenefit = page.benefits[0]

  const relatedPages = page.related
    .map((slug) => getSeoPage(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  return (
    <main className="min-h-screen bg-white" dir="rtl">
      {/* 1. Hero — straight navy band, no diagonal (professional, composed) */}
      <HeroBand
        bgClass="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800"
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
        badgeClass="bg-white/10 text-blue-100 border-white/20"
        title={page.h1}
        subtitle={page.heroText}
        subtitleClass="text-slate-300"
        cta={<CtaButtons page={page} waUrl={waUrl} />}
      />

      {/* 2. Business stats strip — the numbers a CFO checks first */}
      <StatStrip
        bandClass="bg-slate-50 border-b border-slate-200"
        colsClass="sm:grid-cols-2 lg:grid-cols-4"
        stats={[
          { value: 'DTF', label: 'הדפסה חדה ועמידה — גם אחרי שנה של משמרות' },
          { value: 'לכל הארץ', label: 'משלוח עד דלת העסק או איסוף עצמי מראשון לציון' },
          { value: '0 ₪', label: 'דמי הקמה — ליווי גרפיקאי כלול במחיר' },
          { value: 'נשמר', label: 'הקובץ שלכם אצלנו — הזמנה חוזרת בדקות' },
        ]}
        valueClass="text-blue-800"
        labelClass="text-slate-500"
      />

      {/* 3. Procurement flow — early, so busy owners see the process up front */}
      <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-20">
        <h2 className="mb-3 text-center text-2xl font-extrabold text-[#1e293b] md:text-3xl">
          {processParagraph?.title ?? 'איך זה עובד'}
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-center font-semibold text-slate-500 md:mb-14">
          שלושה שלבים מהלוגו ועד שהחולצות בעסק — בלי לרדוף אחרי ספקים.
        </p>
        <StepsTimeline
          numberClass="bg-slate-900 text-white ring-4 ring-blue-100"
          lineClass="bg-slate-200"
          steps={[
            {
              title: 'שולחים את הלוגו',
              text: 'מעלים במעצב האונליין או שולחים לנו — עדיף PNG עם רקע שקוף, והגרפיקאי מסדר את מה שצריך',
            },
            {
              title: 'מקבלים סקיצה לאישור',
              text: 'הגרפיקאי עובר על הקובץ ומתאים אותו להדפסה. מדפיסים רק אחרי שאישרתם',
            },
            {
              title: 'ייצור ואספקה',
              text: 'תוך ימים ספורים: משלוח עד דלת העסק לכל הארץ או איסוף עצמי חינם מראשון לציון',
            },
          ]}
        />
      </section>

      {/* 4. Walking-billboard story split */}
      {brandingParagraph && (
        <section className="border-y border-slate-100 bg-slate-50/60">
          <div className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
            <SplitSection
              eyebrow="למה מיתוג טקסטיל"
              eyebrowClass="text-blue-700"
              title={brandingParagraph.title}
              image={{ src: page.galleryImages[0], alt: `${page.h1} — הדפסה של בדפוס` }}
              imageFrameClass="rounded-2xl shadow-xl ring-1 ring-slate-200"
            >
              <p>{brandingParagraph.text}</p>
            </SplitSection>
          </div>
        </section>
      )}

      {/* 5. Use cases — calm bordered card grid (own markup, no playful rotations) */}
      {page.ideas && (
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="mb-2 text-center text-2xl font-extrabold text-[#1e293b] md:text-3xl">
            {page.ideas.title}
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center font-semibold text-slate-500">
            מהמשמרת היומית ועד הכנס השנתי — אותו לוגו, אותה נראות אחידה.
          </p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {page.ideas.items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-hidden />
                <span className="font-bold text-blue-900">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 6. Pull quote — the trust argument, oversized */}
      {trustBenefit && (
        <section className="border-y border-slate-100 bg-white py-14 md:py-20">
          <PullQuote
            quote={trustBenefit.text}
            attribution={trustBenefit.title}
            markClass="text-blue-200"
            quoteClass="text-slate-900"
          />
        </section>
      )}

      {/* 7. Pricing transparency split (reversed) */}
      {pricingParagraph && (
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <SplitSection
            reverse
            eyebrow="שקיפות במחיר"
            eyebrowClass="text-blue-700"
            title={pricingParagraph.title}
            image={{
              src: page.galleryImages[1] ?? page.galleryImages[0],
              alt: `${page.h1} — חולצות מודפסות של בדפוס`,
            }}
            imageFrameClass="rounded-2xl shadow-xl ring-1 ring-slate-200"
          >
            <p>{pricingParagraph.text}</p>
          </SplitSection>
        </section>
      )}

      {/* 8. What the price includes — checklist card */}
      <section className="mx-auto max-w-4xl px-4 pb-16 md:px-8 md:pb-24">
        <ChecklistCard
          title="מה כלול במחיר"
          intro="חשוב לא פחות ממה שמשלמים זה מה שלא משלמים — בלי הצעת מחיר עם כוכביות."
          cardClass="bg-slate-50 border-slate-200"
          checkClass="bg-blue-100 text-blue-700"
          items={[
            'התאמת הלוגו להדפסה על ידי גרפיקאי — בלי דמי גרפיקה ובלי חיוב על בדיקת קבצים',
            'סקיצה לאישור לפני הייצור — מדפיסים רק אחרי שאישרתם',
            'בלי דמי הקמה ובלי הפתעות בחשבונית — כל הזמנה מלווה בחשבונית מס',
            'מחירון שקוף באתר — והצעת מחיר מסודרת להזמנות צוות גדולות',
            'הקובץ וההגדרות נשמרים — השלמת מלאי לעובד חדש בהזמנה קצרה',
          ]}
        />
      </section>

      {/* 9. FAQ */}
      <section className="mx-auto max-w-4xl px-4 pb-16 md:px-8 md:pb-24">
        <h2 className="mb-6 text-2xl font-extrabold text-[#1e293b] md:text-3xl">שאלות נפוצות</h2>
        <FaqAccordion faq={page.faq} iconClass="text-blue-700" cardClass="border-slate-200 bg-white" />
      </section>

      {/* 10. Related pages */}
      {relatedPages.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pb-16 md:px-8 md:pb-20">
          <h2 className="mb-4 text-xl font-extrabold text-[#1e293b]">אולי יעניין אתכם גם</h2>
          <div className="flex flex-wrap gap-3">
            {relatedPages.map((related) => (
              <Link
                key={related.slug}
                href={`/${related.slug}`}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-[#1e293b] hover:bg-blue-50 hover:border-blue-400 transition-colors"
              >
                {related.h1}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 11. Closing CTA band — navy */}
      <div className="mx-auto max-w-5xl px-4 pb-16 md:px-8 md:pb-24">
        <CtaBanner
          bgClass="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800"
          headline="מוכנים למתג את הצוות?"
          sub="שולחים לוגו, מקבלים סקיצה לאישור ותוך ימים ספורים החולצות בעסק — משלוח לכל הארץ או איסוף עצמי מראשון לציון."
        >
          <CtaButtons page={page} waUrl={waUrl} />
        </CtaBanner>
      </div>
    </main>
  )
}
