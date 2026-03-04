'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface DealSettings {
  isActive: boolean
  title: string
  subtitle: string
  tagText: string
  ctaText: string
  showBenefits: boolean
}

const defaults: DealSettings = {
  isActive: true,
  title: 'מבצע מיוחד',
  subtitle: 'חסכו על ההזמנה הבאה שלכם',
  tagText: 'מבצע',
  ctaText: 'לפרטים נוספים',
  showBenefits: true,
}

export default function AdminDealsPage() {
  const [settings, setSettings] = useState<DealSettings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    getDoc(doc(db, 'settings', 'deals'))
      .then(snap => {
        if (snap.exists()) setSettings({ ...defaults, ...snap.data() as DealSettings })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!db) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'settings', 'deals'), settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
      alert('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof DealSettings, value: any) =>
    setSettings(prev => ({ ...prev, [key]: value }))

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">הגדרות מבצעים</h1>
        <p className="text-gray-600">הגדרת אזור המבצעים בעמוד הבית</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl">
          <div className="space-y-6">

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">הפעל אזור מבצעים</p>
                <p className="text-sm text-gray-500">האם להציג את אזור המבצעים בעמוד הבית</p>
              </div>
              <button
                onClick={() => update('isActive', !settings.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.isActive ? 'bg-yellow-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">כותרת ראשית</label>
              <Input value={settings.title} onChange={e => update('title', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">כותרת משנית</label>
              <Input value={settings.subtitle} onChange={e => update('subtitle', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">טקסט לתג</label>
              <Input value={settings.tagText} onChange={e => update('tagText', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">טקסט כפתור (CTA)</label>
              <Input value={settings.ctaText} onChange={e => update('ctaText', e.target.value)} />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">הצג יתרונות</p>
                <p className="text-sm text-gray-500">האם להציג רשימת יתרונות באזור המבצעים</p>
              </div>
              <button
                onClick={() => update('showBenefits', !settings.showBenefits)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showBenefits ? 'bg-yellow-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showBenefits ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

          </div>

          <div className="mt-8 pt-6 border-t">
            <Button
              className={`px-8 text-white ${saved ? 'bg-green-500 hover:bg-green-500' : 'bg-yellow-500 hover:bg-yellow-600'}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              {saved ? 'נשמר!' : 'שמור הגדרות'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
