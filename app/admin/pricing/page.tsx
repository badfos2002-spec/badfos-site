'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, RefreshCw } from 'lucide-react'
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

const PRODUCT_LABELS: Record<string, string> = {
  tshirt: 'חולצה', sweatshirt: 'סווטשרט', buff: 'באף', apron: 'סינר',
}
const FABRIC_LABELS: Record<string, string> = {
  cotton: 'כותנה', 'dri-fit': 'דרייפיט', polo: 'פולו', oversized: 'אוברסייז',
}
const AREA_LABELS: Record<string, string> = {
  front_full: 'קידמי מלא', back: 'גב', chest_logo: 'סמל שמאל', chest_logo_right: 'סמל ימין', center: 'מרכזי (סינר)',
}

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState<Pricing>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getDocument<Pricing>('settings', 'pricing')
      .then(data => {
        if (data) setPricing({
          basePrices: { ...DEFAULTS.basePrices, ...data.basePrices },
          fabricSurcharges: { ...DEFAULTS.fabricSurcharges, ...data.fabricSurcharges },
          designAreas: { ...DEFAULTS.designAreas, ...data.designAreas },
          sizeSurcharges: { ...DEFAULTS.sizeSurcharges, ...data.sizeSurcharges },
          shipping: { ...DEFAULTS.shipping, ...data.shipping },
          quantityDiscount: { ...DEFAULTS.quantityDiscount, ...data.quantityDiscount },
        })
      })
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
    <div dir="rtl" className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">ניהול תמחור</h1>
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

      <div className="space-y-4">

        {/* מחירי בסיס למוצר */}
        <Section title="מחירי בסיס למוצר">
          <table className="w-full">
            <tbody>
              {(Object.keys(pricing.basePrices) as Array<keyof typeof pricing.basePrices>).map(key => (
                <Row key={key} label={PRODUCT_LABELS[key] || key}>
                  <Input
                    type="number" min="0"
                    value={pricing.basePrices[key]}
                    onChange={e => setNum(['basePrices', key], e.target.value)}
                    className="w-24 h-8 text-sm font-semibold text-center"
                  />
                </Row>
              ))}
            </tbody>
          </table>
        </Section>

        {/* תוספת סוג בד */}
        <Section title="תוספת סוג בד (חולצות)">
          <table className="w-full">
            <tbody>
              {(Object.keys(pricing.fabricSurcharges) as Array<keyof typeof pricing.fabricSurcharges>).map(key => (
                <Row key={key} label={FABRIC_LABELS[key]}>
                  <Input
                    type="number" min="0"
                    value={pricing.fabricSurcharges[key]}
                    onChange={e => setNum(['fabricSurcharges', key], e.target.value)}
                    className="w-24 h-8 text-sm font-semibold text-center"
                  />
                </Row>
              ))}
            </tbody>
          </table>
        </Section>

        {/* תוספת אזור עיצוב */}
        <Section title="תוספת אזור עיצוב">
          <table className="w-full">
            <tbody>
              {(Object.keys(pricing.designAreas) as Array<keyof typeof pricing.designAreas>).map(key => (
                <Row key={key} label={AREA_LABELS[key] || key}>
                  <Input
                    type="number" min="0"
                    value={pricing.designAreas[key]}
                    onChange={e => setNum(['designAreas', key], e.target.value)}
                    className="w-24 h-8 text-sm font-semibold text-center"
                  />
                </Row>
              ))}
            </tbody>
          </table>
        </Section>

        {/* תוספת מידות + משלוח + הנחה - שורה אחת */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Section title="מידות גדולות">
            <table className="w-full">
              <tbody>
                {(Object.keys(pricing.sizeSurcharges) as Array<keyof typeof pricing.sizeSurcharges>).map(key => (
                  <Row key={key} label={key}>
                    <Input
                      type="number" min="0"
                      value={pricing.sizeSurcharges[key]}
                      onChange={e => setNum(['sizeSurcharges', key], e.target.value)}
                      className="w-20 h-8 text-sm font-semibold text-center"
                    />
                  </Row>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-gray-400 mt-2 px-3">XS–XXL: ללא תוספת</p>
          </Section>

          <Section title="משלוח">
            <table className="w-full">
              <tbody>
                <Row label="עד הבית">
                  <Input
                    type="number" min="0"
                    value={pricing.shipping.delivery}
                    onChange={e => setNum(['shipping', 'delivery'], e.target.value)}
                    className="w-20 h-8 text-sm font-semibold text-center"
                  />
                </Row>
                <Row label="איסוף עצמי">
                  <span className="text-sm font-semibold text-green-600">חינם</span>
                </Row>
              </tbody>
            </table>
          </Section>

          <Section title="הנחת כמות">
            <table className="w-full">
              <tbody>
                <Row label="מינימום יחידות">
                  <Input
                    type="number" min="1"
                    value={pricing.quantityDiscount.minQuantity}
                    onChange={e => setNum(['quantityDiscount', 'minQuantity'], e.target.value)}
                    className="w-20 h-8 text-sm font-semibold text-center"
                  />
                </Row>
                <Row label="אחוז הנחה">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number" min="0" max="100"
                      value={pricing.quantityDiscount.discountPercent}
                      onChange={e => setNum(['quantityDiscount', 'discountPercent'], e.target.value)}
                      className="w-20 h-8 text-sm font-semibold text-center"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </Row>
              </tbody>
            </table>
          </Section>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-2 pr-1 text-sm text-gray-600">{label}</td>
      <td className="py-2 pl-1 text-left">
        <div className="flex justify-end">{children}</div>
      </td>
    </tr>
  )
}
