'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const HOMEPAGE_DEFAULTS: Record<string, string> = {
  // Hero
  hero_badge: 'עיצובים אישיים ייחודיים',
  hero_title1: 'הפוך את הרעיונות שלך',
  hero_title2: 'לחולצות מדהימות',
  hero_subtitle: 'דיוק • איכות • מיתוג',
  hero_desc1: 'במקום אחד - העלה תמונה, בחר עיצוב, וקבל',
  hero_desc2: 'חולצה איכותית עם הדיזיין האישי שלך.',
  hero_ctaText: 'לעיצוב חולצה',
  // Why Choose
  why_title: 'למה לבחור בנו?',
  why_subtitle: 'הכנסה לחשבון, עיצוב חולצה ותפוקה — כל זה מיידי ויעיל ביותר',
  why_videoUrl: 'https://www.youtube.com/embed/ZBnLtKpF3l8?start=64&autoplay=1&mute=1&loop=1&playlist=ZBnLtKpF3l8',
  why_b1_title: 'איכות הדפסה גבוהה',
  why_b1_desc: 'הדפסת DTF באיכות פרימיום על חולצות ומוצרי טקסטיל',
  why_b2_title: 'משלוח מהיר',
  why_b2_desc: 'משלוח עד הבית או איסוף עצמי מהסניף',
  why_b3_title: 'תשלום מאובטח',
  why_b3_desc: 'מערכת תשלום מאובטחת ושירות לקוחות 24/7',
  // How It Works
  hiw_title: 'איך זה עובד?',
  hiw_subtitle: 'תהליך פשוט בשלושה שלבים',
  hiw_s1_title: 'העלה תמונה',
  hiw_s1_desc: 'העלה את העיצוב שלך או בחר מהגלריה',
  hiw_s2_title: 'בחר עיצוב',
  hiw_s2_desc: 'התאם אישית עם צבעים, טקסט וגרפיקה',
  hiw_s3_title: 'צפה בעיצוב שלך',
  hiw_s3_desc: 'ראה תצוגה מקדימה בזמן אמת',
  hiw_ctaText: 'בואו נתחיל!',
  // Final CTA
  cta_title: 'מוכן ליצור את החולצה הבאה שלך?',
  cta_subtitle: 'צרו עיצובים ייחודיים, הזמינו בקלות, וקבלו משלוח מהיר עד הבית',
  cta_buttonText: '⚡ התחל עכשיו - זה בחינם!',
  cta_footnote: 'ללא התחייבות • ללא עלות • תמיכה 24/7',
}

function Field({
  label,
  fieldKey,
  multiline,
  values,
  onChange,
}: {
  label: string
  fieldKey: string
  multiline?: boolean
  values: Record<string, string>
  onChange: (key: string, val: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {multiline ? (
        <Textarea
          value={values[fieldKey] ?? ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          rows={2}
        />
      ) : (
        <Input
          value={values[fieldKey] ?? ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
        />
      )}
    </div>
  )
}

export default function AdminHomepagePage() {
  const [values, setValues] = useState<Record<string, string>>(HOMEPAGE_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    getDoc(doc(db, 'settings', 'homepage'))
      .then((snap) => {
        if (snap.exists()) setValues({ ...HOMEPAGE_DEFAULTS, ...snap.data() as Record<string, string> })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const set = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!db) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'settings', 'homepage'), values)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
      alert('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const f = (label: string, fieldKey: string, multiline = false) => (
    <Field label={label} fieldKey={fieldKey} multiline={multiline} values={values} onChange={set} />
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    )
  }

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול תוכן דף הבית</h1>
          <p className="text-gray-600">עריכת טקסטים בכל הסקציות</p>
        </div>
        <Button
          className={`px-8 text-white ${saved ? 'bg-green-500 hover:bg-green-500' : 'bg-yellow-500 hover:bg-yellow-600'}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
          {saved ? 'נשמר!' : 'שמור הכל'}
        </Button>
      </div>

      <div className="space-y-6">

        {/* ── Hero ── */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-5 pb-3 border-b flex items-center gap-2">
            <span className="text-2xl">🦸</span> Hero — חלק עליון
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {f('טקסט תג (badge)', 'hero_badge')}
            {f('טקסט כפתור', 'hero_ctaText')}
            {f('כותרת שורה 1', 'hero_title1')}
            {f('כותרת שורה 2 (בצהוב)', 'hero_title2')}
            {f('כתובית (subtitle)', 'hero_subtitle')}
            {f('תיאור שורה 1', 'hero_desc1')}
            {f('תיאור שורה 2', 'hero_desc2')}
          </div>
        </div>

        {/* ── Why Choose ── */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-5 pb-3 border-b flex items-center gap-2">
            <span className="text-2xl">⭐</span> למה לבחור בנו
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {f('כותרת ראשית', 'why_title')}
            {f('כתובית', 'why_subtitle')}
            <div className="md:col-span-2">
              {f('קישור וידאו YouTube (embed URL)', 'why_videoUrl')}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl space-y-3">
                <p className="font-semibold text-gray-700">יתרון {i}</p>
                {f('כותרת', `why_b${i}_title`)}
                {f('תיאור', `why_b${i}_desc`, true)}
              </div>
            ))}
          </div>
        </div>

        {/* ── How It Works ── */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-5 pb-3 border-b flex items-center gap-2">
            <span className="text-2xl">⚙️</span> איך זה עובד
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {f('כותרת ראשית', 'hiw_title')}
            {f('כתובית', 'hiw_subtitle')}
            {f('טקסט כפתור CTA', 'hiw_ctaText')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl space-y-3">
                <p className="font-semibold text-gray-700">שלב {i}</p>
                {f('כותרת', `hiw_s${i}_title`)}
                {f('תיאור', `hiw_s${i}_desc`, true)}
              </div>
            ))}
          </div>
        </div>

        {/* ── Final CTA ── */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-5 pb-3 border-b flex items-center gap-2">
            <span className="text-2xl">📣</span> קריאה לפעולה — סוף דף
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {f('כותרת ראשית', 'cta_title')}
            {f('כתובית', 'cta_subtitle')}
            {f('טקסט כפתור', 'cta_buttonText')}
            {f('הערת תחתית', 'cta_footnote')}
          </div>
        </div>

      </div>
    </div>
  )
}
