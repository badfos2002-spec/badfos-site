// "לכל אירוע יש חולצה" — compact internal-links strip to the 7 SEO landing pages.
// Server component, deliberately light: one heading + a row of link chips in the
// homepage cream/amber design language. Placed between HowItWorks and the contact form.

import Link from 'next/link'

const EVENT_LINKS: { slug: string; label: string; emoji: string }[] = [
  { slug: 'חולצות-למסיבת-רווקות', label: 'מסיבת רווקות', emoji: '👰' },
  { slug: 'חולצות-ליום-הולדת', label: 'יום הולדת', emoji: '🎂' },
  { slug: 'חולצות-משפחתיות', label: 'אירוע משפחתי', emoji: '👨‍👩‍👧' },
  { slug: 'חולצות-לחיילים', label: 'חיילים ויחידות', emoji: '🎖️' },
  { slug: 'חולצות-לסוף-שנה', label: 'סוף שנה ומחזור', emoji: '🎓' },
  { slug: 'הדפסת-חולצות-לעסקים', label: 'עסקים וצוותים', emoji: '💼' },
  { slug: 'הדפסת-חולצות-בראשון-לציון', label: 'ראשון לציון', emoji: '📍' },
]

export default function EventLinksSection() {
  return (
    <section
      className="relative overflow-hidden border-y border-amber-100/60 bg-gradient-to-br from-[#fffaf0] via-white to-[#fff6e6] py-14"
      dir="rtl"
    >
      <div
        className="pointer-events-none absolute -top-16 right-8 h-48 w-48 rounded-full bg-[#ffc32e]/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-8 h-56 w-56 rounded-full bg-[#f59e0b]/10 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl px-4 text-center md:px-8">
        <h2 className="text-3xl font-black tracking-tight text-[#1e293b] md:text-4xl">
          לכל אירוע יש <span className="text-[#f59e0b]">חולצה</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-gray-600 md:text-lg">
          רווקות, שחרור מהצבא או הצוות במשרד — בחרו את האירוע שלכם וקבלו את כל המידע וההשראה.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {EVENT_LINKS.map((event) => (
            <Link
              key={event.slug}
              href={`/${event.slug}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-yellow-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ffc32e] hover:bg-yellow-50 hover:text-gray-900 hover:shadow-md md:text-base"
            >
              <span aria-hidden>{event.emoji}</span>
              {event.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
