'use client'

// גריד הגלריה: צ'יפים לסינון לפי קטגוריה + גריד תמונות אחיד + לייטבוקס.
// מקור התמונות: siteImages (category='gallery') — מנוהל במלואו מהאדמין
// (קטגוריה, סדר, הסתרה, מחיקה). אם ה-DB ריק / לא זמין — fallback לרשימה
// הסטטית שמגיעה מהשרת, כדי שהעמוד הציבורי לעולם לא יישאר ריק.

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { queryDocuments } from '@/lib/db'
import { GALLERY_SECTIONS } from '@/lib/constants'
import type { SiteImage, GallerySection } from '@/lib/types'

export interface GalleryItem {
  src: string
  alt: string
  section: GallerySection
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
  const allItems = dbItems && dbItems.length > 0 ? dbItems : fallbackItems
  const visibleItems =
    activeSection === 'all' ? allItems : allItems.filter((i) => i.section === activeSection)

  // צ'יפים רק לקטגוריות שיש בהן תמונות
  const sections = GALLERY_SECTIONS.filter((s) =>
    allItems.some((i) => i.section === s.value)
  )

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
      <div className="sticky top-20 lg:top-16 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-2 py-3">
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={`min-h-[44px] cursor-pointer whitespace-nowrap rounded-full px-5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] ${
                activeSection === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-pressed={activeSection === 'all'}
            >
              הכל
            </button>
            {sections.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setActiveSection(s.value)}
                className={`min-h-[44px] cursor-pointer whitespace-nowrap rounded-full px-5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] ${
                  activeSection === s.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-pressed={activeSection === s.value}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── גריד תמונות אחיד ── */}
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {visibleItems.map((item, idx) => (
            <button
              key={`${item.src}-${idx}`}
              type="button"
              onClick={() => setLightboxIndex(idx)}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2"
              aria-label={`הגדלת תמונה: ${item.alt}`}
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                priority={idx < 4}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </button>
          ))}
        </div>
      </div>

      {/* ── לייטבוקס ── */}
      {current && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-4"
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
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:left-4"
                aria-label="התמונה הבאה"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
            </>
          )}

          <div
            className="relative h-[80vh] w-[92vw] max-w-4xl"
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

          {visibleItems.length > 1 && lightboxIndex !== null && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm font-bold text-white/70" dir="ltr">
              {lightboxIndex + 1} / {visibleItems.length}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
