'use client'

import { useState, useEffect } from 'react'
import { Percent, Plus, Trash2, Loader2, ToggleLeft, ToggleRight, Save, Tag, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAllDocuments, createDocument, updateDocument, deleteDocument } from '@/lib/db'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Discount, DiscountCategory } from '@/lib/types'

// ── Discount rules ──────────────────────────────────────────────────────────

const categoryLabels: Record<DiscountCategory, string> = {
  tshirts: 'חולצות',
  sweatshirts: 'סווטשרטים',
  all: 'הכל',
}

const emptyForm = {
  name: '',
  type: 'quantity' as const,
  category: 'all' as DiscountCategory,
  minQuantity: 10,
  discountPercent: 5,
  isActive: true,
}

// ── Banner settings ─────────────────────────────────────────────────────────

interface BannerSettings {
  isActive: boolean
  text: string
  code: string
  showInHeader: boolean
  showInDesigner: boolean
}

const BANNER_DEFAULTS: BannerSettings = {
  isActive: false,
  text: '',
  code: '',
  showInHeader: true,
  showInDesigner: true,
}

// ── Deals (homepage section) settings ───────────────────────────────────────

interface DealSettings {
  isActive: boolean
  title: string
  subtitle: string
  tagText: string
  ctaText: string
  showBenefits: boolean
}

const DEAL_DEFAULTS: DealSettings = {
  isActive: true,
  title: 'מבצע מיוחד',
  subtitle: 'חסכו על ההזמנה הבאה שלכם',
  tagText: 'מבצע',
  ctaText: 'לפרטים נוספים',
  showBenefits: true,
}

// ── Toggle component ────────────────────────────────────────────────────────

function Toggle({ checked, onChange, size = 'md' }: { checked: boolean; onChange: () => void; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-6 w-11' : 'h-7 w-12'
  const knob = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const translate = size === 'sm' ? 'translate-x-5' : 'translate-x-6'
  const base = size === 'sm' ? 'translate-x-0.5' : 'translate-x-1'
  return (
    <button
      dir="ltr"
      type="button"
      onClick={onChange}
      className={`relative inline-flex ${h} items-center rounded-full transition-colors shrink-0 ${checked ? 'bg-yellow-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block ${knob} transform rounded-full bg-white shadow transition-transform ${checked ? translate : base}`} />
    </button>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function AdminDiscountsPage() {
  // Discount rules state
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loadingDiscounts, setLoadingDiscounts] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  // Banner state
  const [banner, setBanner] = useState<BannerSettings>(BANNER_DEFAULTS)
  const [loadingBanner, setLoadingBanner] = useState(true)
  const [savingBanner, setSavingBanner] = useState(false)
  const [savedBanner, setSavedBanner] = useState(false)

  // Deals state
  const [deals, setDeals] = useState<DealSettings>(DEAL_DEFAULTS)
  const [loadingDeals, setLoadingDeals] = useState(true)
  const [savingDeals, setSavingDeals] = useState(false)
  const [savedDeals, setSavedDeals] = useState(false)

  // Active tab
  const [activeTab, setActiveTab] = useState<'rules' | 'banner' | 'deals'>('rules')

  // ── Load data ───────────────────────────────────────────────────────────
  useEffect(() => {
    getAllDocuments<Discount>('discounts')
      .then(setDiscounts)
      .catch(console.error)
      .finally(() => setLoadingDiscounts(false))

    if (!db) { setLoadingBanner(false); setLoadingDeals(false); return }

    getDoc(doc(db, 'settings', 'couponBanner'))
      .then(snap => { if (snap.exists()) setBanner({ ...BANNER_DEFAULTS, ...snap.data() as BannerSettings }) })
      .catch(console.error)
      .finally(() => setLoadingBanner(false))

    getDoc(doc(db, 'settings', 'deals'))
      .then(snap => { if (snap.exists()) setDeals({ ...DEAL_DEFAULTS, ...snap.data() as DealSettings }) })
      .catch(console.error)
      .finally(() => setLoadingDeals(false))
  }, [])

  // ── Discount CRUD ───────────────────────────────────────────────────────
  const openAdd = () => { setForm(emptyForm); setEditingId(null); setShowModal(true) }

  const openEdit = (d: Discount) => {
    setForm({ name: d.name, type: d.type, category: d.category, minQuantity: d.minQuantity, discountPercent: d.discountPercent, isActive: d.isActive })
    setEditingId(d.id)
    setShowModal(true)
  }

  const handleSaveDiscount = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await updateDocument<Discount>('discounts', editingId, form as any)
        setDiscounts(prev => prev.map(d => d.id === editingId ? { ...d, ...form } : d))
      } else {
        const id = await createDocument<Discount>('discounts', form as any)
        setDiscounts(prev => [...prev, { id, ...form } as Discount])
      }
      setShowModal(false)
    } catch (e) {
      console.error(e)
      alert('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleDiscount = async (d: Discount) => {
    try {
      await updateDocument<Discount>('discounts', d.id, { isActive: !d.isActive } as any)
      setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, isActive: !x.isActive } : x))
    } catch { alert('שגיאה בעדכון') }
  }

  const handleDeleteDiscount = async (id: string) => {
    if (!confirm('למחוק את ההנחה?')) return
    try {
      await deleteDocument('discounts', id)
      setDiscounts(prev => prev.filter(d => d.id !== id))
    } catch { alert('שגיאה במחיקה') }
  }

  // ── Banner save ─────────────────────────────────────────────────────────
  const handleSaveBanner = async () => {
    if (!db) return
    setSavingBanner(true)
    try {
      await setDoc(doc(db, 'settings', 'couponBanner'), banner)
      setSavedBanner(true)
      setTimeout(() => setSavedBanner(false), 2500)
    } catch { alert('שגיאה בשמירה') }
    finally { setSavingBanner(false) }
  }

  // ── Deals save ──────────────────────────────────────────────────────────
  const handleSaveDeals = async () => {
    if (!db) return
    setSavingDeals(true)
    try {
      await setDoc(doc(db, 'settings', 'deals'), deals)
      setSavedDeals(true)
      setTimeout(() => setSavedDeals(false), 2500)
    } catch { alert('שגיאה בשמירה') }
    finally { setSavingDeals(false) }
  }

  // ── Tabs ────────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'rules' as const, label: 'הנחות כמות', icon: Percent },
    { key: 'banner' as const, label: 'באנר מבצעים', icon: Tag },
    { key: 'deals' as const, label: 'אזור מבצעים', icon: Megaphone },
  ]

  const loading = loadingDiscounts || loadingBanner || loadingDeals

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">ניהול הנחות ומבצעים</h1>
        <p className="text-gray-600">הנחות כמות, באנר מבצעים ואזור מבצעים בדף הבית</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-yellow-400 text-white shadow-yellow-200'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : (
        <>
          {/* ═══════════════ TAB 1: Quantity Discounts ═══════════════ */}
          {activeTab === 'rules' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">כללי הנחה אוטומטיים</h2>
                <Button onClick={openAdd} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                  <Plus className="w-4 h-4 ml-2" />
                  הנחה חדשה
                </Button>
              </div>

              {discounts.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-white rounded-2xl shadow">
                  <Percent className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">אין הנחות מוגדרות</p>
                  <p className="text-sm mt-1">לחצו על &quot;הנחה חדשה&quot; כדי להוסיף</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {discounts.map((d) => (
                    <div key={d.id} className="bg-white rounded-xl shadow p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{d.name}</div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {categoryLabels[d.category] ?? d.category} &bull; מינימום {d.minQuantity} יח&apos; &bull;{' '}
                          <span className="font-bold text-yellow-600">{d.discountPercent}%</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleToggleDiscount(d)} className="flex items-center gap-1">
                          {d.isActive ? (
                            <><ToggleRight className="w-6 h-6 text-green-500" /><span className="text-xs text-green-700 font-medium">פעיל</span></>
                          ) : (
                            <><ToggleLeft className="w-6 h-6 text-gray-400" /><span className="text-xs text-gray-500">מושבת</span></>
                          )}
                        </button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(d)}>ערוך</Button>
                        <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={() => handleDeleteDiscount(d.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ TAB 2: Banner (Top Bar) ═══════════════ */}
          {activeTab === 'banner' && (
            <div className="max-w-2xl space-y-6">
              {/* Preview */}
              {banner.text && (
                <div className="bg-yellow-400 text-gray-900 py-2 px-4 rounded-xl text-center text-sm font-medium flex items-center justify-center gap-3">
                  <span>{banner.text}</span>
                  {banner.code && (
                    <span className="bg-white/80 px-3 py-0.5 rounded-full font-bold border border-yellow-500 text-sm">
                      {banner.code}
                    </span>
                  )}
                  <span className="text-xs text-gray-600 mr-2">(תצוגה מקדימה)</span>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 space-y-6">
                {/* Active toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-bold text-gray-900">הצג באנר מבצעים</p>
                    <p className="text-sm text-gray-500">פס עליון מעל הכותרת באתר</p>
                  </div>
                  <Toggle checked={banner.isActive} onChange={() => setBanner(prev => ({ ...prev, isActive: !prev.isActive }))} />
                </div>

                {/* Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">טקסט ההודעה</label>
                  <Input
                    value={banner.text}
                    onChange={e => setBanner(prev => ({ ...prev, text: e.target.value }))}
                    placeholder='לדוגמה: "השתמשו בקוד SAVE10 לחיסכון של 10% על ההזמנה!"'
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">קוד קופון להצגה (ניתן להעתקה)</label>
                  <Input
                    value={banner.code}
                    onChange={e => setBanner(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="לדוגמה: SAVE10"
                    className="font-mono tracking-widest text-lg"
                  />
                  <p className="text-xs text-gray-400 mt-1">השאירו ריק אם אין קוד קופון</p>
                </div>

                {/* Placements */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">מיקומים</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">מעל הכותרת</p>
                        <p className="text-xs text-gray-500">בכל דפי האתר</p>
                      </div>
                      <Toggle size="sm" checked={banner.showInHeader} onChange={() => setBanner(prev => ({ ...prev, showInHeader: !prev.showInHeader }))} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">בשלב הכמויות</p>
                        <p className="text-xs text-gray-500">שלב 4 בעיצוב</p>
                      </div>
                      <Toggle size="sm" checked={banner.showInDesigner} onChange={() => setBanner(prev => ({ ...prev, showInDesigner: !prev.showInDesigner }))} />
                    </div>
                  </div>
                </div>

                {/* Save */}
                <div className="pt-2 border-t">
                  <Button
                    onClick={handleSaveBanner}
                    disabled={savingBanner}
                    className={`px-10 text-white ${savedBanner ? 'bg-green-500 hover:bg-green-500' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                  >
                    {savingBanner ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                    {savedBanner ? 'נשמר!' : 'שמור'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ TAB 3: Deals (Homepage Section) ═══════════════ */}
          {activeTab === 'deals' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 space-y-6">
                {/* Active toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-bold text-gray-900">הפעל אזור מבצעים</p>
                    <p className="text-sm text-gray-500">הצגה בעמוד הבית</p>
                  </div>
                  <Toggle checked={deals.isActive} onChange={() => setDeals(prev => ({ ...prev, isActive: !prev.isActive }))} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">כותרת ראשית</label>
                  <Input value={deals.title} onChange={e => setDeals(prev => ({ ...prev, title: e.target.value }))} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">כותרת משנית</label>
                  <Input value={deals.subtitle} onChange={e => setDeals(prev => ({ ...prev, subtitle: e.target.value }))} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">טקסט לתג</label>
                  <Input value={deals.tagText} onChange={e => setDeals(prev => ({ ...prev, tagText: e.target.value }))} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">טקסט כפתור (CTA)</label>
                  <Input value={deals.ctaText} onChange={e => setDeals(prev => ({ ...prev, ctaText: e.target.value }))} />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">הצג יתרונות</p>
                    <p className="text-sm text-gray-500">רשימת יתרונות באזור המבצעים</p>
                  </div>
                  <Toggle size="sm" checked={deals.showBenefits} onChange={() => setDeals(prev => ({ ...prev, showBenefits: !prev.showBenefits }))} />
                </div>

                {/* Save */}
                <div className="pt-2 border-t">
                  <Button
                    onClick={handleSaveDeals}
                    disabled={savingDeals}
                    className={`px-10 text-white ${savedDeals ? 'bg-green-500 hover:bg-green-500' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                  >
                    {savingDeals ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                    {savedDeals ? 'נשמר!' : 'שמור'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ Modal: Add/Edit Discount Rule ═══════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md" dir="rtl">
            <h2 className="text-xl font-bold mb-6">{editingId ? 'עריכת הנחה' : 'הנחה חדשה'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם ההנחה</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="למשל: הנחת כמות 15+" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">קטגוריה</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as DiscountCategory }))}
                >
                  <option value="all">הכל</option>
                  <option value="tshirts">חולצות</option>
                  <option value="sweatshirts">סווטשרטים</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">כמות מינימלית</label>
                <Input type="number" min={1} value={form.minQuantity} onChange={e => setForm(f => ({ ...f, minQuantity: parseInt(e.target.value) || 1 }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">אחוז הנחה (%)</label>
                <Input type="number" min={1} max={100} value={form.discountPercent} onChange={e => setForm(f => ({ ...f, discountPercent: parseInt(e.target.value) || 1 }))} />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-yellow-500" />
                <span className="text-sm font-medium">פעיל</span>
              </label>
            </div>

            <div className="flex gap-3 mt-8">
              <Button onClick={handleSaveDiscount} disabled={saving || !form.name.trim()} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'שמור'}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">ביטול</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
