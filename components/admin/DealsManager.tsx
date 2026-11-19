'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2, Save, X, ImagePlus, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DealCard from '@/components/deals/DealCard'
import DealPicture from '@/components/deals/DealPicture'
import { adminFetch } from '@/lib/admin-fetch'
import { uploadSiteImage } from '@/lib/storage'
import {
  DEAL_LIMITS,
  ORDER_TARGETS,
  dealHeroCopy,
  dealPath,
  formatDealDate,
  isDealExpired,
  slugify,
  uniqueSlug,
  validateDealInput,
  type DealErrors,
} from '@/lib/deals'
import type { Deal } from '@/lib/types'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type Variant = 'mobile' | 'desktop'

type Form = {
  id?: string
  title: string
  slug: string
  shortText: string
  priceText: string
  endsAt: string
  isActive: boolean
  sortOrder: number
  imageMobile: string
  imageDesktop: string
  orderOn: boolean
  orderHref: string
  orderLabel: string
  couponCode: string
  heroOn: boolean
  heroTitle: string
  heroText: string
  heroCta: string
}

const emptyForm = (sortOrder: number): Form => ({
  title: '', slug: '', shortText: '', priceText: '', endsAt: '', isActive: true, sortOrder,
  imageMobile: '', imageDesktop: '', orderOn: false, orderHref: ORDER_TARGETS[0].href, orderLabel: '', couponCode: '',
  heroOn: false, heroTitle: '', heroText: '', heroCta: '',
})

const formFromDeal = (d: Deal): Form => ({
  id: d.id, title: d.title, slug: d.slug, shortText: d.shortText, priceText: d.priceText ?? '', endsAt: d.endsAt ?? '',
  isActive: d.isActive, sortOrder: d.sortOrder, imageMobile: d.imageMobile ?? '', imageDesktop: d.imageDesktop ?? '',
  orderOn: !!d.order, orderHref: d.order?.href ?? ORDER_TARGETS[0].href, orderLabel: d.order?.label ?? '', couponCode: d.order?.couponCode ?? '',
  heroOn: !!d.hero?.enabled, heroTitle: d.hero?.title ?? '', heroText: d.hero?.text ?? '', heroCta: d.hero?.ctaLabel ?? '',
})

function payload(f: Form) {
  return {
    ...(f.id ? { id: f.id } : {}),
    title: f.title, slug: f.slug, shortText: f.shortText, priceText: f.priceText, endsAt: f.endsAt,
    isActive: f.isActive, sortOrder: f.sortOrder, imageMobile: f.imageMobile, imageDesktop: f.imageDesktop,
    ...(f.orderOn ? { order: { href: f.orderHref, label: f.orderLabel, couponCode: f.couponCode } } : {}),
    ...(f.heroOn || f.heroTitle || f.heroText || f.heroCta
      ? { hero: { enabled: f.heroOn, title: f.heroTitle, text: f.heroText, ctaLabel: f.heroCta } }
      : {}),
  }
}

function previewDeal(f: Form): Deal {
  const t = (s: string) => s.trim() || undefined
  return {
    id: 'preview', slug: f.slug || 'preview', title: f.title.trim(), shortText: f.shortText.trim(),
    priceText: t(f.priceText), imageMobile: t(f.imageMobile), imageDesktop: t(f.imageDesktop), endsAt: t(f.endsAt),
    isActive: f.isActive, sortOrder: f.sortOrder,
    order: f.orderOn ? { href: f.orderHref, label: t(f.orderLabel), couponCode: t(f.couponCode.toUpperCase()) } : undefined,
    hero: { enabled: f.heroOn, title: t(f.heroTitle), text: t(f.heroText), ctaLabel: t(f.heroCta) },
    createdAt: '', updatedAt: '',
  }
}

function status(d: Deal): { label: string; cls: string } {
  if (!d.isActive) return { label: 'לא פעיל', cls: 'bg-gray-100 text-gray-600' }
  if (isDealExpired(d)) return { label: 'פג תוקף', cls: 'bg-red-100 text-red-700' }
  return { label: 'פעיל', cls: 'bg-green-100 text-green-700' }
}

async function api(body: Record<string, unknown>) {
  const res = await adminFetch('/api/admin/deals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

const Err = ({ msg }: { msg?: string }) => (msg ? <p className="mt-1 text-sm text-red-600">{msg}</p> : null)

export default function DealsManager() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Form | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [errors, setErrors] = useState<DealErrors>({})
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [upload, setUpload] = useState<Record<Variant, { busy: boolean; error: string }>>({
    mobile: { busy: false, error: '' },
    desktop: { busy: false, error: '' },
  })

  const load = async () => {
    try {
      const { ok, data } = await api({ action: 'list' })
      if (ok && Array.isArray(data.deals)) setDeals(data.deals)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const otherSlugs = (id?: string) => deals.filter((d) => d.id !== id).map((d) => d.slug)

  const openNew = () => {
    setForm(emptyForm(deals.length))
    setSlugTouched(false)
    setErrors({})
  }
  const openEdit = (d: Deal) => {
    setForm(formFromDeal(d))
    setSlugTouched(true)
    setErrors({})
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))

  const onTitle = (title: string) =>
    setForm((f) => (f ? { ...f, title, slug: slugTouched ? f.slug : title.trim() ? uniqueSlug(slugify(title), otherSlugs(f.id)) : '' } : f))

  const onFile = async (variant: Variant, file: File | undefined) => {
    if (!file) return
    const fail = (error: string) => setUpload((u) => ({ ...u, [variant]: { busy: false, error } }))
    if (!IMAGE_TYPES.includes(file.type)) return fail('רק קבצי JPG, PNG או WebP')
    if (file.size > MAX_IMAGE_BYTES) return fail('הקובץ גדול מדי — עד 5MB')
    setUpload((u) => ({ ...u, [variant]: { busy: true, error: '' } }))
    try {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const url = await uploadSiteImage(file, 'deals', `${Date.now()}-${variant}.${ext}`)
      set(variant === 'mobile' ? 'imageMobile' : 'imageDesktop', url)
      setUpload((u) => ({ ...u, [variant]: { busy: false, error: '' } }))
    } catch (e) {
      console.error(e)
      fail('ההעלאה נכשלה, נסו שוב')
    }
  }

  const save = async () => {
    if (!form) return
    const body = payload(form)
    const local = validateDealInput(body)
    if (!local.ok) { setErrors(local.errors); return }
    setErrors({})
    setSaving(true)
    try {
      const { ok, data } = await api({ action: 'save', deal: body })
      if (!ok) {
        if (data?.errors) setErrors(data.errors)
        else alert('שגיאה בשמירה')
        return
      }
      setForm(null)
      await load()
    } catch (e) {
      console.error(e)
      alert('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (d: Deal) => {
    if (!confirm(`למחוק את המבצע «${d.title}»?`)) return
    setBusy(true)
    try {
      const { ok } = await api({ action: 'delete', id: d.id })
      if (!ok) alert('שגיאה במחיקה')
      setDeals((prev) => prev.filter((x) => x.id !== d.id))
      if (form?.id === d.id) setForm(null)
    } finally {
      setBusy(false)
    }
  }

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= deals.length) return
    const next = [...deals]
    ;[next[index], next[target]] = [next[target], next[index]]
    setDeals(next.map((d, i) => ({ ...d, sortOrder: i })))
    setBusy(true)
    try {
      const { ok } = await api({ action: 'reorder', ids: next.map((d) => d.id) })
      if (!ok) { alert('שגיאה בשינוי הסדר'); await load() }
    } finally {
      setBusy(false)
    }
  }

  const label = 'block text-sm font-medium text-gray-700 mb-1'

  const uploader = (variant: Variant, title: string, hint: string) => {
    const url = variant === 'mobile' ? form!.imageMobile : form!.imageDesktop
    const id = `deal-image-${variant}`
    return (
      <div className="rounded-xl border border-gray-200 p-3">
        <label htmlFor={id} className={label}>{title}</label>
        <p className="mb-2 text-xs text-gray-500">{hint}</p>
        <div className="flex items-center gap-3">
          <div className={`flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 ${variant === 'mobile' ? 'h-20 w-16' : 'h-16 w-24'}`}>
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={`תצוגה מקדימה — ${variant === 'mobile' ? 'מובייל' : 'דסקטופ'}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center"><ImagePlus className="h-5 w-5 text-gray-400" aria-hidden="true" /></div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              id={id}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => { onFile(variant, e.target.files?.[0]); e.target.value = '' }}
              className="block w-full text-sm file:ml-3 file:min-h-[44px] file:rounded-lg file:border-0 file:bg-yellow-100 file:px-3 file:font-medium file:text-yellow-800"
            />
            {url && (
              <button type="button" onClick={() => set(variant === 'mobile' ? 'imageMobile' : 'imageDesktop', '')} className="self-start text-sm text-red-600 hover:underline">
                הסר תמונה
              </button>
            )}
          </div>
        </div>
        {upload[variant].busy && <p className="mt-2 flex items-center gap-1 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />מעלה...</p>}
        <Err msg={upload[variant].error || (variant === 'mobile' ? errors.imageMobile : errors.imageDesktop)} />
      </div>
    )
  }

  return (
    <div dir="rtl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">מבצעים</h1>
          <p className="text-gray-600">המבצעים שמופיעים בעמוד «מבצעים», בעמוד של כל מבצע ובדף הבית (עד 3).</p>
        </div>
        {!form && (
          <Button className="min-h-[44px] bg-yellow-500 text-white hover:bg-yellow-600" onClick={openNew}>
            <Plus className="ml-2 h-4 w-4" />
            מבצע חדש
          </Button>
        )}
      </div>

      {form ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ── Form ── */}
          <div className="space-y-4 rounded-2xl bg-white p-4 shadow-lg sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{form.id ? 'עריכת מבצע' : 'מבצע חדש'}</h2>
              <button type="button" onClick={() => setForm(null)} className="rounded-full p-2 hover:bg-gray-100" aria-label="סגור">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div>
              <label htmlFor="deal-title" className={label}>כותרת</label>
              <Input id="deal-title" value={form.title} maxLength={DEAL_LIMITS.title + 20} onChange={(e) => onTitle(e.target.value)} />
              <Err msg={errors.title} />
            </div>
            <div>
              <label htmlFor="deal-slug" className={label}>כתובת (slug)</label>
              <Input id="deal-slug" value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value) }} />
              <p className="mt-1 text-xs text-gray-500" dir="ltr">badfos.co.il/deals/{form.slug || '…'}</p>
              <Err msg={errors.slug} />
            </div>
            <div>
              <label htmlFor="deal-short" className={label}>טקסט קצר</label>
              <textarea
                id="deal-short"
                rows={3}
                value={form.shortText}
                onChange={(e) => set('shortText', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500">{form.shortText.trim().length}/{DEAL_LIMITS.shortText}</p>
              <Err msg={errors.shortText} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="deal-price" className={label}>מחיר / הנחה (טקסט חופשי)</label>
                <Input id="deal-price" value={form.priceText} placeholder="לדוגמה: 20% הנחה" onChange={(e) => set('priceText', e.target.value)} />
                <Err msg={errors.priceText} />
              </div>
              <div>
                <label htmlFor="deal-ends" className={label}>תאריך סיום</label>
                <Input id="deal-ends" type="date" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
                <p className="mt-1 text-xs text-gray-500">ריק = ללא תאריך סיום. המבצע יורד אחרי סוף היום.</p>
                <Err msg={errors.endsAt} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="deal-sort" className={label}>סדר תצוגה</label>
                <Input id="deal-sort" type="number" min="0" value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value) || 0)} />
              </div>
              <label htmlFor="deal-active" className="flex min-h-[44px] items-center gap-3 self-end rounded-xl bg-gray-50 px-3">
                <input id="deal-active" type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-5 w-5 accent-yellow-500" />
                <span className="text-sm font-medium text-gray-700">פעיל</span>
              </label>
            </div>

            {uploader('mobile', 'תמונה למובייל', 'לאורך או ריבוע (מוצג 4:5, חיתוך מהמרכז). JPG/PNG/WebP עד 5MB.')}
            {uploader('desktop', 'תמונה לדסקטופ', 'רחבה (מוצג 16:10, חיתוך מהמרכז). אם יש רק תמונה אחת — היא תוצג בכל המסכים.')}

            <div className="space-y-3 rounded-xl border border-gray-200 p-3">
              <label htmlFor="deal-order-on" className="flex min-h-[44px] items-center gap-3">
                <input id="deal-order-on" type="checkbox" checked={form.orderOn} onChange={(e) => set('orderOn', e.target.checked)} className="h-5 w-5 accent-yellow-500" />
                <span className="text-sm font-medium text-gray-700">כפתור «להזמנה» (לא חובה)</span>
              </label>
              {form.orderOn && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="deal-order-href" className={label}>יעד הכפתור</label>
                    <select
                      id="deal-order-href"
                      value={form.orderHref}
                      onChange={(e) => set('orderHref', e.target.value)}
                      className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {ORDER_TARGETS.map((t) => (
                        <option key={t.href} value={t.href}>{t.label} ({t.href})</option>
                      ))}
                    </select>
                    <Err msg={errors.order} />
                  </div>
                  <div>
                    <label htmlFor="deal-order-label" className={label}>טקסט על הכפתור (לא חובה)</label>
                    <Input id="deal-order-label" value={form.orderLabel} placeholder="להזמנה" onChange={(e) => set('orderLabel', e.target.value)} />
                    <Err msg={errors.orderLabel} />
                  </div>
                  <div>
                    <label htmlFor="deal-coupon" className={label}>קוד קופון</label>
                    <Input id="deal-coupon" dir="ltr" value={form.couponCode} placeholder="WINTER20" onChange={(e) => set('couponCode', e.target.value.toUpperCase())} />
                    <Err msg={errors.couponCode} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-yellow-300 bg-yellow-50/50 p-3">
              <p className="text-sm font-bold text-gray-900">הירו בדף הבית</p>
              <label htmlFor="deal-hero-on" className="flex min-h-[44px] items-center gap-3">
                <input id="deal-hero-on" type="checkbox" checked={form.heroOn} onChange={(e) => set('heroOn', e.target.checked)} className="h-5 w-5 accent-yellow-500" />
                <span className="text-sm font-medium text-gray-700">הצג את המבצע בהירו של דף הבית</span>
              </label>
              <p className="text-xs text-gray-500">רק מבצע אחד בכל פעם — שמירה עם הסימון מורידה אותו מהמבצע שהיה בהירו. מבצע לא פעיל או שפג תוקפו לא יוצג.</p>
              {form.heroOn && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="deal-hero-title" className={label}>כותרת בהירו (לא חובה — ברירת מחדל: כותרת המבצע)</label>
                    <Input id="deal-hero-title" value={form.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} />
                    <Err msg={errors.heroTitle} />
                  </div>
                  <div>
                    <label htmlFor="deal-hero-text" className={label}>טקסט בהירו (לא חובה — ברירת מחדל: הטקסט הקצר)</label>
                    <textarea id="deal-hero-text" rows={2} value={form.heroText} onChange={(e) => set('heroText', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    <Err msg={errors.heroText} />
                  </div>
                  <div>
                    <label htmlFor="deal-hero-cta" className={label}>טקסט הכפתור בהירו (ברירת מחדל: «לפרטי המבצע»)</label>
                    <Input id="deal-hero-cta" value={form.heroCta} onChange={(e) => set('heroCta', e.target.value)} />
                    <Err msg={errors.heroCta} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t pt-4">
              <Button className="min-h-[44px] flex-1 bg-yellow-500 text-white hover:bg-yellow-600" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                {saving ? 'שומר...' : 'שמור'}
              </Button>
              <Button variant="outline" className="min-h-[44px]" onClick={() => setForm(null)}>ביטול</Button>
            </div>
          </div>

          {/* ── Live preview ── */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">תצוגה מקדימה</h2>
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-full max-w-[300px]">
                <p className="mb-1 text-xs font-medium text-gray-500">מובייל</p>
                <DealCard deal={previewDeal(form)} preview="mobile" />
              </div>
              <div className="w-full min-w-[260px] flex-1">
                <p className="mb-1 text-xs font-medium text-gray-500">דסקטופ</p>
                <DealCard deal={previewDeal(form)} preview="desktop" />
              </div>
            </div>
            {form.heroOn && (() => {
              const pd = previewDeal(form)
              const hc = dealHeroCopy(pd)
              return (
                <div data-testid="hero-preview" className="rounded-2xl bg-[#fffdf5] p-4 shadow">
                  <p className="mb-2 text-xs font-medium text-gray-500">הירו בדף הבית</p>
                  <div className="flex flex-col items-center gap-4 sm:flex-row-reverse">
                    <div className="w-40 flex-shrink-0 overflow-hidden rounded-2xl bg-white p-1.5">
                      <div className="overflow-hidden rounded-xl"><DealPicture deal={pd} aspect="aspect-square" /></div>
                    </div>
                    <div className="flex-1 text-center">
                      <span className="inline-block rounded-full bg-[#ffc32e] px-3 py-0.5 text-xs font-extrabold text-[#3b2600]">מבצע</span>
                      <p className="mt-2 text-2xl font-extrabold leading-tight text-[#1e293b]">{hc.title || 'כותרת'}</p>
                      {pd.priceText && <p className="text-lg font-semibold text-[#f59e0b]">{pd.priceText}</p>}
                      <p className="mt-1 text-sm text-gray-500">{hc.text}</p>
                      <span className="mt-3 inline-block rounded-full bg-[#fbbf24] px-5 py-2 text-sm font-bold text-white">{hc.ctaLabel}</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      ) : deals.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          <Megaphone className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium">אין מבצעים עדיין</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {deals.map((d, i) => {
            const s = status(d)
            const thumb = d.imageMobile || d.imageDesktop
            return (
              <li key={d.id} data-testid="admin-deal-row" className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow sm:flex-nowrap sm:p-4">
                <div className="h-16 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gray-900">{d.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${s.cls}`}>{s.label}</span>
                    {d.hero?.enabled && <span className="rounded-full bg-yellow-200 px-2 py-0.5 font-bold text-yellow-900">בהירו</span>}
                    <span>{d.endsAt ? `עד ${formatDealDate(d.endsAt)}` : 'ללא תאריך סיום'}</span>
                    <span>סדר: {d.sortOrder}</span>
                    {d.priceText && <span className="font-medium text-gray-700">{d.priceText}</span>}
                  </div>
                </div>
                <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                  <Button size="icon" variant="outline" className="h-11 w-11" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`הזז למעלה: ${d.title}`}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-11 w-11" disabled={busy || i === deals.length - 1} onClick={() => move(i, 1)} aria-label={`הזז למטה: ${d.title}`}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <a href={dealPath(d.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 w-11 items-center justify-center rounded-md border hover:bg-gray-50" aria-label={`צפייה: ${d.title}`}>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button size="icon" variant="outline" className="h-11 w-11 border-blue-500 text-blue-600" onClick={() => openEdit(d)} aria-label={`עריכה: ${d.title}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-11 w-11 border-red-500 text-red-600" disabled={busy} onClick={() => remove(d)} aria-label={`מחק: ${d.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
