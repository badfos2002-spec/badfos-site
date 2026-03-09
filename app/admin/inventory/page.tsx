'use client'

import { useState, useEffect } from 'react'
import { Search, AlertTriangle, Loader2, Archive, Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getAllDocuments, updateDocument, createDocument } from '@/lib/db'
import type { InventoryItem } from '@/lib/types'
import { Timestamp } from 'firebase/firestore'

const productTypeLabels: Record<string, string> = {
  tshirt: 'חולצה',
  sweatshirt: 'סווטשרט',
  buff: 'באף',
  cap: 'כובע',
  apron: 'סינר',
}

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ productType: 'tshirt', fabricType: '', color: '', size: 'M', quantity: 0, lowStockThreshold: 5 })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    getAllDocuments<InventoryItem>('inventory')
      .then(setInventory)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSaveQty = async (id: string) => {
    const qty = Number(editQty)
    if (isNaN(qty) || qty < 0) {
      alert('יש להזין כמות חוקית (מספר שלם אפס ומעלה)')
      return
    }
    try {
      await updateDocument<InventoryItem>('inventory', id, { quantity: qty } as any)
      setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
      setEditingId(null)
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון כמות')
    }
  }

  const handleAddItem = async () => {
    if (!addForm.color.trim() || !addForm.size.trim()) { alert('נא למלא צבע ומידה'); return }
    setAdding(true)
    try {
      const id = await createDocument<InventoryItem>('inventory', {
        productType: addForm.productType as any,
        ...(addForm.fabricType && { fabricType: addForm.fabricType }),
        color: addForm.color,
        size: addForm.size,
        quantity: addForm.quantity,
        lowStockThreshold: addForm.lowStockThreshold,
        updatedAt: Timestamp.now(),
      } as any)
      setInventory(prev => [...prev, { id, ...addForm, updatedAt: Timestamp.now() } as any])
      setAddForm({ productType: 'tshirt', fabricType: '', color: '', size: 'M', quantity: 0, lowStockThreshold: 5 })
      setAddOpen(false)
    } catch (e) {
      console.error(e)
      alert('שגיאה בהוספת פריט')
    } finally {
      setAdding(false)
    }
  }

  const filtered = inventory.filter(item =>
    !searchTerm ||
    (productTypeLabels[item.productType] ?? item.productType).includes(searchTerm) ||
    item.color.includes(searchTerm) ||
    item.size.includes(searchTerm)
  )

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול מלאי</h1>
          <p className="text-gray-600">מעקב אחר כמויות במלאי</p>
        </div>
        <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף פריט
        </Button>
      </div>

      {/* Add Item Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl" onClick={() => setAddOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">הוסף פריט מלאי</h2>
              <button onClick={() => setAddOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">סוג מוצר</label>
              <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" value={addForm.productType} onChange={e => setAddForm(f => ({ ...f, productType: e.target.value }))}>
                <option value="tshirt">חולצה</option>
                <option value="sweatshirt">סווטשרט</option>
                <option value="buff">באף</option>
                <option value="apron">סינר</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">צבע *</label>
                <Input value={addForm.color} onChange={e => setAddForm(f => ({ ...f, color: e.target.value }))} placeholder="לבן, שחור..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">מידה *</label>
                <Input value={addForm.size} onChange={e => setAddForm(f => ({ ...f, size: e.target.value }))} placeholder="M, L, XL..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">כמות</label>
                <Input type="number" min="0" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">סף מלאי נמוך</label>
                <Input type="number" min="0" value={addForm.lowStockThreshold} onChange={e => setAddForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleAddItem} disabled={adding}>
                {adding ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                הוסף
              </Button>
              <Button variant="outline" onClick={() => setAddOpen(false)}>ביטול</Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            placeholder="חיפוש לפי מוצר, צבע, מידה..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Archive className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">אין פריטי מלאי</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-bold">מוצר</th>
                <th className="px-6 py-4 text-right text-sm font-bold">בד</th>
                <th className="px-6 py-4 text-right text-sm font-bold">צבע</th>
                <th className="px-6 py-4 text-right text-sm font-bold">מידה</th>
                <th className="px-6 py-4 text-right text-sm font-bold">כמות</th>
                <th className="px-6 py-4 text-right text-sm font-bold">סטטוס</th>
                <th className="px-6 py-4 text-right text-sm font-bold">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item) => {
                const isLow = item.quantity < item.lowStockThreshold
                return (
                  <tr key={item.id} className="hover:bg-yellow-50/40 transition-colors cursor-pointer" onClick={() => { if (editingId !== item.id) { setEditingId(item.id); setEditQty(String(item.quantity)) } }}>
                    <td className="px-6 py-4 font-medium">{productTypeLabels[item.productType] ?? item.productType}</td>
                    <td className="px-6 py-4 text-gray-600">{item.fabricType ?? '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{item.color}</td>
                    <td className="px-6 py-4 text-gray-600">{item.size}</td>
                    <td className="px-6 py-4">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Input
                            type="number"
                            value={editQty}
                            onChange={e => setEditQty(e.target.value)}
                            className="w-20 h-8 text-sm"
                          />
                          <Button size="sm" className="h-8 bg-green-500 hover:bg-green-600 text-white" onClick={() => handleSaveQty(item.id)}>שמור</Button>
                          <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingId(null)}>ביטול</Button>
                        </div>
                      ) : (
                        <span className={`font-bold ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                          {item.quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          מלאי נמוך
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          במלאי
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(item.id); setEditQty(String(item.quantity)) }}>
                        עדכן כמות
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
