'use client'

import { useState, useEffect, useRef } from 'react'
import { Shirt, Plus, Minus, Trash2, Loader2, Pencil, X, Save, Upload, Star, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getAllBrandProducts,
  createBrandProduct,
  updateBrandProduct,
  deleteBrandProduct,
  type BrandProductInput,
} from '@/lib/db'
import { uploadSiteImage, validateFile, generateUniqueFileName } from '@/lib/storage'
import type { BrandProduct, BrandProductSize } from '@/lib/types'

// מלאי של 2 ומטה נחשב נמוך — מסומן באדום ברשימה ובטופס
const LOW_STOCK = 2

// הצעת ברירת מחדל לסט המידות — ניתן להוסיף/למחוק מידות בכל מוצר
const DEFAULT_SIZES: BrandProductSize[] = ['S', 'M', 'L', 'XL', 'XXL'].map(size => ({ size, stock: 0 }))

const EMPTY_FORM: BrandProductInput = {
  name: '',
  description: '',
  price: 0,
  images: [],
  sizes: DEFAULT_SIZES,
  active: true,
  sortOrder: 0,
}

const totalStock = (sizes: BrandProductSize[]) => sizes.reduce((sum, s) => sum + (s.stock || 0), 0)

const sortProducts = (list: BrandProduct[]) =>
  [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

export default function AdminBrandPage() {
  const [products, setProducts] = useState<BrandProduct[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<BrandProduct | null>(null)
  const [form, setForm] = useState<BrandProductInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setProducts(await getAllBrandProducts())
    } catch (e) {
      console.error(e)
      alert('שגיאה בטעינת קטלוג המותג')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingProduct(null)
    setForm({
      ...EMPTY_FORM,
      sizes: DEFAULT_SIZES.map(s => ({ ...s })),
      sortOrder: products.length,
    })
    setModalOpen(true)
  }

  const openEdit = (product: BrandProduct) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      images: [...product.images],
      sizes: product.sizes.map(s => ({ ...s })),
      active: product.active,
      sortOrder: product.sortOrder,
    })
    setModalOpen(true)
  }

  // ── תמונות ────────────────────────────────────────────────────────────────
  const handleImageUpload = async (file: File | null) => {
    if (!file) return
    const validation = validateFile(file, 10, ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
    if (!validation.valid) { alert(validation.error); return }
    setUploadingImage(true)
    try {
      const fileName = generateUniqueFileName(file.name)
      // אותו נתיב Storage של תמונות האתר (site-images/) — העלאה מאומתת של אדמין
      const downloadUrl = await uploadSiteImage(file, 'brand', fileName)
      setForm(f => ({ ...f, images: [...f.images, downloadUrl] }))
    } catch (e) {
      console.error(e)
      alert('שגיאה בהעלאת התמונה. בדוק את הרשאות Firebase Storage.')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const makePrimaryImage = (index: number) => {
    setForm(f => {
      const images = [...f.images]
      const [img] = images.splice(index, 1)
      return { ...f, images: [img, ...images] }
    })
  }

  const removeImage = (index: number) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }))
  }

  // ── מידות ומלאי ───────────────────────────────────────────────────────────
  const setSizeName = (index: number, size: string) => {
    setForm(f => ({ ...f, sizes: f.sizes.map((s, i) => i === index ? { ...s, size } : s) }))
  }

  const setStock = (index: number, stock: number) => {
    const safe = Math.max(0, Math.floor(stock) || 0)
    setForm(f => ({ ...f, sizes: f.sizes.map((s, i) => i === index ? { ...s, stock: safe } : s) }))
  }

  const stepStock = (index: number, delta: number) => {
    setForm(f => ({
      ...f,
      sizes: f.sizes.map((s, i) => i === index ? { ...s, stock: Math.max(0, s.stock + delta) } : s),
    }))
  }

  const addSizeRow = () => {
    setForm(f => ({ ...f, sizes: [...f.sizes, { size: '', stock: 0 }] }))
  }

  const removeSizeRow = (index: number) => {
    setForm(f => ({ ...f, sizes: f.sizes.filter((_, i) => i !== index) }))
  }

  // ── שמירה ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { alert('יש להזין שם מוצר'); return }
    if (form.price <= 0) { alert('יש להזין מחיר גדול מ-0'); return }
    const sizes = form.sizes
      .map(s => ({ size: s.size.trim(), stock: s.stock }))
      .filter(s => s.size !== '')
    if (sizes.length === 0) { alert('יש להוסיף לפחות מידה אחת'); return }
    if (new Set(sizes.map(s => s.size)).size !== sizes.length) { alert('יש מידה כפולה — כל מידה יכולה להופיע פעם אחת'); return }

    const payload: BrandProductInput = {
      name: form.name.trim(),
      description: form.description,
      price: form.price,
      images: form.images,
      sizes,
      active: form.active,
      sortOrder: form.sortOrder,
    }

    setSaving(true)
    try {
      if (editingProduct) {
        await updateBrandProduct(editingProduct.id, payload)
        setProducts(prev => sortProducts(prev.map(p => p.id === editingProduct.id ? { ...p, ...payload } : p)))
      } else {
        const newId = await createBrandProduct(payload)
        setProducts(prev => sortProducts([...prev, { ...payload, id: newId } as BrandProduct]))
      }
      setModalOpen(false)
    } catch (e) {
      console.error(e)
      alert('שגיאה בשמירת המוצר')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (product: BrandProduct) => {
    try {
      await updateBrandProduct(product.id, { active: !product.active })
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: !product.active } : p))
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון סטטוס המוצר')
    }
  }

  const handleDelete = async (product: BrandProduct) => {
    if (!confirm(`למחוק את "${product.name}" מקטלוג המותג?\nהמוצר, המחיר והמלאי שלו יימחקו לצמיתות והוא לא יוצג יותר בחנות.`)) return
    try {
      await deleteBrandProduct(product.id)
      setProducts(prev => prev.filter(p => p.id !== product.id))
    } catch (e) {
      console.error(e)
      alert('שגיאה במחיקת המוצר')
    }
  }

  const num = (v: string) => Number(v) || 0

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">קטלוג המותג</h1>
          <p className="text-gray-600">ניהול מוצרי המותג — מחירים, תמונות ומלאי</p>
        </div>
        <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={openCreate}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף מוצר
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Shirt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-4">אין מוצרים בקטלוג</p>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={openCreate}>
            <Plus className="w-4 h-4 ml-2" />
            צור מוצר ראשון
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const stock = totalStock(product.sizes)
            const hasLowStock = product.sizes.some(s => s.stock <= LOW_STOCK)
            return (
              <div key={product.id} className={`bg-white rounded-2xl shadow-lg overflow-hidden ${!product.active ? 'opacity-60' : ''}`}>
                <div className="aspect-square bg-gray-100 relative">
                  {product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Shirt className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  {hasLowStock && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      מלאי נמוך
                    </span>
                  )}
                  {!product.active && (
                    <span className="absolute top-2 left-2 bg-gray-700 text-white text-xs font-medium px-2 py-1 rounded-full">
                      מוסתר
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-bold text-lg text-gray-900 truncate">{product.name}</h3>
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${product.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="font-bold text-green-600">₪{product.price}</span>
                    <span className="text-gray-600">מלאי כולל: <b>{stock}</b></span>
                    <span className="text-gray-400 text-xs">סדר: {product.sortOrder}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {product.sizes.map(s => (
                      <span
                        key={s.size}
                        className={`text-xs px-2 py-1 rounded-full border ${
                          s.stock <= LOW_STOCK
                            ? 'bg-red-50 text-red-600 border-red-200 font-medium'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {s.size} · {s.stock}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleToggleActive(product)}>
                      {product.active ? 'השבת' : 'הפעל'}
                    </Button>
                    <Button size="sm" variant="outline" className="border-blue-500 text-blue-600" onClick={() => openEdit(product)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500 text-red-600" onClick={() => handleDelete(product)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">{editingProduct ? 'עריכת מוצר' : 'מוצר חדש'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full" aria-label="סגור">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם המוצר</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder='לדוגמה: חולצת לוגו שחורה' />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תיאור (אופציונלי)</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="תיאור קצר שיוצג בחנות"
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מחיר (₪)</label>
                  <Input type="number" min="0" aria-label="מחיר בשקלים" value={form.price} onChange={e => setForm(f => ({ ...f, price: num(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">סדר תצוגה</label>
                  <Input type="number" min="0" aria-label="סדר תצוגה" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: num(e.target.value) }))} />
                </div>
              </div>

              {/* תמונות */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תמונות המוצר</label>
                <div className="grid grid-cols-3 gap-2">
                  {form.images.map((url, i) => (
                    <div key={url} className="relative border-2 border-gray-200 rounded-lg overflow-hidden">
                      <img src={url} alt={`תמונה ${i + 1}`} className="aspect-square w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1 right-1 bg-yellow-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                          ראשית
                        </span>
                      )}
                      <div className="absolute bottom-1 left-1 flex gap-1">
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={() => makePrimaryImage(i)}
                            className="p-1 bg-white/90 hover:bg-white rounded-full shadow"
                            title="הפוך לתמונה ראשית"
                            aria-label="הפוך לתמונה ראשית"
                          >
                            <Star className="w-3.5 h-3.5 text-yellow-500" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="p-1 bg-white/90 hover:bg-white rounded-full shadow"
                          title="הסר תמונה"
                          aria-label="הסר תמונה"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <label className={`aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-yellow-500 hover:text-yellow-600 transition-colors ${uploadingImage ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
                    {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    <span className="text-xs">{uploadingImage ? 'מעלה...' : 'העלאה'}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={e => handleImageUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">JPG / PNG / WEBP — עד 10MB. התמונה הראשונה היא הראשית בחנות.</p>
              </div>

              {/* מידות ומלאי */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מידות ומלאי</label>
                <div className="space-y-2">
                  {form.sizes.map((row, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-2 rounded-xl border ${
                        row.stock <= LOW_STOCK ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <Input
                        value={row.size}
                        onChange={e => setSizeName(i, e.target.value)}
                        placeholder="מידה"
                        aria-label="מידה"
                        className="w-20 text-center bg-white"
                      />

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => stepStock(i, -1)}
                          disabled={row.stock === 0}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label={`הפחת מלאי ${row.size}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={row.stock}
                          onChange={e => setStock(i, Number(e.target.value))}
                          className="w-14 h-8 text-center text-sm border border-gray-300 rounded-lg bg-white focus:border-yellow-500 focus:outline-none"
                          aria-label={`מלאי ${row.size}`}
                        />
                        <button
                          type="button"
                          onClick={() => stepStock(i, 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100"
                          aria-label={`הוסף מלאי ${row.size}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {row.stock <= LOW_STOCK && (
                        <span className="text-xs text-red-600 font-medium whitespace-nowrap">מלאי נמוך</span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeSizeRow(i)}
                        className="p-1.5 hover:bg-red-50 rounded-lg mr-auto"
                        title="הסר מידה"
                        aria-label={`הסר מידה ${row.size}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="mt-2" onClick={addSizeRow}>
                  <Plus className="w-4 h-4 ml-1" />
                  הוסף מידה
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">מוצג בחנות</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.active}
                  aria-label="מוצג בחנות"
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-yellow-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t">
              <Button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleSave} disabled={saving || uploadingImage}>
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
