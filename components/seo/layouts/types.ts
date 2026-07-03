import type { SeoPage } from '@/lib/seo-pages'

/** Props every per-slug SEO layout receives from the app/[slug]/page.tsx dispatcher */
export interface SeoLayoutProps {
  page: SeoPage
  waUrl: string
}
