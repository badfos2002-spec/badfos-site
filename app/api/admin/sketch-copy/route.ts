/**
 * /api/admin/sketch-copy — מעתיק קבצי עיצוב של הזמנה לתיקייה של סקיצה חדשה. אדמין בלבד.
 *
 *   POST { urls: string[] } → { sessionId, urls: string[] }   (אותו סדר)
 *
 * למה העתקה ולא הפניה לקובץ ההזמנה: ניקוי הסקיצות (lib/sketch-retention.ts)
 * מוחק אחרי 30 יום כל קובץ ש*מסמך הסקיצה* מפנה אליו. סקיצה שמפנה לקובץ ההזמנה
 * הייתה מוחקת את קובץ ההדפסה של הלקוח. לכן לסקיצה יש עותקים משלה תחת
 * designs/sketch-<ts>/ — בדיוק כמו "שכפל" בעמוד הסקיצות.
 *
 * ההעתקה בצד השרת כי קבצי הדפסה מגיעים עד 30MB ולא עוברים דרך פרוקסי של
 * Vercel (תקרת תשובה 4.5MB); העותק מוקטן לפרופיל הסקיצה (fitForSketch).
 *
 *   404 { error: 'source_missing' } — קובץ ההזמנה כבר לא קיים (נמחק בניקוי)
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { adminStorage } from '@/lib/firebase-admin'
import { rejectUnlessAdmin } from '@/lib/admin-request-auth'
import { isOwnDesignUrl } from '@/lib/manual-order'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const MAX_FILES = 8
/** פרופיל הסקיצה: הצלע הארוכה עד 1600px (כמו lib/sketch-image.ts) — מעבר לזה הסקיצה לא מציגה כלום */
const SKETCH_EDGE = 1600

/**
 * קובץ הדפסה (עד 30MB) → קובץ סקיצה: בתוך 1600×1600 בלי הגדלה, כיוון EXIF מתוקן.
 * שקיפות → PNG, אחרת JPEG — קטן מספיק לפרוקסי (תצוגת 3D, תמונת וואטסאפ, "פתח לעריכה").
 */
async function fitForSketch(input: Buffer): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const img = sharp(input, { failOn: 'none' }).rotate().resize({
    width: SKETCH_EDGE, height: SKETCH_EDGE, fit: 'inside', withoutEnlargement: true,
  })
  const { hasAlpha } = await img.metadata()
  return hasAlpha
    ? { buffer: await img.png({ compressionLevel: 9 }).toBuffer(), contentType: 'image/png', ext: 'png' }
    : { buffer: await img.jpeg({ quality: 85, mozjpeg: true }).toBuffer(), contentType: 'image/jpeg', ext: 'jpg' }
}

export async function POST(request: NextRequest) {
  const rejected = await rejectUnlessAdmin(request, 'sketch-copy')
  if (rejected) return rejected

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }
  const urls = (body as { urls?: unknown } | null)?.urls
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (
    !Array.isArray(urls) || urls.length === 0 || urls.length > MAX_FILES ||
    !urls.every(u => isOwnDesignUrl(u, bucketName))
  ) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const bucket = adminStorage.bucket(bucketName)
  const sessionId = `sketch-${Date.now()}-${randomUUID().slice(0, 6)}`
  const written: string[] = []
  try {
    const sources = urls.map(u => decodeURIComponent(new URL(u as string).pathname.split('/o/')[1]))
    // קובץ ההזמנה כבר נמחק (ניקוי הזמנות ישנות) — לפני שכותבים משהו
    for (const src of sources) {
      const [exists] = await bucket.file(src).exists()
      if (!exists) return NextResponse.json({ error: 'source_missing' }, { status: 404 })
    }
    const out: string[] = []
    for (let i = 0; i < sources.length; i++) {
      const [bytes] = await bucket.file(sources[i]).download()
      const fitted = await fitForSketch(bytes)
      const dest = `designs/${sessionId}/design-${i + 1}-${randomUUID().slice(0, 8)}.${fitted.ext}`
      const token = randomUUID()
      written.push(dest)
      await bucket.file(dest).save(fitted.buffer, {
        metadata: {
          contentType: fitted.contentType,
          metadata: { firebaseStorageDownloadTokens: token },
        },
      })
      out.push(`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`)
    }
    return NextResponse.json({ sessionId, urls: out })
  } catch (e) {
    console.error('sketch-copy error:', e)
    // בלי יתומים: מה שכבר נכתב לסקיצה שלא תיווצר — נמחק
    await Promise.all(written.map(p => bucket.file(p).delete({ ignoreNotFound: true }).catch(err => console.error(`sketch-copy cleanup failed ${p}:`, err))))
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
