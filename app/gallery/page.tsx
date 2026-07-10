// עמוד "העבודות שלנו" — פורטפוליו עריכתי של עבודות הדפסה אמיתיות.
// תמונות אמיתיות של לקוחות מובילות; סקשן כהה להדפסות על שחור; פריסה שונה בכל סקשן.
// Server component — אין JS בצד לקוח פרט ל-GalleryAdminImages.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ChevronLeft, MessageCircle } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/constants'
import { DISPLAY_FONT, PullQuote, CtaBanner } from '@/components/seo/blocks'
import GalleryAdminImages from '@/components/gallery/GalleryAdminImages'

const BASE_URL = 'https://badfos.co.il'

/* ------------------------------------------------------------------ */
/* Content — real customer work first, design directions second        */
/* ------------------------------------------------------------------ */

interface Work {
  src: string
  alt: string
  num: string
  title: string
  sub?: string
}

/** תמונות אמיתיות — הדפסות על שחור (סקשן הפתיחה הכהה) */
const DARK_WORKS: { feature: Work; side: Work[] } = {
  feature: {
    src: '/assets/64ab08d41_IMG_3252.webp',
    alt: 'לקוח לובש חולצת אוברסייז שחורה עם הדפסת גב צבעונית של שמש — Sundara, הדפסת DTF של בדפוס',
    num: '01',
    title: 'Sundara — הדפס גב מלא',
    sub: 'אוברסייז שחורה, צילום אצלנו בדפוס',
  },
  side: [
    {
      src: '/assets/c4660170b_IMG_6179.webp',
      alt: 'סט חולצות שרוול ארוך שחורות עם לוגו Push The Button — הדפסת חולצות לעסק',
      num: '02',
      title: 'Push The Button',
      sub: 'סט ממותג לעסק',
    },
    {
      src: '/assets/fdd643e9f_D747B5AC-1217-4D1F-A7B1-61C6EDE52659.webp',
      alt: 'חולצות שחורות עם הדפסה אישית של איור דמויות וכיתוב בעברית — עיצוב בהתאמה אישית',
      num: '03',
      title: 'איור אישי',
      sub: 'גב + לוגו חזה, סדרה של שלוש',
    },
  ],
}

/** תמונות אמיתיות — בחוץ ובשטיפת אבן (הסקשן הבהיר) */
const LIGHT_FEATURE: Work = {
  src: '/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.webp',
  alt: 'לקוח בחצר לובש חולצת אוברסייז שחורה עם הדפסת גב — Forever Onward Moving Onward',
  num: '04',
  title: 'Forever Onward',
  sub: 'הדפס גב על אוברסייז — ככה זה נראה ביום־יום',
}

const LIGHT_SECONDARY: Work = {
  src: '/assets/a189e74e3_IMG_0490.webp',
  alt: 'חולצת אוברסייז אפורה בשטיפת אבן עם הדפס Greatest בסגנון וינטג׳',
  num: '05',
  title: 'Greatest',
  sub: 'הדפס וינטג׳ על שטיפת אבן',
}

/** כיווני עיצוב לפי אירוע — מוקאפים, מוצגים קטן וממוקד */
interface CategoryImage {
  src: string
  alt: string
  caption: string
}

const BACHELORETTE: CategoryImage[] = [
  {
    src: '/assets/seo/bachelorette-2.jpg',
    alt: 'הדפסת חולצות למסיבת רווקות — "הלילה קצר והחצאית עוד יותר" בעיצוב ורוד עם נעל עקב ושמפניה',
    caption: 'הלילה קצר, החצאית עוד יותר',
  },
  {
    src: '/assets/seo/bachelorette-5.jpg',
    alt: 'חולצת Bride Squad עם איור טבעת ולב ורוד — הדפסה למסיבת רווקות',
    caption: 'Bride Squad',
  },
]

const BIRTHDAY: CategoryImage[] = [
  {
    src: '/assets/seo/birthday-1.jpg',
    alt: 'חולצת יום הולדת לילד עם הדפסת כדורסל — "יום הולדת שמח! כוכב היום"',
    caption: 'כוכב היום',
  },
  {
    src: '/assets/seo/birthday-3.jpg',
    alt: 'חולצת יום הולדת לנסיכה — איור ילדה עם כתר, בלונים ועוגה בהדפסה צבעונית',
    caption: 'יום הולדת לנסיכה',
  },
]

const FAMILY: CategoryImage[] = [
  {
    src: '/assets/seo/family-2.jpg',
    alt: 'חולצה סגולה מודפסת לטיול משפחתי — Family Adventure מונטנגרו 2026',
    caption: 'Family Adventure',
  },
  {
    src: '/assets/seo/family-3.jpg',
    alt: 'חולצת Road Trip משפחתית בצבע שמנת עם איור דוב מטייל ושמות כל בני המשפחה',
    caption: 'Road Trip עם כל השמות',
  },
  {
    src: '/assets/seo/family-1.jpg',
    alt: 'בגד גוף לתינוק עם הדפסת תמונה אישית — "יום הולדת לאמא הכי טובה בעולם"',
    caption: 'גם על בגד גוף',
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

/** כיתוב עריכתי ממוספר מתחת לתמונה (גרסה בהירה) */
function WorkCaption({ work, light }: { work: Work; light?: boolean }) {
  return (
    <figcaption className="mt-3 flex items-baseline gap-3">
      <span
        className={`text-2xl leading-none md:text-3xl ${light ? 'text-amber-400' : 'text-amber-500'}`}
        style={DISPLAY_FONT}
        aria-hidden
      >
        {work.num}
      </span>
      <span>
        <span className={`block text-sm font-extrabold md:text-base ${light ? 'text-white' : 'text-[#1e293b]'}`}>
          {work.title}
        </span>
        {work.sub && (
          <span className={`block text-xs font-semibold md:text-sm ${light ? 'text-white/60' : 'text-[#64748b]'}`}>
            {work.sub}
          </span>
        )}
      </span>
    </figcaption>
  )
}

export default function GalleryPage() {
  const allImages = [
    DARK_WORKS.feature,
    ...DARK_WORKS.side,
    LIGHT_FEATURE,
    LIGHT_SECONDARY,
    ...BACHELORETTE,
    ...BIRTHDAY,
    ...FAMILY,
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
        {/* ============================================================ */}
        {/* 1. הירו כהה — הדפסות על שחור, תמונות אמיתיות בלבד             */}
        {/* ============================================================ */}
        <header className="relative overflow-hidden bg-[#0b1220] text-white">
          {/* Amber glow accents */}
          <div
            className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-amber-400/5 blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-8 md:px-8 md:pb-20 md:pt-12">
            <nav aria-label="פירורי לחם" className="mb-10 text-sm text-white/50">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href="/" className="transition-colors hover:text-white">
                    בית
                  </Link>
                </li>
                <li aria-hidden>
                  <ChevronLeft className="h-4 w-4" />
                </li>
                <li className="font-semibold text-white/90">העבודות שלנו</li>
              </ol>
            </nav>

            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              {/* Text column */}
              <div className="lg:col-span-5">
                <p className="mb-4 text-sm font-extrabold tracking-widest text-amber-400">
                  פורטפוליו · הדפסת DTF · ראשון לציון
                </p>
                <h1
                  className="mb-6 text-5xl leading-[1.08] tracking-tight md:text-7xl"
                  style={DISPLAY_FONT}
                >
                  העבודות
                  <br />
                  <span className="text-amber-400">שלנו</span>
                </h1>
                <p className="mb-8 max-w-md text-lg leading-relaxed text-white/75 md:text-xl">
                  בלי הדמיות מהאינטרנט: חולצות שלקוחות שלנו באמת הזמינו, לבשו
                  ויצאו איתן לרחוב. ככה נראית הדפסה כשהיא פוגשת בד אמיתי — גם על
                  שחור, גם בהדפס גב מלא.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <CtaButtons />
                </div>
              </div>

              {/* Collage — black shirts on dark bg */}
              <div className="lg:col-span-7">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
                  <figure className="col-span-2 md:col-span-3">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-3xl ring-1 ring-white/10">
                      <Image
                        src={DARK_WORKS.feature.src}
                        alt={DARK_WORKS.feature.alt}
                        fill
                        priority
                        sizes="(max-width: 1024px) 60vw, 40vw"
                        className="object-cover"
                      />
                    </div>
                    <WorkCaption work={DARK_WORKS.feature} light />
                  </figure>
                  <div className="col-span-2 grid grid-cols-2 gap-3 md:flex md:flex-col md:gap-4">
                    {DARK_WORKS.side.map((work) => (
                      <figure key={work.src}>
                        <div className="relative aspect-square overflow-hidden rounded-2xl ring-1 ring-white/10">
                          <Image
                            src={work.src}
                            alt={work.alt}
                            fill
                            sizes="(max-width: 1024px) 40vw, 25vw"
                            className="object-cover"
                          />
                        </div>
                        <WorkCaption work={work} light />
                      </figure>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* 2. פס נתונים עריכתי — דק, בלי צבעי פסטל                       */}
        {/* ============================================================ */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 text-center sm:grid-cols-3 sm:divide-x sm:divide-slate-200 sm:rtl:divide-x-reverse md:px-8 md:py-12">
            {[
              { value: '100% אמיתי', label: 'עבודות של לקוחות, לא הדמיות מהאינטרנט' },
              { value: 'DTF', label: 'הדפסה חדה ועמידה בעשרות כביסות' },
              { value: 'ימים ספורים', label: 'מהעיצוב אונליין ועד שהחולצה אצלכם' },
            ].map((stat) => (
              <div key={stat.label} className="px-2">
                <p className="mb-1.5 text-4xl text-[#b45309] md:text-5xl" style={DISPLAY_FONT}>
                  {stat.value}
                </p>
                <p className="text-base font-bold text-[#475569]">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. סקשן בהיר — בחוץ, ביום־יום: פיצ׳ר גדול + תמונה משנית        */}
        {/* ============================================================ */}
        <section className="bg-white py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
              {/* Large feature — customer wearing the shirt outdoors */}
              <figure className="lg:col-span-7">
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5">
                  <Image
                    src={LIGHT_FEATURE.src}
                    alt={LIGHT_FEATURE.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="object-cover"
                  />
                </div>
                <WorkCaption work={LIGHT_FEATURE} />
              </figure>

              {/* Text + secondary image */}
              <div className="flex flex-col justify-center gap-8 lg:col-span-5">
                <div>
                  <p className="mb-3 text-sm font-extrabold tracking-widest text-[#b45309]">
                    מהדפוס אל הרחוב
                  </p>
                  <h2
                    className="mb-4 text-3xl leading-tight tracking-tight text-[#1e293b] md:text-4xl"
                    style={DISPLAY_FONT}
                  >
                    חולצה שנראית טוב גם שנה אחרי
                  </h2>
                  <p className="leading-relaxed text-[#475569] md:text-lg">
                    הדפסת DTF שומרת על צבעים מלאים וחדים גם בהדפסי גב גדולים, גם
                    על שטיפת אבן וגם אחרי עשרות כביסות. כל עבודה עוברת בדיקת
                    גרפיקאי ותצוגה מקדימה לפני שהיא נכנסת למכונה.
                  </p>
                </div>
                <figure>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5">
                    <Image
                      src={LIGHT_SECONDARY.src}
                      alt={LIGHT_SECONDARY.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover"
                    />
                  </div>
                  <WorkCaption work={LIGHT_SECONDARY} />
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. כיווני עיצוב לפי אירוע — פס צהוב מותגי, החולצות "צפות"     */}
        {/*    (רקע המוקאפים הוא בדיוק #ffc32d — נטמע בסקשן בלי מסגרות)   */}
        {/* ============================================================ */}
        <section className="bg-[#ffc32d] py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mb-14 max-w-2xl md:mb-20">
              <p className="mb-3 text-sm font-extrabold tracking-widest text-[#7c4a03]">
                כיווני עיצוב
              </p>
              <h2
                className="mb-4 text-3xl leading-tight tracking-tight text-[#271703] md:text-5xl"
                style={DISPLAY_FONT}
              >
                השראה לפי אירוע
              </h2>
              <p className="font-semibold leading-relaxed text-[#5b3a06] md:text-lg">
                דוגמאות עיצוב שאנחנו מדפיסים שוב ושוב — כנקודת פתיחה. את הטקסט,
                הצבע והשמות מחליפים לשלכם בעורך האונליין.
              </p>
            </div>

            {/* 4a. רווקות — תמונה גדולה + קטנה בהיסט, טקסט בצד */}
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="mb-2 text-6xl leading-none text-white/60 md:text-7xl" style={DISPLAY_FONT} aria-hidden>
                  01
                </p>
                <h3
                  className="mb-3 text-2xl leading-tight tracking-tight text-[#271703] md:text-3xl"
                  style={DISPLAY_FONT}
                >
                  מסיבות רווקות
                </h3>
                <p className="mb-6 font-semibold leading-relaxed text-[#5b3a06]">
                  כיתובים מצחיקים, ורוד בלי התנצלויות והדפסה שמחזיקה הרבה אחרי
                  המסיבה — כל הקבוצה בסט תואם.
                </p>
                <Link
                  href="/חולצות-למסיבת-רווקות"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#271703] shadow-sm transition-colors hover:bg-[#fff6e6]"
                >
                  לעמוד חולצות למסיבת רווקות
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
              <div className="lg:col-span-8">
                <div className="flex items-start gap-2 md:gap-4">
                  <figure className="w-3/5">
                    <Image
                      src={BACHELORETTE[0].src}
                      alt={BACHELORETTE[0].alt}
                      width={1155}
                      height={1400}
                      sizes="(max-width: 1024px) 60vw, 35vw"
                      className="h-auto w-full"
                    />
                    <figcaption className="text-center text-sm font-bold text-[#7c4a03]">
                      {BACHELORETTE[0].caption}
                    </figcaption>
                  </figure>
                  <figure className="mt-10 w-2/5 md:mt-20">
                    <Image
                      src={BACHELORETTE[1].src}
                      alt={BACHELORETTE[1].alt}
                      width={1155}
                      height={1400}
                      sizes="(max-width: 1024px) 40vw, 25vw"
                      className="h-auto w-full"
                    />
                    <figcaption className="text-center text-sm font-bold text-[#7c4a03]">
                      {BACHELORETTE[1].caption}
                    </figcaption>
                  </figure>
                </div>
              </div>
            </div>

            {/* 4b. ימי הולדת — כיוון הפוך: תמונות בימין, טקסט בשמאל */}
            <div className="mt-16 grid items-center gap-10 md:mt-24 lg:grid-cols-12">
              <div className="lg:order-2 lg:col-span-4">
                <p className="mb-2 text-6xl leading-none text-white/60 md:text-7xl" style={DISPLAY_FONT} aria-hidden>
                  02
                </p>
                <h3
                  className="mb-3 text-2xl leading-tight tracking-tight text-[#271703] md:text-3xl"
                  style={DISPLAY_FONT}
                >
                  ימי הולדת
                </h3>
                <p className="mb-6 font-semibold leading-relaxed text-[#5b3a06]">
                  חתן או כלת השמחה מקבלים חולצה משלהם — עם השם, התחביב והסטייל.
                  החגיגה מתחילה עוד לפני העוגה.
                </p>
                <Link
                  href="/חולצות-ליום-הולדת"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#271703] shadow-sm transition-colors hover:bg-[#fff6e6]"
                >
                  לעמוד חולצות ליום הולדת
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
              <div className="lg:order-1 lg:col-span-8">
                <div className="flex items-start gap-2 md:gap-4">
                  <figure className="mt-10 w-2/5 md:mt-20">
                    <Image
                      src={BIRTHDAY[1].src}
                      alt={BIRTHDAY[1].alt}
                      width={1155}
                      height={1400}
                      sizes="(max-width: 1024px) 40vw, 25vw"
                      className="h-auto w-full"
                    />
                    <figcaption className="text-center text-sm font-bold text-[#7c4a03]">
                      {BIRTHDAY[1].caption}
                    </figcaption>
                  </figure>
                  <figure className="w-3/5">
                    <Image
                      src={BIRTHDAY[0].src}
                      alt={BIRTHDAY[0].alt}
                      width={1155}
                      height={1400}
                      sizes="(max-width: 1024px) 60vw, 35vw"
                      className="h-auto w-full"
                    />
                    <figcaption className="text-center text-sm font-bold text-[#7c4a03]">
                      {BIRTHDAY[0].caption}
                    </figcaption>
                  </figure>
                </div>
              </div>
            </div>

            {/* 4c. משפחות — פס אופקי של שלוש, גלילה אופקית במובייל */}
            <div className="mt-16 md:mt-24">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-xl">
                  <p className="mb-2 text-6xl leading-none text-white/60 md:text-7xl" style={DISPLAY_FONT} aria-hidden>
                    03
                  </p>
                  <h3
                    className="mb-3 text-2xl leading-tight tracking-tight text-[#271703] md:text-3xl"
                    style={DISPLAY_FONT}
                  >
                    משפחות
                  </h3>
                  <p className="font-semibold leading-relaxed text-[#5b3a06]">
                    טיול שנתי, אירוע משפחתי או מתנה לאמא — הדפסות שהופכות רגע
                    משפחתי למזכרת שלובשים שוב ושוב.
                  </p>
                </div>
                <Link
                  href="/חולצות-משפחתיות"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#271703] shadow-sm transition-colors hover:bg-[#fff6e6]"
                >
                  לעמוד חולצות משפחתיות
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
              <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0">
                {FAMILY.map((img) => (
                  <figure key={img.src} className="w-64 shrink-0 snap-start md:w-auto">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      width={1155}
                      height={1400}
                      sizes="(max-width: 768px) 70vw, 30vw"
                      className="h-auto w-full"
                    />
                    <figcaption className="text-center text-sm font-bold text-[#7c4a03]">
                      {img.caption}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5. ציטוט — ההבטחה שלנו                                       */}
        {/* ============================================================ */}
        <section className="bg-white py-14 md:py-20">
          <PullQuote
            quote="כל חולצה שיוצאת מכאן עוברת בדיקת גרפיקאי ותצוגה מקדימה — כדי שמה שדמיינתם זה בדיוק מה שתלבשו."
            attribution="ההבטחה שלנו בכל עבודה"
            markClass="text-[#ffc32e]/40"
            quoteClass="text-[#1e293b]"
          />
        </section>

        {/* ============================================================ */}
        {/* 6. עבודות שנוספו מהאדמין (קטגוריית gallery ב-Firestore)        */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-6xl px-4 md:px-8">
          <GalleryAdminImages />
        </section>

        {/* ============================================================ */}
        {/* 7. CTA סוגר                                                   */}
        {/* ============================================================ */}
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
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
