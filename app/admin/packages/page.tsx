'use client'

import { useState, useEffect } from 'react'
import { Gift, Plus, Trash2, Loader2, Pencil, X, Save, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAllDocuments, deleteDocument, updateDocument, createDocument } from '@/lib/db'
import type { Package } from '@/lib/types'

const DEFAULT_PACKAGES: Omit<Package, 'id'>[] = [
  { name: 'עד 10 חולצות', tag: 'חדש', minQuantity: 1, maxQuantity: 10, pricePerUnit: 42, graphicDesignerCost: 250, isActive: true, sortOrder: 0, image: '/images/packages/package-10.png' },
  { name: '11-20 חולצות', tag: 'חסכוני', minQuantity: 11, maxQuantity: 20, pricePerUnit: 40, graphicDesignerCost: 250, isActive: true, sortOrder: 1, image: '/images/packages/package-11-20.png' },
  { name: '21-50 חולצות', tag: 'הכי משתלם', minQuantity: 21, maxQuantity: 50, pricePerUnit: 38, graphicDesignerCost: 0, isActive: true, sortOrder: 2, image: '/images/packages/package-21-50.png' },
]

const EMPTY_FORM: Omit<Package, 'id'> = {
  name: '',
  tag: '',
  minQuantity: 10,
  maxQuantity: 50,
  pricePerUnit: 35,
  graphicDesignerCost: 250,
  isActive: true,
  sortOrder: 0,
  image: '',
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPkg, setEditingPkg] = useState<Package | null>(null)
  const [form, setForm] = useState<Omit<Package, 'id'>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = () => {
    getAllDocuments<Package>('packages')
      .then(pkgs => setPackages(pkgs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const openCreate = () => {
    setEditingPkg(null)
    setForm({ ...EMPTY_FORM, sortOrder: packages.length })
    setModalOpen(true)
  }

  const openEdit = (pkg: Package) => {
    setEditingPkg(pkg)
    setForm({
      name: pkg.name,
      tag: pkg.tag,
      minQuantity: pkg.minQuantity,
      maxQuantity: pkg.maxQuantity,
      pricePerUnit: pkg.pricePerUnit,
      graphicDesignerCost: pkg.graphicDesignerCost,
      isActive: pkg.isActive,
      sortOrder: pkg.sortOrder,
      image: pkg.image ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { alert('יש להזין שם חבילה'); return }
    setSaving(true)
    try {
      if (editingPkg) {
        await updateDocument<Package>('packages', editingPkg.id, form as any)
        setPackages(prev => prev.map(p => p.id === editingPkg.id ? { ...p, ...form } : p))
      } else {
        const newId = await createDocument<Package>('packages', form)
        setPackages(prev => [...prev, { id: newId, ...form }].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
      }
      setModalOpen(false)
    } catch (e) {
      console.error(e)
      alert('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await updateDocument<Package>('packages', id, { isActive: !current } as any)
      setPackages(prev => prev.map(p => p.id === id ? { ...p, isActive: !current } : p))
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון סטטוס חבילה')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק את החבילה?')) return
    try {
      await deleteDocument('packages', id)
      setPackages(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      console.error(e)
      alert('שגיאה במחיקת חבילה')
    }
  }

  const handleSeedDefaults = async () => {
    const msg = packages.length > 0
      ? `יש כבר ${packages.length} חבילות. למחוק הכל ולהחליף בברירות מחדל?`
      : 'להוסיף 3 חבילות ברירת מחדל?'
    if (!confirm(msg)) return
    try {
      for (const pkg of packages) {
        await deleteDocument('packages', pkg.id)
      }
      for (const pkg of DEFAULT_PACKAGES) {
        await createDocument<Package>('packages', pkg)
      }
      loadPackages()
    } catch (e) {
      console.error(e)
      alert('שגיאה בהוספת חבילות')
    }
  }

  const num = (v: string) => Number(v) || 0

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">ניהול חבילות</h1>
          <p className="text-gray-600">הגדרת חבילות מוצרים ומבצעים</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={handleSeedDefaults}>
            <Database className="w-4 h-4 ml-2" />
            הזן חבילות ברירת מחדל
          </Button>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={openCreate}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף חבילה
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Gift className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-4">אין חבילות</p>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={openCreate}>
            <Plus className="w-4 h-4 ml-2" />
            צור חבילה ראשונה
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{pkg.name}</h3>
                    <span className="text-sm text-gray-500">{pkg.tag}</span>
                  </div>
                </div>
                <span className={`w-3 h-3 rounded-full ${pkg.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">כמות מינימלית</p>
                  <p className="font-bold text-blue-600">{pkg.minQuantity}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">כמות מקסימלית</p>
                  <p className="font-bold text-purple-600">{pkg.maxQuantity}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">מחיר ליחידה</p>
                  <p className="font-bold text-green-600">₪{pkg.pricePerUnit}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">עלות גרפיקאי</p>
                  <p className="font-bold text-orange-600">{pkg.graphicDesignerCost === 0 ? 'חינם' : `₪${pkg.graphicDesignerCost}`}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleToggle(pkg.id, pkg.isActive)}>
                  {pkg.isActive ? 'השבת' : 'הפעל'}
                </Button>
                <Button size="sm" variant="outline" className="border-blue-500 text-blue-600" onClick={() => openEdit(pkg)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="border-red-500 text-red-600" onClick={() => handleDelete(pkg.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">{editingPkg ? 'עריכת חבילה' : 'חבילה חדשה'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם החבילה *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder='לדוגמה: "חבילה בסיסית"' />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תג</label>
                <Input value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} placeholder='לדוגמה: "חדש", "הכי משתלם"' />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">קישור תמונה (URL)</label>
                <Input value={form.image ?? ''} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder='https://...' />
                {form.image && (
                  <img src={form.image} alt="preview" className="mt-2 h-24 w-full object-cover rounded-lg" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">כמות מינימלית</label>
                  <Input type="number" min="1" value={form.minQuantity} onChange={e => setForm(f => ({ ...f, minQuantity: num(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">כמות מקסימלית</label>
                  <Input type="number" min="1" value={form.maxQuantity} onChange={e => setForm(f => ({ ...f, maxQuantity: num(e.target.value) }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מחיר ליחידה (₪)</label>
                  <Input type="number" min="0" value={form.pricePerUnit} onChange={e => setForm(f => ({ ...f, pricePerUnit: num(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">עלות גרפיקאי (₪)</label>
                  <Input type="number" min="0" value={form.graphicDesignerCost} onChange={e => setForm(f => ({ ...f, graphicDesignerCost: num(e.target.value) }))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סדר תצוגה</label>
                <Input type="number" min="0" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: num(e.target.value) }))} />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">פעיל</span>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-yellow-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t">
              <Button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                {saving ? 'שומר...' : 'שמור'}
              </Button>
              <Button variant="outline" onClick={() => setModalOpen(false)}>ביטול</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
