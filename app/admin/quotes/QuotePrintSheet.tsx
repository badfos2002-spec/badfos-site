'use client'

import Image from 'next/image'

export interface QuotePrintData {
  quoteNumber: number | null
  quoteDate: Date
  validUntil: Date
  customerName: string
  contactPerson?: string
  phone?: string
  email?: string
  items: { description: string; quantity: number; unitPrice: number }[]
  subtotal: number
  discountLabel: string // '' when no discount
  discountAmount: number
  shippingPrice: number
  total: number
  businessNumber?: string
  notes?: string
}

function fmt(n: number): string {
  return `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 2 })}`
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('he-IL')
}

/**
 * Print-friendly quote sheet (A4, Hebrew RTL).
 * Rendered on screen inside the preview overlay; isolated for printing
 * via the #quote-print-sheet @media print rules in the quotes page.
 */
export default function QuotePrintSheet({ quote }: { quote: QuotePrintData }) {
  return (
    <div
      id="quote-print-sheet"
      dir="rtl"
      className="bg-white text-gray-900 w-full max-w-[794px] mx-auto shadow-2xl print:shadow-none"
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
    >
      {/* Brand top bar */}
      <div className="h-3 bg-amber-500" />

      <div className="px-10 py-8">
        {/* Header: logo + business identity | quote title */}
        <div className="flex items-start justify-between gap-6 pb-6 border-b-2 border-amber-500">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="בדפוס" width={72} height={72} className="w-[72px] h-[72px]" />
            <div>
              <div className="text-3xl font-extrabold text-gray-900 leading-tight">בדפוס</div>
              <div className="text-sm font-medium text-amber-600">הדפסת חולצות ומוצרי טקסטיל</div>
              <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                דובנוב 10, ראשון לציון · 055-9885954
                <br />
                badfos2002@gmail.com · badfos.co.il
                <br />
                {quote.businessNumber?.trim()
                  ? `עוסק פטור מס׳ ${quote.businessNumber.trim()}`
                  : 'עוסק פטור'}
              </div>
            </div>
          </div>
          <div className="text-left shrink-0">
            <div className="inline-block bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-right">
              <div className="text-xl font-extrabold text-gray-900">הצעת מחיר</div>
              <div className="text-lg font-bold text-amber-600" dir="ltr">
                {quote.quoteNumber ? `Q-${quote.quoteNumber}` : '—'}
              </div>
              <div className="text-xs text-gray-600 mt-1">תאריך: {fmtDate(quote.quoteDate)}</div>
              <div className="text-xs text-gray-600">בתוקף עד: {fmtDate(quote.validUntil)}</div>
            </div>
          </div>
        </div>

        {/* Customer block */}
        <div className="mt-6 mb-6">
          <div className="text-xs font-bold text-amber-600 mb-1">לכבוד</div>
          <div className="text-lg font-bold text-gray-900">{quote.customerName}</div>
          <div className="text-sm text-gray-600 leading-relaxed">
            {quote.contactPerson ? <span>איש קשר: {quote.contactPerson}</span> : null}
            {quote.contactPerson && (quote.phone || quote.email) ? ' · ' : ''}
            {quote.phone ? <span dir="ltr">{quote.phone}</span> : null}
            {quote.phone && quote.email ? ' · ' : ''}
            {quote.email ? <span dir="ltr">{quote.email}</span> : null}
          </div>
        </div>

        {/* Items table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-amber-500 text-white">
              <th className="py-2.5 px-3 text-right font-bold rounded-tr-lg w-10">#</th>
              <th className="py-2.5 px-3 text-right font-bold">תיאור</th>
              <th className="py-2.5 px-3 text-center font-bold w-20">כמות</th>
              <th className="py-2.5 px-3 text-center font-bold w-28">מחיר ליחידה</th>
              <th className="py-2.5 px-3 text-center font-bold rounded-tl-lg w-28">סה&quot;כ</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, i) => (
              <tr key={i} className={i % 2 === 1 ? 'bg-amber-50/60' : 'bg-white'}>
                <td className="py-2.5 px-3 border-b border-gray-100 text-gray-500">{i + 1}</td>
                <td className="py-2.5 px-3 border-b border-gray-100 font-medium text-gray-900 whitespace-pre-wrap">
                  {item.description}
                </td>
                <td className="py-2.5 px-3 border-b border-gray-100 text-center">{item.quantity}</td>
                <td className="py-2.5 px-3 border-b border-gray-100 text-center">{fmt(item.unitPrice)}</td>
                <td className="py-2.5 px-3 border-b border-gray-100 text-center font-bold">
                  {fmt(item.quantity * item.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mt-5">
          <div className="w-72">
            <div className="flex justify-between py-1.5 text-sm text-gray-700">
              <span>סכום ביניים</span>
              <span>{fmt(quote.subtotal)}</span>
            </div>
            {quote.discountAmount > 0 ? (
              <div className="flex justify-between py-1.5 text-sm text-green-700">
                <span>{quote.discountLabel}</span>
                <span>-{fmt(quote.discountAmount)}</span>
              </div>
            ) : null}
            {quote.shippingPrice > 0 ? (
              <div className="flex justify-between py-1.5 text-sm text-gray-700">
                <span>משלוח</span>
                <span>{fmt(quote.shippingPrice)}</span>
              </div>
            ) : null}
            <div className="flex justify-between items-center mt-2 bg-amber-500 text-white rounded-lg px-4 py-2.5">
              <span className="font-bold">סה&quot;כ לתשלום</span>
              <span className="text-lg font-extrabold">{fmt(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes?.trim() ? (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <div className="text-xs font-bold text-gray-700 mb-1">הערות</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{quote.notes}</div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center">
          <div className="text-sm font-medium text-gray-700">
            ההצעה בתוקף עד {fmtDate(quote.validUntil)} · תודה שבחרתם בבדפוס! 🙏
          </div>
          <div className="text-xs text-gray-400 mt-1">
            בדפוס · דובנוב 10, ראשון לציון · 055-9885954 · badfos.co.il
          </div>
        </div>
      </div>

      {/* Brand bottom bar */}
      <div className="h-2 bg-amber-500" />
    </div>
  )
}
