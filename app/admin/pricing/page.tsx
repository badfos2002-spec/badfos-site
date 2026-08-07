'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, RefreshCw, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getDocument, setDocument } from '@/lib/db'

/* ────────────────────────────────────────────────────────────────────────────
 * Pricing tab v2 — per-category structure:
 *   category → FULL base price per sub-type → print prices scoped to that
 *   category only (no cross-product bleed like the old global area ids).
 * ──────────────────────────────────────────────────────────────────────────── */

type ProductPricing = { base: Record<string, number>; areas: Record<string, number> }
type PricingV2 = {
  products: Record<string, ProductPricing>
  sizeSurcharges: Record<string, number>
  shipping: { delivery: number; pickup: number }
  quantityDiscount: { minQuantity: number; discountPercent: number }
}

const CATALOG: {
  id: string
  label: string
  types: { id: string; label: string }[]
  areas: { id: string; label: string }[]
}[] = [
  {
    id: 'tshirt', label: 'חולצות',
    types: [
      { id: 'cotton', label: 'כותנה' },
      { id: 'dri-fit', label: 'דרייפיט' },
      { id: 'polo', label: 'פולו' },
      { id: 'oversized', label: 'אוברסייז' },
    ],
    areas: [
      { id: 'front_full', label: 'קדמי מלא' },
      { id: 'back', label: 'גב' },
      { id: 'chest_logo', label: 'סמל כיס ימין' },
      { id: 'chest_logo_right', label: 'סמל כיס שמאל' },
    ],
  },
  {
    id: 'sweatshirt', label: 'סווטשירטים',
    types: [
      { id: 'kangaroo', label: 'קפוצ׳ון קנגרו' },
      { id: 'putter', label: 'פוטר' },
      { id: 'zip', label: 'קפוצ׳ון עם רוכסן' },
    ],
    areas: [
      { id: 'front_full', label: 'קדמי מלא' },
      { id: 'back', label: 'גב' },
      { id: 'chest_logo', label: 'סמל כיס ימין' },
      { id: 'chest_logo_right', label: 'סמל כיס שמאל' },
    ],
  },
  {
    id: 'cap', label: 'כובעים',
    types: [
      { id: 'tembel', label: 'כובע טמבל' },
      { id: 'mesh', label: 'כובע רשת' },
    ],
    areas: [
      { id: 'center', label: 'קדמי' },
      { id: 'center_wide', label: 'קדמי רוחבי' },
    ],
  },
  {
    id: 'tote', label: 'תיקים',
    types: [{ id: 'volume', label: 'תיק קנבס' }, { id: 'drawstring', label: 'תיק שרוכים' }],
    areas: [
      { id: 'front_full', label: 'צד קדמי' },
      { id: 'back', label: 'צד אחורי' },
    ],
  },
  {
    id: 'vest', label: 'וסטים זוהרים',
    types: [{ id: 'default', label: 'וסט זוהר' }],
    areas: [
      { id: 'back', label: 'גב' },
      { id: 'chest_logo', label: 'סמל כיס ימין' },
      { id: 'chest_logo_right', label: 'סמל כיס שמאל' },
    ],
  },
  {
    id: 'buff', label: 'באפים',
    types: [{ id: 'default', label: 'באף' }],
    areas: [{ id: 'center', label: 'מרכזי' }],
  },
  {
    id: 'apron', label: 'סינרים',
    types: [{ id: 'default', label: 'סינר' }],
    areas: [{ id: 'center', label: 'מרכזי' }],
  },
  {
    id: 'baby', label: 'בגדי גוף לתינוק',
    types: [{ id: 'default', label: 'בגד גוף' }],
    areas: [{ id: 'front_full', label: 'קידמי' }, { id: 'back', label: 'גב' }],
  },
]

const GLOBAL_DEFAULTS = {
  sizeSurcharges: { '3XL': 12, '4XL': 12 },
  shipping: { delivery: 35, pickup: 0 },
  quantityDiscount: { minQuantity: 15, discountPercent: 5 },
}

/** Code-default products pricing (used when nothing is saved yet). */
function codeDefaults(): Record<string, ProductPricing> {
  return {
    tshirt: { base: { cotton: 37, 'dri-fit': 37, polo: 47, oversized: 47 }, areas: { front_full: 10, back: 10, chest_logo: 5, chest_logo_right: 5 } },
    sweatshirt: { base: { kangaroo: 53, putter: 53, zip: 53 }, areas: { front_full: 10, back: 10, chest_logo: 5, chest_logo_right: 5 } },
    cap: { base: { tembel: 30, mesh: 30 }, areas: { center: 5, center_wide: 5 } },
    tote: { base: { volume: 35, drawstring: 35 }, areas: { front_full: 5, back: 5 } },
    vest: { base: { default: 30 }, areas: { back: 10, chest_logo: 5, chest_logo_right: 5 } },
    buff: { base: { default: 8 }, areas: { center: 8 } },
    apron: { base: { default: 29 }, areas: { center: 10 } },
    baby: { base: { default: 35 }, areas: { front_full: 5, back: 5 } },
  }
}

/* Legacy doc shape (pre-v2) — migrated once into the per-product structure. */
type LegacyDoc = {
  basePrices?: Record<string, number>
  fabricSurcharges?: Record<string, number>
  designAreas?: Record<string, number>
  sizeSurcharges?: Record<string, number>
  shipping?: { delivery?: number; pickup?: number }
  quantityDiscount?: { minQuantity?: number; discountPercent?: number }
  products?: Record<string, ProductPricing>
}

/**
 * Build v2 `products` from a legacy doc. Intent-preserving:
 * - t-shirt fabric prices = legacy base + fabric surcharge (full prices)
 * - the legacy GLOBAL area overrides are applied only where they were
 *   clearly intended: shirt-family areas + the apron's "מרכזי". The old
 *   leak into cap/buff/tote/baby is deliberately NOT carried over.
 */
function migrateLegacy(legacy: LegacyDoc): Record<string, ProductPricing> {
  const d = codeDefaults()
  const bp = legacy.basePrices ?? {}
  const fs = legacy.fabricSurcharges ?? {}
  const da = legacy.designAreas ?? {}

  const tBase = bp.tshirt ?? 37
  d.tshirt.base = {
    cotton: tBase + (fs.cotton ?? 0),
    'dri-fit': tBase + (fs['dri-fit'] ?? 0),
    polo: tBase + (fs.polo ?? 10),
    oversized: tBase + (fs.oversized ?? 10),
  }
  const shirtAreas = {
    front_full: da.front_full ?? 10,
    back: da.back ?? 10,
    chest_logo: da.chest_logo ?? 5,
    chest_logo_right: da.chest_logo_right ?? 5,
  }
  d.tshirt.areas = { ...shirtAreas }
  const sBase = bp.sweatshirt ?? 53
  d.sweatshirt.base = { kangaroo: sBase, putter: sBase, zip: sBase }
  d.sweatshirt.areas = { ...shirtAreas }
  const capBase = bp.cap ?? 30
  d.cap.base = { tembel: capBase, mesh: capBase }
  d.tote.base = { volume: bp.tote ?? 35, drawstring: bp.tote ?? 35 }
  d.vest.base = { default: bp.vest ?? 30 }
  d.buff.base = { default: bp.buff ?? 8 }
  d.apron.base = { default: bp.apron ?? 29 }
  if (da.center !== undefined) d.apron.areas = { center: da.center } // "מרכזי (סינר)" was the apron's knob
  d.baby.base = { default: bp.baby ?? 35 }
  return d
}

export default function AdminPricingPage() {
  const [products, setProducts] = useState<Record<string, ProductPricing>>(codeDefaults())
  const [globals, setGlobals] = useState(GLOBAL_DEFAULTS)
  const [open, setOpen] = useState<string | null>('tshirt')
  const [migrated, setMigrated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getDocument<LegacyDoc>('settings', 'pricing')
      .then(data => {
        if (!data) return
        if (data.products) {
          // v2 doc — merge over code defaults so new products/areas appear
          const base = codeDefaults()
          for (const [pid, pp] of Object.entries(data.products)) {
            if (!base[pid]) continue
            base[pid] = {
              base: { ...base[pid].base, ...(pp.base ?? {}) },
              areas: { ...base[pid].areas, ...(pp.areas ?? {}) },
            }
          }
          setProducts(base)
        } else {
          setProducts(migrateLegacy(data))
          setMigrated(true)
        }
        setGlobals({
          sizeSurcharges: { ...GLOBAL_DEFAULTS.sizeSurcharges, ...(data.sizeSurcharges ?? {}) },
          shipping: { ...GLOBAL_DEFAULTS.shipping, ...(data.shipping ?? {}) },
          quantityDiscount: { ...GLOBAL_DEFAULTS.quantityDiscount, ...(data.quantityDiscount ?? {}) },
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    const nums: number[] = []
    Object.values(products).forEach(p => {
      nums.push(...Object.values(p.base), ...Object.values(p.areas))
    })
    nums.push(...Object.values(globals.sizeSurcharges), globals.shipping.delivery, globals.shipping.pickup,
      globals.quantityDiscount.minQuantity, globals.quantityDiscount.discountPercent)
    if (nums.some(v => typeof v !== 'number' || isNaN(v) || v < 0)) {
      alert('לא ניתן לשמור ערכים שליליים או ריקים')
      return
    }
    setSaving(true)
    try {
      const doc: PricingV2 = { products, ...globals }
      await setDocument('settings', 'pricing', doc)
      setMigrated(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
      alert('שגיאה בשמירת מחירים')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('לאפס את כל המחירים לברירת המחדל?')) {
      setProducts(codeDefaults())
      setGlobals(GLOBAL_DEFAULTS)
    }
  }

  const setBase = (pid: string, tid: string, val: string) => {
    const n = Number(val)
    if (isNaN(n)) return
    setProducts(prev => ({ ...prev, [pid]: { ...prev[pid], base: { ...prev[pid].base, [tid]: n } } }))
  }
  const setArea = (pid: string, aid: string, val: string) => {
    const n = Number(val)
    if (isNaN(n)) return
    setProducts(prev => ({ ...prev, [pid]: { ...prev[pid], areas: { ...prev[pid].areas, [aid]: n } } }))
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>
  }

  return (
    <div dir="rtl" className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול תמחור</h1>
          <p className="text-sm text-gray-500 mt-1">מחיר בסיס לכל סוג + מחירי הדפסות לכל קטגוריה בנפרד</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="text-gray-500">
            <RefreshCw className="w-3.5 h-3.5 ml-1.5" />
            אפס
          </Button>
          <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" /> : <Save className="w-3.5 h-3.5 ml-1.5" />}
            {saved ? 'נשמר!' : saving ? 'שומר...' : 'שמור'}
          </Button>
        </div>
      </div>

      {migrated && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <b>שדרוג מבנה:</b> המחירים הומרו מהמבנה הישן למבנה החדש (מחיר מלא לכל סוג, הדפסות לכל קטגוריה בנפרד).
          בדקו את הערכים ולחצו <b>שמור</b> כדי להחיל אותם על האתר — עד השמירה האתר ממשיך עם המחירים הישנים.
        </div>
      )}

      <div className="space-y-3">
        {CATALOG.map(cat => {
          const p = products[cat.id]
          const isOpen = open === cat.id
          return (
            <div key={cat.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : cat.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50"
              >
                <span className="font-bold text-gray-900">{cat.label}</span>
                <span className="flex items-center gap-3 text-xs text-gray-400">
                  <span>
                    בסיס {Math.min(...Object.values(p.base))}₪
                    {Object.values(p.base).some(v => v !== Object.values(p.base)[0]) ? '+' : ''}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">מחיר בסיס (ללא הדפסה)</h3>
                    <div className="space-y-2">
                      {cat.types.map(t => (
                        <div key={t.id} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-gray-600">{t.label}</span>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number" min={0}
                              className="w-24 h-9 text-center"
                              value={p.base[t.id] ?? 0}
                              onChange={e => setBase(cat.id, t.id, e.target.value)}
                            />
                            <span className="text-sm text-gray-400">₪</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">מחירי הדפסות (תוספת לאזור)</h3>
                    <div className="space-y-2">
                      {cat.areas.map(a => (
                        <div key={a.id} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-gray-600">{a.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-gray-400">+</span>
                            <Input
                              type="number" min={0}
                              className="w-24 h-9 text-center"
                              value={p.areas[a.id] ?? 0}
                              onChange={e => setArea(cat.id, a.id, e.target.value)}
                            />
                            <span className="text-sm text-gray-400">₪</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Globals */}
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">תוספות מידה (חולצות/סווטשירטים)</h3>
            {(['3XL', '4XL'] as const).map(sz => (
              <div key={sz} className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm text-gray-600">מידה {sz}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-400">+</span>
                  <Input type="number" min={0} className="w-24 h-9 text-center"
                    value={globals.sizeSurcharges[sz] ?? 0}
                    onChange={e => { const n = Number(e.target.value); if (!isNaN(n)) setGlobals(g => ({ ...g, sizeSurcharges: { ...g.sizeSurcharges, [sz]: n } })) }} />
                  <span className="text-sm text-gray-400">₪</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">משלוח</h3>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-sm text-gray-600">משלוח עד הבית</span>
              <div className="flex items-center gap-1.5">
                <Input type="number" min={0} className="w-24 h-9 text-center"
                  value={globals.shipping.delivery}
                  onChange={e => { const n = Number(e.target.value); if (!isNaN(n)) setGlobals(g => ({ ...g, shipping: { ...g.shipping, delivery: n } })) }} />
                <span className="text-sm text-gray-400">₪</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600">איסוף עצמי</span>
              <div className="flex items-center gap-1.5">
                <Input type="number" min={0} className="w-24 h-9 text-center"
                  value={globals.shipping.pickup}
                  onChange={e => { const n = Number(e.target.value); if (!isNaN(n)) setGlobals(g => ({ ...g, shipping: { ...g.shipping, pickup: n } })) }} />
                <span className="text-sm text-gray-400">₪</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">הנחת כמות</h3>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-sm text-gray-600">מכמות (יחידות)</span>
              <Input type="number" min={0} className="w-24 h-9 text-center"
                value={globals.quantityDiscount.minQuantity}
                onChange={e => { const n = Number(e.target.value); if (!isNaN(n)) setGlobals(g => ({ ...g, quantityDiscount: { ...g.quantityDiscount, minQuantity: n } })) }} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600">אחוז הנחה</span>
              <div className="flex items-center gap-1.5">
                <Input type="number" min={0} className="w-24 h-9 text-center"
                  value={globals.quantityDiscount.discountPercent}
                  onChange={e => { const n = Number(e.target.value); if (!isNaN(n)) setGlobals(g => ({ ...g, quantityDiscount: { ...g.quantityDiscount, discountPercent: n } })) }} />
                <span className="text-sm text-gray-400">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
