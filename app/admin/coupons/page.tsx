'use client'

import { useState, useEffect } from 'react'
import { Tag, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAllDocuments, createDocument, updateDocument, deleteDocument } from '@/lib/db'
import type { Coupon } from '@/lib/types'
import { Timestamp } from 'firebase/firestore'

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newDiscount, setNewDiscount] = useState('10')
  const [newExpiry, setNewExpiry] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    getAllDocuments<Coupon>('coupons')
      .then(setCoupons)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    setFormError('')
    if (!newCode.trim()) { setFormError('יש להזין קוד קופון'); return }
    if (!newDiscount || Number(newDiscount) < 1 || Number(newDiscount) > 100) { setFormError('אחוז הנחה חייב להיות בין 1 ל-100'); return }
    if (!newExpiry) { setFormError('יש לבחור תאריך תפוגה'); return }
    const upperCode = newCode.trim().toUpperCase()
    if (coupons.some(c => c.code === upperCode)) { setFormError('קוד קופון כבר קיים במערכת'); return }
    setSaving(true)
    try {
      const expiresAt = Timestamp.fromDate(new Date(newExpiry))
      const data = {
        code: upperCode,
        discountPercent: Number(newDiscount),
        isUsed: false,
        isActive: true,
        expiresAt,
      }
      const id = await createDocument<Coupon>('coupons', { ...data, code: upperCode } as any)
      setCoupons(prev => [...prev, { id, ...data, createdAt: Timestamp.now() } as Coupon])
      setShowForm(false)
      setNewCode('')
      setNewDiscount('10')
      setNewExpiry('')
      setFormError('')
    } catch (e) {
      console.error(e)
      setFormError('שגיאה בשמירה לFirestore. בדוק את חיבור Firebase.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await updateDocument<Coupon>('coupons', id, { isActive: !current } as any)
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, isActive: !current } : c))
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון סטטוס קופון')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק את הקופון?')) return
    try {
      await deleteDocument('coupons', id)
      setCoupons(prev => prev.filter(c => c.id !== id))
    } catch (e) {
      console.error(e)
      alert('שגיאה במחיקת קופון')
    }
  }

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">ניהול קופונים</h1>
          <p className="text-gray-600">יצירה וניהול קופוני הנחה</p>
        </div>
        <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 ml-2" />
          קופון חדש
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-yellow-200">
          <h2 className="text-lg font-bold mb-4">קופון חדש</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">קוד קופון</label>
              <Input placeholder="SAVE10" value={newCode} onChange={e => setNewCode(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">אחוז הנחה</label>
              <Input type="number" min="1" max="100" value={newDiscount} onChange={e => setNewDiscount(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">תאריך תפוגה</label>
              <Input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} />
            </div>
          </div>
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{formError}</p>
          )}
          <div className="flex gap-2">
            <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {saving ? 'שומר...' : 'צור קופון'}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setFormError('') }}>ביטול</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">אין קופונים</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => {
            const expiry = coupon.expiresAt?.toDate?.()?.toLocaleDateString('he-IL') ?? ''
            const isExpired = coupon.expiresAt?.toDate?.() < new Date()
            const status = isExpired ? 'expired' : coupon.isActive ? 'active' : 'inactive'
            return (
              <div key={coupon.id} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-yellow-600" />
                    <span className="font-bold text-lg text-gray-900">{coupon.code}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    status === 'active' ? 'bg-green-100 text-green-700' :
                    status === 'expired' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {status === 'active' ? 'פעיל' : status === 'expired' ? 'פג תוקף' : 'מושבת'}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">הנחה:</span>
                    <span className="font-bold text-yellow-600">{coupon.discountPercent}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">תפוגה:</span>
                    <span className="text-sm text-gray-900">{expiry}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">נוצל:</span>
                    <span className="font-medium text-gray-900">{coupon.isUsed ? 'כן' : 'לא'}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  {!isExpired && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleToggle(coupon.id, coupon.isActive)}>
                      {coupon.isActive ? 'השבת' : 'הפעל'}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={() => handleDelete(coupon.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
