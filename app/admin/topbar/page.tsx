'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface TopBarSettings {
  isActive: boolean
  text: string
  code: string
  showInHeader: boolean
  showInDesigner: boolean
}

const DEFAULTS: TopBarSettings = {
  isActive: false,
  text: '',
  code: '',
  showInHeader: true,
  showInDesigner: true,
}

export default function AdminTopBarPage() {
  const [settings, setSettings] = useState<TopBarSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    getDoc(doc(db, 'settings', 'couponBanner'))
      .then(snap => {
        if (snap.exists()) setSettings({ ...DEFAULTS, ...snap.data() as TopBarSettings })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const update = (key: keyof TopBarSettings, value: any) =>
    setSettings(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!db) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'settings', 'couponBanner'), settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error(e)
      alert('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Top Bar</h1>
        <p className="text-gray-600">פס עליון מעל הכותרת – הצגת הודעה עם קופון ללקוחות</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">

          {/* Preview */}
          {settings.text && (
            <div className="bg-yellow-400 text-gray-900 py-2 px-4 rounded-xl text-center text-sm font-medium flex items-center justify-center gap-3">
              <span>{settings.text}</span>
              {settings.code && (
                <span className="bg-white/80 px-3 py-0.5 rounded-full font-bold border border-yellow-500 text-sm">
                  {settings.code}
                </span>
              )}
              <span className="text-xs text-gray-600 mr-2">(תצוגה מקדימה)</span>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">

            {/* Active toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-bold text-gray-900">הצג Top Bar</p>
                <p className="text-sm text-gray-500">האם להציג את הפס העליון באתר</p>
              </div>
              <button
                onClick={() => update('isActive', !settings.isActive)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${settings.isActive ? 'bg-yellow-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${settings.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                טקסט ההודעה
              </label>
              <Input
                value={settings.text}
                onChange={e => update('text', e.target.value)}
                placeholder='לדוגמה: "השתמשו בקוד SAVE10 לחיסכון של 10% על ההזמנה!"'
              />
            </div>

            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                קוד קופון להצגה (ניתן להעתקה)
              </label>
              <Input
                value={settings.code}
                onChange={e => update('code', e.target.value.toUpperCase())}
                placeholder='לדוגמה: SAVE10'
                className="font-mono tracking-widest text-lg"
              />
              <p className="text-xs text-gray-400 mt-1">השאירו ריק אם אין קוד קופון</p>
            </div>

            {/* Placement toggles */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">איפה להציג</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">מעל הכותרת</p>
                    <p className="text-xs text-gray-500">בכל דפי האתר</p>
                  </div>
                  <button
                    onClick={() => update('showInHeader', !settings.showInHeader)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showInHeader ? 'bg-yellow-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.showInHeader ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">בשלב הכמויות</p>
                    <p className="text-xs text-gray-500">שלב 4 בעיצוב</p>
                  </div>
                  <button
                    onClick={() => update('showInDesigner', !settings.showInDesigner)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showInDesigner ? 'bg-yellow-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.showInDesigner ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="pt-2 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                className={`px-10 text-white ${saved ? 'bg-green-500 hover:bg-green-500' : 'bg-yellow-500 hover:bg-yellow-600'}`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Save className="w-4 h-4 ml-2" />
                )}
                {saved ? 'נשמר!' : 'שמור'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
