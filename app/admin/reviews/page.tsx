'use client'

import { useState, useEffect } from 'react'
import { Star, Check, X, Loader2, MessageSquare, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAllDocuments, updateDocument, deleteDocument, createDocument } from '@/lib/db'
import type { Review } from '@/lib/types'
import { Timestamp } from 'firebase/firestore'

const EMPTY_FORM = { name: '', rating: 5, product: '', text: '', featured: false }

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    getAllDocuments<Review>('reviews')
      .then(setReviews)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleApprove = async (id: string) => {
    try {
      await updateDocument<Review>('reviews', id, { status: 'approved' } as any)
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r))
    } catch (e) {
      console.error(e)
      alert('שגיאה באישור ביקורת')
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('למחוק את הביקורת?')) return
    try {
      await deleteDocument('reviews', id)
      setReviews(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      console.error(e)
      alert('שגיאה במחיקת ביקורת')
    }
  }

  const handleToggleFeatured = async (id: string, current: boolean) => {
    try {
      await updateDocument<Review>('reviews', id, { featured: !current } as any)
      setReviews(prev => prev.map(r => r.id === id ? { ...r, featured: !current } : r))
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון סטטוס נבחר')
    }
  }

  const handleAdd = async () => {
    if (!form.name.trim() || !form.text.trim()) { alert('נא למלא שם וטקסט'); return }
    setAdding(true)
    try {
      const id = await createDocument<Review>('reviews', {
        name: form.name,
        rating: form.rating,
        product: form.product || undefined,
        text: form.text,
        status: 'approved',
        featured: form.featured,
        createdAt: Timestamp.now(),
      } as any)
      setReviews(prev => [{ id, ...form, status: 'approved', createdAt: Timestamp.now() } as any, ...prev])
      setForm(EMPTY_FORM)
      setAddOpen(false)
    } catch (e) {
      console.error(e)
      alert('שגיאה בהוספת ביקורת')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">ניהול ביקורות</h1>
          <p className="text-gray-600">אישור וניהול ביקורות לקוחות</p>
        </div>
        <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף ביקורת
        </Button>
      </div>

      {/* Add Review Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl" onClick={() => setAddOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">הוסף ביקורת</h2>
              <button onClick={() => setAddOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">שם *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="שם הלקוח" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">דירוג</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setForm(f => ({ ...f, rating: n }))}>
                    <Star className={`w-7 h-7 ${n <= form.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">סוג מוצר</label>
              <Input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} placeholder="חולצה, סווטשרט..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">טקסט ביקורת *</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
                value={form.text}
                onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                placeholder="טקסט הביקורת..."
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="w-4 h-4" />
              <span className="text-sm">סמן כנבחר (מוצג בדף הבית)</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleAdd} disabled={adding}>
                {adding ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {adding ? 'מוסיף...' : 'הוסף ואשר'}
              </Button>
              <Button variant="outline" onClick={() => setAddOpen(false)}>ביטול</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">אין ביקורות</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {reviews.map((review) => {
            const date = review.createdAt?.toDate?.()?.toLocaleDateString('he-IL') ?? ''
            return (
              <div key={review.id} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{review.name}</h3>
                    <p className="text-sm text-gray-500">{review.product} • {date}</p>
                    <div className="flex gap-1 mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200 fill-current'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.featured && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">נבחר</span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      review.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {review.status === 'approved' ? 'מאושר' : 'ממתין'}
                    </span>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{review.text}</p>

                <div className="flex gap-2 pt-4 border-t flex-wrap">
                  {review.status === 'pending' && (
                    <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleApprove(review.id)}>
                      <Check className="w-4 h-4 ml-2" />
                      אשר
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => handleToggleFeatured(review.id, review.featured)}>
                    {review.featured ? 'הסר מנבחרים' : 'סמן כנבחר'}
                  </Button>
                  <Button variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={() => handleReject(review.id)}>
                    <X className="w-4 h-4 ml-2" />
                    מחק
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
