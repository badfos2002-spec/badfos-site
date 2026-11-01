// Live price tokens for SEO page copy (lib/seo-pages.ts).
//
// SEO pages are SSG, so any shekel amount interpolated into the copy at build
// time is a code default that drifts from the admin prices (/admin/pricing →
// /api/pricing). Instead the copy holds tokens, the server splits them out, and
// a client island (components/seo/LivePriceToken.tsx) resolves each one from
// the live pricing store — the same getters the designers and the cart use.
//
// Grammar — {{kind:args}}:
//   {{base:<product>}}            ₪ cheapest base price of the product (over its sub-types)
//   {{base:<product>:<subType>}}  ₪ base price of one sub-type (fabric / sweatshirt / cap / tote type)
//   {{area:<product>:<areaId>}}   ₪ print price of one area on that product
//   {{from:<product>}}            ₪ cheapest base + cheapest print area ("החל מ־")
//   {{unit:<product>:<a1>[,<a2>]}} ₪ cheapest base + the listed areas
//   {{unit:<product>:<subType>:<a1>[,<a2>]}} ₪ that sub-type's base + the listed areas
//   (arity decides: 2 args = product:areas, 3 args = product:subType:areas)
//   {{size:<sizeId>}}             ₪ size surcharge (e.g. 3XL)
//   {{shipping}}                  ₪ delivery cost
//   {{discountMin}}               bare number — units needed for the quantity discount
//   {{discountPct}}               bare number — quantity discount percent
// Invalid tokens throw (validateSeoPage runs at build), so a typo can never
// ship as a silent ₪0 or a stuck placeholder.

import type { DesignAreaType, ProductType } from './types'
import {
  FABRIC_TYPES,
  SWEATSHIRT_TYPES,
  CAP_TYPES,
  TOTE_TYPES,
  STANDARD_SIZES,
  CAP_MIN_QUANTITY,
  BUFF_QUANTITIES,
  getBasePrice,
  getDesignAreasByProductType,
  getSizeSurcharge,
  getLiveShippingCost,
  getLiveQuantityDiscount,
} from './constants'

const PRODUCTS: readonly ProductType[] = ['tshirt', 'sweatshirt', 'buff', 'cap', 'apron', 'baby', 'tote', 'vest']

const SUB_TYPES: Partial<Record<ProductType, readonly { id: string }[]>> = {
  tshirt: FABRIC_TYPES,
  sweatshirt: SWEATSHIRT_TYPES,
  cap: CAP_TYPES,
  tote: TOTE_TYPES,
}

const TOKEN_RE = /\{\{([^{}]*)\}\}/g

export type PriceToken =
  | { kind: 'base'; product: ProductType; subType?: string }
  | { kind: 'area'; product: ProductType; area: DesignAreaType }
  | { kind: 'from'; product: ProductType }
  | { kind: 'unit'; product: ProductType; subType?: string; areas: DesignAreaType[] }
  | { kind: 'size'; size: string }
  | { kind: 'shipping' }
  | { kind: 'discountMin' }
  | { kind: 'discountPct' }

function fail(raw: string, why: string): never {
  throw new Error(`[seo price token] {{${raw}}}: ${why}`)
}

function product(raw: string, value: string | undefined): ProductType {
  if (!value || !PRODUCTS.includes(value as ProductType)) fail(raw, `unknown product "${value}"`)
  return value as ProductType
}

function arity(raw: string, args: string[], min: number, max: number): void {
  if (args.length < min || args.length > max) fail(raw, `expects ${min === max ? min : `${min}-${max}`} argument(s), got ${args.length}`)
}

function subType(raw: string, p: ProductType, value: string): string {
  if (!SUB_TYPES[p]?.some((s) => s.id === value)) fail(raw, `sub-type "${value}" does not exist on ${p}`)
  return value
}

function area(raw: string, p: ProductType, value: string | undefined): DesignAreaType {
  if (!value || !getDesignAreasByProductType(p).some((a) => a.id === value)) {
    fail(raw, `area "${value}" does not exist on ${p}`)
  }
  return value as DesignAreaType
}

/** Parses the inside of a {{…}} token. Throws on anything invalid. */
export function parsePriceToken(raw: string): PriceToken {
  const [kind, ...args] = raw.split(':')
  switch (kind) {
    case 'base': {
      arity(raw, args, 1, 2)
      const p = product(raw, args[0])
      return { kind, product: p, subType: args[1] === undefined ? undefined : subType(raw, p, args[1]) }
    }
    case 'area': {
      arity(raw, args, 2, 2)
      const p = product(raw, args[0])
      return { kind, product: p, area: area(raw, p, args[1]) }
    }
    case 'from':
      arity(raw, args, 1, 1)
      return { kind, product: product(raw, args[0]) }
    case 'unit': {
      arity(raw, args, 2, 3)
      const p = product(raw, args[0])
      const sub = args.length === 3 ? subType(raw, p, args[1]) : undefined
      const areas = args[args.length - 1].split(',').map((a) => area(raw, p, a))
      return { kind, product: p, subType: sub, areas }
    }
    case 'size':
      arity(raw, args, 1, 1)
      if (!STANDARD_SIZES.some((s) => s.id === args[0])) fail(raw, `unknown size "${args[0]}"`)
      return { kind, size: args[0] }
    case 'shipping':
    case 'discountMin':
    case 'discountPct':
      arity(raw, args, 0, 0)
      return { kind }
    default:
      return fail(raw, `unknown kind "${kind}"`)
  }
}

/** Cheapest base over the product's sub-types (products without sub-types: the single base). */
function minBase(p: ProductType): number {
  const subs = SUB_TYPES[p]
  return subs ? Math.min(...subs.map((s) => getBasePrice(p, s.id))) : getBasePrice(p)
}

function areaPrice(p: ProductType, id: DesignAreaType): number {
  return getDesignAreasByProductType(p).find((a) => a.id === id)?.price ?? 0
}

/** Current value of a token from the (live) pricing store: '₪45' or a bare number. */
export function resolvePriceToken(raw: string): string {
  const t = parsePriceToken(raw)
  switch (t.kind) {
    case 'base':
      return `₪${t.subType ? getBasePrice(t.product, t.subType) : minBase(t.product)}`
    case 'area':
      return `₪${areaPrice(t.product, t.area)}`
    case 'from':
      return `₪${minBase(t.product) + Math.min(...getDesignAreasByProductType(t.product).map((a) => a.price))}`
    case 'unit':
      return `₪${(t.subType ? getBasePrice(t.product, t.subType) : minBase(t.product)) + t.areas.reduce((sum, a) => sum + areaPrice(t.product, a), 0)}`
    case 'size':
      return `₪${getSizeSurcharge(t.size)}`
    case 'shipping':
      return `₪${getLiveShippingCost('delivery')}`
    case 'discountMin':
      return String(getLiveQuantityDiscount().minQuantity)
    case 'discountPct':
      return String(getLiveQuantityDiscount().discountPercent)
  }
}

/** Number-free placeholder shown until the live prices load (SSR HTML, no-JS crawlers). */
export function priceTokenPlaceholder(raw: string): string {
  return raw.startsWith('discount') ? '…' : '₪…'
}

export function hasPriceToken(text: string): boolean {
  return text.includes('{{')
}

/** Splits copy into plain text and token parts (token parts carry the raw token body). */
export function splitPriceText(text: string): ({ text: string } | { token: string })[] {
  const parts: ({ text: string } | { token: string })[] = []
  let last = 0
  for (const m of Array.from(text.matchAll(TOKEN_RE))) {
    if (m.index! > last) parts.push({ text: text.slice(last, m.index) })
    parts.push({ token: m[1] })
    last = m.index! + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

/** Validates every token in a string (throws on the first invalid one). */
export function validatePriceText(text: string): void {
  for (const m of Array.from(text.matchAll(TOKEN_RE))) parsePriceToken(m[1])
  if (text.replace(TOKEN_RE, '').includes('{{')) throw new Error(`[seo price token] malformed token in: ${text}`)
}

/** Shape validateSeoPage needs (structural — avoids a lib/seo-pages import cycle). */
interface TokenCheckedPage {
  slug: string
  heroText: string
  benefits: { text: string }[]
  paragraphs: { text: string }[]
  faq: { a: string; aLive?: string }[]
  steps?: { title: string }[]
  checklist?: string[]
  priceExamples?: { label: string; productType: ProductType; fabric?: string; areas: string[]; quantity?: number; size?: string }[]
}

/**
 * Build-time contract check (called from app/[slug]/page.tsx generateStaticParams):
 *  - tokens only in heroText, benefits[].text, paragraphs[].text, faq[].aLive
 *    (the fields DefaultLayout runs through <PriceText>), and only on pages
 *    rendered by DefaultLayout;
 *  - every token and every priceExamples scenario must resolve;
 *  - nothing else may contain "{{" — metadata and faq[].a (FAQ JSON-LD) stay number-free.
 */
export function validateSeoPage(page: TokenCheckedPage, usesDefaultLayout: boolean): void {
  const tokenFields = [
    page.heroText,
    ...page.benefits.map((b) => b.text),
    ...page.paragraphs.map((p) => p.text),
    ...page.faq.map((f) => f.aLive ?? ''),
  ]
  const where = `SEO page "${page.slug}"`
  if (!usesDefaultLayout && (tokenFields.some(hasPriceToken) || page.faq.some((f) => f.aLive))) {
    throw new Error(`${where}: price tokens / faq aLive are rendered by DefaultLayout only`)
  }
  tokenFields.forEach(validatePriceText)

  const rest = JSON.stringify({
    ...page,
    heroText: '',
    benefits: page.benefits.map((b) => ({ ...b, text: '' })),
    paragraphs: page.paragraphs.map((p) => ({ ...p, text: '' })),
    faq: page.faq.map((f) => ({ ...f, aLive: '' })),
  })
  if (rest.includes('{{')) {
    throw new Error(`${where}: "{{" outside the token fields (metadata, faq[].a, titles, … must be number-free)`)
  }

  const unique = (what: string, values: string[] | undefined) => {
    const dup = values?.find((v, i) => values.indexOf(v) !== i)
    if (dup !== undefined) throw new Error(`${where}: duplicate ${what} "${dup}" (used as React key)`)
  }
  unique('steps title', page.steps?.map((st) => st.title))
  unique('priceExamples label', page.priceExamples?.map((ex) => ex.label))
  unique('checklist item', page.checklist)

  for (const ex of page.priceExamples ?? []) {
    const bad = (why: string) => new Error(`${where}: priceExamples "${ex.label}" ${why}`)
    // Without a sub-type getBasePrice picks the first key of the admin doc — an arbitrary price
    if (SUB_TYPES[ex.productType] && ex.fabric === undefined) throw bad(`needs fabric (a ${ex.productType} sub-type)`)
    const qty = ex.quantity ?? 1
    if (ex.productType === 'cap' && qty < CAP_MIN_QUANTITY) throw bad(`quantity below CAP_MIN_QUANTITY (${CAP_MIN_QUANTITY})`)
    if (ex.productType === 'buff' && !BUFF_QUANTITIES.some((q) => q.value === qty)) throw bad('quantity must be a BUFF_QUANTITIES pack size')
    parsePriceToken(`unit:${ex.productType}:${ex.areas.join(',')}`)
    if (ex.fabric !== undefined) parsePriceToken(`base:${ex.productType}:${ex.fabric}`)
    if (ex.size !== undefined) {
      parsePriceToken(`size:${ex.size}`)
      // Mirrors the designers: only t-shirts/sweatshirts take STANDARD_SIZES (the only sizes
      // with surcharges); oversized has no XS/3XL/4XL, dri-fit no 4XL (SizeQuantityStep)
      const offered =
        (ex.productType === 'tshirt' || ex.productType === 'sweatshirt') &&
        !(ex.fabric === 'oversized' && ['XS', '3XL', '4XL'].includes(ex.size)) &&
        !(ex.fabric === 'dri-fit' && ex.size === '4XL')
      if (!offered) throw bad(`size "${ex.size}" is not offered for ${ex.productType}${ex.fabric ? `/${ex.fabric}` : ''}`)
    }
  }
}
