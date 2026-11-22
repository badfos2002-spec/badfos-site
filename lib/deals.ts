/**
 * Deals (TICKET-022) — pure rules shared by the admin UI, the admin API route
 * and the public pages. No Firebase here: reads/writes live in lib/deals-server.ts.
 */
import type { Deal } from '@/lib/types'
import { CONTACT_INFO } from '@/lib/constants'

export const SITE_URL = 'https://badfos.co.il'
export const DEALS_TZ = 'Asia/Jerusalem'

export const DEAL_LIMITS = { title: 80, shortText: 300, priceText: 40, slug: 80, orderLabel: 40, couponCode: 30, heroTitle: 60, heroText: 160, heroCta: 30 } as const

export const HERO_CTA_DEFAULT = 'לפרטי המבצע'

/** The only paths the optional «להזמנה» button may point to (internal, validated server-side). */
export const ORDER_TARGETS = [
  { href: '/designer/tshirt', label: 'עיצוב חולצה' },
  { href: '/designer/sweatshirt', label: 'עיצוב סווטשרט' },
  { href: '/designer/cap', label: 'עיצוב כובע' },
  { href: '/designer/tote', label: 'עיצוב תיק בד' },
  { href: '/designer/apron', label: 'עיצוב סינר' },
  { href: '/designer/buff', label: 'עיצוב באף' },
  { href: '/designer/baby', label: 'עיצוב בגד תינוק' },
  { href: '/designer/vest', label: 'עיצוב וסט' },
  { href: '/packages', label: 'חבילות' },
] as const

export function isOrderTarget(href: unknown): boolean {
  return typeof href === 'string' && ORDER_TARGETS.some((t) => t.href === href)
}

export function orderTargetLabel(href: string): string | undefined {
  return ORDER_TARGETS.find((t) => t.href === href)?.label
}

/** Today's calendar date in Israel as YYYY-MM-DD. */
export function israelDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DEALS_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Active, and either open-ended or `endsAt` (inclusive, Israel calendar day) not yet passed. */
export function isDealLive(deal: Pick<Deal, 'isActive' | 'endsAt'>, now: Date = new Date()): boolean {
  if (!deal.isActive) return false
  if (!deal.endsAt) return true
  return israelDate(now) <= deal.endsAt.slice(0, 10)
}

export function isDealExpired(deal: Pick<Deal, 'endsAt'>, now: Date = new Date()): boolean {
  return !!deal.endsAt && israelDate(now) > deal.endsAt.slice(0, 10)
}

/** sortOrder ascending, then newest first. Returns a new array. */
export function sortDeals<T extends Pick<Deal, 'sortOrder' | 'createdAt'>>(deals: T[]): T[] {
  return [...deals].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

export type DealImageVariant = 'square' | 'mobile' | 'desktop'

/**
 * The image whose shape matches the box; when that slot is empty, the nearest shape
 * (a square crops less than a portrait in a wide box, and vice versa). TICKET-025A.
 */
export function dealImage(deal: Pick<Deal, 'imageSquare' | 'imageMobile' | 'imageDesktop'>, variant: DealImageVariant): string | undefined {
  const { imageSquare: s, imageMobile: m, imageDesktop: d } = deal
  return variant === 'square' ? s || m || d : variant === 'mobile' ? m || s || d : d || s || m
}

/** Target width/height per slot, and how far off it may be before we warn. */
const SHAPE_RATIO: Record<DealImageVariant, { ratio: number; tolerance: number }> = {
  square: { ratio: 1, tolerance: 0.08 },
  mobile: { ratio: 0.8, tolerance: 0.08 },
  desktop: { ratio: 1.6, tolerance: 0.15 },
}

/**
 * Soft warning for an uploaded image whose shape does not match its slot — it is
 * centre-cropped, never rejected. `null` when it fits (or could not be measured).
 */
export function imageShapeWarning(variant: DealImageVariant, w: number, h: number): string | null {
  if (!(w > 0) || !(h > 0)) return null
  const { ratio, tolerance } = SHAPE_RATIO[variant]
  if (Math.abs(w / h - ratio) <= tolerance) return null
  if (variant === 'mobile') return 'התמונה שהועלתה אינה ביחס 4:5 — תיחתך מהמרכז'
  if (variant === 'desktop') return 'התמונה שהועלתה אינה רחבה (16:10) — תיחתך מהמרכז'
  return w > h ? 'התמונה שהועלתה שוכבת ולא ריבועית — תיחתך מהמרכז' : 'התמונה שהועלתה לאורך ולא ריבועית — תיחתך מהמרכז'
}

export function dealUrl(slug: string): string {
  return `${SITE_URL}/deals/${encodeURIComponent(slug)}`
}

export function dealPath(slug: string): string {
  return `/deals/${encodeURIComponent(slug)}`
}

export function dealWhatsAppLink(deal: Pick<Deal, 'title' | 'slug'>): string {
  const text = `היי, מתעניין/ת במבצע «${deal.title}» שראיתי באתר\n${dealUrl(deal.slug)}`
  return `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(text)}`
}

export function dealPhoneLink(): string {
  return `tel:+${CONTACT_INFO.whatsapp}`
}

/** «31.12.2026» from «2026-12-31». */
export function formatDealDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

/** URL segment from a title: Hebrew/latin letters and digits kept, spaces → '-', everything else dropped. */
export function slugify(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .replace(/-$/, '')
  return s || 'deal'
}

export function uniqueSlug(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export function isSafeSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= DEAL_LIMITS.slug && /^[\p{L}\p{N}]+(-[\p{L}\p{N}]+)*$/u.test(slug)
}

/** Our Storage bucket (env, falling back to the production bucket). */
export const DEALS_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'badfos-28b67.firebasestorage.app'

/** Firebase Storage objects under OUR bucket's site-images/deals/, or a plain site-relative path. */
export function isAllowedDealImage(url: string): boolean {
  if (url.startsWith('/')) return !url.startsWith('//') && !url.startsWith('/\\') && !url.includes('\\')
  return url.startsWith(`https://firebasestorage.googleapis.com/v0/b/${DEALS_BUCKET}/o/site-images%2Fdeals%2F`)
}

export const COUPON_RE = /^[A-Z0-9-]{1,30}$/

export type DealInput = Omit<Deal, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
export type DealErrors = Partial<Record<'title' | 'shortText' | 'priceText' | 'slug' | 'endsAt' | 'imageSquare' | 'imageMobile' | 'imageDesktop' | 'order' | 'orderLabel' | 'couponCode' | 'sortOrder' | 'heroTitle' | 'heroText' | 'heroCta', string>>

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Trim + validate an admin payload. Shared by the admin form and POST /api/admin/deals. */
export function validateDealInput(raw: unknown): { ok: true; value: DealInput } | { ok: false; errors: DealErrors } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const errors: DealErrors = {}

  const title = str(r.title)
  const shortText = str(r.shortText)
  const priceText = str(r.priceText)
  const slug = str(r.slug)
  const endsAt = str(r.endsAt)
  const imageSquare = str(r.imageSquare)
  const imageMobile = str(r.imageMobile)
  const imageDesktop = str(r.imageDesktop)
  const sortOrder = typeof r.sortOrder === 'number' ? r.sortOrder : Number(r.sortOrder ?? 0)

  if (!title) errors.title = 'חובה למלא כותרת'
  else if (title.length > DEAL_LIMITS.title) errors.title = `כותרת עד ${DEAL_LIMITS.title} תווים`
  if (!shortText) errors.shortText = 'חובה למלא טקסט קצר'
  else if (shortText.length > DEAL_LIMITS.shortText) errors.shortText = `טקסט קצר עד ${DEAL_LIMITS.shortText} תווים`
  if (priceText.length > DEAL_LIMITS.priceText) errors.priceText = `מחיר/הנחה עד ${DEAL_LIMITS.priceText} תווים`
  if (slug && !isSafeSlug(slug)) errors.slug = 'כתובת לא תקינה — רק אותיות, ספרות ומקפים'
  if (endsAt && (!/^\d{4}-\d{2}-\d{2}$/.test(endsAt) || Number.isNaN(Date.parse(endsAt)))) errors.endsAt = 'תאריך לא תקין'
  if (imageSquare && !isAllowedDealImage(imageSquare)) errors.imageSquare = 'כתובת תמונה לא מורשית'
  if (imageMobile && !isAllowedDealImage(imageMobile)) errors.imageMobile = 'כתובת תמונה לא מורשית'
  if (imageDesktop && !isAllowedDealImage(imageDesktop)) errors.imageDesktop = 'כתובת תמונה לא מורשית'
  if (!Number.isFinite(sortOrder)) errors.sortOrder = 'סדר תצוגה חייב להיות מספר'

  let order: DealInput['order']
  if (r.order && typeof r.order === 'object') {
    const o = r.order as Record<string, unknown>
    const href = str(o.href)
    const label = str(o.label)
    const couponCode = str(o.couponCode).toUpperCase()
    if (!isOrderTarget(href)) errors.order = 'יעד הזמנה לא מורשה'
    if (label.length > DEAL_LIMITS.orderLabel) errors.orderLabel = `טקסט הכפתור עד ${DEAL_LIMITS.orderLabel} תווים`
    if (couponCode && !COUPON_RE.test(couponCode)) errors.couponCode = 'קוד קופון: אותיות באנגלית, ספרות ומקף, עד 30 תווים'
    order = { href, ...(label ? { label } : {}), ...(couponCode ? { couponCode } : {}) }
  }

  let hero: DealInput['hero']
  if (r.hero && typeof r.hero === 'object') {
    const hr = r.hero as Record<string, unknown>
    const hTitle = str(hr.title)
    const hText = str(hr.text)
    const hCta = str(hr.ctaLabel)
    if (hTitle.length > DEAL_LIMITS.heroTitle) errors.heroTitle = `כותרת בהירו עד ${DEAL_LIMITS.heroTitle} תווים`
    if (hText.length > DEAL_LIMITS.heroText) errors.heroText = `טקסט בהירו עד ${DEAL_LIMITS.heroText} תווים`
    if (hCta.length > DEAL_LIMITS.heroCta) errors.heroCta = `טקסט כפתור ההירו עד ${DEAL_LIMITS.heroCta} תווים`
    hero = { enabled: hr.enabled === true, ...(hTitle ? { title: hTitle } : {}), ...(hText ? { text: hText } : {}), ...(hCta ? { ctaLabel: hCta } : {}) }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const id = str(r.id)
  const value: DealInput = {
    ...(id ? { id } : {}),
    slug,
    title,
    shortText,
    ...(priceText ? { priceText } : {}),
    ...(imageSquare ? { imageSquare } : {}),
    ...(imageMobile ? { imageMobile } : {}),
    ...(imageDesktop ? { imageDesktop } : {}),
    ...(endsAt ? { endsAt } : {}),
    isActive: r.isActive === true,
    sortOrder: Math.round(sortOrder),
    ...(order ? { order } : {}),
    ...(hero ? { hero } : {}),
  }
  return { ok: true, value }
}

/** Stored document → exactly the Deal interface (unknown fields dropped). */
export function toDeal(id: string, data: Record<string, unknown>): Deal {
  const s = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
  const o = data.order && typeof data.order === 'object' ? (data.order as Record<string, unknown>) : null
  const href = o ? s(o.href) : undefined
  const hr = data.hero && typeof data.hero === 'object' ? (data.hero as Record<string, unknown>) : null
  return {
    id,
    slug: s(data.slug) ?? id,
    title: s(data.title) ?? '',
    shortText: s(data.shortText) ?? '',
    ...(s(data.priceText) ? { priceText: s(data.priceText) } : {}),
    ...(s(data.imageSquare) ? { imageSquare: s(data.imageSquare) } : {}),
    ...(s(data.imageMobile) ? { imageMobile: s(data.imageMobile) } : {}),
    ...(s(data.imageDesktop) ? { imageDesktop: s(data.imageDesktop) } : {}),
    ...(s(data.endsAt) ? { endsAt: s(data.endsAt) } : {}),
    isActive: data.isActive === true,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
    ...(o && href && isOrderTarget(href)
      ? { order: { href, ...(s(o.label) ? { label: s(o.label) } : {}), ...(s(o.couponCode) ? { couponCode: s(o.couponCode) } : {}) } }
      : {}),
    ...(hr
      ? { hero: { enabled: hr.enabled === true, ...(s(hr.title) ? { title: s(hr.title) } : {}), ...(s(hr.text) ? { text: s(hr.text) } : {}), ...(s(hr.ctaLabel) ? { ctaLabel: s(hr.ctaLabel) } : {}) } }
      : {}),
    createdAt: s(data.createdAt) ?? '',
    updatedAt: s(data.updatedAt) ?? '',
  }
}

/** Hero copy for a deal: overrides, else the deal's own title/shortText. */
export function dealHeroCopy(deal: Pick<Deal, 'title' | 'shortText' | 'hero'>) {
  return {
    title: deal.hero?.title || deal.title,
    text: deal.hero?.text || deal.shortText,
    ctaLabel: deal.hero?.ctaLabel || HERO_CTA_DEFAULT,
  }
}
