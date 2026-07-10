// עמוד "העבודות שלנו" — גלריית עבודות הדפסה אמיתיות לפי קטגוריות.
// Magazine-style layout built from the shared SEO blocks (server component).

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, MessageCircle } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/constants'
import {
  DISPLAY_FONT,
  HeroBand,
  StatStrip,
  PolaroidGallery,
  SplitSection,
  PullQuote,
  CtaBanner,
  type PolaroidImage,
} from '@/components/seo/blocks'
import GalleryAdminImages from '@/components/gallery/GalleryAdminImages'

const BASE_URL = 'https://badfos.co.il'

/* ------------------------------------------------------------------ */
/* Static gallery content — real printed work, grouped by category     */
/* ------------------------------------------------------------------ */

interface GalleryCategory {
  id: string
  title: string
  emoji: string
  intro: string
  /** Link to the matching SEO landing page (cross-link) */
  moreHref?: string
  moreLabel?: string
  images: PolaroidImage[]
}

const GALLERY_CATEGORIES: GalleryCategory[] = [
  {
    id: 'bachelorette',
    title: 'מסיבות רווקות',
    emoji: '👰',
    intro: 'החולצות שפותחות כל סוף שבוע של רווקות — כיתובים מצחיקים, ורוד בלי התנצלויות והדפסה שמחזיקה הרבה אחרי המסיבה.',
    moreHref: '/חולצות-למסיבת-רווקות',
    moreLabel: 'לעמוד חולצות למסיבת רווקות',
    images: [
      {
        src: '/assets/seo/bachelorette-1.jpg',
        alt: 'חולצה לבנה עם הדפסה למסיבת רווקות — "היא מתחתנת אנחנו מתפרקות" עם שמפניה וכדור דיסקו',
        caption: 'היא מתחתנת, אנחנו מתפרקות',
      },
      {
        src: '/assets/seo/bachelorette-2.jpg',
        alt: 'הדפסת חולצות למסיבת רווקות — "הלילה קצר והחצאית עוד יותר" בעיצוב ורוד עם נעל עקב ושמפניה',
        caption: 'הלילה קצר, החצאית עוד יותר',
      },
      {
        src: '/assets/seo/bachelorette-3.jpg',
        alt: 'חולצת Bride Squad Club מודפסת עם איור קוקטיילים למסיבת רווקות',
        caption: 'Bride Squad Club',
      },
      {
        src: '/assets/seo/bachelorette-4.jpg',
        alt: 'חולצת Bride Squad עם איור טבעת ולב ורוד — הדפסה למסיבת רווקות',
        caption: 'Bride Squad',
      },
    ],
  },
  {
    id: 'family',
    title: 'משפחות',
    emoji: '👨‍👩‍👧',
    intro: 'טיול שנתי, אירוע משפחתי או סתם מתנה לאמא — הדפסות שהופכות רגע משפחתי למזכרת שלובשים שוב ושוב.',
    moreHref: '/חולצות-משפחתיות',
    moreLabel: 'לעמוד חולצות משפחתיות',
    images: [
      {
        src: '/assets/seo/family-1.jpg',
        alt: 'בגד גוף לתינוק עם הדפסת תמונה אישית — "יום הולדת לאמא הכי טובה בעולם"',
        caption: 'מתנה לאמא הכי טובה בעולם',
      },
      {
        src: '/assets/seo/family-2.jpg',
        alt: 'חולצה סגולה מודפסת לטיול משפחתי — Family Adventure מונטנגרו 2026',
        caption: 'Family Adventure 2026',
      },
      {
        src: '/assets/seo/family-3.jpg',
        alt: 'חולצת Road Trip משפחתית בצבע שמנת עם איור דוב מטייל ושמות כל בני המשפחה',
        caption: 'Road Trip משפחתי',
      },
    ],
  },
  {
    id: 'birthday',
    title: 'ימי הולדת',
    emoji: '🎂',
    intro: 'חתן או כלת השמחה מקבלים חולצה משלהם — עם השם, התחביב והסטייל. ככה נראית חגיגה שמתחילה עוד לפני העוגה.',
    moreHref: '/חולצות-ליום-הולדת',
    moreLabel: 'לעמוד חולצות ליום הולדת',
    images: [
      {
        src: '/assets/seo/birthday-1.jpg',
        alt: 'חולצת יום הולדת לילד עם הדפסת כדורסל — "יום הולדת שמח! כוכב היום"',
        caption: 'כוכב היום 🏀',
      },
      {
        src: '/assets/seo/birthday-2.jpg',
        alt: 'חולצה מודפסת ליום הולדת — "יום הולדת לעמרי מזל טוב" עם בלונים, עוגה ומתנות',
        caption: 'יום הולדת לעמרי',
      },
      {
        src: '/assets/seo/birthday-3.jpg',
        alt: 'חולצת יום הולדת לנסיכה — איור ילדה עם כתר, בלונים ועוגה בהדפסה צבעונית',
        caption: 'יום הולדת שמח לנסיכה',
      },
      {
        src: '/assets/seo/birthday-4.jpg',
        alt: 'חולצת יום הולדת למאיה בעיצוב ורוד עם בלוני לב ונצנצים',
        caption: 'יום הולדת למאיה',
      },
    ],
  },
]

/** ועוד עבודות — תמונות אמיתיות של לקוחות ומוצרים מודפסים */
const GENERAL_FEATURE: { src: string; alt: string } = {
  src: '/assets/64ab08d41_IMG_3252.webp',
  alt: 'לקוח לובש חולצת אוברסייז שחורה עם הדפסת גב צבעונית של שמש — Sundara, הדפסת DTF של בדפוס',
}

const GENERAL_IMAGES: PolaroidImage[] = [
  {
    src: '/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.webp',
    alt: 'הדפסת גב על חולצת אוברסייז שחורה — כיתוב Forever Onward Moving Onward',
    caption: 'הדפסת גב על אוברסייז',
  },
  {
    src: '/assets/a189e74e3_IMG_0490.webp',
    alt: 'חולצת אוברסייז אפורה בשטיפת אבן עם הדפס Greatest בסגנון וינטג׳',
    caption: 'הדפס וינטג׳ על אבן',
  },
  {
    src: '/assets/c4660170b_IMG_6179.webp',
    alt: 'סט חולצות שרוול ארוך שחורות עם לוגו Push The Button — הדפסת חולצות לעסק',
    caption: 'סט ממותג לעסק',
  },
  {
    src: '/assets/fdd643e9f_D747B5AC-1217-4D1F-A7B1-61C6EDE52659.webp',
    alt: 'חולצות שחורות עם הדפסה אישית של איור דמויות וכיתוב בעברית — עיצוב בהתאמה אישית',
    caption: 'איור אישי בהתאמה מלאה',
  },
]

/* ------------------------------------------------------------------ */
/* Metadata + JSON-LD                                                  */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: 'העבודות שלנו — גלריית הדפסות אמיתיות על חולצות | בדפוס',
  description:
    'גלריית עבודות אמיתיות של בדפוס: דוגמאות הדפסה על חולצות למסיבות רווקות, ימי הולדת, משפחות ועסקים. הדפסת DTF איכותית בראשון לציון עם משלוח לכל הארץ.',
  alternates: { canonical: '/gallery' },
  openGraph: {
    title: 'העבודות שלנו — גלריית הדפסות אמיתיות | בדפוס',
    description:
      'דוגמאות הדפסה על חולצות מעבודות אמיתיות: רווקות, ימי הולדת, משפחות ועסקים.',
    url: `${BASE_URL}/gallery`,
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [`${BASE_URL}/assets/64ab08d41_IMG_3252.webp`],
  },
}

const WA_URL = `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent('היי! ראיתי את הגלריה באתר ואני רוצה חולצות כאלה 🙂')}`

// Static tab colors per category band — full Tailwind literals only
const CATEGORY_STYLES: Record<string, { band: string; heading: string; chip: string }> = {
  bachelorette: {
    band: 'bg-gradient-to-b from-pink-50/70 to-rose-50',
    heading: 'text-pink-600',
    chip: 'border-pink-200 bg-white text-pink-700 hover:bg-pink-50 hover:border-pink-400',
  },
  family: {
    band: 'bg-gradient-to-b from-orange-50/70 to-amber-50',
    heading: 'text-orange-600',
    chip: 'border-orange-200 bg-white text-orange-700 hover:bg-orange-50 hover:border-orange-400',
  },
  birthday: {
    band: 'bg-gradient-to-b from-purple-50/70 to-fuchsia-50',
    heading: 'text-purple-600',
    chip: 'border-purple-200 bg-white text-purple-700 hover:bg-purple-50 hover:border-purple-400',
  },
}

/** Yellow brand CTA + green WhatsApp button pair */
function CtaButtons() {
  return (
    <>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffc32e] to-[#f59e0b] px-8 py-4 text-lg font-extrabold text-white shadow-[0_15px_35px_-10px_rgba(245,158,11,0.6)] hover:from-[#e6ac28] hover:to-[#d97706] transition-colors"
      >
        רוצים כזאת חולצה? מתחילים לעצב
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <a
        href={WA_URL}
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

export default function GalleryPage() {
  const allImages = [
    ...GALLERY_CATEGORIES.flatMap((cat) => cat.images),
    GENERAL_FEATURE,
    ...GENERAL_IMAGES,
  ]

  const galleryJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${BASE_URL}/gallery`,
    name: 'העבודות שלנו — גלריית הדפסות של בדפוס',
    description:
      'גלריית עבודות אמיתיות: דוגמאות הדפסה על חולצות למסיבות רווקות, ימי הולדת, משפחות ועסקים.',
    url: `${BASE_URL}/gallery`,
    inLanguage: 'he',
    mainEntity: {
      '@type': 'ImageGallery',
      name: 'גלריית העבודות של בדפוס',
      associatedMedia: allImages.map((img) => ({
        '@type': 'ImageObject',
        contentUrl: `${BASE_URL}${encodeURI(img.src)}`,
        name: img.alt,
      })),
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'בית', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'העבודות שלנו', item: `${BASE_URL}/gallery` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(galleryJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />

      <main className="min-h-screen bg-white" dir="rtl">
        {/* 1. Hero — brand yellow band with diagonal cut */}
        <HeroBand
          bgClass="bg-gradient-to-br from-amber-400 via-[#ffc32e] to-orange-500"
          diagonal
          breadcrumb={
            <nav aria-label="פירורי לחם" className="mb-8 text-sm text-white/80">
              <ol className="flex items-center gap-1.5 flex-wrap">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    בית
                  </Link>
                </li>
                <li aria-hidden>
                  <ChevronLeft className="w-4 h-4" />
                </li>
                <li className="font-semibold text-white">העבודות שלנו</li>
              </ol>
            </nav>
          }
          badgeText="כל תמונה כאן היא עבודה אמיתית שיצאה מהדפוס שלנו"
          badgeEmoji="📸"
          badgeClass="bg-white/20 text-white border-white/30"
          title="העבודות שלנו"
          subtitle="רווקות שצוחקות עד הבוקר, משפחות בטיול השנתי, ילדים ביום ההולדת וצוותים עם לוגו — ככה נראית הדפסת DTF כשהיא פוגשת סיפור אמיתי. בחרו השראה, ותוך דקות מעצבים כזאת גם לכם."
          cta={<CtaButtons />}
        />

        {/* 2. Stats band */}
        <StatStrip
          bandClass="bg-amber-50"
          stats={[
            { value: '100% אמיתי', label: 'עבודות של לקוחות, לא הדמיות מהאינטרנט' },
            { value: 'DTF', label: 'הדפסה חדה ועמידה בעשרות כביסות' },
            { value: 'ימים ספורים', label: 'מהעיצוב אונליין ועד שהחולצה אצלכם' },
          ]}
          valueClass="text-[#b45309]"
          labelClass="text-[#64748b]"
        />

        {/* 3. Category sections — tilted polaroid bands */}
        {GALLERY_CATEGORIES.map((cat, index) => {
          const style = CATEGORY_STYLES[cat.id]
          return (
            <section
              key={cat.id}
              className={`py-16 md:py-24 ${index % 2 === 0 ? style.band : 'bg-white'}`}
              style={
                index % 2 === 0
                  ? { clipPath: 'polygon(0 2.5rem, 100% 0, 100% 100%, 0 100%)' }
                  : undefined
              }
            >
              <div className="mx-auto max-w-5xl px-4 md:px-8">
                <div className="mb-10 text-center md:mb-14">
                  <h2
                    className={`mb-3 text-3xl leading-tight tracking-tight md:text-5xl ${style.heading}`}
                    style={DISPLAY_FONT}
                  >
                    <span aria-hidden className="ml-2">
                      {cat.emoji}
                    </span>
                    {cat.title}
                  </h2>
                  <p className="mx-auto max-w-2xl font-semibold leading-relaxed text-[#475569]">
                    {cat.intro}
                  </p>
                </div>
                <PolaroidGallery images={cat.images} />
                {cat.moreHref && (
                  <p className="mt-12 text-center">
                    <Link
                      href={cat.moreHref}
                      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-colors ${style.chip}`}
                    >
                      {cat.moreLabel}
                      <ArrowLeft className="w-4 h-4" />
                    </Link>
                  </p>
                )}
              </div>
            </section>
          )
        })}

        {/* 4. Pull quote */}
        <section className="bg-white py-10 md:py-16">
          <PullQuote
            quote="כל חולצה שיוצאת מכאן עוברת בדיקת גרפיקאי ותצוגה מקדימה — כדי שמה שדמיינתם זה בדיוק מה שתלבשו."
            attribution="ההבטחה שלנו בכל עבודה"
            markClass="text-[#ffc32e]/40"
            quoteClass="text-[#1e293b]"
          />
        </section>

        {/* 5. ועוד עבודות — feature split + polaroids + admin-managed additions */}
        <section
          className="bg-gradient-to-b from-slate-50 to-amber-50/60 py-16 md:py-24"
          style={{ clipPath: 'polygon(0 2.5rem, 100% 0, 100% 100%, 0 100%)' }}
        >
          <div className="mx-auto max-w-5xl px-4 md:px-8">
            <SplitSection
              eyebrow="ועוד עבודות"
              eyebrowClass="text-[#b45309]"
              title="גם על שחור, גם אוברסייז — ההדפסה נשארת חדה"
              image={GENERAL_FEATURE}
              imageFrameClass="rounded-[2.5rem] shadow-2xl ring-4 ring-amber-100"
            >
              <p>
                חלק גדול מהעבודות שלנו הן בדיוק כאלה: לקוח מגיע עם רעיון, קובץ או
                אפילו סקיצה ביד — ויוצא עם חולצה שנראית כמו מותג. הדפסת DTF שומרת
                על צבעים מלאים וחדים גם על בדים כהים, גם בהדפסי גב גדולים וגם
                אחרי עשרות כביסות.
              </p>
              <p>
                בגלריה למטה תמצאו עוד עבודות אמיתיות — סטים ממותגים לעסקים, איורים
                אישיים והדפסי אופנה. רוצים לראות את העיצוב שלכם כאן? זה מתחיל
                בלחיצה אחת.
              </p>
            </SplitSection>

            <div className="mt-16">
              <PolaroidGallery images={GENERAL_IMAGES} />
            </div>

            {/* עבודות שנוספות מהאדמין (קטגוריית gallery ב-Firestore) */}
            <GalleryAdminImages />
          </div>
        </section>

        {/* 6. Closing CTA */}
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <CtaBanner
            bgClass="bg-gradient-to-br from-amber-400 to-orange-500"
            headline="החולצה הבאה בגלריה יכולה להיות שלכם"
            sub="מעצבים אונליין עם תצוגה מקדימה חיה, מאשרים סקיצה של גרפיקאי — ותוך ימים ספורים לובשים את זה."
          >
            <CtaButtons />
          </CtaBanner>
        </div>
      </main>
    </>
  )
}
