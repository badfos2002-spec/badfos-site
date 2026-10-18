'use client'

import { Trash2 } from 'lucide-react'
import { getColorLabel } from '@/lib/constants'
import { productTypeLabel, sizeLabel, type DailySummary, type VoiceItem } from '@/lib/daily-orders'

export interface SavedVoiceOrder {
  id: string
  items: VoiceItem[]
  transcript: string
  createdAt: number
}

const timeFmt = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })

export default function DailySummaryView({
  summary,
  voiceOrders,
  onDelete,
}: {
  summary: DailySummary
  voiceOrders: SavedVoiceOrder[]
  onDelete: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      {/* סה"כ */}
      <div className="bg-gray-900 text-white rounded-2xl p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-base sm:text-lg font-bold">סה״כ פריטים</span>
          <span className="text-3xl font-bold tabular-nums">{summary.total}</span>
        </div>
        <p className="text-sm text-gray-300 mt-1">
          אתר {summary.site} ({summary.siteOrders} הזמנות ששולמו) · קולי {summary.voice} ({summary.voiceOrders} הזמנות)
        </p>
      </div>

      {/* קבוצות */}
      {summary.groups.length === 0 ? (
        <p className="text-gray-500 text-center py-6 bg-white rounded-2xl border border-gray-200">אין הזמנות ביום הזה</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {summary.groups.map(g => (
            <div key={g.key} className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-bold text-gray-900 min-w-0">{g.label}</h3>
                <span className="font-bold text-gray-900 whitespace-nowrap tabular-nums">סה״כ {g.total}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 text-gray-800">
                {g.sizes.map(s => (
                  <span key={s.size} dir={/[\u0590-\u05FF]/.test(s.label) ? 'rtl' : 'ltr'} className="bg-gray-100 rounded-md px-2 py-0.5 tabular-nums whitespace-nowrap">
                    <bdi className="font-semibold me-1.5">{s.label}</bdi><bdi dir="ltr">×{s.quantity}</bdi>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {[g.site ? `אתר ${g.site}` : '', g.voice ? `קולי ${g.voice}` : ''].filter(Boolean).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* הזמנות קוליות שנשמרו ליום */}
      <div>
        <h2 className="font-bold text-gray-900 mb-2">הזמנות קוליות שנשמרו ({voiceOrders.length})</h2>
        {voiceOrders.length === 0 ? (
          <p className="text-sm text-gray-500">אין הזמנות קוליות ביום הזה</p>
        ) : (
          <ul className="space-y-2">
            {voiceOrders.map(vo => (
              <li key={vo.id} className="bg-white rounded-xl border border-gray-200 p-3 flex gap-3 items-start">
                <div className="flex-1 min-w-0 text-sm">
                  <div className="text-xs text-gray-500 mb-1">{vo.createdAt ? timeFmt.format(new Date(vo.createdAt)) : ''}</div>
                  <ul className="space-y-0.5">
                    {vo.items.map((it, i) => (
                      <li key={i}>
                        {productTypeLabel(it.productType, it.fabricType)} · {getColorLabel(it.color, it.productType)} · {sizeLabel(it.size)} ×{it.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(vo.id)}
                  className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                  aria-label="מחיקת הזמנה קולית"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
