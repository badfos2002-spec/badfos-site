'use client'

import { useState, useEffect } from 'react'
import { Percent, Plus, Trash2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAllDocuments, createDocument, updateDocument, deleteDocument } from '@/lib/db'
import type { Discount, DiscountCategory } from '@/lib/types'

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

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    getAllDocuments<Discount>('discounts')
      .then(setDiscounts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const openAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (d: Discount) => {
    setForm({
      name: d.name,
      type: d.type,
      category: d.category,
      minQuantity: d.minQuantity,
      discountPercent: d.discountPercent,
      isActive: d.isActive,
    })
    setEditingId(d.id)
    setShowModal(true)
  }

  const handleSave = async () => {
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

  const handleToggle = async (d: Discount) => {
    try {
      await updateDocument<Discount>('discounts', d.id, { isActive: !d.isActive } as any)
      setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, isActive: !x.isActive } : x))
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק את ההנחה?')) return
    try {
      await deleteDocument('discounts', id)
      setDiscounts(prev => prev.filter(d => d.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול הנחות</h1>
          <p className="text-gray-600">הגדרת כללי הנחה אוטומטיים</p>
        </div>
        <Button onClick={openAdd} className="bg-purple-500 hover:bg-purple-600 text-white">
          <Plus className="w-4 h-4 ml-2" />
          הנחה חדשה
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : discounts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Percent className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">אין הנחות מוגדרות</p>
            <p className="text-sm mt-1">לחצו על "הנחה חדשה" כדי להוסיף</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-bold">שם ההנחה</th>
                <th className="px-6 py-4 text-right text-sm font-bold">קטגוריה</th>
                <th className="px-6 py-4 text-right text-sm font-bold">כמות מינימלית</th>
                <th className="px-6 py-4 text-right text-sm font-bold">אחוז הנחה</th>
                <th className="px-6 py-4 text-right text-sm font-bold">סטטוס</th>
                <th className="px-6 py-4 text-right text-sm font-bold">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {discounts.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{d.name}</td>
                  <td className="px-6 py-4 text-gray-600">{categoryLabels[d.category] ?? d.category}</td>
                  <td className="px-6 py-4 text-gray-600">{d.minQuantity}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-purple-600">{d.discountPercent}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleToggle(d)} className="flex items-center gap-2">
                      {d.isActive ? (
                        <><ToggleRight className="w-6 h-6 text-green-500" /><span className="text-sm text-green-700 font-medium">פעיל</span></>
                      ) : (
                        <><ToggleLeft className="w-6 h-6 text-gray-400" /><span className="text-sm text-gray-500">לא פעיל</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(d)}>ערוך</Button>
                      <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={() => handleDelete(d.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md" dir="rtl">
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
                <Input
                  type="number" min={1}
                  value={form.minQuantity}
                  onChange={e => setForm(f => ({ ...f, minQuantity: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">אחוז הנחה (%)</label>
                <Input
                  type="number" min={1} max={100}
                  value={form.discountPercent}
                  onChange={e => setForm(f => ({ ...f, discountPercent: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-purple-500"
                />
                <span className="text-sm font-medium">פעיל</span>
              </label>
            </div>

            <div className="flex gap-3 mt-8">
              <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white">
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
