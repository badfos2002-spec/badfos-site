'use client'

import { useState, useEffect } from 'react'
import { Image as ImageIcon, Upload, Trash2, Eye, EyeOff, Loader2, Database, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAllDocuments, createDocument, updateDocument, deleteDocument } from '@/lib/db'
import { uploadSiteImage, validateFile, generateUniqueFileName } from '@/lib/storage'
import { GALLERY_SECTIONS } from '@/lib/constants'
import type { SiteImage, GallerySection } from '@/lib/types'
import { Timestamp } from 'firebase/firestore'

// ─── Seed Data ─────────────────────────────────────────────────────────────
const SEED_IMAGES: Omit<SiteImage, 'id' | 'createdAt'>[] = [
  // logo
  { category: 'logo', name: 'לוגו', description: 'לוגו האתר', imageUrl: '/assets/logo.webp', isActive: true, sortOrder: 1 },

  // homepage_carousel – תמונות חבילות
  { category: 'homepage_carousel', name: 'חבילה עד 10 חולצות', description: '', imageUrl: '/assets/ddc5d7f82_10.webp', isActive: true, sortOrder: 1 },
  { category: 'homepage_carousel', name: 'חבילה 11-20 חולצות', description: '', imageUrl: '/assets/0181cec14_11-20.webp', isActive: true, sortOrder: 2 },
  { category: 'homepage_carousel', name: 'חבילה 21-50 חולצות', description: '', imageUrl: '/assets/056e4ce29_21-50.webp', isActive: true, sortOrder: 3 },

  // hero_carousel – תמונות גלריה בדף הבית
  { category: 'hero_carousel', name: 'תמונה 1', description: '', imageUrl: '/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.webp', isActive: true, sortOrder: 1 },
  { category: 'hero_carousel', name: 'תמונה 2', description: '', imageUrl: '/assets/64ab08d41_IMG_3252.webp', isActive: true, sortOrder: 2 },
  { category: 'hero_carousel', name: 'תמונה 3', description: '', imageUrl: '/assets/a189e74e3_IMG_0490.webp', isActive: true, sortOrder: 3 },
  { category: 'hero_carousel', name: 'תמונה 4', description: '', imageUrl: '/assets/c4660170b_IMG_6179.webp', isActive: true, sortOrder: 4 },
  { category: 'hero_carousel', name: 'תמונה 5', description: '', imageUrl: '/assets/fdd643e9f_D747B5AC-1217-4D1F-A7B1-61C6EDE52659.webp', isActive: true, sortOrder: 5 },

  // designable_products – כרטיסי קטגוריה בעמוד עיצוב
  { category: 'designable_products', name: 'חולצות', description: 'tshirt', imageUrl: '/assets/חולצה לבנה קדימה.webp', isActive: true, sortOrder: 1 },
  { category: 'designable_products', name: 'סווטשרטים', description: 'sweatshirt', imageUrl: '/assets/סווטשרטים.webp', isActive: true, sortOrder: 2 },
  { category: 'designable_products', name: 'באפים', description: 'buff', imageUrl: '/assets/רקע קטגוריית באפים.webp', isActive: true, sortOrder: 3 },

  // tshirt_mockups
  { category: 'tshirt_mockups', name: 'חולצה לבנה קדימה', description: '', imageUrl: '/assets/חולצה לבנה קדימה.webp', isActive: true, sortOrder: 1 },
  { category: 'tshirt_mockups', name: 'חולצה לבנה אחורה', description: '', imageUrl: '/assets/חולצה לבנה אחורה.webp', isActive: true, sortOrder: 2 },
  { category: 'tshirt_mockups', name: 'חולצה שחורה קדימה', description: '', imageUrl: '/assets/חולצה שחורה קדימה.webp', isActive: true, sortOrder: 3 },
  { category: 'tshirt_mockups', name: 'חולצה שחורה אחורה', description: '', imageUrl: '/assets/חולצה שחורה אחורה.webp', isActive: true, sortOrder: 4 },
  { category: 'tshirt_mockups', name: 'חולצה אפורה קדימה', description: '', imageUrl: '/assets/חולצה אפורה קדימה.webp', isActive: true, sortOrder: 5 },
  { category: 'tshirt_mockups', name: 'חולצה אפורה אחורה', description: '', imageUrl: '/assets/חולצה אפורה אחורה.webp', isActive: true, sortOrder: 6 },
  { category: 'tshirt_mockups', name: 'חולצה כחולה קדימה', description: '', imageUrl: '/assets/חולצה כחולה קדימה.webp', isActive: true, sortOrder: 7 },
  { category: 'tshirt_mockups', name: 'חולצה כחולה אחורה', description: '', imageUrl: '/assets/חולצה כחולה אחורה.webp', isActive: true, sortOrder: 8 },
  { category: 'tshirt_mockups', name: 'חולצה אדומה קדימה', description: '', imageUrl: '/assets/חולצה אדומה קדימה.webp', isActive: true, sortOrder: 9 },
  { category: 'tshirt_mockups', name: 'חולצה אדומה אחורה', description: '', imageUrl: '/assets/חולצה אדומה אחורה.webp', isActive: true, sortOrder: 10 },
  { category: 'tshirt_mockups', name: 'חולצה בורדו קדימה', description: '', imageUrl: '/assets/חולצה קדימה בורדו.webp', isActive: true, sortOrder: 11 },
  { category: 'tshirt_mockups', name: 'חולצה בורדו אחורה', description: '', imageUrl: '/assets/חולצה אחורה בורדו.webp', isActive: true, sortOrder: 12 },
  { category: 'tshirt_mockups', name: 'חולצה ירוק זית קדימה', description: '', imageUrl: '/assets/חולצה קדימה ירוק זית.webp', isActive: true, sortOrder: 13 },
  { category: 'tshirt_mockups', name: 'חולצה ירוק זית אחורה', description: '', imageUrl: '/assets/חולצה אחורה ירוק זית.webp', isActive: true, sortOrder: 14 },

  // sweatshirt_mockups
  { category: 'sweatshirt_mockups', name: 'סווטשרט לבן קדימה', description: '', imageUrl: '/assets/סווטשרט חזית לבן.webp', isActive: true, sortOrder: 1 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט לבן אחורה', description: '', imageUrl: '/assets/סווטשירט גב לבן.webp', isActive: true, sortOrder: 2 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט אפור קדימה', description: '', imageUrl: '/assets/סווטשרט חזית אפור.webp', isActive: true, sortOrder: 3 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט אפור אחורה', description: '', imageUrl: '/assets/סווטשירט גב אפור.webp', isActive: true, sortOrder: 4 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט כחול קדימה', description: '', imageUrl: '/assets/סווטשרט חזית כחול.webp', isActive: true, sortOrder: 5 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט כחול אחורה', description: '', imageUrl: '/assets/סווטשירט גב כחול.webp', isActive: true, sortOrder: 6 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט אדום קדימה', description: '', imageUrl: '/assets/סווטשרט חזית אדום.webp', isActive: true, sortOrder: 7 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט אדום אחורה', description: '', imageUrl: '/assets/סווטשירט גב אדום.webp', isActive: true, sortOrder: 8 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט קדימה', description: '', imageUrl: '/assets/סווטשרט חזית.webp', isActive: true, sortOrder: 9 },
  { category: 'sweatshirt_mockups', name: 'סווטשרט אחורה', description: '', imageUrl: '/assets/סווטשירט גב.webp', isActive: true, sortOrder: 10 },

  // buff_mockups
  { category: 'buff_mockups' as any, name: 'באף כחול', description: '', imageUrl: '/assets/באף כחול.webp', isActive: true, sortOrder: 1 },
  { category: 'buff_mockups' as any, name: 'באף אדום', description: '', imageUrl: '/assets/באף אדום.webp', isActive: true, sortOrder: 2 },
  { category: 'buff_mockups' as any, name: 'באף כתום', description: '', imageUrl: '/assets/באף כתום.webp', isActive: true, sortOrder: 3 },
  { category: 'buff_mockups' as any, name: 'באף סגול', description: '', imageUrl: '/assets/באף סגול.webp', isActive: true, sortOrder: 4 },
  { category: 'buff_mockups' as any, name: 'באף ירוק', description: '', imageUrl: '/assets/באף ירוק.webp', isActive: true, sortOrder: 5 },
  { category: 'buff_mockups' as any, name: 'באף תכלת', description: '', imageUrl: '/assets/באף תכלת.webp', isActive: true, sortOrder: 6 },
  // apron_mockups
  { category: 'apron_mockups' as any, name: 'סינר אפור', description: '', imageUrl: '/assets/סינר אפור.png', isActive: true, sortOrder: 1 },
  { category: 'apron_mockups' as any, name: 'סינר לבן', description: '', imageUrl: '/assets/סינר לבן.webp', isActive: true, sortOrder: 2 },
  { category: 'apron_mockups' as any, name: 'סינר נייבי', description: '', imageUrl: '/assets/סינר נייבי.webp', isActive: true, sortOrder: 3 },
  { category: 'apron_mockups' as any, name: 'סינר שחור', description: '', imageUrl: '/assets/סינר שחור.webp', isActive: true, sortOrder: 4 },
]

// ─── ייבוא הגלריה הסטטית של /gallery ל-siteImages ──────────────────────────
// הרשימה משקפת את ה-fallback הסטטי בעמוד /gallery. אחרי הייבוא הגריד הציבורי
// נבנה 100% מה-DB. אידמפוטנטי לפי imageUrl — תמונות שכבר קיימות מדולגות.
const GALLERY_IMPORT: Omit<SiteImage, 'id' | 'createdAt'>[] = [
  // עסקים
  { category: 'gallery', gallerySection: 'business', name: 'סט חולצות לעסק — Push The Button', description: 'סט חולצות שרוול ארוך שחורות עם לוגו Push The Button — הדפסת חולצות לעסק', imageUrl: '/assets/c4660170b_IMG_6179.webp', isActive: true, sortOrder: 1 },
  { category: 'gallery', gallerySection: 'business', name: 'סט חולצות לצוות — איור דמויות', description: 'חולצות שחורות עם הדפסה אישית של איור דמויות וכיתוב בעברית — סט מותאם לצוות', imageUrl: '/assets/fdd643e9f_D747B5AC-1217-4D1F-A7B1-61C6EDE52659.webp', isActive: true, sortOrder: 2 },
  // ועוד
  { category: 'gallery', gallerySection: 'more', name: 'הדפסת גב — Sundara', description: 'לקוח לובש חולצת אוברסייז שחורה עם הדפסת גב צבעונית של שמש — Sundara, הדפסת DTF של בדפוס', imageUrl: '/assets/64ab08d41_IMG_3252.webp', isActive: true, sortOrder: 3 },
  { category: 'gallery', gallerySection: 'more', name: 'הדפסת גב — Forever Onward', description: 'לקוח בחצר לובש חולצת אוברסייז שחורה עם הדפסת גב — Forever Onward Moving Onward', imageUrl: '/assets/17c316b38_a3e2972a-35b1-4c08-a15d-c61ebe4f68712.webp', isActive: true, sortOrder: 4 },
  { category: 'gallery', gallerySection: 'more', name: 'אוברסייז אפורה — Greatest', description: 'חולצת אוברסייז אפורה בשטיפת אבן עם הדפס Greatest בסגנון וינטג׳', imageUrl: '/assets/a189e74e3_IMG_0490.webp', isActive: true, sortOrder: 5 },
  // רווקות
  { category: 'gallery', gallerySection: 'bachelorette', name: 'רווקות — Bride to Be', description: 'חולצה מודפסת למסיבת רווקות — עיצוב Bride to Be', imageUrl: '/assets/seo/bachelorette-1.jpg', isActive: true, sortOrder: 6 },
  { category: 'gallery', gallerySection: 'bachelorette', name: 'רווקות — הלילה קצר', description: 'הדפסת חולצות למסיבת רווקות — "הלילה קצר והחצאית עוד יותר" בעיצוב ורוד עם נעל עקב ושמפניה', imageUrl: '/assets/seo/bachelorette-2.jpg', isActive: true, sortOrder: 7 },
  { category: 'gallery', gallerySection: 'bachelorette', name: 'רווקות — כיתוב מצחיק', description: 'חולצה מודפסת למסיבת רווקות עם כיתוב מצחיק בעברית', imageUrl: '/assets/seo/bachelorette-3.jpg', isActive: true, sortOrder: 8 },
  { category: 'gallery', gallerySection: 'bachelorette', name: 'רווקות — צוות הכלה', description: 'חולצת רווקות מודפסת לצוות הכלה — סט תואם לכל הקבוצה', imageUrl: '/assets/seo/bachelorette-4.jpg', isActive: true, sortOrder: 9 },
  { category: 'gallery', gallerySection: 'bachelorette', name: 'רווקות — Bride Squad', description: 'חולצת Bride Squad עם איור טבעת ולב ורוד — הדפסה למסיבת רווקות', imageUrl: '/assets/seo/bachelorette-5.jpg', isActive: true, sortOrder: 10 },
  // משפחות
  { category: 'gallery', gallerySection: 'families', name: 'משפחות — בגד גוף לתינוק', description: 'בגד גוף לתינוק עם הדפסת תמונה אישית — "יום הולדת לאמא הכי טובה בעולם"', imageUrl: '/assets/seo/family-1.jpg', isActive: true, sortOrder: 11 },
  { category: 'gallery', gallerySection: 'families', name: 'משפחות — Family Adventure', description: 'חולצה סגולה מודפסת לטיול משפחתי — Family Adventure מונטנגרו 2026', imageUrl: '/assets/seo/family-2.jpg', isActive: true, sortOrder: 12 },
  { category: 'gallery', gallerySection: 'families', name: 'משפחות — Road Trip', description: 'חולצת Road Trip משפחתית בצבע שמנת עם איור דוב מטייל ושמות כל בני המשפחה', imageUrl: '/assets/seo/family-3.jpg', isActive: true, sortOrder: 13 },
  { category: 'gallery', gallerySection: 'families', name: 'משפחות — עיצוב תואם', description: 'חולצות משפחתיות מודפסות בעיצוב תואם לכל המשפחה', imageUrl: '/assets/seo/family-4.jpg', isActive: true, sortOrder: 14 },
  // ימי הולדת
  { category: 'gallery', gallerySection: 'birthday', name: 'יום הולדת — כוכב היום', description: 'חולצת יום הולדת לילד עם הדפסת כדורסל — "יום הולדת שמח! כוכב היום"', imageUrl: '/assets/seo/birthday-1.jpg', isActive: true, sortOrder: 15 },
  { category: 'gallery', gallerySection: 'birthday', name: 'יום הולדת — שם וגיל', description: 'חולצת יום הולדת מודפסת עם שם וגיל בעיצוב צבעוני', imageUrl: '/assets/seo/birthday-2.jpg', isActive: true, sortOrder: 16 },
  { category: 'gallery', gallerySection: 'birthday', name: 'יום הולדת — נסיכה', description: 'חולצת יום הולדת לנסיכה — איור ילדה עם כתר, בלונים ועוגה בהדפסה צבעונית', imageUrl: '/assets/seo/birthday-3.jpg', isActive: true, sortOrder: 17 },
  { category: 'gallery', gallerySection: 'birthday', name: 'יום הולדת — שם החוגג', description: 'חולצה מודפסת לחגיגת יום הולדת — עיצוב אישי עם שם החוגג', imageUrl: '/assets/seo/birthday-4.jpg', isActive: true, sortOrder: 18 },
]

const categoryLabels: Record<string, string> = {
  logo: 'לוגו',
  hero_carousel: 'קרוסלת גלריה (דף הבית)',
  gallery: 'גלריית העבודות שלנו (עמוד /gallery)',
  homepage_carousel: 'קרוסלת חבילות',
  designable_products: 'מוצרים לעיצוב',
  tshirt_mockups: 'מוקאפים חולצות',
  sweatshirt_mockups: 'מוקאפים סווטשרטים',
  buff_mockups: 'מוקאפים באפים',
  apron_mockups: 'מוקאפים סינרים',
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
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<string>('hero_carousel')
  const [uploadGallerySection, setUploadGallerySection] = useState<GallerySection>('soldiers')
  const [uploadName, setUploadName] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

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

  // ייבוא הגלריה הסטטית של /gallery ל-DB — אידמפוטנטי לפי imageUrl
  const handleGalleryImport = async () => {
    if (!confirm('לייבא את תמונות הגלריה הקיימות ל-Firebase? (תמונות שכבר קיימות ידולגו)')) return
    setSeeding(true)
    try {
      // בדיקה טרייה מול ה-DB כדי להישאר אידמפוטנטי גם אם המצב המקומי לא מעודכן
      const existing = await getAllDocuments<SiteImage>('siteImages')
      const existingUrls = new Set(existing.filter(i => i.category === 'gallery').map(i => i.imageUrl))
      const toAdd = GALLERY_IMPORT.filter(img => !existingUrls.has(img.imageUrl))
      if (toAdd.length === 0) {
        alert('✅ כל תמונות הגלריה כבר קיימות במערכת')
        return
      }
      for (const img of toAdd) {
        await createDocument<SiteImage>('siteImages', {
          ...img,
          createdAt: Timestamp.now(),
        } as any)
      }
      await loadImages()
      alert(`✅ יובאו ${toAdd.length} תמונות גלריה — עמוד /gallery מנוהל כעת במלואו מהאדמין`)
    } catch (e) {
      console.error(e)
      alert('❌ שגיאה בייבוא תמונות הגלריה')
    } finally {
      setSeeding(false)
    }
  }

  // שינוי קטגוריית תצוגה בעמוד /gallery — נשמר מיד
  const handleSectionChange = async (id: string, section: GallerySection) => {
    try {
      await updateDocument<SiteImage>('siteImages', id, { gallerySection: section } as any)
      setImages(prev => prev.map(i => i.id === id ? { ...i, gallerySection: section } : i))
    } catch (e) {
      console.error(e)
      alert('❌ שגיאה בעדכון הקטגוריה')
    }
  }

  // שינוי סדר תצוגה (נמוך = מוצג קודם) — נשמר ביציאה מהשדה
  const handleSortOrderChange = async (id: string, value: string) => {
    const sortOrder = parseInt(value, 10)
    if (isNaN(sortOrder)) return
    const current = images.find(i => i.id === id)
    if (!current || (current.sortOrder ?? 0) === sortOrder) return
    try {
      await updateDocument<SiteImage>('siteImages', id, { sortOrder } as any)
      setImages(prev =>
        prev
          .map(i => i.id === id ? { ...i, sortOrder } : i)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      )
    } catch (e) {
      console.error(e)
      alert('❌ שגיאה בעדכון סדר התצוגה')
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

  const handleUpload = async () => {
    if (!uploadFile) { alert('יש לבחור קובץ'); return }
    if (!uploadName.trim()) { alert('יש להזין שם לתמונה'); return }
    const validation = validateFile(uploadFile, 10)
    if (!validation.valid) { alert(validation.error); return }

    setUploading(true)
    try {
      const fileName = generateUniqueFileName(uploadFile.name)
      const downloadUrl = await uploadSiteImage(uploadFile, uploadCategory, fileName)
      const maxSort = Math.max(0, ...images.filter(i => i.category === uploadCategory).map(i => i.sortOrder ?? 0))

      await createDocument<SiteImage>('siteImages', {
        category: uploadCategory as any,
        name: uploadName.trim(),
        description: '',
        imageUrl: downloadUrl,
        isActive: true,
        sortOrder: maxSort + 1,
        createdAt: Timestamp.now(),
        // תמונת גלריה משויכת לקטגוריית תצוגה בעמוד /gallery
        ...(uploadCategory === 'gallery' ? { gallerySection: uploadGallerySection } : {}),
      } as any)

      await loadImages()
      setUploadOpen(false)
      setUploadName('')
      setUploadFile(null)
      alert('✅ התמונה הועלתה בהצלחה')
    } catch (e) {
      console.error(e)
      alert('❌ שגיאה בהעלאת התמונה. בדוק את הרשאות Firebase Storage.')
    } finally {
      setUploading(false)
    }
  }

  const filtered = activeCategory === 'all'
    ? images
    : images.filter(i => i.category === activeCategory)

  const categories = ['all', ...new Set(images.map(i => i.category))]

  // כמה מתמונות הגלריה הסטטיות עדיין חסרות ב-DB (קובע אם להציג את כפתור הייבוא)
  const galleryUrls = new Set(images.filter(i => i.category === 'gallery').map(i => i.imageUrl))
  const missingGalleryImports = GALLERY_IMPORT.filter(img => !galleryUrls.has(img.imageUrl))

  return (
    <div dir="rtl">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">ניהול תמונות</h1>
          <p className="text-gray-600">ניהול תמונות האתר לפי קטגוריות</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => setUploadOpen(true)}
            disabled={seeding || loading}
          >
            <Plus className="w-4 h-4 ml-2" />
            העלאת תמונה
          </Button>
          {!loading && missingGalleryImports.length > 0 && (
            <Button
              variant="outline"
              className="border-purple-400 text-purple-700 hover:bg-purple-50"
              onClick={handleGalleryImport}
              disabled={seeding || loading}
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Database className="w-4 h-4 ml-2" />}
              ייבוא תמונות הגלריה הקיימות ({missingGalleryImports.length})
            </Button>
          )}
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
            variant="outline"
            onClick={handleSeed}
            disabled={seeding || loading}
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Database className="w-4 h-4 ml-2" />}
            {seeding ? 'מזין...' : images.length === 0 ? 'הזן כל התמונות' : 'הוסף ברירת מחדל'}
          </Button>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !uploading && setUploadOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">העלאת תמונה חדשה</h2>
              <button onClick={() => !uploading && setUploadOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="סגור">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  disabled={uploading}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-yellow-500 focus:outline-none"
                >
                  {Object.entries(categoryLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  לתמונות בקרוסלה של דף הבית — בחר &quot;קרוסלת גלריה (דף הבית)&quot;
                </p>
              </div>

              {uploadCategory === 'gallery' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה בעמוד הגלריה</label>
                  <select
                    value={uploadGallerySection}
                    onChange={e => setUploadGallerySection(e.target.value as GallerySection)}
                    disabled={uploading}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  >
                    {GALLERY_SECTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    התמונה תופיע בעמוד /gallery תחת הקטגוריה שנבחרה
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם התמונה</label>
                <Input
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  placeholder="לדוגמה: תמונה חדשה לקרוסלה"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">קובץ תמונה</label>
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                {uploadFile && (
                  <p className="text-xs text-gray-600 mt-1">
                    נבחר: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">JPG / PNG / WEBP — עד 10MB</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile || !uploadName.trim()}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Upload className="w-4 h-4 ml-2" />}
                  {uploading ? 'מעלה...' : 'העלה'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUploadOpen(false)}
                  disabled={uploading}
                >
                  ביטול
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <p className="text-xs text-gray-500 mb-3">
                  {categoryLabels[image.category] ?? image.category}
                </p>
                {/* תמונת גלריה: שינוי קטגוריה + סדר תצוגה — נשמרים מיד */}
                {image.category === 'gallery' && (
                  <div className="mb-3 space-y-2">
                    <select
                      value={image.gallerySection ?? 'more'}
                      onChange={e => handleSectionChange(image.id, e.target.value as GallerySection)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:border-yellow-500 focus:outline-none"
                      aria-label="קטגוריה בעמוד הגלריה"
                    >
                      {GALLERY_SECTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 whitespace-nowrap">סדר תצוגה</label>
                      <input
                        key={`${image.id}-${image.sortOrder ?? 0}`}
                        type="number"
                        defaultValue={image.sortOrder ?? 0}
                        onBlur={e => handleSortOrderChange(image.id, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:border-yellow-500 focus:outline-none"
                        aria-label="סדר תצוגה (נמוך = מוצג קודם)"
                        title="נמוך = מוצג קודם"
                      />
                    </div>
                  </div>
                )}
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
