'use client'

// גריד הגלריה: צ'יפים לסינון לפי קטגוריה + גריד תמונות אחיד + לייטבוקס.
// מקור התמונות: siteImages (category='gallery') — מנוהל במלואו מהאדמין
// (קטגוריה, סדר, הסתרה, מחיקה). אם ה-DB ריק / לא זמין — fallback לרשימה
// הסטטית שמגיעה מהשרת, כדי שהעמוד הציבורי לעולם לא יישאר ריק.
//
// ליטוש ויזואלי לפי ספריית UI/UX Pro Max: סגנון Motion-Driven + Bento Grid —
// כניסה מדורגת (35ms לפריט), שלד שימר בזמן טעינה, ריחוף עם זום + צל,
// צ'יפ פעיל בגרדיאנט המותג עם טקסט כהה (ניגודיות WCAG), לייטבוקס עם
// טשטוש רקע, כיתוב ומונה. prefers-reduced-motion מכובה גלובלית ב-globals.css.

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { X, ChevronRight, ChevronLeft, ZoomIn } from 'lucide-react'
import { queryDocuments } from '@/lib/db'
import { GALLERY_SECTIONS } from '@/lib/constants'
import type { SiteImage, GallerySection } from '@/lib/types'

export interface GalleryItem {
  src: string
  alt: string
  section: GallerySection
}

/* כרטיס בודד: שלד שימר עד שהתמונה נטענת + ריחוף (זום תמונה, צל, אייקון הגדלה) */
function GalleryCard({
  item,
  index,
  onOpen,
}: {
  item: GalleryItem
  index: number
  onOpen: () => void
}) {
  const [loaded, setLoaded] = useState(false)

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}
      className="animate-gallery-in group relative aspect-square cursor-pointer overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-gray-900/5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_24px_45px_-20px_rgba(245,158,11,0.45)] hover:ring-[#ffc32e]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2"
      aria-label={`הגדלת תמונה: ${item.alt}`}
    >
      {!loaded && (
        <span aria-hidden className="gallery-shimmer absolute inset-0 overflow-hidden bg-gray-100" />
      )}
      <Image
        src={item.src}
        alt={item.alt}
        fill
        priority={index < 4}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        onLoad={() => setLoaded(true)}
        className={`object-cover transition-[transform,opacity] duration-500 ease-out group-hover:scale-105 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {/* שכבת ריחוף עדינה + אייקון הגדלה (דסקטופ; במובייל הקלקה עובדת כרגיל) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-900/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-3 right-3 flex h-9 w-9 translate-y-1.5 items-center justify-center rounded-full bg-white/95 text-gray-900 opacity-0 shadow-md transition-[transform,opacity] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100"
      >
        <ZoomIn className="h-4 w-4" />
      </span>
    </button>
  )
}

export default function GalleryGrid({ fallbackItems }: { fallbackItems: GalleryItem[] }) {
  const [dbItems, setDbItems] = useState<GalleryItem[] | null>(null)
  const [activeSection, setActiveSection] = useState<'all' | GallerySection>('all')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // תמונות הגלריה מהאדמין — ממוינות לפי סדר תצוגה ואז לפי תאריך העלאה
  useEffect(() => {
    queryDocuments<SiteImage>('siteImages', [
      { field: 'category', operator: '==', value: 'gallery' },
    ])
      .then((data) =>
        setDbItems(
          data
            .filter((img) => img.isActive && img.imageUrl)
            .sort(
              (a, b) =>
                (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
                (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)
            )
            .map((img) => ({
              src: img.imageUrl,
              alt: img.description || `${img.name} — עבודת הדפסה של בדפוס`,
              section: img.gallerySection ?? 'more',
            }))
        )
      )
      .catch(() => {})
  }, [])

  // DB ריק / עדיין נטען / שגיאה → fallback סטטי (העמוד לעולם לא ריק)
  const usingDb = dbItems !== null && dbItems.length > 0
  const allItems = usingDb ? dbItems : fallbackItems
  const visibleItems =
    activeSection === 'all' ? allItems : allItems.filter((i) => i.section === activeSection)

  // צ'יפים רק לקטגוריות שיש בהן תמונות + ספירה לכל קטגוריה
  const sections = GALLERY_SECTIONS.map((s) => ({
    ...s,
    count: allItems.filter((i) => i.section === s.value).length,
  })).filter((s) => s.count > 0)

  const close = useCallback(() => setLightboxIndex(null), [])
  const next = useCallback(
    () => setLightboxIndex((i) => (i === null ? null : (i + 1) % visibleItems.length)),
    [visibleItems.length]
  )
  const prev = useCallback(
    () =>
      setLightboxIndex((i) =>
        i === null ? null : (i - 1 + visibleItems.length) % visibleItems.length
      ),
    [visibleItems.length]
  )

  // מקלדת + נעילת גלילה כשהלייטבוקס פתוח
  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      // RTL: חץ שמאלה = קדימה, חץ ימינה = אחורה
      if (e.key === 'ArrowLeft') next()
      if (e.key === 'ArrowRight') prev()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [lightboxIndex, close, next, prev])

  const current = lightboxIndex !== null ? visibleItems[lightboxIndex] : null

  return (
    <div dir="rtl">
      {/* ── צ'יפים דביקים מתחת להדר האתר (h-20 מובייל / h-16 דסקטופ) ── */}
      <div className="sticky top-20 lg:top-16 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto flex w-max items-center gap-2 py-3">
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-5 text-sm font-bold shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-1 ${
                activeSection === 'all'
                  ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                  : 'border-yellow-200 bg-white text-gray-700 hover:bg-yellow-50 hover:text-gray-900'
              }`}
              aria-pressed={activeSection === 'all'}
            >
              הכל
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                  activeSection === 'all' ? 'bg-white/80 text-yellow-800' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {allItems.length}
              </span>
            </button>
            {sections.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setActiveSection(s.value)}
                className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-5 text-sm font-bold shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-1 ${
                  activeSection === s.value
                    ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                    : 'border-yellow-200 bg-white text-gray-700 hover:bg-yellow-50 hover:text-gray-900'
                }`}
                aria-pressed={activeSection === s.value}
              >
                {s.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                    activeSection === s.value
                      ? 'bg-white/80 text-yellow-800'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {s.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── גריד תמונות אחיד; key מפעיל מחדש את אנימציית הכניסה בהחלפת פילטר ── */}
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <div
          key={`${activeSection}-${usingDb ? 'db' : 'fb'}`}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4"
        >
          {visibleItems.map((item, idx) => (
            <GalleryCard
              key={`${item.src}-${idx}`}
              item={item}
              index={idx}
              onOpen={() => setLightboxIndex(idx)}
            />
          ))}
        </div>
      </div>

      {/* ── לייטבוקס ── */}
      {current && (
        <div
          className="animate-lightbox-fade fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="סגירה"
          >
            <X className="h-6 w-6" />
          </button>

          {visibleItems.length > 1 && (
            <>
              {/* RTL: הקודמת מימין, הבאה משמאל */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  prev()
                }}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-4"
                aria-label="התמונה הקודמת"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  next()
                }}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:left-4"
                aria-label="התמונה הבאה"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
            </>
          )}

          <div
            key={current.src}
            className="animate-lightbox-zoom relative h-[76vh] w-[92vw] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={current.src}
              alt={current.alt}
              fill
              sizes="92vw"
              className="object-contain"
            />
          </div>

          {/* כיתוב + מונה */}
          <div
            className="pointer-events-none absolute bottom-4 left-1/2 flex w-[92vw] max-w-2xl -translate-x-1/2 flex-col items-center gap-2 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="line-clamp-2 text-sm font-medium text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
              {current.alt}
            </p>
            {visibleItems.length > 1 && lightboxIndex !== null && (
              <p
                className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold tabular-nums text-white backdrop-blur-sm"
                dir="ltr"
              >
                {lightboxIndex + 1} / {visibleItems.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
