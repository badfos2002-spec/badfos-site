// Per-slug SEO layout registry. app/[slug]/page.tsx resolves:
//   const Layout = LAYOUTS[page.slug] ?? DefaultLayout
// Pages without an entry keep the original uniform layout (DefaultLayout).

import type { ComponentType } from 'react'
import DefaultLayout from './DefaultLayout'
import BacheloretteLayout from './BacheloretteLayout'
import BusinessLayout from './BusinessLayout'
import BirthdayLayout from './BirthdayLayout'
import FamilyLayout from './FamilyLayout'
import EndOfYearLayout from './EndOfYearLayout'
import RishonLayout from './RishonLayout'
import type { SeoLayoutProps } from './types'

export type { SeoLayoutProps } from './types'
export { DefaultLayout }

export const LAYOUTS: Record<string, ComponentType<SeoLayoutProps>> = {
  'חולצות-למסיבת-רווקות': BacheloretteLayout,
  'הדפסת-חולצות-לעסקים': BusinessLayout,
  'חולצות-ליום-הולדת': BirthdayLayout,
  'חולצות-משפחתיות': FamilyLayout,
  'חולצות-לסוף-שנה': EndOfYearLayout,
  'הדפסת-חולצות-בראשון-לציון': RishonLayout,
}
