/**
 * POST /api/admin/voice-order — הקלטה/קובץ קולי → תמלול + שורות הזמנה.
 *
 * multipart/form-data עם שדה `audio`. אדמין בלבד (Bearer ID token).
 * האודיו לא נשמר — הוא עובר מהזיכרון ישר ל-OpenAI. שום דבר לא נכתב כאן
 * ל-Firestore: השמירה היא צעד נפרד אחרי שהמשתמש סקר ותיקן את השורות.
 */
import { NextRequest, NextResponse } from 'next/server'
import { rejectUnlessAdmin } from '@/lib/admin-request-auth'
import { processVoiceOrder, VoiceOrderError } from '@/lib/voice-order'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** גוף בקשה ב-Vercel מוגבל ל-~4.5MB; הלקוח חוסם מעל 4MB, וגם כאן. */
const MAX_BYTES = 4 * 1024 * 1024

/** סיומות ש-OpenAI מקבל. opus של וואטסאפ הוא Ogg/Opus — נשלח בשם .ogg. */
const ACCEPTED_EXT = ['flac', 'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'ogg', 'wav', 'webm']

function apiFileName(name: string, mime: string): string | null {
  let ext = (name.split('.').pop() ?? '').toLowerCase()
  if (ext === 'opus' || ext === 'oga') ext = 'ogg'
  if (!ACCEPTED_EXT.includes(ext)) {
    // אין סיומת מוכרת — ננחש מה-MIME (הקלטות דפדפן)
    if (mime.includes('webm')) ext = 'webm'
    else if (mime.includes('ogg') || mime.includes('opus')) ext = 'ogg'
    else if (mime.includes('mp4') || mime.includes('aac') || mime.includes('m4a')) ext = 'm4a'
    else if (mime.includes('mpeg') || mime.includes('mp3')) ext = 'mp3'
    else if (mime.includes('wav')) ext = 'wav'
    else return null
  }
  return `audio.${ext}`
}

export async function POST(request: NextRequest) {
  const rejected = await rejectUnlessAdmin(request, 'voice-order')
  if (rejected) return rejected

  let file: File | null = null
  try {
    const form = await request.formData()
    const value = form.get('audio')
    if (value && typeof value !== 'string') file = value
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'no_audio' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 })
  }
  const fileName = apiFileName(file.name || '', file.type || '')
  if (!fileName) {
    return NextResponse.json({ error: 'unsupported_format' }, { status: 415 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await processVoiceOrder(buffer, fileName)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof VoiceOrderError) {
      const status = e.code === 'no_api_key' ? 503 : 502
      return NextResponse.json({ error: e.code }, { status })
    }
    console.error('voice-order error:', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
