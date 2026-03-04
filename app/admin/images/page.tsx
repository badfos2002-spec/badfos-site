'use client'

import { useState, useEffect } from 'react'
import { Image as ImageIcon, Upload, Trash2, Eye, EyeOff, Loader2, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAllDocuments, createDocument, updateDocument, deleteDocument } from '@/lib/db'
import type { SiteImage } from '@/lib/types'
import { Timestamp } from 'firebase/firestore'

// ─── Seed Data ─────────────────────────────────────────────────────────────
const SEED_IMAGES: Omit<SiteImage, 'id' | 'createdAt'>[] = [
  // logo
  { category: 'logo', name: 'לוגו', description: 'לוגו האתר', imageUrl: '/assets/logo.png', isActive: true, sortOrder: 1 },

  // homepage_carousel – תמונות חבילות
  { category: 'homepage_carousel', name: 'חבילה עד 10 חולצות', description: '', imageUrl: '/assets/ddc5d7f82_10.png', isActive: true, sortOrder: 1 },
  { category: 'homepage_carousel', name: 'חבילה 11-20 חולצות', description: '', imageUrl: '/assets/0181cec14_11-20.png', isActive: true, sortOrder: 2 },
  { category: 'homepage_carousel', name: 'חבילה 21-50 חולצות', description: '', imageUrl: '/assets/056e4ce29_21-50.png', isActive: true, sortOrder: 3 },

  // hero_carousel – תמונות גלריה בדף הבית
  { category: 'hero_carousel', name: 'תמונה 1', description: '', imageUrl: '/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.jpg', isActive: true, sortOrder: 1 },
  { category: 'hero_carousel', name: 'תמונה 2', description: '', imageUrl: '/assets/64ab08d41_IMG_3252.jpg', isActive: true, sortOrder: 2 },
  { category: 'hero_carousel', name: 'תמונה 3', description: '', imageUrl: '/assets/a189e74e3_IMG_0490.jpg', isActive: true, sortOrder: 3 },
  { category: 'hero_carousel', name: 'תמונה 4', description: '', imageUrl: '/assets/c4660170b_IMG_6179.jpg', isActive: true, sortOrder: 4 },
  { category: 'hero_carousel', name: 'תמונה 5', description: '', imageUrl: '/assets/fdd643e9f_D747B5AC-1217-4D1F-A7B1-61C6EDE52659.jpg', isActive: true, sortOrder: 5 },

  // designable_products – כרטיסי קטגוריה בעמוד עיצוב
  { category: 'designable_products', name: 'חולצות', description: 'tshirt', imageUrl: '/assets/חולצה לבנה קדימה.png', isActive: true, sortOrder: 1 },
  { category: 'designable_products', name: 'סווטשרטים', description: 'sweatshirt', imageUrl: '/assets/סווטשרטים.png', isActive: true, sortOrder: 2 },
  { category: 'designable_products', name: 'באפים', description: 'buff', imageUrl: '/assets/רקע קטגוריית באפים.png', isActive: true, sortOrder: 3 },

  // tshirt_mockups
  { category: 'tshirt_mockups', name: 'חולצה לבנה קדימה', description: '', imageUrl: '/assets/חולצה לבנה קדימה.png', isActive: true, sortOrder: 1 },
  { category: 'tshirt_mockups', name: 'חולצה לבנה אחורה', description: '', imageUrl: '/assets/חולצה לבנה אחורה.png', isActive: true, sortOrder: 2 },
  { category: 'tshirt_mockups', name: 'חולצה שחורה קדימה', description: '', imageUrl: '/assets/חולצה שחורה קדימה.png', isActive: true, sortOrder: 3 },
  { category: 'tshirt_mockups', name: 'חולצה שחורה אחורה', description: '', imageUrl: '/assets/חולצה שחורה אחורה.png', isActive: true, sortOrder: 4 },
  { category: 'tshirt_mockups', name: 'חולצה אפורה קדימה', description: '', imageUrl: '/assets/חולצה אפורה קדימה.png', isActive: true, sortOrder: 5 },
  { category: 'tshirt_mockups', name: 'חולצה אפורה אחורה', description: '', imageUrl: '/assets/חולצה אפורה אחורה.png', isActive: true, sortOrder: 6 },
  { category: 'tshirt_mockups', name: 'חולצה כחולה קדימה', description: '', imageUrl: '/assets/חולצה כחולה קדימה.png', isActive: true, sortOrder: 7 },
  { category: 'tshirt_mockups', name: 'חולצה כחולה אחורה', description: '', imageUrl: '/assets/חולצה כחולה אחורה.png', isActive: true, sortOrder: 8 },
  { category: 'tshirt_mockups', name: 'חולצה אדומה קדימה', description: '', imageUrl: '/assets/חולצה אדומה קדימה.png', isActive: true, sortOrder: 9 },
  { category: 'tshirt_mockups', name: 'חולצה אדומה אחורה', description: '', imageUrl: '/assets/חולצה אדומה אחורה.png', isActive: true, sortOrder: 10 },
  { category: 'tshirt_mockups', name: 'חולצה בורדו קדימה', description: '', imageUrl: '/assets/חולצה קדימה בורדו.png', isActive: true, sortOrder: 11 },
  { category: 'tshirt_mockups', name: 'חולצה בורדו אחורה', description: '', imageUrl: '/assets/חולצה אחורה בורדו.png', isActive: true, sortOrder: 12 },
  { category: 'tshirt_mockups', name: 'חולצה ירוק זית קדימה', description: '', imageUrl: '/assets/חולצה קדימה ירוק זית.png', isActive: true, sortOrder: 13 },
  { category: 'tshirt_mockups', name: 'חולצה ירוק זית אחורה', description: '', imageUrl: '/assets/חולצה אחורה ירוק זית.png', isActive: true, sortOrder: 14 },

  // sweatshirt_mockups
  { category: 'sweatshirt_mockups', name: 'סווטשרט לבן קדימה', description: '', imageUrl: '/assets/סווטשרט חזית לבן.png', isActive: true, sortOrder: 1 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט לבן אחורה', description: '', imageUrl: '/assets/סווטשירט גב לבן.png', isActive: true, sortOrder: 2 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט אפור קדימה', description: '', imageUrl: '/assets/סווטשרט חזית אפור.png', isActive: true, sortOrder: 3 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט אפור אחורה', description: '', imageUrl: '/assets/סווטשירט גב אפור.png', isActive: true, sortOrder: 4 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט כחול קדימה', description: '', imageUrl: '/assets/סווטשרט חזית כחול.png', isActive: true, sortOrder: 5 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט כחול אחורה', description: '', imageUrl: '/assets/סווטשירט גב כחול.png', isActive: true, sortOrder: 6 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט אדום קדימה', description: '', imageUrl: '/assets/סווטשרט חזית אדום.png', isActive: true, sortOrder: 7 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט אדום אחורה', description: '', imageUrl: '/assets/סווטשירט גב אדום.png', isActive: true, sortOrder: 8 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט קדימה', description: '', imageUrl: '/assets/סווטשרט חזית.png', isActive: true, sortOrder: 9 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט אחורה', description: '', imageUrl: '/assets/סווטשירט גב.png', isActive: true, sortOrder: 10 },

  // buff_mockups
  { category: 'buff_mockups' as any, name: 'באף כחול', description: '', imageUrl: '/assets/באף כחול.png', isActive: true, sortOrder: 1 },
  { category: 'buff_mockups' as any, name: 'באף אדום', description: '', imageUrl: '/assets/באף אדום.png', isActive: true, sortOrder: 2 },
  { category: 'buff_mockups' as any, name: 'באף כתום', description: '', imageUrl: '/assets/באף כתום.png', isActive: true, sortOrder: 3 },
  { category: 'buff_mockups' as any, name: 'באף סגול', description: '', imageUrl: '/assets/באף סגול.png', isActive: true, sortOrder: 4 },
  { category: 'buff_mockups' as any, name: 'באף ירוק', description: '', imageUrl: '/assets/באף ירוק.png', isActive: true, sortOrder: 5 },
  { category: 'buff_mockups' as any, name: 'באף תכלת', description: '', imageUrl: '/assets/באף תכלת.png', isActive: true, sortOrder: 6 },
]

const categoryLabels: Record<string, string> = {
  logo: 'לוגו',
  hero_carousel: 'קרוסלת גלריה (דף הבית)',
  homepage_carousel: 'קרוסלת חבילות',
  designable_products: 'מוצרים לעיצוב',
  tshirt_mockups: 'מוקאפים חולצות',
  sweatshirt_mockups: 'מוקאפים סווטשרטים',
  buff_mockups: 'מוקאפים באפים',
  about_main: 'אודות ראשי',
  about_process: 'תהליך אודות',
  video: 'וידאו',
}

const ALL_CATEGORIES = [...new Set(SEED_IMAGES.map(i => i.category))]

export default function AdminImagesPage() {
  const [images, setImages] = useState<SiteImage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const data = await getAllDocuments<SiteImage>('siteImages')
      setImages(data.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
    } catch (e) {
      console.error(e)
      setLoadError(true)
      alert('שגיאה בטעינת תמונות מ-Firebase. בדוק הרשאות Firestore.')
    } finally {
      setLoading(false)
    }
  }

  const handleSeed = async () => {
    if (!confirm(`להזין תמונות חדשות ל-Firebase? (כפילויות ידולגו)`)) return
    setSeeding(true)
    try {
      const existing = await getAllDocuments<SiteImage>('siteImages')
      const existingUrls = new Set(existing.map(i => i.imageUrl))
      const toAdd = SEED_IMAGES.filter(img => !existingUrls.has(img.imageUrl))
      if (toAdd.length === 0) {
        alert('✅ כל התמונות כבר קיימות במערכת')
        return
      }
      for (const img of toAdd) {
        await createDocument<SiteImage>('siteImages', {
          ...img,
          createdAt: Timestamp.now(),
        } as any)
      }
      await loadImages()
      alert(`✅ נוספו ${toAdd.length} תמונות חדשות!`)
    } catch (e) {
      console.error(e)
      alert('❌ שגיאה בהזנת התמונות')
    } finally {
      setSeeding(false)
    }
  }

  const handleDeleteDuplicates = async () => {
    if (!confirm('למחוק כפילויות? (ישמר רק עותק אחד לכל URL)')) return
    setSeeding(true)
    try {
      const existing = await getAllDocuments<SiteImage>('siteImages')
      const seen = new Map<string, string>() // url → first id
      const toDelete: string[] = []
      for (const img of existing.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0))) {
        if (seen.has(img.imageUrl)) {
          toDelete.push(img.id)
        } else {
          seen.set(img.imageUrl, img.id)
        }
      }
      if (toDelete.length === 0) {
        alert('אין כפילויות')
        return
      }
      for (const id of toDelete) {
        await deleteDocument('siteImages', id)
      }
      await loadImages()
      alert(`✅ נמחקו ${toDelete.length} כפילויות`)
    } catch (e) {
      console.error(e)
      alert('❌ שגיאה במחיקת כפילויות')
    } finally {
      setSeeding(false)
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await updateDocument<SiteImage>('siteImages', id, { isActive: !current } as any)
      setImages(prev => prev.map(i => i.id === id ? { ...i, isActive: !current } : i))
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק תמונה זו?')) return
    try {
      await deleteDocument('siteImages', id)
      setImages(prev => prev.filter(i => i.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const filtered = activeCategory === 'all'
    ? images
    : images.filter(i => i.category === activeCategory)

  const categories = ['all', ...new Set(images.map(i => i.category))]

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול תמונות</h1>
          <p className="text-gray-600">ניהול תמונות האתר לפי קטגוריות</p>
        </div>
        <div className="flex gap-2">
          {images.length > 0 && (
            <Button
              variant="outline"
              className="border-red-400 text-red-600 hover:bg-red-50"
              onClick={handleDeleteDuplicates}
              disabled={seeding || loading}
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              מחק כפילויות
            </Button>
          )}
          <Button
            className="bg-green-500 hover:bg-green-600 text-white"
            onClick={handleSeed}
            disabled={seeding || loading}
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Database className="w-4 h-4 ml-2" />}
            {seeding ? 'מזין...' : images.length === 0 ? 'הזן כל התמונות' : 'הוסף תמונות ברירת מחדל'}
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-yellow-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
              }`}
            >
              {cat === 'all' ? `הכל (${images.length})` : `${categoryLabels[cat] ?? cat} (${images.filter(i => i.category === cat).length})`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-xl font-medium text-gray-700 mb-2">
            {loadError ? 'שגיאה בטעינת תמונות' : 'אין תמונות עדיין'}
          </p>
          <p className="text-gray-500 mb-6">
            {loadError
              ? 'בדוק הרשאות Firestore ואת חיבור Firebase'
              : 'לחץ על "הזן כל התמונות" כדי לטעון את כל תמונות האתר ל-Firebase'}
          </p>
          {!loadError && (
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={handleSeed}
              disabled={seeding}
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Database className="w-4 h-4 ml-2" />}
              {seeding ? 'מזין תמונות...' : 'הזן כל התמונות'}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((image) => (
            <div key={image.id} className={`bg-white rounded-2xl shadow-lg overflow-hidden ${!image.isActive ? 'opacity-50' : ''}`}>
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                <img
                  src={image.imageUrl}
                  alt={image.name}
                  className="w-full h-full object-contain p-2"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900 text-sm truncate">{image.name}</h3>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${image.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <p className="text-xs text-gray-500 mb-3">{categoryLabels[image.category] ?? image.category}</p>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className={`flex-1 text-xs ${image.isActive ? 'border-yellow-500 text-yellow-600' : 'border-green-500 text-green-600'}`}
                    onClick={() => handleToggle(image.id, image.isActive)}
                  >
                    {image.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-600 text-xs"
                    onClick={() => handleDelete(image.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
