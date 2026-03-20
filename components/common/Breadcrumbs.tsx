import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="ניווט" className="mb-4">
      <ol className="flex items-center gap-1 text-sm text-gray-500 flex-wrap" dir="rtl">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronLeft className="w-3.5 h-3.5 flex-shrink-0" />}
            {item.href ? (
              <Link href={item.href} className="hover:text-[#f59e0b] transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: items.map((item, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: item.label,
              ...(item.href && { item: `https://badfos.co.il${item.href}` }),
            })),
          }),
        }}
      />
    </nav>
  )
}
