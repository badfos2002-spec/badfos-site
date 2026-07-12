'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Plus, Trash2, Copy, Pencil, Loader2, Printer, ArrowRight, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getAllQuotes, createQuote, updateQuote, deleteQuote } from '@/lib/db'
import { Timestamp } from 'firebase/firestore'
import type { Quote, QuoteStatus, QuoteDiscountType } from '@/lib/types'
import QuotePrintSheet, { type QuotePrintData } from './QuotePrintSheet'

const statusLabels: Record<QuoteStatus, { label: string; color: string }> = {
  draft:    { label: 'טיוטה',  color: 'bg-gray-100 text-gray-700' },
  sent:     { label: 'נשלחה',  color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'אושרה',  color: 'bg-green-100 text-green-700' },
  rejected: { label: 'נדחתה',  color: 'bg-red-100 text-red-700' },
}

interface ItemDraft {
  description: string
  quantity: string
  unitPrice: string
}

const emptyItem = (): ItemDraft => ({ description: '', quantity: '1', unitPrice: '' })

function num(s: string): number {
  const n = parseFloat(s)
  return isFinite(n) && n > 0 ? n : 0
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayStr(): string {
  return toDateInput(new Date())
}

function plus14Str(): string {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return toDateInput(d)
}

function inputToDate(s: string): Date {
  return new Date(`${s}T12:00:00`)
}

function fmt(n: number): string {
  return `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 2 })}`
}

function computeTotals(
  items: ItemDraft[],
  discountType: QuoteDiscountType,
  discountValue: string,
  shipping: string
) {
  const subtotal = round2(items.reduce((sum, it) => sum + num(it.quantity) * num(it.unitPrice), 0))
  const dv = num(discountValue)
  let discountAmount = 0
  if (discountType === 'percent') discountAmount = round2((subtotal * Math.min(dv, 100)) / 100)
  if (discountType === 'amount') discountAmount = round2(Math.min(dv, subtotal))
  const shippingPrice = round2(num(shipping))
  const total = round2(subtotal - discountAmount + shippingPrice)
  return { subtotal, discountAmount, shippingPrice, total }
}

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'editor'>('list')

  // Editor state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNumber, setEditingNumber] = useState<number | null>(null)
  const [status, setStatus] = useState<QuoteStatus>('draft')
  const [customerName, setCustomerName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [quoteDate, setQuoteDate] = useState(todayStr())
  const [validUntil, setValidUntil] = useState(plus14Str())
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  const [discountType, setDiscountType] = useState<QuoteDiscountType>('none')
  const [discountValue, setDiscountValue] = useState('')
  const [shipping, setShipping] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [autoPrint, setAutoPrint] = useState(false)

  const loadQuotes = useCallback(async () => {
    try {
      const list = await getAllQuotes()
      setQuotes(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQuotes()
  }, [loadQuotes])

  const totals = computeTotals(items, discountType, discountValue, shipping)

  const openNew = () => {
    setEditingId(null)
    setEditingNumber(null)
    setStatus('draft')
    setCustomerName('')
    setContactPerson('')
    setPhone('')
    setEmail('')
    // Prefill business number from the most recent quote
    setBusinessNumber(quotes[0]?.businessNumber ?? '')
    setQuoteDate(todayStr())
    setValidUntil(plus14Str())
    setItems([emptyItem()])
    setDiscountType('none')
    setDiscountValue('')
    setShipping('')
    setNotes('')
    setFormError('')
    setView('editor')
  }

  const openEdit = (q: Quote) => {
    setEditingId(q.id)
    setEditingNumber(q.quoteNumber)
    setStatus(q.status)
    setCustomerName(q.customerName)
    setContactPerson(q.contactPerson ?? '')
    setPhone(q.phone ?? '')
    setEmail(q.email ?? '')
    setBusinessNumber(q.businessNumber ?? '')
    setQuoteDate(q.quoteDate?.toDate ? toDateInput(q.quoteDate.toDate()) : todayStr())
    setValidUntil(q.validUntil?.toDate ? toDateInput(q.validUntil.toDate()) : plus14Str())
    setItems(
      q.items?.length
        ? q.items.map(it => ({
            description: it.description,
            quantity: String(it.quantity),
            unitPrice: String(it.unitPrice),
          }))
        : [emptyItem()]
    )
    setDiscountType(q.discountType ?? 'none')
    setDiscountValue(q.discountValue ? String(q.discountValue) : '')
    setShipping(q.shippingPrice ? String(q.shippingPrice) : '')
    setNotes(q.notes ?? '')
    setFormError('')
    setView('editor')
  }

  const validate = (): boolean => {
    if (!customerName.trim()) {
      setFormError('יש להזין שם לקוח/עסק')
      return false
    }
    if (!items.some(it => it.description.trim())) {
      setFormError('יש להזין לפחות שורת פריט אחת עם תיאור')
      return false
    }
    if (!quoteDate || !validUntil) {
      setFormError('יש להזין תאריך הצעה ותאריך תוקף')
      return false
    }
    setFormError('')
    return true
  }

  const buildDocData = () => ({
    status,
    customerName: customerName.trim(),
    contactPerson: contactPerson.trim(),
    phone: phone.trim(),
    email: email.trim(),
    items: items
      .filter(it => it.description.trim())
      .map(it => ({
        description: it.description.trim(),
        quantity: num(it.quantity),
        unitPrice: round2(num(it.unitPrice)),
      })),
    discountType,
    discountValue: num(discountValue),
    shippingPrice: totals.shippingPrice,
    businessNumber: businessNumber.trim(),
    quoteDate: Timestamp.fromDate(inputToDate(quoteDate)),
    validUntil: Timestamp.fromDate(inputToDate(validUntil)),
    notes: notes.trim(),
    subtotal: totals.subtotal,
    total: totals.total,
  })

  const handleSave = async (): Promise<boolean> => {
    if (!validate()) return false
    setSaving(true)
    try {
      if (editingId) {
        await updateQuote(editingId, buildDocData())
      } else {
        const { id, quoteNumber } = await createQuote(buildDocData())
        setEditingId(id)
        setEditingNumber(quoteNumber)
      }
      await loadQuotes()
      return true
    } catch (e) {
      console.error(e)
      setFormError('שגיאה בשמירה ל-Firestore. בדקו את חיבור Firebase.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = async () => {
    const ok = await handleSave()
    if (ok) {
      setAutoPrint(true)
      setPreviewOpen(true)
    }
  }

  // Auto-print once the preview sheet is fully rendered (fonts + logo painted)
  useEffect(() => {
    if (!previewOpen || !autoPrint) return
    let cancelled = false

    const waitForLogo = () => {
      const img = document.querySelector<HTMLImageElement>('#quote-print-sheet img')
      if (!img || img.complete) return Promise.resolve()
      return new Promise<void>(resolve => {
        const done = () => resolve()
        img.addEventListener('load', done, { once: true })
        img.addEventListener('error', done, { once: true })
        setTimeout(done, 2000) // safety net — never block printing forever
      })
    }

    const run = async () => {
      await document.fonts.ready
      await waitForLogo()
      // Double rAF tick to guarantee the sheet is painted before the print dialog freezes rendering
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      if (cancelled) return
      setAutoPrint(false)
      window.print()
    }

    run()
    return () => {
      cancelled = true
    }
  }, [previewOpen, autoPrint])

  const handleStatusChange = async (id: string, newStatus: QuoteStatus) => {
    try {
      await updateQuote(id, { status: newStatus })
      setQuotes(prev => prev.map(q => (q.id === id ? { ...q, status: newStatus } : q)))
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון סטטוס')
    }
  }

  const handleDuplicate = async (q: Quote) => {
    try {
      await createQuote({
        status: 'draft',
        customerName: q.customerName,
        contactPerson: q.contactPerson ?? '',
        phone: q.phone ?? '',
        email: q.email ?? '',
        items: q.items ?? [],
        discountType: q.discountType ?? 'none',
        discountValue: q.discountValue ?? 0,
        shippingPrice: q.shippingPrice ?? 0,
        businessNumber: q.businessNumber ?? '',
        quoteDate: Timestamp.fromDate(inputToDate(todayStr())),
        validUntil: Timestamp.fromDate(inputToDate(plus14Str())),
        notes: q.notes ?? '',
        subtotal: q.subtotal,
        total: q.total,
      })
      await loadQuotes()
    } catch (e) {
      console.error(e)
      alert('שגיאה בשכפול ההצעה')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק את הצעת המחיר?')) return
    try {
      await deleteQuote(id)
      setQuotes(prev => prev.filter(q => q.id !== id))
    } catch (e) {
      console.error(e)
      alert('שגיאה במחיקת ההצעה')
    }
  }

  const updateItem = (index: number, field: keyof ItemDraft, value: string) => {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  }

  const addItem = () => setItems(prev => [...prev, emptyItem()])

  const removeItem = (index: number) =>
    setItems(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const printData: QuotePrintData = {
    quoteNumber: editingNumber,
    quoteDate: inputToDate(quoteDate || todayStr()),
    validUntil: inputToDate(validUntil || plus14Str()),
    customerName: customerName.trim(),
    contactPerson: contactPerson.trim(),
    phone: phone.trim(),
    email: email.trim(),
    items: items
      .filter(it => it.description.trim())
      .map(it => ({
        description: it.description.trim(),
        quantity: num(it.quantity),
        unitPrice: num(it.unitPrice),
      })),
    subtotal: totals.subtotal,
    discountLabel: discountType === 'percent' ? `הנחה ${num(discountValue)}%` : 'הנחה',
    discountAmount: totals.discountAmount,
    shippingPrice: totals.shippingPrice,
    total: totals.total,
    businessNumber: businessNumber.trim(),
    notes: notes.trim(),
  }

  // ==========================================================================
  // List view
  // ==========================================================================
  if (view === 'list') {
    return (
      <div dir="rtl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">הצעות מחיר</h1>
            <p className="text-gray-600">יצירה, עריכה והפקת הצעות מחיר ללקוחות</p>
          </div>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white shrink-0" onClick={openNew}>
            <Plus className="w-4 h-4 ml-2" />
            הצעה חדשה
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">אין הצעות מחיר עדיין</p>
            <p className="text-sm mt-1">לחצו על &quot;הצעה חדשה&quot; כדי ליצור את הראשונה</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <th className="py-3 px-4 text-right font-semibold">מס׳</th>
                    <th className="py-3 px-4 text-right font-semibold">לקוח</th>
                    <th className="py-3 px-4 text-right font-semibold">תאריך</th>
                    <th className="py-3 px-4 text-right font-semibold">סה&quot;כ</th>
                    <th className="py-3 px-4 text-right font-semibold">סטטוס</th>
                    <th className="py-3 px-4 text-left font-semibold">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map(q => (
                    <tr key={q.id} className="border-b border-gray-100 hover:bg-yellow-50/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap" dir="ltr">
                        Q-{q.quoteNumber}
                      </td>
                      <td className="py-3 px-4 text-gray-900">{q.customerName}</td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        {q.quoteDate?.toDate?.()?.toLocaleDateString('he-IL') ??
                          q.createdAt?.toDate?.()?.toLocaleDateString('he-IL') ?? ''}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">{fmt(q.total ?? 0)}</td>
                      <td className="py-3 px-4">
                        <select
                          value={q.status}
                          onChange={e => handleStatusChange(q.id, e.target.value as QuoteStatus)}
                          className={`appearance-none rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer border border-gray-200 shadow-sm outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${statusLabels[q.status]?.color ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {(Object.entries(statusLabels) as [QuoteStatus, { label: string }][]).map(([val, { label }]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" className="px-2" title="פתיחה ועריכה" onClick={() => openEdit(q)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="px-2" title="שכפול" onClick={() => handleDuplicate(q)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="px-2 border-red-500 text-red-600 hover:bg-red-50" title="מחיקה" onClick={() => handleDelete(q.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ==========================================================================
  // Editor view
  // ==========================================================================
  return (
    <div dir="rtl">
      {/* Editor header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setView('list')}>
            <ArrowRight className="w-4 h-4 ml-1" />
            לרשימה
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
            {editingNumber ? <>עריכת הצעה <span dir="ltr">Q-{editingNumber}</span></> : 'הצעת מחיר חדשה'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={e => setStatus(e.target.value as QuoteStatus)}
            className={`appearance-none rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer border border-gray-200 shadow-sm outline-none focus:ring-2 focus:ring-yellow-400 ${statusLabels[status].color}`}
          >
            {(Object.entries(statusLabels) as [QuoteStatus, { label: string }][]).map(([val, { label }]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
            שמירה
          </Button>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handlePrint} disabled={saving}>
            <Printer className="w-4 h-4 ml-2" />
            📄 הורדה כ-PDF / הדפסה
          </Button>
        </div>
      </div>

      {formError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{formError}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer block */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold mb-4">פרטי לקוח</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">שם לקוח / עסק *</label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="לדוגמה: מסעדת השף בע״מ" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">איש קשר</label>
                <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">טלפון</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" className="text-right" inputMode="tel" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">אימייל</label>
                <Input value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className="text-right" inputMode="email" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">תאריך ההצעה</label>
                <Input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">בתוקף עד</label>
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 mb-1 block">עוסק פטור מס׳ (יוצג ב-PDF אם מולא)</label>
                <Input value={businessNumber} onChange={e => setBusinessNumber(e.target.value)} dir="ltr" className="text-right" />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold mb-4">פריטים</h2>
            <div className="hidden sm:grid grid-cols-[1fr_5rem_7rem_6rem_2.5rem] gap-2 text-xs font-semibold text-gray-500 mb-2 px-1">
              <span>תיאור המוצר</span>
              <span className="text-center">כמות</span>
              <span className="text-center">מחיר ליחידה</span>
              <span className="text-center">סה&quot;כ</span>
              <span />
            </div>
            <div className="space-y-2">
              {items.map((item, i) => {
                const rowTotal = round2(num(item.quantity) * num(item.unitPrice))
                return (
                  <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_5rem_7rem_6rem_2.5rem] gap-2 items-center bg-gray-50 sm:bg-transparent rounded-xl sm:rounded-none p-3 sm:p-0">
                    <div className="col-span-2 sm:col-span-1">
                      <Input
                        value={item.description}
                        onChange={e => updateItem(i, 'description', e.target.value)}
                        placeholder="לדוגמה: חולצת כותנה שחורה + הדפסה קדמית"
                      />
                    </div>
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', e.target.value)}
                      className="text-center"
                      placeholder="כמות"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      inputMode="decimal"
                      value={item.unitPrice}
                      onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                      className="text-center"
                      placeholder="₪ ליח׳"
                    />
                    <div className="text-sm font-bold text-gray-900 text-center whitespace-nowrap">
                      {fmt(rowTotal)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={items.length === 1}
                      className="justify-self-end sm:justify-self-center text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed p-1"
                      title="הסרת שורה"
                      tabIndex={-1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
            <Button variant="outline" size="sm" className="mt-4" onClick={addItem}>
              <Plus className="w-4 h-4 ml-1" />
              הוספת שורה
            </Button>
          </div>

          {/* Discount / shipping / notes */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold mb-4">הנחה, משלוח והערות</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">הנחה</label>
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as QuoteDiscountType)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="none">ללא הנחה</option>
                  <option value="percent">אחוז (%)</option>
                  <option value="amount">סכום (₪)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  {discountType === 'percent' ? 'אחוז הנחה' : discountType === 'amount' ? 'סכום הנחה (₪)' : 'ערך הנחה'}
                </label>
                <Input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  disabled={discountType === 'none'}
                  className="text-center"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">משלוח (₪, אופציונלי)</label>
                <Input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={shipping}
                  onChange={e => setShipping(e.target.value)}
                  className="text-center"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">הערות (יוצגו ב-PDF)</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="לדוגמה: זמן אספקה 7 ימי עסקים ממועד אישור ההצעה" />
            </div>
          </div>
        </div>

        {/* Live summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-20">
            <h2 className="text-lg font-bold mb-4">סיכום</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>סכום ביניים</span>
                <span className="font-medium">{fmt(totals.subtotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>{discountType === 'percent' ? `הנחה ${num(discountValue)}%` : 'הנחה'}</span>
                  <span className="font-medium">-{fmt(totals.discountAmount)}</span>
                </div>
              )}
              {totals.shippingPrice > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>משלוח</span>
                  <span className="font-medium">{fmt(totals.shippingPrice)}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-3">
                <span className="font-bold text-gray-900">סה&quot;כ לתשלום</span>
                <span className="text-2xl font-extrabold text-yellow-600">{fmt(totals.total)}</span>
              </div>
              <p className="text-xs text-gray-400 pt-1">עוסק פטור — המחירים ללא מע&quot;מ</p>
            </div>
          </div>
        </div>
      </div>

      {/* PDF preview overlay */}
      {previewOpen && (
        <div className="quote-preview-overlay fixed inset-0 z-[100] bg-gray-900/80 overflow-y-auto px-4 py-8">
          <div className="quote-preview-actions max-w-[794px] mx-auto mb-4 flex items-center justify-between gap-3">
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={() => window.print()}>
              <Printer className="w-4 h-4 ml-2" />
              הדפסה חוזרת
            </Button>
            <Button variant="outline" className="bg-white" onClick={() => { setAutoPrint(false); setPreviewOpen(false) }}>
              סגירה
            </Button>
          </div>
          <QuotePrintSheet quote={printData} />
        </div>
      )}

      {/* Print isolation: only the quote sheet is printed, A4, exact colors */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #quote-print-sheet,
          #quote-print-sheet * {
            visibility: visible !important;
          }
          .quote-preview-overlay {
            position: static !important;
            overflow: visible !important;
            padding: 0 !important;
            background: none !important;
          }
          .quote-preview-actions {
            display: none !important;
          }
          #quote-print-sheet {
            position: absolute !important;
            top: 0;
            right: 0;
            left: 0;
            margin: 0 auto !important;
            box-shadow: none !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
