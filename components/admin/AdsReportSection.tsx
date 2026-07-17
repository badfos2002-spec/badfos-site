'use client'

import { BarChart3, Save, Loader2 } from 'lucide-react'

export interface AdsMonthRow {
  key: string // 'YYYY-MM'
  label: string // 'יולי 2026'
  adsCount: number // paid orders with gclid in this month
  adsRevenue: number // sum of paymentSum ?? total for those orders
  totalPaidCount: number // all paid orders in this month (comparison)
  totalPaidRevenue: number
  spendInput: string // editable draft of the monthly Google Ads spend
}

/**
 * ROAS + estimated gross profit from the ads revenue and the manually
 * entered monthly spend. Empty / zero / invalid spend → no calculation.
 */
export function computeRoasProfit(
  adsRevenue: number,
  spendInput: string
): { spend: number | null; roas: number | null; profit: number | null } {
  const raw = spendInput.trim()
  const num = raw === '' ? NaN : Number(raw)
  if (isNaN(num) || num <= 0) return { spend: null, roas: null, profit: null }
  return { spend: num, roas: adsRevenue / num, profit: adsRevenue - num }
}

const money = (v: number) => `₪${Math.round(v).toLocaleString('he-IL')}`

interface AdsReportSectionProps {
  months: AdsMonthRow[] // current month first
  onSpendChange: (key: string, value: string) => void
  onSave: () => void
  saving: boolean
  saved: boolean
  dirty: boolean
}

export function AdsReportSection({ months, onSpendChange, onSave, saving, saved, dirty }: AdsReportSectionProps) {
  const current = months[0]
  const currentCalc = current ? computeRoasProfit(current.adsRevenue, current.spendInput) : null

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">רווחיות גוגל אדס</h2>
            <p className="text-sm text-gray-600">הזמנות ששולמו והגיעו מקליק על מודעה</p>
          </div>
        </div>
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className="flex items-center justify-center gap-2 h-11 min-h-[44px] px-5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? 'נשמר!' : 'שמור הוצאות'}
        </button>
      </div>

      {current && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">הזמנות מהמודעות החודש</p>
            <p className="text-2xl font-bold text-gray-900">{current.adsCount}</p>
            <p className="text-xs text-gray-500 mt-1">מתוך {current.totalPaidCount} הזמנות ששולמו</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">הכנסה מהמודעות החודש</p>
            <p className="text-2xl font-bold text-gray-900">{money(current.adsRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">מתוך {money(current.totalPaidRevenue)} בסך הכל</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">ROAS החודש</p>
            {currentCalc?.roas != null ? (
              <p className={`text-2xl font-bold ${currentCalc.roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                x{currentCalc.roas.toFixed(1)}
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-400">—</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {currentCalc?.roas != null ? 'הכנסה חלקי הוצאה' : 'הזן הוצאה חודשית כדי לחשב'}
            </p>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-right text-gray-600">
              <th className="py-3 px-2 font-medium">חודש</th>
              <th className="py-3 px-2 font-medium">הזמנות מגוגל</th>
              <th className="py-3 px-2 font-medium">הכנסה מגוגל</th>
              <th className="py-3 px-2 font-medium">ממוצע להזמנה</th>
              <th className="py-3 px-2 font-medium">הוצאה בגוגל (₪)</th>
              <th className="py-3 px-2 font-medium">ROAS</th>
              <th className="py-3 px-2 font-medium">רווח גולמי</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => {
              const { roas, profit } = computeRoasProfit(m.adsRevenue, m.spendInput)
              return (
                <tr key={m.key} className="border-b border-gray-100">
                  <td className="py-3 px-2 font-bold text-gray-900 whitespace-nowrap">{m.label}</td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    <span className="font-bold text-gray-900">{m.adsCount}</span>{' '}
                    <span className="text-xs text-gray-500">מתוך {m.totalPaidCount}</span>
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    <span className="font-bold text-gray-900">{money(m.adsRevenue)}</span>{' '}
                    <span className="text-xs text-gray-500">מתוך {money(m.totalPaidRevenue)}</span>
                  </td>
                  <td className="py-3 px-2 text-gray-700 whitespace-nowrap">
                    {m.adsCount > 0 ? money(m.adsRevenue / m.adsCount) : '—'}
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      placeholder="0"
                      value={m.spendInput}
                      onChange={(e) => onSpendChange(m.key, e.target.value)}
                      aria-label={`הוצאה בגוגל ${m.label}`}
                      className="w-28 h-11 min-h-[44px] px-3 border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    {roas != null ? (
                      <span className={`font-bold ${roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>x{roas.toFixed(1)}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    {profit != null ? (
                      <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(profit)}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {months.map((m) => {
          const { roas, profit } = computeRoasProfit(m.adsRevenue, m.spendInput)
          return (
            <div key={m.key} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-900">{m.label}</span>
                {roas != null && (
                  <span className={`font-bold ${roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>ROAS x{roas.toFixed(1)}</span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">הזמנות מגוגל</span>
                  <span className="font-bold text-gray-900">
                    {m.adsCount} <span className="font-normal text-xs text-gray-500">מתוך {m.totalPaidCount}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">הכנסה מגוגל</span>
                  <span className="font-bold text-gray-900">
                    {money(m.adsRevenue)} <span className="font-normal text-xs text-gray-500">מתוך {money(m.totalPaidRevenue)}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">ממוצע להזמנה</span>
                  <span className="text-gray-900">{m.adsCount > 0 ? money(m.adsRevenue / m.adsCount) : '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">הוצאה בגוגל (₪)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    placeholder="0"
                    value={m.spendInput}
                    onChange={(e) => onSpendChange(m.key, e.target.value)}
                    aria-label={`הוצאה בגוגל ${m.label}`}
                    className="w-24 h-11 min-h-[44px] px-3 border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                {profit != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">רווח גולמי</span>
                    <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(profit)}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-500 mt-4 leading-relaxed">
        נספרות רק הזמנות ששולמו והגיעו עם מזהה קליק של גוגל (GCLID). לקוח שלחץ על מודעה אבל השלים את ההזמנה מאוחר
        יותר ממכשיר אחר או בלי המזהה — לא ייוחס לגוגל אדס, ולכן המספרים כאן הם רצפת מינימום. הזמנות ישנות שנוצרו
        לפני הוספת המעקב עשויות להופיע ללא ייחוס.
      </p>
    </div>
  )
}
