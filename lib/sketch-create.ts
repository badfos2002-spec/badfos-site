/**
 * סקיצה בלחיצה אחת מתוך שורת הזמנה (טופס הזמנה ידנית + כרטיסי /admin/orders).
 *
 * 1. העתקת קבצי ההזמנה לתיקיית הסקיצה (שרת, אדמין בלבד — /api/admin/sketch-copy).
 * 2. תצוגה לוואטסאפ: העיצוב על הרקע הממותג (אין קנבס תלת-ממדי בעמודים האלה).
 *    כשל כאן לעולם לא חוסם — הקישור פשוט יוצג עם הלוגו.
 * 3. createSharedDesign — אותו מסמך shared_designs כמו בעמוד הסקיצות, בלי transform
 *    (= מיקום ברירת המחדל), ומכאן אותה מדיניות שמירה (30 יום, ראו sketch-retention).
 */
import { adminFetch } from './admin-fetch'
import { createSharedDesign, type SharedDesignData } from './db'
import { uploadDesignFile, deleteFile } from './storage'
import { composeArtworkPreview } from './sketch-preview'
import type { SketchSpec } from './sketch-products'

export interface CreatedSketch {
  id: string
  url: string
  /** התצוגה לוואטסאפ לא נוצרה — הקישור יוצג עם הלוגו */
  previewMissing: boolean
}

export async function createSketchFromSpec(
  spec: SketchSpec,
  meta: { phone?: string; label?: string } = {},
): Promise<CreatedSketch> {
  const res = await adminFetch('/api/admin/sketch-copy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls: spec.designs.map(d => d.imageUrl) }),
  })
  const copy = await res.json().catch(() => null) as { sessionId?: string; urls?: string[] } | null
  if (res.status === 404 && (copy as { error?: string } | null)?.error === 'source_missing') throw new Error('source_missing')
  if (!res.ok || !copy?.sessionId || copy.urls?.length !== spec.designs.length) {
    throw new Error(res.status === 401 || res.status === 403 ? 'not_signed_in' : `copy_failed_${res.status}`)
  }
  const urls = copy.urls

  // ניסיון חוזר אחד; אם עדיין אין — הסקיצה נשמרת עם previewMissing (מסומנת ב-/admin/sketches)
  let previewUrl: string | null = null
  for (let attempt = 1; attempt <= 2 && !previewUrl; attempt++) {
    try {
      const shot = await composeArtworkPreview(urls)
      if (shot) previewUrl = await uploadDesignFile(new File([shot], 'preview.jpg', { type: 'image/jpeg' }), copy.sessionId, 'preview.jpg')
    } catch (err) {
      console.error(`[SKETCH_PREVIEW_UPLOAD_FAILED] attempt ${attempt}:`, err)
    }
  }
  if (!previewUrl) console.error('[SKETCH_PREVIEW_MISSING] one-click sketch saved without a WhatsApp preview (previewMissing:true)')

  // מפתחות חסרים ולא undefined — אין ignoreUndefinedProperties ב-lib/firebase.ts
  const payload: SharedDesignData = {
    productType: spec.productType,
    color: spec.color,
    ...(spec.fabricType ? { fabricType: spec.fabricType } : {}),
    ...(previewUrl ? { previewUrl } : { previewMissing: true }),
    ...(meta.phone?.trim() ? { phone: meta.phone.trim() } : {}),
    ...(meta.label?.trim() ? { label: meta.label.trim() } : {}),
    designs: spec.designs.map((d, i) => ({ area: d.area, areaName: d.areaName, imageBase64: urls[i] })),
  }
  let id: string
  try {
    id = await createSharedDesign(payload)
  } catch (err) {
    // בלי יתומים: אין מסמך שמפנה לעותקים — מוחקים אותם (ואת התצוגה)
    await Promise.all([...urls, ...(previewUrl ? [previewUrl] : [])].map(u => deleteFile(u).catch(() => {})))
    throw err
  }
  return { id, url: `${window.location.origin}/share/${id}`, previewMissing: !previewUrl }
}
