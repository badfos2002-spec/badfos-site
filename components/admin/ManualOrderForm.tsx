'use client'

/**
 * טופס "הזמנה ידנית חדשה" — מכירה שהשותף סגר מחוץ לאתר. נפתח מ-/admin/orders.
 * כל הבחירות (סוג/צבע/מידה/אזור) מגיעות מ-lib/manual-order.ts — אותם כללים
 * כמו במעצבים, ואותה ולידציה שהשרת מריץ לפני הכתיבה.
 *
 * עיצובים: הקובץ עולה ל-Storage ברגע הבחירה (כמו בכל המעצבים) ונשמר רק ה-URL
 * (https). אף פעם לא blob:/data: — ראו design-file-persistence.
 */
import { useState } from 'react'
import { Loader2, Plus, Minus, Trash2, X, ChevronDown } from 'lucide-react'
import {
  MANUAL_PAYMENT_METHODS,
  PRODUCT_OPTIONS,
  typeOptions,
  colorOptions,
  sizeOptions,
  areaOptions,
  validateManualOrder,
  MAX_QUANTITY,
  OTHER_PRODUCT,
  OTHER_PRODUCT_OPTION,
  OTHER_NAME_MAX,
  OTHER_DETAILS_MAX,
  OTHER_SIZE_MAX,
  type ManualOrderInput,
} from '@/lib/manual-order'
import { uploadDesignFile, generateUniqueFileName } from '@/lib/storage'
import { preparePrintFile, printUploadErrorMessage } from '@/lib/print-image'
import { adminFetch } from '@/lib/admin-fetch'
import { STANDARD_SIZES, KIDS_SIZES } from '@/lib/constants'
import SketchLinkButton from '@/components/admin/SketchLinkButton'

interface Row {
  key: number
  productType: string
  fabricType: string
  color: string
  qty: Record<string, string>
  designs: Record<string, { imageUrl: string; fileName: string }>
  showDesigns: boolean
  /** מידות ילדים פתוחות; undefined = פתוח רק אם כבר יש בהן כמות */
  showKids?: boolean
  /** מוצר "אחר" (OTHER_PRODUCT) בלבד */
  otherName: string
  otherDetails: string
  otherSize: string
  otherQty: string
}

const emptyRow = (key: number): Row => ({
  key, productType: '', fabricType: '', color: '', qty: {}, designs: {}, showDesigns: false,
  otherName: '', otherDetails: '', otherSize: '', otherQty: '',
})

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-400'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

const STANDARD_IDS = new Set<string>(STANDARD_SIZES.map(s => s.id))
const KIDS_IDS = new Set<string>(KIDS_SIZES.map(s => s.id))
/** כמות כמספר שלם חיובי לתצוגה/סטפר; כל ערך לא תקין = 0 (הוולידציה עצמה לא השתנתה). */
const qtyNum = (q: string | undefined) => {
  const n = Number(q)
  return Number.isInteger(n) && n > 0 ? n : 0
}

/** שורה אחרי שינוי מוצר/סוג/צבע: מנקה כל בחירה שכבר לא חוקית. */
function prune(row: Row): Row {
  const types = typeOptions(row.productType)
  const fabricType = types.some(t => t.id === row.fabricType) ? row.fabricType : ''
  const colors = colorOptions(row.productType, fabricType)
  const color = colors.some(c => c.id === row.color) ? row.color : ''
  const sizes = new Set(sizeOptions(row.productType, fabricType, color).map(s => s.id))
  const areas = new Set(areaOptions(row.productType, fabricType).map(a => a.id))
  return {
    ...row,
    fabricType,
    color,
    qty: Object.fromEntries(Object.entries(row.qty).filter(([s]) => sizes.has(s))),
    designs: Object.fromEntries(Object.entries(row.designs).filter(([a]) => areas.has(a))),
  }
}

export default function ManualOrderForm({ onClose, onCreated }: { onClose: () => void; onCreated: (orderNumber: number) => void }) {
  const [sessionId] = useState(() => `manual-${Date.now()}`)
  // מפתח אידמפוטנטיות — אחד לכל פתיחת טופס; השרת משתמש בו כמזהה המסמך
  const [requestId] = useState(() => crypto.randomUUID())
  const [moreAddress, setMoreAddress] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [method, setMethod] = useState<'' | 'delivery' | 'pickup'>('')
  const [express, setExpress] = useState(false)
  const [address, setAddress] = useState({ street: '', number: '', city: '', apartment: '', floor: '', entrance: '' })
  const [additionalPhone, setAdditionalPhone] = useState('')
  const [rows, setRows] = useState<Row[]>([emptyRow(1)])
  const [total, setTotal] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isDirty = () =>
    !!(firstName || lastName || phone || email || notes || method || express || total || paymentMethod ||
      Object.values(address).some(Boolean) || additionalPhone ||
      rows.some(r => r.productType || Object.keys(r.designs).length || Object.values(r.qty).some(q => q.trim()) ||
        r.otherName || r.otherDetails || r.otherSize || r.otherQty))

  const requestClose = () => {
    if (saving) return
    if (isDirty() && !confirm('לצאת בלי לשמור?')) return
    onClose()
  }

  /** מציג את השגיאה וגולל לחלק הרלוונטי בטופס. */
  const showError = (message: string) => {
    setError(message)
    const row = /^שורה (\d+)/.exec(message)
    const id = row ? `mo-row-${row[1]}`
      : /סכום|תשלום/.test(message) ? 'mo-sec-payment'
      : /משלוח|רחוב|שליח/.test(message) ? 'mo-sec-shipping'
      : /שם|טלפון|אימייל/.test(message) ? 'mo-sec-customer'
      : /שורת מוצר|שורות/.test(message) ? 'mo-sec-items'
      : ''
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => (r.key === key ? prune({ ...r, ...patch }) : r)))

  const handleFile = async (row: Row, area: string, file: File | undefined) => {
    if (!file) return
    setUploading(`${row.key}_${area}`)
    setError('')
    try {
      const ready = await preparePrintFile(file)
      const ext = ready.type === 'image/jpeg' ? 'jpg' : ready.type === 'image/webp' ? 'webp' : 'png'
      const imageUrl = await uploadDesignFile(ready, sessionId, generateUniqueFileName(`design.${ext}`))
      setRows(prev => prev.map(r => (r.key === row.key ? { ...r, designs: { ...r.designs, [area]: { imageUrl, fileName: ready.name } } } : r)))
    } catch (err) {
      console.error('Manual order design upload failed:', err)
      setError(printUploadErrorMessage(err))
    } finally {
      setUploading(null)
    }
  }

  const buildPayload = (): ManualOrderInput => ({
    customer: { firstName, lastName, phone, email, notes },
    shipping: method === 'delivery' ? { method, address, additionalPhone, express } : { method: method as 'pickup', express },
    items: rows.map(r => r.productType === OTHER_PRODUCT ? {
      productType: r.productType,
      specialProductName: r.otherName,
      color: r.otherDetails,
      sizes: [{ size: r.otherSize, quantity: r.otherQty.trim() === '' ? NaN : Number(r.otherQty) }],
      designs: Object.entries(r.designs).map(([area, d]) => ({ area, ...d })),
    } : {
      productType: r.productType,
      fabricType: r.fabricType,
      color: r.color,
      sizes: Object.entries(r.qty)
        .filter(([, q]) => q.trim() !== '')
        .map(([size, q]) => ({ size, quantity: Number(q) })),
      designs: Object.entries(r.designs).map(([area, d]) => ({ area, ...d })),
    }),
    total: total.trim() === '' ? NaN : Number(total),
    paymentMethod,
  })

  const submit = async () => {
    if (saving || uploading) return
    setError('')
    const payload = buildPayload()
    const check = validateManualOrder(payload, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
    if (!check.ok) {
      showError(check.error)
      return
    }
    setSaving(true)
    try {
      const res = await adminFetch('/api/admin/manual-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data?.message || (res.status === 401 || res.status === 403 ? 'נדרשת התחברות מחדש' : 'השמירה נכשלה, נסו שוב'))
        return
      }
      onCreated(data.orderNumber)
    } catch (e) {
      setError(e instanceof Error && e.message === 'not_signed_in' ? 'נדרשת התחברות מחדש' : 'השמירה נכשלה, נסו שוב')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-center bg-black/50 sm:p-4" dir="rtl">
      <div className="flex w-full max-w-2xl flex-col bg-gray-50 sm:max-h-[92vh] sm:rounded-2xl shadow-xl">
        <div className="flex items-center justify-between border-b bg-white px-4 py-3 sm:rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">הזמנה ידנית חדשה</h2>
          <button type="button" onClick={requestClose} aria-label="סגירה" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {/* לקוח */}
          <section id="mo-sec-customer" className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900">פרטי לקוח</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="mo-first">שם פרטי *</label>
                <input id="mo-first" className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls} htmlFor="mo-last">שם משפחה *</label>
                <input id="mo-last" className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="mo-phone">טלפון *</label>
                <input id="mo-phone" type="tel" inputMode="tel" dir="ltr" placeholder="05XXXXXXXX" className={`${inputCls} text-right`} value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div>
                <label className={labelCls} htmlFor="mo-email">אימייל (לא חובה)</label>
                <input id="mo-email" type="email" inputMode="email" dir="ltr" className={`${inputCls} text-right`} value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
          </section>

          {/* משלוח */}
          <section id="mo-sec-shipping" className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900">משלוח *</h3>
            <div className="grid grid-cols-2 gap-2">
              {([['delivery', 'משלוח'], ['pickup', 'איסוף עצמי']] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMethod(id)}
                  className={`min-h-[44px] rounded-lg border-2 text-base font-semibold ${method === id ? 'border-yellow-500 bg-yellow-50 text-yellow-900' : 'border-gray-200 bg-white text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {method && (
              <button
                type="button"
                role="switch"
                aria-checked={express}
                onClick={() => setExpress(v => !v)}
                className={`flex min-h-[44px] w-full items-center justify-between rounded-lg border-2 px-3 text-base font-semibold ${express ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-700'}`}
              >
                <span>אקספרס ⚡</span>
                <span className={`relative inline-block h-6 w-11 rounded-full transition-colors ${express ? 'bg-orange-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${express ? 'left-0.5' : 'left-[22px]'}`} />
                </span>
              </button>
            )}
            {method === 'delivery' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls} htmlFor="mo-street">רחוב *</label>
                  <input id="mo-street" className={inputCls} value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="mo-number">מספר בית *</label>
                  <input id="mo-number" className={inputCls} value={address.number} onChange={e => setAddress({ ...address, number: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="mo-city">עיר *</label>
                  <input id="mo-city" className={inputCls} value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} />
                </div>
                <button
                  type="button"
                  onClick={() => setMoreAddress(v => !v)}
                  className="col-span-2 flex items-center gap-1 justify-self-start text-sm font-medium text-blue-700"
                  aria-expanded={moreAddress}
                >
                  פרטים נוספים (דירה, קומה, כניסה, טלפון לשליח)
                  <ChevronDown className={`h-4 w-4 transition-transform ${moreAddress ? 'rotate-180' : ''}`} />
                </button>
                {moreAddress && (<>
                <div>
                  <label className={labelCls} htmlFor="mo-apt">דירה</label>
                  <input id="mo-apt" className={inputCls} value={address.apartment} onChange={e => setAddress({ ...address, apartment: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="mo-floor">קומה</label>
                  <input id="mo-floor" className={inputCls} value={address.floor} onChange={e => setAddress({ ...address, floor: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="mo-entrance">כניסה</label>
                  <input id="mo-entrance" className={inputCls} value={address.entrance} onChange={e => setAddress({ ...address, entrance: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="mo-addphone">טלפון נוסף לשליח</label>
                  <input id="mo-addphone" type="tel" inputMode="tel" dir="ltr" className={`${inputCls} text-right`} value={additionalPhone} onChange={e => setAdditionalPhone(e.target.value)} />
                </div>
                </>)}
              </div>
            )}
          </section>

          {/* פריטים */}
          <section id="mo-sec-items" className="space-y-3">
            <h3 className="px-1 font-semibold text-gray-900">מוצרים</h3>
            {rows.map((row, idx) => {
              const isOther = row.productType === OTHER_PRODUCT
              const types = typeOptions(row.productType)
              const colors = row.productType && (!types.length || row.fabricType) ? colorOptions(row.productType, row.fabricType) : []
              const sizes = row.color ? sizeOptions(row.productType, row.fabricType, row.color) : []
              const areas = row.color || isOther ? areaOptions(row.productType, row.fabricType) : []
              const setOther = (patch: Partial<Row>) => setRows(prev => prev.map(r => (r.key === row.key ? { ...r, ...patch } : r)))
              return (
                <div key={row.key} id={`mo-row-${idx + 1}`} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-500">שורה {idx + 1}</span>
                    {rows.length > 1 && (
                      <button type="button" onClick={() => setRows(prev => prev.filter(r => r.key !== row.key))} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" /> הסרה
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelCls}>מוצר *</label>
                      <select className={inputCls} value={row.productType} onChange={e => updateRow(row.key, { productType: e.target.value })}>
                        <option value="">בחרו…</option>
                        {PRODUCT_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        <option value={OTHER_PRODUCT_OPTION.id}>{OTHER_PRODUCT_OPTION.name}</option>
                      </select>
                    </div>
                    {isOther && (<>
                      <div>
                        <label className={labelCls} htmlFor={`mo-other-name-${row.key}`}>שם המוצר *</label>
                        <input id={`mo-other-name-${row.key}`} className={inputCls} maxLength={OTHER_NAME_MAX} placeholder="למשל: כוס קרמיקה" value={row.otherName} onChange={e => setOther({ otherName: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor={`mo-other-details-${row.key}`}>צבע/פרטים</label>
                        <input id={`mo-other-details-${row.key}`} className={inputCls} maxLength={OTHER_DETAILS_MAX} value={row.otherDetails} onChange={e => setOther({ otherDetails: e.target.value })} />
                      </div>
                    </>)}
                    {types.length > 0 && (
                      <div>
                        <label className={labelCls}>סוג *</label>
                        <select className={inputCls} value={row.fabricType} onChange={e => updateRow(row.key, { fabricType: e.target.value })}>
                          <option value="">בחרו…</option>
                          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    )}
                    {colors.length > 0 && (
                      <div>
                        <label className={labelCls}>צבע *</label>
                        <select className={inputCls} value={row.color} onChange={e => updateRow(row.key, { color: e.target.value })}>
                          <option value="">בחרו…</option>
                          {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {isOther && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls} htmlFor={`mo-other-qty-${row.key}`}>כמות *</label>
                        <input id={`mo-other-qty-${row.key}`} type="number" inputMode="numeric" min={1} max={MAX_QUANTITY} dir="ltr" className={`${inputCls} text-right`} value={row.otherQty} onChange={e => setOther({ otherQty: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor={`mo-other-size-${row.key}`}>מידה (לא חובה)</label>
                        <input id={`mo-other-size-${row.key}`} className={inputCls} maxLength={OTHER_SIZE_MAX} value={row.otherSize} onChange={e => setOther({ otherSize: e.target.value })} />
                      </div>
                    </div>
                  )}

                  {!isOther && sizes.length > 0 && (() => {
                    const adult = sizes.filter(s => STANDARD_IDS.has(s.id))
                    const kids = sizes.filter(s => KIDS_IDS.has(s.id))
                    const other = sizes.filter(s => !STANDARD_IDS.has(s.id) && !KIDS_IDS.has(s.id))
                    const sumOf = (list: { id: string }[]) => list.reduce((n, s) => n + qtyNum(row.qty[s.id]), 0)
                    const kidsQty = sumOf(kids)
                    const kidsOpen = row.showKids ?? kids.some(s => (row.qty[s.id] ?? '').trim() !== '')
                    const totalQty = sumOf(sizes)
                    const setQty = (sizeId: string, value: string) =>
                      setRows(prev => prev.map(r => (r.key === row.key ? { ...r, qty: { ...r.qty, [sizeId]: value } } : r)))
                    const stepper = (s: { id: string; name: string }, label: string) => {
                      const raw = row.qty[s.id] ?? ''
                      const n = qtyNum(raw)
                      return (
                        <div key={s.id} className={`flex items-center justify-between gap-0.5 rounded-lg border p-1 ${n > 0 ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
                          <span className="min-w-0 pr-0.5 text-sm font-bold leading-tight text-gray-900">{label}</span>
                          <div className="flex shrink-0 items-center" dir="ltr">
                            <button
                              type="button"
                              aria-label={`הפחתה ${s.name}`}
                              disabled={n <= 0}
                              onClick={() => setQty(s.id, n - 1 > 0 ? String(n - 1) : '')}
                              className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 active:bg-gray-100 disabled:opacity-30"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={10000}
                              aria-label={`כמות ${s.name}`}
                              placeholder="0"
                              className="h-10 w-9 bg-transparent px-0 text-center text-base font-bold [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              value={raw}
                              onFocus={e => e.target.select()}
                              onChange={e => setQty(s.id, e.target.value)}
                            />
                            <button
                              type="button"
                              aria-label={`הוספה ${s.name}`}
                              disabled={n >= MAX_QUANTITY}
                              onClick={() => setQty(s.id, String(n + 1))}
                              className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 active:bg-gray-100 disabled:opacity-30"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    }
                    const gridCls = 'grid grid-cols-2 gap-1.5 sm:grid-cols-3'
                    return (
                      <div className="space-y-2">
                        <span className={labelCls}>כמות לפי מידה *</span>
                        {adult.length > 0 && (
                          <div>
                            <p className="mb-1 text-xs font-semibold text-gray-500">מבוגרים</p>
                            <div className={gridCls}>{adult.map(s => stepper(s, s.name))}</div>
                          </div>
                        )}
                        {other.length > 0 && (
                          <div className={other.length === 1 ? 'grid grid-cols-1' : 'grid grid-cols-1 gap-1.5 sm:grid-cols-2'}>
                            {other.map(s => stepper(s, s.name))}
                          </div>
                        )}
                        {kids.length > 0 && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setRows(prev => prev.map(r => (r.key === row.key ? { ...r, showKids: !kidsOpen } : r)))}
                              className="flex min-h-[40px] items-center gap-1 text-sm font-medium text-blue-700"
                              aria-expanded={kidsOpen}
                            >
                              מידות ילדים{kidsQty > 0 ? ` · ${kidsQty} יח׳` : ''}
                              <ChevronDown className={`h-4 w-4 transition-transform ${kidsOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {kidsOpen && (
                              <div>
                                <p className="mb-1 text-xs font-semibold text-gray-500">ילדים</p>
                                <div className={gridCls}>{kids.map(s => stepper(s, s.id))}</div>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-sm font-semibold text-gray-700">סה״כ: {totalQty} יח׳</p>
                      </div>
                    )
                  })()}

                  {areas.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setRows(prev => prev.map(r => (r.key === row.key ? { ...r, showDesigns: !r.showDesigns } : r)))}
                        className="flex items-center gap-1 text-sm font-medium text-blue-700"
                        aria-expanded={row.showDesigns}
                      >
                        הוספת עיצוב (לא חובה){Object.keys(row.designs).length > 0 ? ` · ${Object.keys(row.designs).length} הועלו` : ''}
                        <ChevronDown className={`h-4 w-4 transition-transform ${row.showDesigns ? 'rotate-180' : ''}`} />
                      </button>
                      {row.showDesigns && <div className="mt-2 space-y-2">
                        {areas.map(a => {
                          const d = row.designs[a.id]
                          const busy = uploading === `${row.key}_${a.id}`
                          return (
                            <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
                              <span className="text-sm font-medium text-gray-800">{a.name}</span>
                              {d ? (
                                <div className="flex items-center gap-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={d.imageUrl} alt={a.name} className="h-10 w-10 rounded object-cover ring-1 ring-gray-200" />
                                  <button
                                    type="button"
                                    onClick={() => setRows(prev => prev.map(r => {
                                      if (r.key !== row.key) return r
                                      const designs = { ...r.designs }
                                      delete designs[a.id]
                                      return { ...r, designs }
                                    }))}
                                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                    aria-label={`הסרת העיצוב ${a.name}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <label className={`inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-lg border border-blue-600 bg-white px-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                                  {busy ? 'מעלה…' : '+ עיצוב'}
                                  <input
                                    type="file"
                                    accept="image/png, image/jpeg"
                                    className="hidden"
                                    disabled={!!uploading}
                                    onChange={e => { handleFile(row, a.id, e.target.files?.[0]); e.target.value = '' }}
                                  />
                                </label>
                              )}
                            </div>
                          )
                        })}
                      </div>}
                    </div>
                  )}

                  {!isOther && Object.keys(row.designs).length > 0 && (
                    <SketchLinkButton
                      fullWidth
                      item={{
                        productType: row.productType,
                        fabricType: row.fabricType,
                        color: row.color,
                        designs: Object.entries(row.designs).map(([area, d]) => ({ area, imageUrl: d.imageUrl })),
                      }}
                      phone={phone}
                      label={`הזמנה ידנית · ${`${firstName} ${lastName}`.trim()}`}
                    />
                  )}
                </div>
              )
            })}
            <button
              type="button"
              onClick={() => setRows(prev => [...prev, emptyRow(Math.max(...prev.map(r => r.key)) + 1)])}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white text-base font-semibold text-gray-700 hover:border-yellow-500"
            >
              <Plus className="h-5 w-5" /> הוספת מוצר
            </button>
          </section>

          {/* תשלום */}
          <section id="mo-sec-payment" className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900">תשלום</h3>
            <div>
              <label className={labelCls} htmlFor="mo-total">סכום כולל (₪) *</label>
              <input id="mo-total" type="number" inputMode="decimal" min={0} step="0.01" dir="ltr" className={`${inputCls} text-right`} value={total} onChange={e => setTotal(e.target.value)} />
            </div>
            <div>
              <span className={labelCls}>אמצעי תשלום *</span>
              <div className="flex flex-wrap gap-2">
                {MANUAL_PAYMENT_METHODS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`min-h-[44px] rounded-full border-2 px-4 text-base font-semibold ${paymentMethod === m.id ? 'border-yellow-500 bg-yellow-50 text-yellow-900' : 'border-gray-200 bg-white text-gray-700'}`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="mo-notes">הערות</label>
              <input id="mo-notes" className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </section>
        </div>

        <div className="space-y-2 border-t bg-white px-4 py-3 sm:rounded-b-2xl">
          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={saving || !!uploading}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-500 text-base font-bold text-white hover:bg-yellow-600 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-5 w-5 animate-spin" />}
              שמירת הזמנה (שולם)
            </button>
            <button type="button" onClick={requestClose} className="min-h-[48px] rounded-xl border border-gray-300 px-5 text-base font-medium text-gray-700">
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
