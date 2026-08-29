// The original uniform SEO landing layout, extracted as-is from app/[slug]/page.tsx.
// Pages without a custom layout in LAYOUTS render exactly like before.

import Link from 'next/link'
import Image from 'next/image'
import {
  Star,
  Truck,
  Store,
  Sparkles,
  Clock,
  BadgePercent,
  Palette,
  ChevronLeft,
  ArrowLeft,
  ChevronDown,
  MessageCircle,
} from 'lucide-react'
import { getSeoPage } from '@/lib/seo-pages'
import LiveBasePrice from '@/components/seo/LiveBasePrice'
import type { SeoLayoutProps } from './types'

const BENEFIT_ICONS = [BadgePercent, Palette, Sparkles, Truck]

export default function DefaultLayout({ page, waUrl }: SeoLayoutProps) {
  // Product pages send visitors straight to their designer; audience pages keep
  // the original targets (homepage hero CTA, t-shirt designer in the strip).
  const ctaHref = page.productType ? `/designer/${page.productType}` : '/'
  const designerHref = page.productType ? `/designer/${page.productType}` : '/designer/tshirt'
  const relatedPages = page.related
    .map((slug) => getSeoPage(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  return (
    <div className="min-h-screen bg-[#fffdf5]" dir="rtl">
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-10 md:py-16">
        {/* Breadcrumb */}
        <nav aria-label="פירורי לחם" className="mb-6 text-sm text-gray-500">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link href="/" className="hover:text-[#b45309] transition-colors">
                בית
              </Link>
            </li>
            <li aria-hidden>
              <ChevronLeft className="w-4 h-4" />
            </li>
            <li className="font-semibold text-gray-700">{page.h1}</li>
          </ol>
        </nav>

        {/* Hero */}
        <header className="text-center md:text-right mb-12">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#1e293b] leading-tight mb-5">
            {page.h1}
          </h1>
          {page.audienceLine && (
            <p className="mb-5">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-base md:text-lg font-extrabold ${
                  page.accent ? page.accent.badge : 'bg-[#fff6e6] text-[#b45309] border-[#ffc32e]/50'
                }`}
              >
                {page.accent && <span aria-hidden>{page.accent.emoji}</span>}
                {page.audienceLine}
              </span>
            </p>
          )}
          <p className="text-lg md:text-xl text-[#475569] leading-relaxed max-w-3xl md:ml-auto mb-7">
            {page.heroText}
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <Link
              href={ctaHref}
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
          </div>
        </header>

        {/* Trust row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
          {[
            { icon: Star, text: '4.8★ בגוגל' },
            { icon: Truck, text: 'משלוח מהיר לכל הארץ' },
            { icon: Store, text: 'איסוף עצמי בראשון לציון' },
            { icon: Clock, text: 'ייצור תוך ימים ספורים' },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <div
                key={i}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#ffc32e]/30 bg-white/80 px-3 py-3 text-sm font-bold text-[#1e293b]"
              >
                <Icon className="w-4 h-4 text-[#f59e0b] shrink-0" />
                <span>{item.text}</span>
              </div>
            )
          })}
        </div>

        {/* Benefits grid */}
        <section className="mb-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {page.benefits.map((benefit, index) => {
              const Icon = BENEFIT_ICONS[index % BENEFIT_ICONS.length]
              return (
                <div
                  key={index}
                  className="flex items-start gap-4 rounded-3xl border border-black/5 bg-white p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.25)]"
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br shadow ring-1 ${
                      page.accent
                        ? `${page.accent.gradient} ring-black/10`
                        : 'from-[#ffc32e] to-[#f59e0b] ring-[#ffc32e]/40'
                    }`}
                  >
                    <Icon className="w-6 h-6" strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-[#1e293b] mb-1">{benefit.title}</h3>
                    <p className="text-[#64748b] text-sm leading-relaxed">{benefit.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Gallery */}
        <section className="mb-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {page.galleryImages.map((src, index) => (
              <div
                key={src}
                className="relative aspect-square rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-md"
              >
                <Image
                  src={src}
                  alt={`${page.h1} — דוגמה ${index + 1} מלקוחות בדפוס`}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Ideas chips — playful print-slogan / use-case inspiration */}
        {page.ideas && (
          <section className="mb-14">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1e293b] mb-2">
              {page.accent && <span aria-hidden className="ml-2">{page.accent.emoji}</span>}
              {page.ideas.title}
            </h2>
            <p className="text-[#64748b] font-semibold mb-5">
              קחו השראה — כל כיתוב כזה מעצבים אונליין תוך דקות, עם תצוגה מקדימה חיה.
            </p>
            <div className="flex flex-wrap gap-3">
              {page.ideas.items.map((item) => (
                <span
                  key={item}
                  className={`rounded-full border px-5 py-2.5 text-sm md:text-base font-bold ${
                    page.accent
                      ? page.accent.badge
                      : 'bg-[#fff6e6] text-[#b45309] border-[#ffc32e]/50'
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Body copy */}
        <section className="mb-14 space-y-10">
          {page.paragraphs.map((paragraph, index) => (
            <div key={index}>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#1e293b] mb-3">
                {paragraph.title}
              </h2>
              <p className="text-[#475569] leading-relaxed text-base md:text-lg">{paragraph.text}</p>
            </div>
          ))}
        </section>

        {/* Pricing highlight strip */}
        <section className="mb-14 rounded-3xl bg-gradient-to-l from-[#ffc32e]/20 via-[#fff6e6] to-white border border-[#ffc32e]/40 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-right">
            <div>
              <p className="text-xl md:text-2xl font-black text-[#1e293b]">
                מחירים שקופים — בלי הפתעות ובלי עלויות נסתרות
              </p>
              <p className="text-[#64748b] font-semibold mt-1">
                מעצבים אונליין עם תצוגה מקדימה חיה ומקבלים הצעת מחיר מהירה
              </p>
              {page.productType && (
                <p className="text-[#1e293b] font-extrabold mt-2">
                  מחיר בסיס: <LiveBasePrice productType={page.productType} /> ליחידה + תוספת הדפסה לפי אזור
                </p>
              )}
            </div>
            <Link
              href={designerHref}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#f59e0b] px-6 py-3 font-extrabold text-[#b45309] hover:bg-[#f59e0b] hover:text-white transition-colors"
            >
              מתחילים לעצב
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-14">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1e293b] mb-6">שאלות נפוצות</h2>
          <div className="space-y-3">
            {page.faq.map((item, index) => (
              <details
                key={index}
                className="group rounded-2xl border border-black/5 bg-white shadow-sm open:shadow-md"
              >
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-5 py-4 font-bold text-[#1e293b] [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <ChevronDown className="w-5 h-5 text-[#f59e0b] shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-[#475569] leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Related SEO pages */}
        {relatedPages.length > 0 && (
          <section className="mb-14">
            <h2 className="text-xl font-extrabold text-[#1e293b] mb-4">אולי יעניין אתכם גם</h2>
            <div className="flex flex-wrap gap-3">
              {relatedPages.map((related) => (
                <Link
                  key={related.slug}
                  href={`/${related.slug}`}
                  className="rounded-full border border-[#ffc32e]/50 bg-white px-5 py-2.5 text-sm font-bold text-[#1e293b] hover:bg-[#fff6e6] hover:border-[#f59e0b] transition-colors"
                >
                  {related.h1}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="rounded-3xl bg-gradient-to-br from-[#ffc32e] to-[#f59e0b] p-8 md:p-12 text-center shadow-[0_25px_60px_-20px_rgba(245,158,11,0.6)]">
          <h2 className="text-2xl md:text-4xl font-black text-white mb-3">
            מוכנים להתחיל לעצב?
          </h2>
          <p className="text-white/90 text-lg font-semibold mb-6">
            מעצבים אונליין, רואים תצוגה מקדימה חיה ומקבלים חולצות מודפסות תוך ימים ספורים.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-extrabold text-[#b45309] shadow-lg hover:bg-[#fffdf5] transition-colors"
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
          </div>
        </section>
      </div>
    </div>
  )
}
