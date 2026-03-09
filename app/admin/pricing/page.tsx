'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Save, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getDocument, setDocument } from '@/lib/db'

const DEFAULTS = {
  basePrices: { tshirt: 37, sweatshirt: 53, buff: 8, apron: 29 },
  fabricSurcharges: { cotton: 0, 'dri-fit': 0, polo: 10, oversized: 10 },
  designAreas: { front_full: 10, back: 10, chest_logo: 5, chest_logo_right: 5, center: 10 },
  sizeSurcharges: { '3XL': 12, '4XL': 12 },
  shipping: { delivery: 35, pickup: 0 },
  quantityDiscount: { minQuantity: 15, discountPercent: 5 },
}

type Pricing = typeof DEFAULTS

const FABRIC_LABELS: Record<string, string> = { cotton: 'כותנה', 'dri-fit': 'דרייפיט', polo: 'פולו', oversized: 'אוברסייז' }
const AREA_LABELS: Record<string, string> = { front_full: 'קידמי מלא', back: 'גב', chest_logo: 'סמל כיס שמאל', chest_logo_right: 'סמל כיס ימין', center: 'מרכזי (סינר)' }

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState<Pricing>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getDocument<Pricing>('settings', 'pricing')
      .then(data => { if (data) setPricing(data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDocument('settings', 'pricing', pricing)
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
    if (confirm('לאפס לברירת מחדל?')) setPricing(DEFAULTS)
  }

  const setNum = (path: string[], val: string) => {
    const n = Number(val)
    if (isNaN(n)) return
    setPricing(prev => {
      const next = { ...prev }
      let obj: any = next
      for (let i = 0; i < path.length - 1; i++) {
        obj[path[i]] = { ...obj[path[i]] }
        obj = obj[path[i]]
      }
      obj[path[path.length - 1]] = n
      return next
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>
  }

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול תמחור</h1>
          <p className="text-gray-600">עריכת מחירים — שינויים נשמרים ב-Firestore ומשפיעים על ההזמנות החדשות</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="border-gray-400 text-gray-600">
            <RefreshCw className="w-4 h-4 ml-2" />
            אפס
          </Button>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
            {saved ? '✅ נשמר!' : saving ? 'שומר...' : 'שמור שינויים'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">

        {/* Base Prices */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-500" />
            מחירי בסיס
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.keys(pricing.basePrices) as Array<keyof typeof pricing.basePrices>).map(key => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {{ tshirt: 'חולצה', sweatshirt: 'סווטשרט', buff: 'באף', apron: 'סינר' }[key] || key} (₪)
                </label>
                <Input
                  type="number" min="0"
                  value={pricing.basePrices[key]}
                  onChange={e => setNum(['basePrices', key], e.target.value)}
                  className="font-bold text-blue-600"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Fabric Surcharges */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">תוספת בד (חולצות)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(Object.keys(pricing.fabricSurcharges) as Array<keyof typeof pricing.fabricSurcharges>).map(key => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-600 mb-1">{FABRIC_LABELS[key]} (₪)</label>
                <Input
                  type="number" min="0"
                  value={pricing.fabricSurcharges[key]}
                  onChange={e => setNum(['fabricSurcharges', key], e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Design Area Prices */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">תוספת אזור עיצוב</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {(Object.keys(pricing.designAreas) as Array<keyof typeof pricing.designAreas>).map(key => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-600 mb-1">{AREA_LABELS[key]} (₪)</label>
                <Input
                  type="number" min="0"
                  value={pricing.designAreas[key]}
                  onChange={e => setNum(['designAreas', key], e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Size Surcharges */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">תוספת מידות גדולות</h2>
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(pricing.sizeSurcharges) as Array<keyof typeof pricing.sizeSurcharges>).map(key => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-600 mb-1">{key} (₪)</label>
                <Input
                  type="number" min="0"
                  value={pricing.sizeSurcharges[key]}
                  onChange={e => setNum(['sizeSurcharges', key], e.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">XS–XXL: ללא תוספת</p>
        </div>

        {/* Shipping */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">מחירי משלוח</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">משלוח עד הבית (₪)</label>
              <Input
                type="number" min="0"
                value={pricing.shipping.delivery}
                onChange={e => setNum(['shipping', 'delivery'], e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">איסוף עצמי (₪)</label>
              <Input
                type="number" min="0"
                value={pricing.shipping.pickup}
                onChange={e => setNum(['shipping', 'pickup'], e.target.value)}
                disabled
              />
              <p className="text-xs text-gray-400 mt-1">תמיד חינם</p>
            </div>
          </div>
        </div>

        {/* Quantity Discount */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">הנחת כמות</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">מינימום יחידות</label>
              <Input
                type="number" min="1"
                value={pricing.quantityDiscount.minQuantity}
                onChange={e => setNum(['quantityDiscount', 'minQuantity'], e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">אחוז הנחה (%)</label>
              <Input
                type="number" min="0" max="100"
                value={pricing.quantityDiscount.discountPercent}
                onChange={e => setNum(['quantityDiscount', 'discountPercent'], e.target.value)}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
