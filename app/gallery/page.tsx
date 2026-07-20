// עמוד "העבודות שלנו" — גלריית תמונות נקייה ופשוטה.
// כותרת קצרה → צ'יפים לסינון לפי קטגוריה → גריד תמונות אחיד עם לייטבוקס → שורת CTA.
// Server component; הסינון והלייטבוקס ב-GalleryGrid (client).
// הגריד מנוהל במלואו מהאדמין (siteImages, category='gallery');
// הרשימה הסטטית כאן משמשת רק כ-fallback כשה-DB ריק + כמקור ל-JSON-LD (יציבות SEO).

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Camera, MessageCircle } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/constants'
import { DISPLAY_FONT } from '@/components/seo/blocks'
import GalleryGrid, { type GalleryItem } from '@/components/gallery/GalleryGrid'

const BASE_URL = 'https://badfos.co.il'

/* ------------------------------------------------------------------ */
/* Fallback סטטי — מוצג רק כשאין תמונות גלריה פעילות ב-Firestore        */
/* (אחרי לחיצה על "ייבוא תמונות הגלריה הקיימות" באדמין — הכל מה-DB)      */
/* ------------------------------------------------------------------ */

const GALLERY_ITEMS: GalleryItem[] = [
  // עסקים — עבודות אמיתיות של לקוחות
  {
    src: '/assets/c4660170b_IMG_6179.webp',
    alt: 'סט חולצות שרוול ארוך שחורות עם לוגו Push The Button — הדפסת חולצות לעסק',
    section: 'business',
  },
  {
    src: '/assets/fdd643e9f_D747B5AC-1217-4D1F-A7B1-61C6EDE52659.webp',
    alt: 'חולצות שחורות עם הדפסה אישית של איור דמויות וכיתוב בעברית — סט מותאם לצוות',
    section: 'business',
  },
  // ועוד — עבודות אמיתיות נוספות
  {
    src: '/assets/64ab08d41_IMG_3252.webp',
    alt: 'לקוח לובש חולצת אוברסייז שחורה עם הדפסת גב צבעונית של שמש — Sundara, הדפסת DTF של בדפוס',
    section: 'more',
  },
  {
    src: '/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.webp',
    alt: 'לקוח בחצר לובש חולצת אוברסייז שחורה עם הדפסת גב — Forever Onward Moving Onward',
    section: 'more',
  },
  {
    src: '/assets/a189e74e3_IMG_0490.webp',
    alt: 'חולצת אוברסייז אפורה בשטיפת אבן עם הדפס Greatest בסגנון וינטג׳',
    section: 'more',
  },
  // רווקות
  {
    src: '/assets/seo/bachelorette-1.jpg',
    alt: 'חולצה מודפסת למסיבת רווקות — עיצוב Bride to Be',
    section: 'bachelorette',
  },
  {
    src: '/assets/seo/bachelorette-2.jpg',
    alt: 'הדפסת חולצות למסיבת רווקות — "הלילה קצר והחצאית עוד יותר" בעיצוב ורוד עם נעל עקב ושמפניה',
    section: 'bachelorette',
  },
  {
    src: '/assets/seo/bachelorette-3.jpg',
    alt: 'חולצה מודפסת למסיבת רווקות עם כיתוב מצחיק בעברית',
    section: 'bachelorette',
  },
  {
    src: '/assets/seo/bachelorette-4.jpg',
    alt: 'חולצת רווקות מודפסת לצוות הכלה — סט תואם לכל הקבוצה',
    section: 'bachelorette',
  },
  {
    src: '/assets/seo/bachelorette-5.jpg',
    alt: 'חולצת Bride Squad עם איור טבעת ולב ורוד — הדפסה למסיבת רווקות',
    section: 'bachelorette',
  },
  // משפחות
  {
    src: '/assets/seo/family-1.jpg',
    alt: 'בגד גוף לתינוק עם הדפסת תמונה אישית — "יום הולדת לאמא הכי טובה בעולם"',
    section: 'families',
  },
  {
    src: '/assets/seo/family-2.jpg',
    alt: 'חולצה סגולה מודפסת לטיול משפחתי — Family Adventure מונטנגרו 2026',
    section: 'families',
  },
  {
    src: '/assets/seo/family-3.jpg',
    alt: 'חולצת Road Trip משפחתית בצבע שמנת עם איור דוב מטייל ושמות כל בני המשפחה',
    section: 'families',
  },
  {
    src: '/assets/seo/family-4.jpg',
    alt: 'חולצות משפחתיות מודפסות בעיצוב תואם לכל המשפחה',
    section: 'families',
  },
  // ימי הולדת
  {
    src: '/assets/seo/birthday-1.jpg',
    alt: 'חולצת יום הולדת לילד עם הדפסת כדורסל — "יום הולדת שמח! כוכב היום"',
    section: 'birthday',
  },
  {
    src: '/assets/seo/birthday-2.jpg',
    alt: 'חולצת יום הולדת מודפסת עם שם וגיל בעיצוב צבעוני',
    section: 'birthday',
  },
  {
    src: '/assets/seo/birthday-3.jpg',
    alt: 'חולצת יום הולדת לנסיכה — איור ילדה עם כתר, בלונים ועוגה בהדפסה צבעונית',
    section: 'birthday',
  },
  {
    src: '/assets/seo/birthday-4.jpg',
    alt: 'חולצה מודפסת לחגיגת יום הולדת — עיצוב אישי עם שם החוגג',
    section: 'birthday',
  },
]

/* ------------------------------------------------------------------ */
/* Metadata + JSON-LD                                                  */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: 'העבודות שלנו — גלריית הדפסות אמיתיות על חולצות | בדפוס',
  description:
    'גלריית עבודות של בדפוס לפי קטגוריות: חולצות מודפסות לחיילים, משפחות, מסיבות רווקות, ימי הולדת ועסקים. הדפסת DTF איכותית בראשון לציון עם משלוח לכל הארץ.',
  alternates: { canonical: '/gallery' },
  openGraph: {
    title: 'העבודות שלנו — גלריית הדפסות אמיתיות | בדפוס',
    description:
      'תמונות של חולצות מודפסות לפי קטגוריות: חיילים, משפחות, רווקות, ימי הולדת ועסקים.',
    url: `${BASE_URL}/gallery`,
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
    images: [`${BASE_URL}/assets/64ab08d41_IMG_3252.webp`],
  },
}

const WA_URL = `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent('היי! ראיתי את הגלריה באתר ואני רוצה חולצות כאלה 🙂')}`

export default function GalleryPage() {
  const galleryJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${BASE_URL}/gallery`,
    name: 'העבודות שלנו — גלריית הדפסות של בדפוס',
    description:
      'גלריית עבודות לפי קטגוריות: חיילים, משפחות, רווקות, ימי הולדת ועסקים.',
    url: `${BASE_URL}/gallery`,
    inLanguage: 'he',
    mainEntity: {
      '@type': 'ImageGallery',
      name: 'גלריית העבודות של בדפוס',
      associatedMedia: GALLERY_ITEMS.map((img) => ({
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

      <div className="min-h-screen bg-white" dir="rtl">
        {/* כותרת קומפקטית בשפת האתר — ממורכזת, באדג' צהוב, מילת הדגשה ענברית ורקע קרם עם גלואים */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#fffdf5] via-[#fffdf5] to-white">
          <div
            className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#ffc32e]/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-[#f59e0b]/10 blur-3xl"
            aria-hidden
          />
          <header className="relative mx-auto max-w-6xl px-4 pb-7 pt-8 text-center md:px-8 md:pt-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-700 shadow-sm">
              <Camera className="h-4 w-4" />
              גלריית עבודות
            </div>
            <h1
              className="text-4xl tracking-tight text-[#1e293b] md:text-5xl"
              style={DISPLAY_FONT}
            >
              העבודות <span className="text-[#f59e0b]">שלנו</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600 md:text-lg">
              הדפסות אמיתיות שיצאו מהדפוס שלנו — בוחרים קטגוריה ולוחצים על תמונה להגדלה.
            </p>
          </header>
        </div>

        {/* צ'יפים + גריד + לייטבוקס — תמונות מנוהלות מהאדמין; fallback סטטי כשה-DB ריק */}
        <GalleryGrid fallbackItems={GALLERY_ITEMS} />

        {/* שורת CTA מצומצמת — ממורכזת בשפת האתר: רקע קרם-ענברי, כותרת דיספליי וכפתורי החתימה */}
        <div className="relative overflow-hidden border-t border-amber-100/60 bg-gradient-to-br from-[#fffaf0] via-white to-[#fff6e6]">
          <div
            className="pointer-events-none absolute -top-16 right-8 h-48 w-48 rounded-full bg-[#ffc32e]/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-8 h-56 w-56 rounded-full bg-[#f59e0b]/10 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 py-12 text-center md:px-8 md:py-14">
            <h2 className="text-2xl tracking-tight text-[#1e293b] md:text-3xl" style={DISPLAY_FONT}>
              רוצים חולצה <span className="text-[#f59e0b]">כזאת?</span>
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-gray-600 md:text-lg">
              מתחילים לעצב אונליין תוך דקות — או מדברים איתנו ומקבלים ליווי אישי.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#fbbf24] px-8 py-3 text-lg font-bold text-white shadow-xl transition-all hover:scale-105 hover:bg-[#f59e0b]"
              >
                מתחילים לעצב
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#25D366] px-8 py-3 text-lg font-bold text-white shadow-xl transition-all hover:scale-105 hover:bg-[#1fb455]"
              >
                <MessageCircle className="h-5 w-5" />
                דברו איתנו בוואטסאפ
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
